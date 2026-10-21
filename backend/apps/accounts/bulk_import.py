import csv
import io
import logging
import re
import zipfile

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from apps.courses.models import Enrollment
from apps.files.storage import model_default_quota, quota_bytes_from_setting
from .emails import send_welcome_email, build_set_password_url
from .models import SystemSettings, Notification

User = get_user_model()
logger = logging.getLogger(__name__)

REQUIRED_COLUMNS = {'email'}
EXPECTED_COLUMNS = {'email', 'first_name', 'last_name', 'username', 'section'}
OPTIONAL_COLUMNS = {'first_name', 'last_name', 'username', 'section'}

MAX_UNPACKED_XLSX_BYTES = 50 * 1024 * 1024
USERNAME_RE = re.compile(r'^[\w.@+-]{1,150}$')


class BulkImportError(Exception):
    """A problem with the uploaded file that is safe to show to the user."""


def _max_rows():
    return int(getattr(settings, 'BULK_IMPORT_MAX_ROWS', 2000))


def _clean_cell(value, max_length=150):
    text = '' if value is None else str(value)
    text = re.sub(r'<[^>]*>', '', text)
    return text.strip()[:max_length]


def generate_username(email, first_name='', last_name=''):
    """Generate a unique username from email or name."""
    # Try first_name + last_name
    if first_name and last_name:
        base = f"{first_name.lower()}.{last_name.lower()}"
    elif first_name:
        base = first_name.lower()
    else:
        base = email.split('@')[0].lower()

    # Clean non-alphanumeric chars (except dots)
    base = ''.join(c for c in base if c.isalnum() or c == '.')[:140]
    if not base:
        base = 'student'

    username = base
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f"{base}{counter}"
        counter += 1
    return username


def parse_csv(file_content):
    """Parse CSV content and return list of row dicts."""
    try:
        text = file_content.decode('utf-8-sig')
    except UnicodeDecodeError:
        raise BulkImportError('The CSV file must be UTF-8 encoded.')
    reader = csv.DictReader(io.StringIO(text))
    rows = []
    for i, row in enumerate(reader, start=2):
        if len(rows) >= _max_rows():
            raise BulkImportError(f'The file has more than {_max_rows()} rows.')
        # Normalize keys to lowercase, strip whitespace
        cleaned = {k.strip().lower().replace(' ', '_'): (v or '').strip() for k, v in row.items() if k}
        cleaned['_row'] = i
        rows.append(cleaned)
    return rows


def parse_xlsx(file_content):
    """Parse XLSX content and return list of row dicts."""
    import openpyxl
    try:
        with zipfile.ZipFile(io.BytesIO(file_content)) as zf:
            if sum(i.file_size for i in zf.infolist()) > MAX_UNPACKED_XLSX_BYTES:
                raise BulkImportError('The spreadsheet is too large when unpacked.')
    except zipfile.BadZipFile:
        raise BulkImportError('The file is not a valid XLSX spreadsheet.')

    wb = openpyxl.load_workbook(io.BytesIO(file_content), read_only=True)
    try:
        ws = wb.active
        rows = []
        headers = None
        for i, row in enumerate(ws.iter_rows(values_only=True), start=1):
            if i == 1:
                headers = [str(h).strip().lower().replace(' ', '_') if h else f'col_{j}' for j, h in enumerate(row)]
                continue
            if len(rows) >= _max_rows():
                raise BulkImportError(f'The file has more than {_max_rows()} rows.')
            cleaned = {}
            for j, val in enumerate(row):
                if j < len(headers):
                    cleaned[headers[j]] = str(val).strip() if val is not None else ''
            cleaned['_row'] = i
            rows.append(cleaned)
    finally:
        wb.close()
    return rows


def validate_rows(rows):
    """Validate parsed rows. Returns (valid_rows, errors)."""
    errors = []
    valid = []

    if not rows:
        return [], [{'row': 0, 'error': 'File contains no data rows'}]

    # Check required columns exist
    sample_keys = set(rows[0].keys()) - {'_row'}
    if 'email' not in sample_keys:
        return [], [{'row': 0, 'error': "Missing required column 'email'. Found columns: " + ', '.join(sorted(sample_keys))[:300]}]

    seen_emails = set()
    for row in rows:
        row_num = row.get('_row', '?')
        email = row.get('email', '').strip().lower()

        if not email:
            errors.append({'row': row_num, 'error': 'Email is required'})
            continue

        try:
            validate_email(email)
        except DjangoValidationError:
            errors.append({'row': row_num, 'error': 'Invalid email address'})
            continue

        if email in seen_emails:
            errors.append({'row': row_num, 'error': f"Duplicate email in file: {email}"})
            continue

        seen_emails.add(email)
        username = _clean_cell(row.get('username', ''))
        if username and not USERNAME_RE.match(username):
            username = ''  # fall back to a generated username
        valid.append({
            'email': email,
            'first_name': _clean_cell(row.get('first_name', '')),
            'last_name': _clean_cell(row.get('last_name', '')),
            'username': username,
            'section': _clean_cell(row.get('section', ''), 50),
            '_row': row_num,
        })

    return valid, errors


def validate_bulk_import_sections(rows, course):
    """Validate sections against course sections when a course is selected.
    Returns (valid_rows, errors)."""
    if not course:
        return rows, []

    course_sections = course.sections or []
    # Normalize section names for comparison
    valid_section_names = {s.strip().lower() for s in course_sections if isinstance(s, str) and s.strip()}

    errors = []
    valid = []
    for row in rows:
        section = row.get('section', '').strip()
        row_num = row.get('_row', '?')

        if not section:
            errors.append({'row': row_num, 'error': f'Section is required when enrolling in a course (email: {row["email"]})'})
            continue

        if valid_section_names and section.lower() not in valid_section_names:
            errors.append({'row': row_num, 'error': f'Section "{section}" does not exist in course. Available sections: {", ".join(str(s) for s in course_sections)}'})
            continue

        valid.append(row)

    return valid, errors


def process_bulk_import(rows, course=None, send_emails=True, created_by=None, reveal_existing=False):
    """
    Process validated rows: create users, enroll in course, send emails.
    `course` must already have been checked by the caller (the lecturer teaches it, or the caller is an admin).
    New accounts get an unusable password and a one-time "set your password" link by e-mail; no password is generated
    or sent. `reveal_existing` (admins only) includes the username of accounts that already exist.
    Returns results dict.
    """
    # Validate sections against course if course is specified
    if course:
        rows, section_errors = validate_bulk_import_sections(rows, course)
        if section_errors and not rows:
            return {'success': False, 'error': 'All rows failed section validation', 'section_errors': section_errors}
    else:
        section_errors = []

    # Default storage quota for the new accounts (an unusable setting keeps the model default)
    default_quota = quota_bytes_from_setting(SystemSettings.get_all_settings().get('defaultStorageQuota', '5'),
                                             model_default_quota())

    results = {
        'created': [],
        'existing': [],
        'enrolled': [],
        'errors': [],
        'emails_sent': 0,
    }

    for row in rows:
        email = row['email']
        row_num = row['_row']

        try:
            # Check if user already exists
            existing_user = User.objects.filter(email__iexact=email).first()

            if existing_user:
                user = existing_user
                entry = {'row': row_num, 'email': email, 'message': 'User already exists'}
                if reveal_existing:
                    entry['username'] = user.username
                results['existing'].append(entry)
            else:
                username = row.get('username') or generate_username(
                    email, row.get('first_name', ''), row.get('last_name', '')
                )

                # Ensure username is unique
                if User.objects.filter(username=username).exists():
                    username = generate_username(email, row.get('first_name', ''), row.get('last_name', ''))

                user = User(
                    username=username,
                    email=email,
                    first_name=row.get('first_name', ''),
                    last_name=row.get('last_name', ''),
                    role='student',
                    storage_quota=default_quota,
                    # Not verified until the person uses the emailed set-password link.
                    email_verified=False,
                )
                user.set_unusable_password()
                user.save()

                results['created'].append({
                    'row': row_num,
                    'email': email,
                    'username': username,
                })

                # Send welcome email with a one-time set-password link
                if send_emails:
                    uid = urlsafe_base64_encode(force_bytes(user.pk))
                    token = default_token_generator.make_token(user)
                    send_welcome_email(user, build_set_password_url(uid, token), course)
                    results['emails_sent'] += 1

            # Enroll in course if specified
            if course:
                enrollment, created = Enrollment.objects.get_or_create(
                    student=user,
                    course=course,
                    defaults={'section': row.get('section', ''), 'status': 'active'},
                )
                if created:
                    results['enrolled'].append({
                        'row': row_num,
                        'email': email,
                        'course': course.code,
                        'section': row.get('section', ''),
                    })

                    # Create notification for enrollment
                    Notification.objects.create(
                        user=user,
                        type='course_enrolled',
                        title=f'Enrolled in {course.code}',
                        message=f'You have been enrolled in {course.code} - {course.name}.',
                    )

        except Exception:
            logger.warning('Bulk import row %s failed', row_num, exc_info=False)
            results['errors'].append({
                'row': row_num,
                'email': email,
                'error': 'This row could not be imported.',
            })

    # Include section validation errors in the errors list
    for se in section_errors:
        results['errors'].append(se)

    return results

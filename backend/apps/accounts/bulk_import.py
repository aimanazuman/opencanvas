import csv
import io
import string
import secrets
from django.contrib.auth import get_user_model
from apps.courses.models import Course, Enrollment
from .emails import send_welcome_email
from .models import SystemSettings, Notification

User = get_user_model()

REQUIRED_COLUMNS = {'email'}
OPTIONAL_COLUMNS = {'first_name', 'last_name', 'username', 'section'}


def generate_password(length=10):
    """Generate a random password."""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


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
    base = ''.join(c for c in base if c.isalnum() or c == '.')
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
    text = file_content.decode('utf-8-sig')
    reader = csv.DictReader(io.StringIO(text))
    rows = []
    for i, row in enumerate(reader, start=2):
        # Normalize keys to lowercase, strip whitespace
        cleaned = {k.strip().lower().replace(' ', '_'): v.strip() for k, v in row.items() if k}
        cleaned['_row'] = i
        rows.append(cleaned)
    return rows


def parse_xlsx(file_content):
    """Parse XLSX content and return list of row dicts."""
    import openpyxl
    wb = openpyxl.load_workbook(io.BytesIO(file_content), read_only=True)
    ws = wb.active
    rows = []
    headers = None
    for i, row in enumerate(ws.iter_rows(values_only=True), start=1):
        if i == 1:
            headers = [str(h).strip().lower().replace(' ', '_') if h else f'col_{j}' for j, h in enumerate(row)]
            continue
        cleaned = {}
        for j, val in enumerate(row):
            if j < len(headers):
                cleaned[headers[j]] = str(val).strip() if val is not None else ''
        cleaned['_row'] = i
        rows.append(cleaned)
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
        return [], [{'row': 0, 'error': "Missing required column 'email'. Found columns: " + ', '.join(sorted(sample_keys))}]

    seen_emails = set()
    for row in rows:
        row_num = row.get('_row', '?')
        email = row.get('email', '').strip().lower()

        if not email:
            errors.append({'row': row_num, 'error': 'Email is required'})
            continue

        if '@' not in email or '.' not in email.split('@')[-1]:
            errors.append({'row': row_num, 'error': f"Invalid email: {email}"})
            continue

        if email in seen_emails:
            errors.append({'row': row_num, 'error': f"Duplicate email in file: {email}"})
            continue

        seen_emails.add(email)
        valid.append({
            'email': email,
            'first_name': row.get('first_name', '').strip(),
            'last_name': row.get('last_name', '').strip(),
            'username': row.get('username', '').strip(),
            'section': row.get('section', '').strip(),
            '_row': row_num,
        })

    return valid, errors


def process_bulk_import(rows, course_id, send_emails=True, created_by=None):
    """
    Process validated rows: create users, enroll in course, send emails.
    Returns results dict.
    """
    course = None
    if course_id:
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return {'success': False, 'error': f'Course ID {course_id} not found'}

    # Get default storage quota
    try:
        default_gb = float(SystemSettings.get_all_settings().get('defaultStorageQuota', '5'))
        default_quota = int(default_gb * (1024 ** 3))
    except (ValueError, TypeError):
        default_quota = 5368709120

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
            existing_user = User.objects.filter(email=email).first()

            if existing_user:
                user = existing_user
                results['existing'].append({
                    'row': row_num,
                    'email': email,
                    'username': user.username,
                    'message': 'User already exists',
                })
            else:
                # Create new user
                password = generate_password()
                username = row.get('username') or generate_username(
                    email, row.get('first_name', ''), row.get('last_name', '')
                )

                # Ensure username is unique
                if User.objects.filter(username=username).exists():
                    username = generate_username(email, row.get('first_name', ''), row.get('last_name', ''))

                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    first_name=row.get('first_name', ''),
                    last_name=row.get('last_name', ''),
                    role='student',
                    storage_quota=default_quota,
                )

                results['created'].append({
                    'row': row_num,
                    'email': email,
                    'username': username,
                })

                # Send welcome email
                if send_emails:
                    try:
                        send_welcome_email(user, password, course)
                        results['emails_sent'] += 1
                    except Exception:
                        pass  # Email failures are non-critical

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

        except Exception as e:
            results['errors'].append({
                'row': row_num,
                'email': email,
                'error': str(e),
            })

    return results

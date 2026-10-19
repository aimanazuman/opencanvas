"""Upload validation, safe storage names and signed media URLs.

Nothing here trusts the client: the extension must be on an allow-list, the content must match the extension (checked
with Pillow for images and magic bytes for the rest), the MIME type is chosen by the server, and stored names are random.
"""
import os
import re
import uuid
import zipfile

from django.conf import settings
from django.core import signing
from django.core.exceptions import ValidationError as DjangoValidationError
from PIL import Image, UnidentifiedImageError

MEDIA_SALT = 'opencanvas.media.v1'

RASTER_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
_IMAGE_FORMATS = {
    'png': {'PNG'},
    'jpg': {'JPEG'},
    'jpeg': {'JPEG'},
    'gif': {'GIF'},
    'webp': {'WEBP'},
}

# extension -> (mime type, file_type bucket used by the File model, check name)
ALLOWED_UPLOADS = {
    'png': ('image/png', 'image', 'image'),
    'jpg': ('image/jpeg', 'image', 'image'),
    'jpeg': ('image/jpeg', 'image', 'image'),
    'gif': ('image/gif', 'image', 'image'),
    'webp': ('image/webp', 'image', 'image'),
    'pdf': ('application/pdf', 'document', 'pdf'),
    'docx': ('application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'document', 'ooxml:word/'),
    'pptx': ('application/vnd.openxmlformats-officedocument.presentationml.presentation', 'document', 'ooxml:ppt/'),
    'xlsx': ('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'document', 'ooxml:xl/'),
    'doc': ('application/msword', 'document', 'ole'),
    'ppt': ('application/vnd.ms-powerpoint', 'document', 'ole'),
    'xls': ('application/vnd.ms-excel', 'document', 'ole'),
    'txt': ('text/plain', 'other', 'text'),
    'md': ('text/markdown', 'other', 'text'),
    'csv': ('text/csv', 'other', 'text'),
    'mp3': ('audio/mpeg', 'other', 'mp3'),
    'wav': ('audio/wav', 'other', 'wav'),
    'ogg': ('audio/ogg', 'other', 'ogg'),
    'mp4': ('video/mp4', 'video', 'mp4'),
    'webm': ('video/webm', 'video', 'webm'),
    'zip': ('application/zip', 'other', 'zip'),
}

MAX_ZIP_ENTRIES = 5000
MAX_ZIP_UNCOMPRESSED = 1024 * 1024 * 1024  # 1 GiB


def _fail(message):
    raise DjangoValidationError(message)


def get_extension(name):
    """Lower-case extension without the dot ('' when there is none)."""
    return os.path.splitext(name or '')[1].lower().lstrip('.')


def safe_display_name(name, max_length=255):
    """A client-supplied file name reduced to something safe to show and to put in a download header."""
    name = (name or '').replace('\\', '/').split('/')[-1]
    name = re.sub(r'[\x00-\x1f\x7f<>"\'`|?*:;]', '', name).strip().strip('.')
    name = re.sub(r'\s+', ' ', name)
    if len(name) > max_length:
        base, ext = os.path.splitext(name)
        name = base[: max_length - len(ext)] + ext
    return name or 'file'


def _read_head(uploaded, size=8192):
    uploaded.seek(0)
    head = uploaded.read(size)
    uploaded.seek(0)
    return head


def _check_image(uploaded, ext):
    try:
        uploaded.seek(0)
        with Image.open(uploaded) as img:
            fmt = img.format
            img.verify()
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        _fail('The file is not a valid image.')
    finally:
        uploaded.seek(0)
    if fmt not in _IMAGE_FORMATS.get(ext, set()):
        _fail('The file content does not match its extension.')


def _check_ooxml(uploaded, prefix):
    uploaded.seek(0)
    if not zipfile.is_zipfile(uploaded):
        _fail('The file is not a valid Office document.')
    uploaded.seek(0)
    try:
        with zipfile.ZipFile(uploaded) as zf:
            infos = zf.infolist()
            if len(infos) > MAX_ZIP_ENTRIES or sum(i.file_size for i in infos) > MAX_ZIP_UNCOMPRESSED:
                _fail('The document is too large when unpacked.')
            names = set(zf.namelist())
    except zipfile.BadZipFile:
        _fail('The file is not a valid Office document.')
    finally:
        uploaded.seek(0)
    if '[Content_Types].xml' not in names or not any(n.startswith(prefix) for n in names):
        _fail('The file content does not match its extension.')


def _check_zip(uploaded):
    uploaded.seek(0)
    try:
        with zipfile.ZipFile(uploaded) as zf:
            infos = zf.infolist()
            if len(infos) > MAX_ZIP_ENTRIES or sum(i.file_size for i in infos) > MAX_ZIP_UNCOMPRESSED:
                _fail('The archive is too large when unpacked.')
    except zipfile.BadZipFile:
        _fail('The file is not a valid ZIP archive.')
    finally:
        uploaded.seek(0)


def _check_text(head):
    if b'\x00' in head:
        _fail('The file is not a text file.')
    try:
        head.decode('utf-8')
    except UnicodeDecodeError as exc:
        # A multi-byte character cut by the 8 KiB window is fine; anything earlier is not.
        if exc.start < len(head) - 4:
            _fail('The file is not valid UTF-8 text.')


def sniff_upload(uploaded, original_name):
    """Validate an uploaded file. Returns (ext, mime_type, file_type). Raises django ValidationError."""
    ext = get_extension(original_name)
    if ext not in ALLOWED_UPLOADS:
        allowed = ', '.join(sorted(ALLOWED_UPLOADS))
        _fail('This file type is not allowed. Allowed types: %s.' % allowed)
    mime, file_type, check = ALLOWED_UPLOADS[ext]
    head = _read_head(uploaded)
    if not head:
        _fail('The file is empty.')

    if check == 'image':
        _check_image(uploaded, ext)
    elif check == 'pdf':
        if not head.startswith(b'%PDF-'):
            _fail('The file is not a valid PDF.')
    elif check.startswith('ooxml:'):
        _check_ooxml(uploaded, check.split(':', 1)[1])
    elif check == 'ole':
        if not head.startswith(b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1'):
            _fail('The file content does not match its extension.')
    elif check == 'text':
        _check_text(head)
    elif check == 'mp3':
        if not (head.startswith(b'ID3') or (len(head) > 1 and head[0] == 0xFF and (head[1] & 0xE0) == 0xE0)):
            _fail('The file is not a valid MP3.')
    elif check == 'wav':
        if not (head.startswith(b'RIFF') and head[8:12] == b'WAVE'):
            _fail('The file is not a valid WAV.')
    elif check == 'ogg':
        if not head.startswith(b'OggS'):
            _fail('The file is not a valid OGG.')
    elif check == 'mp4':
        if head[4:8] != b'ftyp':
            _fail('The file is not a valid MP4.')
    elif check == 'webm':
        if not head.startswith(b'\x1a\x45\xdf\xa3'):
            _fail('The file is not a valid WebM.')
    elif check == 'zip':
        _check_zip(uploaded)
    return ext, mime, file_type


def validate_image_upload(uploaded, max_size=None):
    """For avatars, logos and thumbnails: a real raster image within the size limit. Returns the extension."""
    limit = max_size or getattr(settings, 'MAX_IMAGE_UPLOAD_SIZE', 10 * 1024 * 1024)
    if uploaded.size > limit:
        _fail('The image is too large (limit %d MB).' % (limit // (1024 * 1024)))
    ext = get_extension(getattr(uploaded, 'name', ''))
    if ext not in RASTER_IMAGE_EXTENSIONS:
        _fail('Only PNG, JPEG, GIF or WebP images are allowed.')
    _check_image(uploaded, ext)
    return ext


# --- storage names ----------------------------------------------------------------------------------------------------
def _random_name(folder, filename):
    ext = get_extension(filename)
    ext = re.sub(r'[^a-z0-9]', '', ext)[:8]
    return '%s/%s%s' % (folder, uuid.uuid4().hex, ('.' + ext) if ext else '')


# One function per folder so migrations can reference them by import path.
def upload_file_path(instance, filename):
    return _random_name('uploads', filename)


def upload_file_thumbnail_path(instance, filename):
    return _random_name('file_thumbnails', filename)


def upload_avatar_path(instance, filename):
    return _random_name('avatars', filename)


def upload_board_thumbnail_path(instance, filename):
    return _random_name('board_thumbnails', filename)


def upload_institution_logo_path(instance, filename):
    return _random_name('institution_logos', filename)


# --- download headers -------------------------------------------------------------------------------------------------
def mime_for_name(name):
    """MIME type decided by the server from the stored extension only."""
    ext = get_extension(name)
    if ext in ALLOWED_UPLOADS:
        return ALLOWED_UPLOADS[ext][0]
    return 'application/octet-stream'


def is_inline_safe(name):
    """Only raster images are ever shown inline."""
    return get_extension(name) in RASTER_IMAGE_EXTENSIONS


# --- signed URLs ------------------------------------------------------------------------------------------------------
KIND_FILE = 'f'
KIND_FILE_THUMB = 'ft'
KIND_AVATAR = 'av'
KIND_BOARD_THUMB = 'bt'
KIND_LOGO = 'il'


def make_media_token(kind, object_id, user_id=None, board_id=None):
    payload = {'k': kind, 'i': int(object_id)}
    if user_id is not None:
        payload['u'] = int(user_id)
    if board_id is not None:
        payload['b'] = int(board_id)
    return signing.dumps(payload, salt=MEDIA_SALT, compress=True)


def read_media_token(token):
    """Return the payload dict, or None when the signature is wrong, malformed or expired."""
    max_age = int(getattr(settings, 'MEDIA_SIGNING_MAX_AGE', 3600))
    try:
        data = signing.loads(token, salt=MEDIA_SALT, max_age=max_age)
    except signing.BadSignature:  # includes SignatureExpired
        return None
    if not isinstance(data, dict) or 'k' not in data or 'i' not in data:
        return None
    return data


def signed_media_path(kind, object_id, user_id=None, board_id=None):
    return '%sf/%s/' % (settings.MEDIA_URL, make_media_token(kind, object_id, user_id, board_id))


def signed_media_url(request, kind, object_id, user_id=None, board_id=None):
    path = signed_media_path(kind, object_id, user_id, board_id)
    if request is not None:
        return request.build_absolute_uri(path)
    return path


# --- deleting stored files --------------------------------------------------------------------------------------------
def delete_stored_file(field_file):
    """Delete the physical file behind a FieldFile, ignoring a missing file."""
    if not field_file:
        return
    try:
        storage, name = field_file.storage, field_file.name
        if name and storage.exists(name):
            storage.delete(name)
    except Exception:  # pragma: no cover - best effort, never block a request on disk errors
        import logging
        logging.getLogger(__name__).warning('Could not delete stored file %s', getattr(field_file, 'name', ''))

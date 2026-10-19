"""Helpers shared by the test modules (not a test module itself)."""
import io

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient, APITestCase

PASSWORD = 'Sturdy-Pass-9271!'


def make_user(username, role='student', password=PASSWORD, **extra):
    User = get_user_model()
    extra.setdefault('email', f'{username}@example.test')
    extra.setdefault('email_verified', True)
    return User.objects.create_user(username=username, password=password, role=role, **extra)


def png_bytes(size=(4, 4), color=(200, 30, 30)):
    from PIL import Image
    buf = io.BytesIO()
    Image.new('RGB', size, color).save(buf, format='PNG')
    return buf.getvalue()


def png_upload(name='pic.png'):
    return SimpleUploadedFile(name, png_bytes(), content_type='image/png')


def pdf_upload(name='doc.pdf'):
    return SimpleUploadedFile(name, b'%PDF-1.4\n%fake but valid header\n1 0 obj\n<<>>\nendobj\n', content_type='application/pdf')


class BaseAPITestCase(APITestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def as_user(self, user):
        client = APIClient()
        client.force_authenticate(user=user)
        return client

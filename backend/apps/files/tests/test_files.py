"""OC-05 (safe uploads and signed downloads), OC-11 (file API fields, quota, deletion)."""
import io
import re
import zipfile

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings

from apps.boards.models import Board, BoardShare
from apps.files.models import File
from apps.files.security import make_media_token, sniff_upload
from apps.files.storage import update_user_storage
from apps.testutils import BaseAPITestCase, make_user, pdf_upload, png_bytes, png_upload

User = get_user_model()


def upload(client, uploaded, **extra):
    return client.post('/api/files/', dict(file=uploaded, **extra), format='multipart')


def signed_path(url):
    """Path part of a signed URL returned by the API."""
    return '/media/f/' + url.split('/media/f/', 1)[1]


def docx_bytes():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w') as zf:
        zf.writestr('[Content_Types].xml', '<Types/>')
        zf.writestr('word/document.xml', '<w:document/>')
    return buf.getvalue()


class UploadValidationTests(BaseAPITestCase):
    def setUp(self):
        super().setUp()
        self.user = make_user('uploader')
        self.client = self.as_user(self.user)

    def test_attack_html_and_svg_uploads_are_refused(self):
        for name, content in (('x.html', b'<script>alert(1)</script>'),
                              ('x.svg', b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
                              ('x.js', b'alert(1)'), ('x.exe', b'MZ'), ('noext', b'hello')):
            response = upload(self.client, SimpleUploadedFile(name, content, content_type='text/html'))
            self.assertEqual(response.status_code, 400, name)
        self.assertEqual(File.objects.count(), 0)

    def test_attack_disguised_content_is_refused(self):
        fake_png = SimpleUploadedFile('photo.png', b'<html><script>alert(1)</script></html>', content_type='image/png')
        self.assertEqual(upload(self.client, fake_png).status_code, 400)
        png_as_jpg = SimpleUploadedFile('photo.jpg', png_bytes(), content_type='image/jpeg')
        self.assertEqual(upload(self.client, png_as_jpg).status_code, 400)
        fake_pdf = SimpleUploadedFile('doc.pdf', b'<html>', content_type='application/pdf')
        self.assertEqual(upload(self.client, fake_pdf).status_code, 400)
        fake_docx = SimpleUploadedFile('doc.docx', b'not a zip', content_type='application/octet-stream')
        self.assertEqual(upload(self.client, fake_docx).status_code, 400)
        binary_txt = SimpleUploadedFile('notes.txt', b'abc\x00\x01\x02', content_type='text/plain')
        self.assertEqual(upload(self.client, binary_txt).status_code, 400)

    def test_valid_files_are_accepted_with_random_names_and_server_side_mime(self):
        cases = [
            (png_upload('My Picture.png'), 'image/png', 'image'),
            (pdf_upload('Lecture 1.pdf'), 'application/pdf', 'document'),
            (SimpleUploadedFile('essay.docx', docx_bytes(), content_type='text/html'), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'document'),
            (SimpleUploadedFile('notes.txt', 'héllo'.encode(), content_type='text/html'), 'text/plain', 'other'),
        ]
        for uploaded, mime, file_type in cases:
            response = upload(self.client, uploaded)
            self.assertEqual(response.status_code, 201, response.content)
            stored = File.objects.get(id=response.data['id'])
            self.assertEqual(stored.mime_type, mime)  # the client said text/html for some of these
            self.assertEqual(stored.file_type, file_type)
            self.assertRegex(stored.file.name, r'^uploads/[0-9a-f]{32}\.[a-z]+$')
            self.assertIn('/media/f/', response.data['url'])
            self.assertTrue(response.data['ref'].startswith('ocmedia:uploads/'))
            self.assertNotIn('/media/uploads/', response.data['url'])
        self.assertEqual(File.objects.get(name='My Picture.png').name, 'My Picture.png')

    def test_size_limit(self):
        with override_settings(MAX_UPLOAD_SIZE=100):
            response = upload(self.client, SimpleUploadedFile('big.txt', b'a' * 500))
        self.assertEqual(response.status_code, 400)

    def test_path_tricks_in_names_are_neutralised(self):
        response = upload(self.client, SimpleUploadedFile('../../etc/passwd.txt', b'hello'))
        self.assertEqual(response.status_code, 201)
        stored = File.objects.get()
        self.assertTrue(stored.file.name.startswith('uploads/'))
        self.assertNotIn('..', stored.file.name)
        self.assertNotIn('/', stored.name)

    def test_sniffing_unit(self):
        ext, mime, kind = sniff_upload(io.BytesIO(png_bytes()), 'a.PNG')
        self.assertEqual((ext, mime, kind), ('png', 'image/png', 'image'))


class SignedDownloadTests(BaseAPITestCase):
    def setUp(self):
        super().setUp()
        self.owner = make_user('owner')
        self.stranger = make_user('stranger')
        self.client = self.as_user(self.owner)
        self.png = upload(self.client, png_upload('pic.png')).data
        self.pdf = upload(self.client, pdf_upload('doc.pdf')).data

    def _get(self, url, **extra):
        return self.client.__class__().get(signed_path(url), **extra)  # no credentials: a plain <img> request

    def test_png_is_served_inline_with_safe_headers(self):
        response = self._get(self.png['url'])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'image/png')
        self.assertTrue(response['Content-Disposition'].startswith('inline'))
        self.assertEqual(response['X-Content-Type-Options'], 'nosniff')
        self.assertIn('sandbox', response['Content-Security-Policy'])
        self.assertEqual(b''.join(response.streaming_content), png_bytes())

    def test_everything_else_is_a_download(self):
        response = self._get(self.pdf['url'])
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response['Content-Disposition'].startswith('attachment'))
        self.assertIn('doc.pdf', response['Content-Disposition'])
        self.assertEqual(response['X-Content-Type-Options'], 'nosniff')

    def test_attack_the_old_public_media_route_is_gone(self):
        stored = File.objects.get(id=self.png['id']).file.name
        response = self.client.__class__().get('/media/' + stored)
        self.assertEqual(response.status_code, 404)

    def test_attack_forged_tampered_and_expired_tokens(self):
        token = signed_path(self.png['url']).split('/')[3]
        anon = self.client.__class__()
        self.assertEqual(anon.get('/media/f/' + token[:-3] + 'abc/').status_code, 404)
        self.assertEqual(anon.get('/media/f/garbage/').status_code, 404)
        with override_settings(MEDIA_SIGNING_MAX_AGE=-1):
            self.assertEqual(anon.get('/media/f/' + token + '/').status_code, 404)

    def test_attack_token_issued_to_a_user_without_access_does_not_work(self):
        token = make_media_token('f', self.png['id'], self.stranger.id)
        self.assertEqual(self.client.__class__().get(f'/media/f/{token}/').status_code, 404)
        no_user = make_media_token('f', self.png['id'])
        self.assertEqual(self.client.__class__().get(f'/media/f/{no_user}/').status_code, 404)

    def test_access_is_rechecked_when_the_file_is_deleted(self):
        url = self.png['url']
        self.assertEqual(self._get(url).status_code, 200)
        self.assertEqual(self.client.delete(f'/api/files/{self.png["id"]}/').status_code, 204)
        self.assertEqual(self._get(url).status_code, 404)

    def test_only_get_and_head(self):
        self.assertEqual(self.client.__class__().post(signed_path(self.png['url'])).status_code, 405)

    def test_files_attached_to_a_board_are_readable_by_board_members_only(self):
        board = Board.objects.create(owner=self.owner, name='B', content={})
        BoardShare.objects.create(board=board, user=self.stranger, permission='view')
        attached = upload(self.client, png_upload('b.png'), board=board.id).data
        listing = self.as_user(self.stranger).post('/api/files/resolve/', {'refs': [attached['ref']]}, format='json').data['urls']
        self.assertIsNotNone(listing[attached['ref']])
        # the board member's signed URL works without credentials
        self.assertEqual(self.client.__class__().get(signed_path(listing[attached['ref']])).status_code, 200)
        outsider = self.as_user(make_user('outsider')).post('/api/files/resolve/', {'refs': [attached['ref']]}, format='json').data['urls']
        self.assertIsNone(outsider[attached['ref']])


class ResolveTests(BaseAPITestCase):
    """The browser exchanges stored references (and old public URLs) for short-lived signed URLs."""

    def setUp(self):
        super().setUp()
        self.owner = make_user('owner')
        self.viewer = make_user('viewer')
        self.mallory = make_user('mallory')
        self.client = self.as_user(self.owner)
        self.file = upload(self.client, png_upload('pic.png')).data
        self.board = Board.objects.create(owner=self.owner, name='B', content={'blocks': [{'src': self.file['ref']}]})
        BoardShare.objects.create(board=self.board, user=self.viewer, permission='view')

    def _resolve(self, user, refs, board=None):
        body = {'refs': refs}
        if board is not None:
            body['board_id'] = board.id
        return self.as_user(user).post('/api/files/resolve/', body, format='json').data['urls']

    def test_embedded_file_is_readable_by_a_board_viewer(self):
        urls = self._resolve(self.viewer, [self.file['ref']], self.board)
        self.assertIn('/media/f/', urls[self.file['ref']])
        self.assertEqual(self.client.__class__().get(signed_path(urls[self.file['ref']])).status_code, 200)

    def test_without_the_board_there_is_no_access(self):
        self.assertIsNone(self._resolve(self.viewer, [self.file['ref']])[self.file['ref']])

    def test_attack_naming_a_file_in_my_own_board_does_not_grant_access(self):
        own = Board.objects.create(owner=self.mallory, name='M', content={'src': self.file['ref']})
        self.assertIsNone(self._resolve(self.mallory, [self.file['ref']], own)[self.file['ref']])
        # not even when the board is shared with the victim file's owner as a viewer
        self.assertIsNone(self._resolve(self.mallory, [self.file['ref']], self.board)[self.file['ref']])

    def test_old_public_urls_are_still_resolved(self):
        stored = File.objects.get(id=self.file['id']).file.name
        legacy = f'http://localhost:8000/media/{stored}'
        self.assertIn('/media/f/', self._resolve(self.owner, [legacy])[legacy])

    def test_legacy_rows_with_original_file_names_are_served_safely(self):
        default_storage.save('uploads/old-evil.html', ContentFile(b'<script>alert(document.cookie)</script>'))
        default_storage.save('uploads/old-photo.png', ContentFile(png_bytes()))
        evil = File.objects.create(name='old-evil.html', file='uploads/old-evil.html', uploaded_by=self.owner,
                                   mime_type='text/html', file_size=10)
        photo = File.objects.create(name='old-photo.png', file='uploads/old-photo.png', uploaded_by=self.owner,
                                    mime_type='image/png', file_size=10)
        refs = ['http://x/media/uploads/old-evil.html', 'http://x/media/uploads/old-photo.png']
        urls = self._resolve(self.owner, refs)
        evil_response = self.client.__class__().get(signed_path(urls[refs[0]]))
        self.assertEqual(evil_response.status_code, 200)
        self.assertTrue(evil_response['Content-Disposition'].startswith('attachment'))
        self.assertEqual(evil_response['Content-Type'], 'application/octet-stream')
        self.assertEqual(evil_response['X-Content-Type-Options'], 'nosniff')
        photo_response = self.client.__class__().get(signed_path(urls[refs[1]]))
        self.assertEqual(photo_response['Content-Type'], 'image/png')
        self.assertTrue(photo_response['Content-Disposition'].startswith('inline'))
        del evil, photo

    def test_bad_input(self):
        r = self.as_user(self.owner).post('/api/files/resolve/', {'refs': 'nope'}, format='json')
        self.assertEqual(r.status_code, 400)
        urls = self._resolve(self.owner, ['', '../../etc/passwd', 'ocmedia:../x', 'https://evil.test/media/f/abc', 42])
        self.assertTrue(all(v is None for v in urls.values()))


class FileApiTests(BaseAPITestCase):
    """OC-11."""

    def setUp(self):
        super().setUp()
        self.owner = make_user('owner')
        self.other = make_user('other')
        self.client = self.as_user(self.owner)

    def test_attack_update_can_only_rename(self):
        created = upload(self.client, png_upload('a.png')).data
        victim_board = Board.objects.create(owner=self.other, name='victim', content={})
        replacement = SimpleUploadedFile('evil.html', b'<script>1</script>')
        response = self.client.patch(f'/api/files/{created["id"]}/', {
            'name': 'renamed.png', 'board': victim_board.id, 'is_deleted': True, 'file': replacement, 'file_size': 1,
        }, format='multipart')
        self.assertEqual(response.status_code, 200, response.content)
        stored = File.objects.get(id=created['id'])
        self.assertEqual(stored.name, 'renamed.png')
        self.assertIsNone(stored.board)
        self.assertFalse(stored.is_deleted)
        self.assertRegex(stored.file.name, r'\.png$')
        self.assertNotEqual(stored.file_size, 1)

    def test_attack_cannot_attach_a_file_to_someone_elses_board(self):
        victim_board = Board.objects.create(owner=self.other, name='victim', content={})
        response = upload(self.client, png_upload(), board=victim_board.id)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(File.objects.count(), 0)

    def test_view_only_member_cannot_attach_but_editor_can(self):
        board = Board.objects.create(owner=self.other, name='shared', content={})
        BoardShare.objects.create(board=board, user=self.owner, permission='view')
        self.assertEqual(upload(self.client, png_upload(), board=board.id).status_code, 400)
        BoardShare.objects.filter(board=board).update(permission='edit')
        self.assertEqual(upload(self.client, png_upload(), board=board.id).status_code, 201)

    def test_users_only_see_their_own_files(self):
        upload(self.as_user(self.other), png_upload())
        self.assertEqual(self.client.get('/api/files/').data, [])
        mine = upload(self.client, png_upload()).data
        self.assertEqual([f['id'] for f in self.client.get('/api/files/').data], [mine['id']])
        self.assertEqual(self.as_user(self.other).delete(f'/api/files/{mine["id"]}/').status_code, 404)

    def test_quota_is_enforced_and_charged(self):
        size = len(png_bytes())
        self.owner.storage_quota = size + 5
        self.owner.save()
        self.assertEqual(upload(self.client, png_upload()).status_code, 201)
        self.owner.refresh_from_db()
        self.assertEqual(self.owner.storage_used, size)
        second = upload(self.client, png_upload())
        self.assertEqual(second.status_code, 400)
        self.assertEqual(File.objects.count(), 1)
        self.owner.refresh_from_db()
        self.assertEqual(self.owner.storage_used, size)

    def test_storage_counter_updates_are_not_lost_when_two_requests_overlap(self):
        a = User.objects.get(pk=self.owner.pk)
        b = User.objects.get(pk=self.owner.pk)  # both hold the same stale value
        update_user_storage(a, 100)
        update_user_storage(b, 100)
        self.assertEqual(User.objects.get(pk=self.owner.pk).storage_used, 200)
        update_user_storage(a, -1000)
        self.assertEqual(User.objects.get(pk=self.owner.pk).storage_used, 0)  # never negative

    def test_system_wide_limit_is_enforced(self):
        from apps.accounts.models import SystemSettings
        SystemSettings.set_setting('systemStorageLimit', '0.00000001')  # about 10 bytes
        self.assertEqual(upload(self.client, png_upload()).status_code, 400)


class DeletionTests(BaseAPITestCase):
    def setUp(self):
        super().setUp()
        self.owner = make_user('owner')
        self.admin = make_user('boss', role='admin')
        self.client = self.as_user(self.owner)

    def _upload(self):
        data = upload(self.client, png_upload()).data
        return File.objects.get(id=data['id'])

    def test_soft_delete_removes_the_bytes_and_returns_the_space(self):
        stored = self._upload()
        name = stored.file.name
        self.assertTrue(default_storage.exists(name))
        with self.captureOnCommitCallbacks(execute=True):
            self.assertEqual(self.client.delete(f'/api/files/{stored.id}/').status_code, 204)
        self.assertFalse(default_storage.exists(name))
        stored.refresh_from_db()
        self.assertTrue(stored.is_deleted)
        self.owner.refresh_from_db()
        self.assertEqual(self.owner.storage_used, 0)

    def test_admin_delete_removes_the_bytes_and_notifies_the_owner(self):
        stored = self._upload()
        name = stored.file.name
        with self.captureOnCommitCallbacks(execute=True):
            response = self.as_user(self.admin).delete(f'/api/files/admin-delete/{stored.id}/', {'reason': 'Policy'}, format='json')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertFalse(default_storage.exists(name))
        self.owner.refresh_from_db()
        self.assertEqual(self.owner.storage_used, 0)
        self.assertEqual(self.owner.notifications.filter(type='file_deleted').count(), 1)

    def test_attack_non_admin_cannot_use_admin_delete(self):
        stored = self._upload()
        self.assertEqual(self.as_user(self.owner).delete(f'/api/files/admin-delete/{stored.id}/').status_code, 403)
        self.assertTrue(default_storage.exists(stored.file.name))

    def test_hard_delete_and_board_delete_remove_the_bytes(self):
        stored = self._upload()
        name = stored.file.name
        with self.captureOnCommitCallbacks(execute=True):
            stored.delete()
        self.assertFalse(default_storage.exists(name))
        board = Board.objects.create(owner=self.owner, name='B', content={})
        attached = File.objects.get(id=upload(self.client, png_upload(), board=board.id).data['id'])
        attached_name = attached.file.name
        with self.captureOnCommitCallbacks(execute=True):
            self.assertEqual(self.client.delete(f'/api/boards/{board.id}/').status_code, 204)
        self.assertFalse(default_storage.exists(attached_name))

    def test_deleting_twice_does_not_refund_twice(self):
        stored = self._upload()
        other = self._upload()
        self.client.delete(f'/api/files/{stored.id}/')
        self.assertEqual(self.client.delete(f'/api/files/{stored.id}/').status_code, 404)
        self.owner.refresh_from_db()
        self.assertEqual(self.owner.storage_used, other.file_size)


class RefFormatTests(BaseAPITestCase):
    def test_stored_reference_format(self):
        user = make_user('u')
        data = upload(self.as_user(user), png_upload()).data
        self.assertTrue(re.match(r'^ocmedia:uploads/[0-9a-f]{32}\.png$', data['ref']))

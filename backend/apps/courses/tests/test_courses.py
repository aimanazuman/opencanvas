"""OC-03 (enrollments), OC-07 (course permissions, bulk import ownership), OC-10 (bulk import mail), OC-19 (bulk limits)."""
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings

from apps.courses.models import Course, Enrollment
from apps.testutils import BaseAPITestCase, make_user

User = get_user_model()


class EnrollmentTests(BaseAPITestCase):
    """OC-03."""

    def setUp(self):
        super().setUp()
        self.teacher = make_user('teach', role='lecturer')
        self.other_teacher = make_user('teach2', role='lecturer')
        self.course = Course.objects.create(name='Paid course', code='P1', instructor=self.teacher, sections=['A', 'B'])
        self.student = make_user('stud')
        self.friend = make_user('friend')

    def test_attack_student_cannot_enrol_themselves_or_a_friend(self):
        client = self.as_user(self.student)
        for body in ({'student': self.student.id, 'course': self.course.id},
                     {'student': self.friend.id, 'course': self.course.id, 'section': 'A'}):
            response = client.post('/api/courses/enrollments/', body, format='json')
            self.assertEqual(response.status_code, 403)
        self.assertEqual(Enrollment.objects.count(), 0)

    def test_attack_student_cannot_edit_or_delete_their_enrollment(self):
        enrollment = Enrollment.objects.create(student=self.student, course=self.course, status='dropped')
        client = self.as_user(self.student)
        self.assertEqual(client.patch(f'/api/courses/enrollments/{enrollment.id}/', {'status': 'active'}, format='json').status_code, 403)
        self.assertEqual(client.delete(f'/api/courses/enrollments/{enrollment.id}/').status_code, 403)
        enrollment.refresh_from_db()
        self.assertEqual(enrollment.status, 'dropped')

    def test_attack_other_lecturer_cannot_manage_my_course_enrollments(self):
        enrollment = Enrollment.objects.create(student=self.student, course=self.course)
        client = self.as_user(self.other_teacher)
        response = client.post('/api/courses/enrollments/', {'student': self.friend.id, 'course': self.course.id}, format='json')
        self.assertEqual(response.status_code, 403)
        self.assertEqual(client.patch(f'/api/courses/enrollments/{enrollment.id}/', {'status': 'completed'}, format='json').status_code, 404)

    def test_attack_enrollment_cannot_be_moved_to_another_course_or_student(self):
        enrollment = Enrollment.objects.create(student=self.student, course=self.course)
        other_course = Course.objects.create(name='Other', code='O1', instructor=self.teacher)
        client = self.as_user(self.teacher)
        self.assertEqual(client.patch(f'/api/courses/enrollments/{enrollment.id}/', {'course': other_course.id}, format='json').status_code, 400)
        self.assertEqual(client.patch(f'/api/courses/enrollments/{enrollment.id}/', {'student': self.friend.id}, format='json').status_code, 400)

    def test_instructor_can_manage_enrollments(self):
        client = self.as_user(self.teacher)
        created = client.post('/api/courses/enrollments/', {'student': self.student.id, 'course': self.course.id, 'section': 'A'}, format='json')
        self.assertEqual(created.status_code, 201, created.content)
        eid = created.data['id']
        updated = client.patch(f'/api/courses/enrollments/{eid}/', {'status': 'completed', 'section': 'B'}, format='json')
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data['student_details']['email'], 'stud@example.test')  # the instructor sees it
        self.assertEqual(client.delete(f'/api/courses/enrollments/{eid}/').status_code, 204)

    def test_students_join_through_the_course_code_and_see_only_their_enrollments(self):
        client = self.as_user(self.student)
        joined = client.post('/api/courses/courses/join-by-code/', {'invite_code': self.course.invite_code, 'section': 'A'}, format='json')
        self.assertEqual(joined.status_code, 200, joined.content)
        Enrollment.objects.create(student=self.friend, course=self.course)
        listing = client.get('/api/courses/enrollments/').data
        self.assertEqual([e['student'] for e in listing], [self.student.id])
        self.assertNotIn('email', listing[0]['student_details'] if listing[0]['student_details'].get('id') != self.student.id else {})
        bad_section = self.as_user(self.friend).post('/api/courses/courses/join-by-code/', {'invite_code': self.course.invite_code, 'section': 'Z'}, format='json')
        self.assertEqual(bad_section.status_code, 400)

    def test_student_can_leave_a_course(self):
        Enrollment.objects.create(student=self.student, course=self.course)
        response = self.as_user(self.student).post(f'/api/courses/courses/{self.course.id}/unenroll/')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(Enrollment.objects.get(student=self.student).status, 'dropped')


class CoursePermissionTests(BaseAPITestCase):
    """OC-07."""

    def setUp(self):
        super().setUp()
        self.teacher = make_user('teach', role='lecturer')
        self.rival = make_user('rival', role='lecturer')
        self.course = Course.objects.create(name='Mine', code='M1', instructor=self.teacher)
        # the rival can see the course because they are enrolled in it
        Enrollment.objects.create(student=self.rival, course=self.course, status='active')
        self.url = f'/api/courses/courses/{self.course.id}/'

    def test_attack_a_visible_but_foreign_course_cannot_be_changed_or_deleted(self):
        client = self.as_user(self.rival)
        self.assertEqual(client.get(self.url).status_code, 200)
        self.assertEqual(client.patch(self.url, {'name': 'Hacked'}, format='json').status_code, 403)
        self.assertEqual(client.put(self.url, {'name': 'Hacked', 'code': 'M1'}, format='json').status_code, 403)
        self.assertEqual(client.delete(self.url).status_code, 403)
        self.course.refresh_from_db()
        self.assertEqual(self.course.name, 'Mine')

    def test_students_cannot_change_courses(self):
        student = make_user('stud')
        Enrollment.objects.create(student=student, course=self.course, status='active')
        self.assertEqual(self.as_user(student).patch(self.url, {'name': 'x'}, format='json').status_code, 403)

    def test_instructor_and_admin_can_change_and_delete(self):
        self.assertEqual(self.as_user(self.teacher).patch(self.url, {'name': 'Renamed'}, format='json').status_code, 200)
        self.assertEqual(self.as_user(make_user('boss', role='admin')).patch(self.url, {'description': 'ok'}, format='json').status_code, 200)
        self.assertEqual(self.as_user(self.teacher).delete(self.url).status_code, 204)

    def test_create_course_needs_a_lecturer_and_sets_the_instructor(self):
        student = make_user('stud')
        self.assertEqual(self.as_user(student).post('/api/courses/courses/', {'name': 'N', 'code': 'N1'}, format='json').status_code, 403)
        ok = self.as_user(self.teacher).post('/api/courses/courses/', {'name': 'N', 'code': 'N1', 'instructor': self.rival.id}, format='json')
        self.assertEqual(ok.status_code, 201)
        self.assertEqual(Course.objects.get(code='N1').instructor_id, self.teacher.id)
        self.assertEqual(len(ok.data['invite_code']), 16)

    def test_invite_code_is_visible_to_the_instructor_only(self):
        self.assertIn('invite_code', self.as_user(self.teacher).get(self.url).data)
        self.assertNotIn('invite_code', self.as_user(self.rival).get(self.url).data)
        self.assertNotIn('email', self.as_user(self.rival).get(self.url).data['instructor_details'])


CSV = b'email,first_name,last_name,section\nnew.student@example.test,New,Student,A\n'


class BulkImportTests(BaseAPITestCase):
    """OC-07 (ownership), OC-10 (mail), OC-19 (limits)."""

    def setUp(self):
        super().setUp()
        self.teacher = make_user('teach', role='lecturer')
        self.rival = make_user('rival', role='lecturer')
        self.course = Course.objects.create(name='Mine', code='M1', instructor=self.teacher, sections=['A'])

    def _post(self, user, data=CSV, name='students.csv', **body):
        upload = SimpleUploadedFile(name, data, content_type='text/csv')
        return self.as_user(user).post('/api/accounts/bulk-import/', dict(body, file=upload), format='multipart')

    def test_attack_import_into_someone_elses_course_is_refused(self):
        response = self._post(self.rival, course_id=self.course.id)
        self.assertEqual(response.status_code, 403)
        self.assertFalse(User.objects.filter(email='new.student@example.test').exists())
        self.assertEqual(Enrollment.objects.filter(course=self.course).count(), 0)

    def test_instructor_import_works_and_mails_a_link_not_a_password(self):
        response = self._post(self.teacher, course_id=self.course.id)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data['summary']['created'], 1)
        self.assertEqual(response.data['summary']['enrolled'], 1)
        user = User.objects.get(email='new.student@example.test')
        self.assertFalse(user.has_usable_password())
        self.assertFalse(user.email_verified)
        self.assertEqual(user.role, 'student')
        message = mail.outbox[0]
        self.assertIn('/forgot-password?uid=', message.body)
        self.assertNotIn('Password:', message.body)

    def test_unknown_course_is_404(self):
        self.assertEqual(self._post(self.teacher, course_id=99999).status_code, 404)

    def test_students_cannot_use_bulk_import(self):
        self.assertEqual(self._post(make_user('stud')).status_code, 403)

    def test_existing_accounts_are_not_revealed_to_lecturers(self):
        make_user('already', email='new.student@example.test')
        response = self._post(self.teacher, course_id=self.course.id)
        self.assertEqual(response.status_code, 200)
        existing = response.data['details']['existing'][0]
        self.assertNotIn('username', existing)
        admin_response = self._post(make_user('boss', role='admin'), course_id=self.course.id)
        self.assertEqual(admin_response.data['details']['existing'][0]['username'], 'already')

    def test_attack_oversized_or_huge_files_are_refused(self):
        with override_settings(BULK_IMPORT_MAX_BYTES=50):
            self.assertEqual(self._post(self.teacher).status_code, 400)
        rows = b'email\n' + b''.join(b'u%d@example.test\n' % i for i in range(20))
        with override_settings(BULK_IMPORT_MAX_ROWS=5):
            response = self._post(self.teacher, data=rows)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(User.objects.filter(email__startswith='u').count(), 0)

    def test_parse_errors_do_not_leak_internals(self):
        response = self._post(self.teacher, data=b'\xff\xfe\x00bad', name='x.csv')
        self.assertEqual(response.status_code, 400)
        self.assertNotIn('codec', str(response.data))

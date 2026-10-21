"""OC-04 (share IDOR), OC-08 (board permissions), OC-09 (templates, quiz data, collaborator data, course choice)."""
from django.contrib.auth import get_user_model
from django.test import override_settings

from apps.accounts.models import SystemSettings
from apps.boards.models import Board, BoardShare
from apps.courses.models import Course, Enrollment
from apps.files.storage import calculate_content_size
from apps.testutils import BaseAPITestCase, make_user

User = get_user_model()


def make_board(owner, name='Board', **kwargs):
    kwargs.setdefault('content', {'blocks': []})
    return Board.objects.create(owner=owner, name=name, **kwargs)


class ShareIdorTests(BaseAPITestCase):
    """OC-04."""

    def setUp(self):
        super().setUp()
        self.owner = make_user('owner')
        self.mallory = make_user('mallory')
        self.friend = make_user('friend')
        self.mal_board = make_board(self.mallory, 'mallory board')
        self.secret = make_board(self.owner, 'secret board')
        self.share = BoardShare.objects.create(board=self.mal_board, user=self.friend, permission='view')

    def test_attack_share_cannot_be_moved_to_another_board(self):
        client = self.as_user(self.mallory)
        response = client.patch(f'/api/boards/shares/{self.share.id}/', {'board': self.secret.id, 'permission': 'edit'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.share.refresh_from_db()
        self.assertEqual(self.share.board_id, self.mal_board.id)
        self.assertEqual(self.share.permission, 'view')

    def test_attack_share_user_cannot_be_swapped(self):
        client = self.as_user(self.mallory)
        response = client.patch(f'/api/boards/shares/{self.share.id}/', {'user': self.mallory.id}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_attack_non_owner_cannot_touch_a_share(self):
        client = self.as_user(self.owner)  # owns a different board, not this share's
        self.assertEqual(client.patch(f'/api/boards/shares/{self.share.id}/', {'permission': 'edit'}, format='json').status_code, 404)
        self.assertEqual(client.delete(f'/api/boards/shares/{self.share.id}/').status_code, 404)

    def test_attack_cannot_share_someone_elses_board(self):
        client = self.as_user(self.mallory)
        response = client.post('/api/boards/shares/', {'board': self.secret.id, 'user': self.mallory.id, 'permission': 'edit'}, format='json')
        self.assertEqual(response.status_code, 403)
        self.assertFalse(BoardShare.objects.filter(board=self.secret).exists())

    def test_cannot_share_with_the_owner(self):
        response = self.as_user(self.mallory).post('/api/boards/shares/', {'board': self.mal_board.id, 'user': self.mallory.id, 'permission': 'view'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_owner_can_still_share_and_change_permission(self):
        client = self.as_user(self.mallory)
        other = make_user('other')
        created = client.post('/api/boards/shares/', {'board': self.mal_board.id, 'user': other.id, 'permission': 'view'}, format='json')
        self.assertEqual(created.status_code, 201, created.content)
        self.assertEqual(created.data['user_details']['email'], 'other@example.test')  # the owner sees the address
        changed = client.patch(f'/api/boards/shares/{created.data["id"]}/', {'permission': 'edit'}, format='json')
        self.assertEqual(changed.status_code, 200)
        self.assertEqual(BoardShare.objects.get(id=created.data['id']).permission, 'edit')
        self.assertEqual(client.delete(f'/api/boards/shares/{created.data["id"]}/').status_code, 204)


class BoardPermissionTests(BaseAPITestCase):
    """OC-08."""

    def setUp(self):
        super().setUp()
        self.owner = make_user('owner')
        self.editor = make_user('editor')
        self.commenter = make_user('commenter')
        self.viewer = make_user('viewer')
        self.board = make_board(self.owner, 'Shared board', description='d')
        BoardShare.objects.create(board=self.board, user=self.editor, permission='edit')
        BoardShare.objects.create(board=self.board, user=self.commenter, permission='comment')
        BoardShare.objects.create(board=self.board, user=self.viewer, permission='view')
        self.url = f'/api/boards/{self.board.id}/'

    def test_attack_only_owner_or_instructor_can_delete(self):
        for user in (self.editor, self.commenter, self.viewer):
            self.assertEqual(self.as_user(user).delete(self.url).status_code, 403, user.username)
        self.assertTrue(Board.objects.filter(id=self.board.id).exists())

    def test_owner_can_delete(self):
        self.assertEqual(self.as_user(self.owner).delete(self.url).status_code, 204)

    def test_attack_editor_cannot_change_system_fields(self):
        course = Course.objects.create(name='C', code='C1', instructor=self.editor)
        client = self.as_user(self.editor)
        for body in ({'is_archived': True}, {'is_template': True}, {'course': course.id}, {'section': 'B'}, {'board_type': 'quiz'}):
            response = client.patch(self.url, body, format='json')
            self.assertIn(response.status_code, (200, 400, 403), (body, response.content))  # 200 = read-only field ignored
        self.board.refresh_from_db()
        self.assertFalse(self.board.is_archived)
        self.assertFalse(self.board.is_template)
        self.assertIsNone(self.board.course)
        self.assertEqual(self.board.section, '')

    def test_attack_commenter_cannot_rename_but_can_save_content(self):
        client = self.as_user(self.commenter)
        self.assertEqual(client.patch(self.url, {'name': 'Hijacked'}, format='json').status_code, 403)
        # the client sends the unchanged name back together with the content: that is fine
        ok = client.patch(self.url, {'name': 'Shared board', 'content': {'blocks': [{'comment': 'nice'}]}}, format='json')
        self.assertEqual(ok.status_code, 200, ok.content)

    def test_view_only_cannot_edit(self):
        self.assertEqual(self.as_user(self.viewer).patch(self.url, {'content': {'x': 1}}, format='json').status_code, 403)

    def test_editor_can_edit_and_the_owner_pays_for_the_storage(self):
        client = self.as_user(self.editor)
        response = client.patch(self.url, {'name': 'Renamed', 'content': {'text': 'A' * 500}}, format='json')
        self.assertEqual(response.status_code, 200, response.content)
        self.owner.refresh_from_db()
        self.editor.refresh_from_db()
        self.assertGreater(self.owner.storage_used, 500)
        self.assertEqual(self.editor.storage_used, 0)

    def test_owner_quota_limits_what_an_editor_can_add(self):
        self.owner.storage_quota = 100
        self.owner.save()
        response = self.as_user(self.editor).patch(self.url, {'content': {'text': 'A' * 500}}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_viewer_can_star_and_duplicate_but_the_copy_is_private(self):
        client = self.as_user(self.viewer)
        self.assertEqual(client.post(self.url + 'toggle_star/').status_code, 200)
        copy = client.post(self.url + 'duplicate/')
        self.assertEqual(copy.status_code, 201, copy.content)
        self.assertEqual(Board.objects.get(id=copy.data['id']).owner_id, self.viewer.id)

    def test_archive_and_restore_cannot_be_repeated_to_cheat_quota(self):
        client = self.as_user(self.owner)
        client.patch(self.url, {'content': {'text': 'A' * 300}}, format='json')
        self.owner.refresh_from_db()
        used = self.owner.storage_used
        self.assertGreater(used, 0)
        self.assertEqual(client.post(self.url + 'archive/').status_code, 200)
        self.assertEqual(client.post(self.url + 'archive/').status_code, 400)  # second archive would refund twice
        self.owner.refresh_from_db()
        self.assertEqual(self.owner.storage_used, 0)
        self.assertEqual(client.post(self.url + 'restore/').status_code, 200)
        self.assertEqual(client.post(self.url + 'restore/').status_code, 400)
        self.owner.refresh_from_db()
        self.assertEqual(self.owner.storage_used, used)

    def test_is_archived_cannot_be_flipped_through_patch(self):
        self.as_user(self.owner).patch(self.url, {'is_archived': True}, format='json')
        self.board.refresh_from_db()
        self.assertFalse(self.board.is_archived)

    def test_stranger_gets_404(self):
        self.assertEqual(self.as_user(make_user('stranger')).get(self.url).status_code, 404)


class CourseInstructorBoardTests(BaseAPITestCase):
    def test_course_instructor_can_delete_a_course_board_but_a_student_cannot(self):
        teacher = make_user('teach', role='lecturer')
        student = make_user('stud')
        course = Course.objects.create(name='C', code='C1', instructor=teacher)
        Enrollment.objects.create(student=student, course=course, status='active')
        board = make_board(student, 'student notes', course=course)
        other_student = make_user('stud2')
        Enrollment.objects.create(student=other_student, course=course, status='active')
        self.assertEqual(self.as_user(other_student).delete(f'/api/boards/{board.id}/').status_code, 403)
        self.assertEqual(self.as_user(teacher).delete(f'/api/boards/{board.id}/').status_code, 204)


class TemplateScopeTests(BaseAPITestCase):
    """OC-09: templates."""

    def setUp(self):
        super().setUp()
        self.admin = make_user('admin1', role='admin')
        self.alice = make_user('alice')
        self.bob = make_user('bob')
        self.official = make_board(self.admin, 'Official template', is_template=True)
        self.private = make_board(self.alice, 'Alice private template', is_template=True, content={'secret': 'alice-only'})

    def test_attack_other_peoples_templates_are_not_listed(self):
        names = [b['name'] for b in self.as_user(self.bob).get('/api/boards/templates/').data]
        self.assertIn('Official template', names)
        self.assertNotIn('Alice private template', names)

    def test_own_templates_are_listed_and_only_admins_can_publish_one(self):
        names = [b['name'] for b in self.as_user(self.alice).get('/api/boards/templates/').data]
        self.assertEqual(set(names), {'Official template', 'Alice private template'})
        response = self.as_user(self.bob).post('/api/boards/', {'name': 'Mine', 'content': {}, 'is_template': True}, format='json')
        self.assertEqual(response.status_code, 400)
        ok = self.as_user(self.admin).post('/api/boards/', {'name': 'Another', 'content': {}, 'is_template': True}, format='json')
        self.assertEqual(ok.status_code, 201)


class CollaboratorPrivacyTests(BaseAPITestCase):
    """OC-09: slim user data."""

    def test_emails_are_for_the_owner_only(self):
        owner = make_user('owner', email='owner.private@example.test')
        collab = make_user('collab', email='collab.private@example.test')
        viewer = make_user('viewer', email='viewer.private@example.test')
        board = make_board(owner)
        BoardShare.objects.create(board=board, user=collab, permission='edit')
        BoardShare.objects.create(board=board, user=viewer, permission='view')
        as_viewer = self.as_user(viewer).get(f'/api/boards/{board.id}/').data
        text = str(as_viewer)
        self.assertNotIn('owner.private', text)
        self.assertNotIn('collab.private', text)
        self.assertNotIn('storage_quota', text)
        self.assertEqual(as_viewer['collaborators'][0]['user_details']['username'] in ('collab', 'viewer'), True)
        as_owner = self.as_user(owner).get(f'/api/boards/{board.id}/').data
        self.assertEqual(as_owner['owner_details']['email'], 'owner.private@example.test')
        emails = {c['user_details'].get('email') for c in as_owner['collaborators']}
        self.assertEqual(emails, {'collab.private@example.test', 'viewer.private@example.test'})


class BoardCourseChoiceTests(BaseAPITestCase):
    """OC-09: a board can only be attached to a course the user teaches or is enrolled in."""

    def setUp(self):
        super().setUp()
        self.teacher = make_user('teach', role='lecturer')
        self.course = Course.objects.create(name='Secret course', code='S1', instructor=self.teacher)
        self.student = make_user('stud')

    def test_attack_attaching_to_a_foreign_course_is_refused(self):
        response = self.as_user(self.student).post('/api/boards/', {'name': 'x', 'content': {}, 'course': self.course.id}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Board.objects.filter(owner=self.student).exists())
        board = make_board(self.student)
        response = self.as_user(self.student).patch(f'/api/boards/{board.id}/', {'course': self.course.id}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.as_user(self.teacher).get(f'/api/boards/{board.id}/').status_code, 404)

    def test_enrolled_student_and_instructor_can_attach(self):
        Enrollment.objects.create(student=self.student, course=self.course, status='active')
        ok = self.as_user(self.student).post('/api/boards/', {'name': 'x', 'content': {}, 'course': self.course.id}, format='json')
        self.assertEqual(ok.status_code, 201, ok.content)
        ok = self.as_user(self.teacher).post('/api/boards/', {'name': 'y', 'content': {}, 'course': self.course.id}, format='json')
        self.assertEqual(ok.status_code, 201)


class QuizDataTests(BaseAPITestCase):
    """OC-09: quiz responses."""

    def setUp(self):
        super().setUp()
        self.teacher = make_user('teach', role='lecturer')
        self.course = Course.objects.create(name='Quiz course', code='Q1', instructor=self.teacher)
        self.s1 = make_user('s1')
        self.s2 = make_user('s2')
        for s in (self.s1, self.s2):
            Enrollment.objects.create(student=s, course=self.course, status='active')
        self.quiz = make_board(self.teacher, 'Quiz', course=self.course, board_type='quiz', content={
            'questions': [{'id': 'q1', 'correctAnswer': 1}], 'quizSettings': {'allowRetake': False}, 'responses': {}})
        self.url = f'/api/boards/{self.quiz.id}/'

    def _submit(self, user, response=None):
        return self.as_user(user).post(self.url + 'submit-quiz-response/', {'response': response or {'answers': {'q1': 1}, 'score': 1}}, format='json')

    def test_students_only_see_their_own_response_and_the_teacher_sees_all(self):
        self.assertEqual(self._submit(self.s1).status_code, 200)
        self.assertEqual(self._submit(self.s2).status_code, 200)
        as_s1 = self.as_user(self.s1).get(self.url).data['content']['responses']
        self.assertEqual(list(as_s1.keys()), [str(self.s1.id)])
        as_teacher = self.as_user(self.teacher).get(self.url).data['content']['responses']
        self.assertEqual(set(as_teacher.keys()), {str(self.s1.id), str(self.s2.id)})
        listing = self.as_user(self.s2).get('/api/boards/').data
        self.assertEqual(list(listing[0]['content']['responses'].keys()), [str(self.s2.id)])
        versions = self.as_user(self.s2).get(self.url + 'versions/').data
        self.assertEqual(versions, [])

    def test_attack_oversized_response_is_refused(self):
        with override_settings(QUIZ_RESPONSE_MAX_BYTES=500):
            response = self._submit(self.s1, {'answers': {'q1': 'A' * 5000}})
        self.assertEqual(response.status_code, 400)
        self.quiz.refresh_from_db()
        self.assertEqual(self.quiz.content['responses'], {})

    def test_retake_rule_and_non_members(self):
        self.assertEqual(self._submit(self.s1).status_code, 200)
        self.assertEqual(self._submit(self.s1).status_code, 400)
        self.assertEqual(self._submit(make_user('outsider')).status_code, 403)

    def test_attack_a_commenter_cannot_wipe_other_students_answers(self):
        self._submit(self.s1)
        commenter = make_user('commenter')
        BoardShare.objects.create(board=self.quiz, user=commenter, permission='comment')
        response = self.as_user(commenter).patch(self.url, {'content': {'questions': [], 'responses': {}}}, format='json')
        self.assertEqual(response.status_code, 200)
        self.quiz.refresh_from_db()
        self.assertIn(str(self.s1.id), self.quiz.content['responses'])

    def test_duplicate_does_not_copy_other_students_answers(self):
        self._submit(self.s1)
        self._submit(self.s2)
        copy = self.as_user(self.s2).post(self.url + 'duplicate/')
        self.assertEqual(copy.status_code, 201, copy.content)
        stored = Board.objects.get(id=copy.data['id'])
        self.assertEqual(list(stored.content['responses'].keys()), [str(self.s2.id)])
        self.assertIsNone(stored.course)


class QuizStorageTests(BaseAPITestCase):
    """Quiz answers are paid for by the quiz owner, through the same quota check as every other write."""

    def setUp(self):
        super().setUp()
        self.teacher = make_user('teach2', role='lecturer')
        self.student = make_user('stud2')
        content = {'questions': [{'id': 'q1', 'correctAnswer': 1}],
                   'quizSettings': {'allowRetake': False}, 'responses': {}}
        self.quiz = make_board(self.teacher, 'Quiz', board_type='quiz', content=content,
                               content_size=calculate_content_size(content))
        BoardShare.objects.create(board=self.quiz, user=self.student, permission='view')
        self.base_used = calculate_content_size(content)  # the quiz itself, charged to the owner
        User.objects.filter(pk=self.teacher.pk).update(storage_used=self.base_used)
        self.url = f'/api/boards/{self.quiz.id}/submit-quiz-response/'

    def _submit(self):
        return self.as_user(self.student).post(
            self.url, {'response': {'answers': {'q1': 1}, 'score': 1}}, format='json')

    def _set_owner_quota(self, quota):
        User.objects.filter(pk=self.teacher.pk).update(storage_quota=quota)

    def test_answers_are_charged_to_the_quiz_owner(self):
        response = self._submit()
        self.assertEqual(response.status_code, 200, response.content)
        self.teacher.refresh_from_db()
        self.student.refresh_from_db()
        self.quiz.refresh_from_db()
        self.assertGreater(self.quiz.content_size, 0)
        self.assertEqual(self.teacher.storage_used, self.quiz.content_size)
        self.assertEqual(self.student.storage_used, 0)

    def test_owner_over_quota_rejects_the_answer_and_saves_nothing(self):
        self._set_owner_quota(1)
        before = self.quiz.content_size
        response = self._submit()
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.data)
        self.assertIn("lecturer's storage is full", response.data['error'])
        self.quiz.refresh_from_db()
        self.assertEqual(self.quiz.content['responses'], {})
        self.assertEqual(self.quiz.content_size, before)
        self.teacher.refresh_from_db()
        self.assertEqual(self.teacher.storage_used, self.base_used)

    def test_rejected_student_can_answer_once_the_owner_has_space(self):
        self._set_owner_quota(1)
        self.assertEqual(self._submit().status_code, 400)
        self._set_owner_quota(5368709120)
        # The rejected attempt did not count as a submission, so the first real answer is still allowed.
        self.assertEqual(self._submit().status_code, 200)

    def test_system_limit_rejection_has_its_own_message(self):
        # The system total is 1 GB and nearly all of it is taken by someone else, so the owner's own quota still has
        # room but the system limit does not: the rejection must name the system limit.
        limit_bytes = 1024 ** 3
        SystemSettings.set_setting('systemStorageLimit', '1')
        other = make_user('hogger')
        User.objects.filter(pk=other.pk).update(storage_used=limit_bytes - 5)
        response = self._submit()
        self.assertEqual(response.status_code, 400)
        self.assertIn('system storage limit', response.data['error'])
        self.quiz.refresh_from_db()
        self.assertEqual(self.quiz.content['responses'], {})

    def test_answers_to_an_archived_quiz_are_not_charged(self):
        # An archived quiz is not counted (its content was given back when it was archived), so an answer is free.
        Board.objects.filter(pk=self.quiz.pk).update(is_archived=True)
        User.objects.filter(pk=self.teacher.pk).update(storage_used=0)
        self.assertEqual(self._submit().status_code, 200)
        self.teacher.refresh_from_db()
        self.assertEqual(self.teacher.storage_used, 0)


class InviteLinkTests(BaseAPITestCase):
    def test_joining_with_a_weaker_link_never_lowers_a_permission(self):
        owner = make_user('owner')
        user = make_user('user')
        board = make_board(owner)
        BoardShare.objects.create(board=board, user=user, permission='edit')
        link = self.as_user(owner).post(f'/api/boards/{board.id}/create_invite/', {'permission': 'view'}, format='json')
        self.assertEqual(link.status_code, 201)
        joined = self.as_user(user).post(f'/api/boards/join/{link.data["token"]}/')
        self.assertEqual(joined.status_code, 200)
        self.assertEqual(BoardShare.objects.get(board=board, user=user).permission, 'edit')

    def test_invalid_invite_parameters_are_400_not_500(self):
        owner = make_user('owner')
        board = make_board(owner)
        client = self.as_user(owner)
        self.assertEqual(client.post(f'/api/boards/{board.id}/create_invite/', {'permission': 'root'}, format='json').status_code, 400)
        self.assertEqual(client.post(f'/api/boards/{board.id}/create_invite/', {'expires_in': 'abc'}, format='json').status_code, 400)
        self.assertEqual(client.post(f'/api/boards/{board.id}/create_invite/', {'max_uses': 'abc'}, format='json').status_code, 400)

    def test_max_uses_is_enforced(self):
        owner = make_user('owner')
        board = make_board(owner)
        link = self.as_user(owner).post(f'/api/boards/{board.id}/create_invite/', {'max_uses': 1}, format='json').data
        self.assertEqual(self.as_user(make_user('a')).post(f'/api/boards/join/{link["token"]}/').status_code, 200)
        self.assertEqual(self.as_user(make_user('b')).post(f'/api/boards/join/{link["token"]}/').status_code, 410)

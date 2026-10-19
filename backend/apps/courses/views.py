from django.db.models import Q
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.accounts.audit import log_action
from apps.accounts.emails import send_course_enrolled_email
from apps.accounts.notifications import notify_course_enrolled
from apps.accounts.permissions import IsLecturerOrAdmin as IsLecturerOrAdminRole
from opencanvas.throttling import with_defaults, JoinByCodeThrottle
from .models import Course, Enrollment, generate_invite_code
from .permissions import IsLecturerOrAdmin, IsCourseInstructorOrAdmin
from .serializers import CourseSerializer, EnrollmentSerializer


class CourseViewSet(viewsets.ModelViewSet):
    # Creating needs a lecturer/admin; changing or deleting a course needs its instructor (or an admin).
    permission_classes = [permissions.IsAuthenticated, IsLecturerOrAdmin, IsCourseInstructorOrAdmin]
    serializer_class = CourseSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Course.objects.all()
        elif user.role == 'lecturer':
            return Course.objects.filter(Q(instructor=user) | Q(enrollments__student=user)).distinct()
        else:  # student
            return Course.objects.filter(enrollments__student=user, enrollments__status='active')

    def perform_create(self, serializer):
        instance = serializer.save(instructor=self.request.user)
        log_action(self.request.user, 'create', 'course', instance.id, {'name': instance.name, 'code': instance.code}, self.request)

    def perform_update(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'update', 'course', instance.id, {'name': instance.name}, self.request)

    def perform_destroy(self, instance):
        log_action(self.request.user, 'delete', 'course', instance.id, {'name': instance.name}, self.request)
        instance.delete()

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def enroll(self, request, pk=None):
        """Enroll current user in course"""
        course = self.get_object()
        enrollment, created = Enrollment.objects.get_or_create(
            student=request.user,
            course=course,
            defaults={'status': 'active', 'section': request.data.get('section', '')}
        )

        if not created and enrollment.status != 'active':
            enrollment.status = 'active'
            enrollment.save()
            created = True  # treat re-activation as a new enrollment for notifications

        if created:
            notify_course_enrolled(enrollment)
            send_course_enrolled_email(request.user, course)

        log_action(request.user, 'create', 'enrollment', course.id, {'course': course.name}, request)
        return Response({
            'status': 'enrolled',
            'message': 'Successfully enrolled in course'
        })

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def unenroll(self, request, pk=None):
        """Unenroll current user from course"""
        course = self.get_object()
        try:
            enrollment = Enrollment.objects.get(student=request.user, course=course)
            enrollment.status = 'dropped'
            enrollment.save()
            log_action(request.user, 'delete', 'enrollment', course.id, {'course': course.name}, request)
            return Response({'status': 'unenrolled', 'message': 'Successfully unenrolled from course'})
        except Enrollment.DoesNotExist:
            return Response({'error': 'Not enrolled in this course'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='regenerate-invite')
    def regenerate_invite(self, request, pk=None):
        """Regenerate invite code for a course (instructor/admin only)"""
        course = self.get_object()
        if course.instructor != request.user and request.user.role != 'admin':
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        course.invite_code = generate_invite_code()
        course.save(update_fields=['invite_code'])
        return Response({'invite_code': course.invite_code})

    @action(detail=False, methods=['post'], url_path='join-by-code', permission_classes=[permissions.IsAuthenticated],
            throttle_classes=with_defaults(JoinByCodeThrottle))
    def join_by_code(self, request):
        """Join a course using invite code"""
        raw_code = request.data.get('invite_code', '')
        invite_code = raw_code.strip().upper() if isinstance(raw_code, str) else ''
        section = request.data.get('section', '')
        section = section.strip()[:50] if isinstance(section, str) else ''
        if not invite_code or len(invite_code) > 20:
            return Response({'error': 'Invite code is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            course = Course.objects.get(invite_code=invite_code)
        except Course.DoesNotExist:
            return Response({'error': 'Invalid invite code'}, status=status.HTTP_404_NOT_FOUND)
        if not course.is_active:
            return Response({'error': 'This course is no longer active'}, status=status.HTTP_400_BAD_REQUEST)
        if section and course.sections and section not in course.sections:
            return Response({'error': 'That section does not exist in this course'}, status=status.HTTP_400_BAD_REQUEST)

        enrollment, created = Enrollment.objects.get_or_create(
            student=request.user,
            course=course,
            defaults={'status': 'active', 'section': section}
        )
        if not created and enrollment.status != 'active':
            enrollment.status = 'active'
            if section:
                enrollment.section = section
            enrollment.save()
            created = True

        if created:
            notify_course_enrolled(enrollment)
            send_course_enrolled_email(request.user, course)

        log_action(request.user, 'create', 'enrollment', course.id, {'course': course.name, 'method': 'invite_code'}, request)
        return Response({
            'status': 'enrolled',
            'message': f'Successfully enrolled in {course.name}',
            'course': CourseSerializer(course, context={'request': request}).data
        })

    @action(detail=False, methods=['get'], url_path='invite-info/(?P<invite_code>[^/.]+)', permission_classes=[permissions.IsAuthenticated],
            throttle_classes=with_defaults(JoinByCodeThrottle))
    def invite_info(self, request, invite_code=None):
        """Get course info from invite code (without enrolling)"""
        try:
            course = Course.objects.get(invite_code=invite_code.upper())
        except Course.DoesNotExist:
            return Response({'error': 'Invalid invite code'}, status=status.HTTP_404_NOT_FOUND)
        return Response(CourseSerializer(course, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='bulk-enroll')
    def bulk_enroll(self, request, pk=None):
        """Bulk enroll multiple students in a course (instructor/admin only)"""
        course = self.get_object()
        if course.instructor != request.user and request.user.role != 'admin':
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        student_ids = request.data.get('student_ids', [])
        section = request.data.get('section', '')
        section = section.strip()[:50] if isinstance(section, str) else ''
        if not student_ids or not isinstance(student_ids, list):
            return Response({'error': 'No students provided'}, status=status.HTTP_400_BAD_REQUEST)
        if len(student_ids) > 500:
            return Response({'error': 'Too many students at once (limit 500)'}, status=status.HTTP_400_BAD_REQUEST)

        from django.contrib.auth import get_user_model
        User = get_user_model()

        enrolled = []
        already_enrolled = []
        errors = []

        for sid in student_ids:
            try:
                student = User.objects.get(id=sid, is_active=True)
                enrollment, created = Enrollment.objects.get_or_create(
                    student=student,
                    course=course,
                    defaults={'status': 'active', 'section': section}
                )
                if created:
                    enrolled.append(sid)
                    notify_course_enrolled(enrollment)
                    try:
                        send_course_enrolled_email(student, course)
                    except Exception:
                        pass
                elif enrollment.status != 'active':
                    enrollment.status = 'active'
                    if section:
                        enrollment.section = section
                    enrollment.save()
                    enrolled.append(sid)
                else:
                    already_enrolled.append(sid)
            except (User.DoesNotExist, ValueError, TypeError):
                errors.append(sid)

        log_action(request.user, 'create', 'enrollment', course.id,
                   {'course': course.name, 'method': 'bulk_enroll', 'count': len(enrolled)}, request)

        return Response({
            'enrolled': len(enrolled),
            'already_enrolled': len(already_enrolled),
            'errors': len(errors),
            'message': f'{len(enrolled)} student(s) enrolled successfully'
        })

    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """Get analytics for a course (instructor/admin only)"""
        course = self.get_object()

        if course.instructor != request.user and request.user.role != 'admin':
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        total_active = course.enrollments.filter(status='active').count()

        analytics_data = {
            'total_students': total_active,
            'total_boards': course.boards.count(),
            'enrollments_by_status': {
                'active': total_active,
                'dropped': course.enrollments.filter(status='dropped').count(),
                'completed': course.enrollments.filter(status='completed').count(),
            },
            'recent_enrollments': EnrollmentSerializer(
                course.enrollments.order_by('-enrolled_at')[:5],
                many=True
            ).data
        }

        return Response(analytics_data)




class EnrollmentViewSet(viewsets.ModelViewSet):
    """Enrollments.

    Everyone signed in can READ the enrollments they are allowed to see (a student sees their own, a lecturer sees
    those of their courses, an admin sees all). Only the instructor of the course (or an admin) can create, change
    or remove an enrollment. Students join courses through the course invite code (join-by-code) and leave through
    the course "unenroll" action, never by writing enrollments directly.
    """
    serializer_class = EnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsLecturerOrAdminRole()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            queryset = Enrollment.objects.all()
        elif user.role == 'lecturer':
            queryset = Enrollment.objects.filter(course__instructor=user)
        else:
            queryset = Enrollment.objects.filter(student=user)

        course_id = self.request.query_params.get('course')
        if course_id:
            try:
                queryset = queryset.filter(course_id=int(course_id))
            except (TypeError, ValueError):
                queryset = queryset.none()

        return queryset.select_related('student', 'course', 'course__instructor')

    def _require_instructor(self, course):
        user = self.request.user
        if course.instructor_id != user.id and user.role != 'admin':
            raise PermissionDenied('Only the instructor of this course can manage its enrollments.')

    def perform_create(self, serializer):
        course = serializer.validated_data['course']
        self._require_instructor(course)
        instance = serializer.save()
        notify_course_enrolled(instance)
        log_action(self.request.user, 'create', 'enrollment', course.id,
                   {'course': course.name, 'method': 'enrollment_api'}, self.request)

    def perform_update(self, serializer):
        self._require_instructor(serializer.instance.course)
        instance = serializer.save()
        log_action(self.request.user, 'update', 'enrollment', instance.course_id,
                   {'course': instance.course.name, 'status': instance.status}, self.request)

    def perform_destroy(self, instance):
        self._require_instructor(instance.course)
        log_action(self.request.user, 'delete', 'enrollment', instance.course_id,
                   {'course': instance.course.name}, self.request)
        instance.delete()

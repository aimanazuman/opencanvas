from rest_framework import serializers

from apps.accounts.serializers import PublicUserSerializer
from .models import Course, Enrollment


class EnrollmentSerializer(serializers.ModelSerializer):
    student_details = PublicUserSerializer(source='student', read_only=True)
    course_details = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = ['id', 'student', 'student_details', 'course', 'course_details',
                  'status', 'section', 'enrolled_at', 'completed_at']
        read_only_fields = ['id', 'enrolled_at']

    def get_course_details(self, obj):
        return {
            'id': obj.course.id,
            'name': obj.course.name,
            'code': obj.course.code
        }

    def to_representation(self, instance):
        # The course's instructor (and administrators) see the student's e-mail address; the student sees their own.
        request = self.context.get('request')
        if request is not None and request.user.is_authenticated:
            viewer = request.user
            if viewer.role == 'admin' or instance.course.instructor_id == viewer.id or instance.student_id == viewer.id:
                self.fields['student_details'].context['show_email'] = True
            else:
                self.fields['student_details'].context['show_email'] = False
        return super().to_representation(instance)

    def validate(self, attrs):
        if self.instance is not None:
            # After creation the student and the course are fixed; only status, section and completion can change.
            if 'student' in attrs and attrs['student'].pk != self.instance.student_id:
                raise serializers.ValidationError({'student': 'The student of an enrollment cannot be changed.'})
            if 'course' in attrs and attrs['course'].pk != self.instance.course_id:
                raise serializers.ValidationError({'course': 'The course of an enrollment cannot be changed.'})
        else:
            course = attrs.get('course')
            student = attrs.get('student')
            if course is not None and student is not None and not student.is_active:
                raise serializers.ValidationError({'student': 'This user cannot be enrolled.'})
        return attrs


class CourseSerializer(serializers.ModelSerializer):
    instructor_name = serializers.CharField(source='instructor.username', read_only=True)
    instructor_details = PublicUserSerializer(source='instructor', read_only=True)
    student_count = serializers.SerializerMethodField()
    board_count = serializers.SerializerMethodField()
    is_enrolled = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = ['id', 'name', 'code', 'description', 'instructor', 'instructor_name',
                  'instructor_details', 'sections', 'invite_code', 'is_active', 'start_date', 'end_date',
                  'student_count', 'board_count', 'is_enrolled', 'created_at', 'updated_at']
        read_only_fields = ['id', 'instructor', 'invite_code', 'created_at', 'updated_at']

    def validate_sections(self, value):
        if not isinstance(value, list) or len(value) > 100 or not all(isinstance(s, str) and len(s) <= 50 for s in value):
            raise serializers.ValidationError('Sections must be a list of short names.')
        return value

    def get_student_count(self, obj):
        return obj.enrollments.filter(status='active').count()

    def get_board_count(self, obj):
        return obj.boards.count()

    def get_is_enrolled(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.enrollments.filter(student=request.user, status='active').exists()
        return False

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        viewer = request.user if request is not None and request.user.is_authenticated else None
        # The invite code is for the people who run the course.
        if viewer is None or not (viewer.role == 'admin' or instance.instructor_id == viewer.id):
            data.pop('invite_code', None)
        return data

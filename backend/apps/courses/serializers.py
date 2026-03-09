from rest_framework import serializers
from .models import Course, Enrollment
from apps.accounts.serializers import UserSerializer


class EnrollmentSerializer(serializers.ModelSerializer):
    student_details = UserSerializer(source='student', read_only=True)
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


class CourseSerializer(serializers.ModelSerializer):
    instructor_name = serializers.CharField(source='instructor.username', read_only=True)
    instructor_details = UserSerializer(source='instructor', read_only=True)
    student_count = serializers.SerializerMethodField()
    board_count = serializers.SerializerMethodField()
    is_enrolled = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = ['id', 'name', 'code', 'description', 'instructor', 'instructor_name',
                  'instructor_details', 'sections', 'invite_code', 'is_active', 'start_date', 'end_date',
                  'student_count', 'board_count', 'is_enrolled', 'created_at', 'updated_at']
        read_only_fields = ['id', 'instructor', 'invite_code', 'created_at', 'updated_at']

    def get_student_count(self, obj):
        return obj.enrollments.filter(status='active').count()

    def get_board_count(self, obj):
        return obj.boards.count()

    def get_is_enrolled(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.enrollments.filter(student=request.user, status='active').exists()
        return False

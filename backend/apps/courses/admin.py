from django.contrib import admin
from .models import Course, Enrollment


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'instructor', 'is_active', 'start_date', 'end_date', 'created_at']
    list_filter = ['is_active', 'start_date', 'end_date']
    search_fields = ['name', 'code', 'instructor__username']
    date_hierarchy = 'created_at'


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ['student', 'course', 'status', 'section', 'enrolled_at', 'completed_at']
    list_filter = ['status', 'course', 'enrolled_at']
    search_fields = ['student__username', 'course__name', 'course__code', 'section']
    date_hierarchy = 'enrolled_at'

import { useState, useEffect, useCallback } from 'react';
import { coursesApi, enrollmentsApi, boardsApi } from '../services/api';

export function useLecturerData() {
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCourses = useCallback(async () => {
    try {
      const res = await coursesApi.getAll();
      setCourses(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  }, []);

  const loadEnrollments = useCallback(async () => {
    try {
      const res = await enrollmentsApi.getAll();
      setEnrollments(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to load enrollments:', err);
    }
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([loadCourses(), loadEnrollments()]);
      setLoading(false);
    };
    loadAll();
  }, [loadCourses, loadEnrollments]);

  const totalStudents = courses.reduce((acc, c) => acc + (c.student_count || 0), 0);
  const totalBoards = courses.reduce((acc, c) => acc + (c.board_count || 0), 0);

  const getSectionsForCourse = (courseId) => {
    const courseEnrollments = enrollments.filter(e => e.course === courseId && e.status === 'active');
    const sectionMap = {};
    courseEnrollments.forEach(e => {
      const sec = e.section || 'Unassigned';
      if (!sectionMap[sec]) sectionMap[sec] = { name: sec, students: 0, enrollments: [] };
      sectionMap[sec].students++;
      sectionMap[sec].enrollments.push(e);
    });
    return Object.values(sectionMap);
  };

  const getStudentsList = () => {
    return enrollments.map(e => ({
      id: e.id,
      studentId: e.student_details?.id || e.student,
      name: e.student_details
        ? `${e.student_details.first_name || ''} ${e.student_details.last_name || ''}`.trim() || e.student_details.username
        : `User ${e.student}`,
      email: e.student_details?.email || '',
      courseCode: e.course_details?.code || '',
      courseId: e.course,
      section: e.section || '-',
      status: e.status,
      enrolledAt: e.enrolled_at,
    }));
  };

  return {
    courses,
    enrollments,
    loading,
    totalStudents,
    totalBoards,
    loadCourses,
    loadEnrollments,
    getSectionsForCourse,
    getStudentsList,
  };
}

export function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BookOpen, Users, CheckCircle } from 'lucide-react';
import { coursesApi } from '../services/api';
import AuthFrame from '../components/auth/AuthFrame';
import { ClassroomButton, ClassroomAlert, ClassroomField, ChalkBadge } from '../components/classroom';

export default function JoinCoursePage({ onNavigate }) {
  const { inviteCode } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [selectedSection, setSelectedSection] = useState('');

  useEffect(() => {
    if (!inviteCode) return;
    const loadInfo = async () => {
      try {
        const res = await coursesApi.getInviteInfo(inviteCode);
        setCourse(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Invalid invite code');
      } finally {
        setLoading(false);
      }
    };
    loadInfo();
  }, [inviteCode]);

  const handleJoin = async () => {
    setJoining(true);
    setError('');
    try {
      await coursesApi.joinByCode({ invite_code: inviteCode, section: selectedSection });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join course');
    } finally {
      setJoining(false);
    }
  };

  const goHome = () => onNavigate('dashboard');

  if (loading) {
    return (
      <AuthFrame titleId="join-course-title" title="Join course" subtitle="Checking your invite" onHome={goHome}>
        <div aria-busy="true" className="space-y-3">
          <p role="status" className="text-sm text-ink-2">Loading course info</p>
          <div aria-hidden="true" className="space-y-2">
            <span className="block h-4 w-2/3 rounded-sm bg-line" />
            <span className="block h-3 w-full rounded-sm bg-line" />
            <span className="block h-11 w-full rounded-sm bg-line" />
          </div>
        </div>
      </AuthFrame>
    );
  }

  if (error && !course) {
    return (
      <AuthFrame titleId="join-course-title" title="Invalid invite" onHome={goHome}>
        <div className="space-y-4">
          <ClassroomAlert>{error}</ClassroomAlert>
          <ClassroomButton variant="primary" className="w-full" onClick={() => onNavigate('dashboard')}>
            Go to Dashboard
          </ClassroomButton>
        </div>
      </AuthFrame>
    );
  }

  if (success) {
    return (
      <AuthFrame titleId="join-course-title" title="Successfully enrolled" onHome={goHome}>
        <div className="space-y-4">
          <ChalkBadge tone="success" icon={CheckCircle} label="Enrolled" />
          <p className="text-sm text-ink">
            You have been enrolled in <strong className="font-semibold">{course.name}</strong>
          </p>
          <ClassroomButton variant="primary" className="w-full" onClick={() => onNavigate('courses')}>
            View My Courses
          </ClassroomButton>
        </div>
      </AuthFrame>
    );
  }

  const sections = course.sections || [];

  return (
    <AuthFrame
      titleId="join-course-title"
      title="Join course"
      subtitle="You've been invited to join a course"
      onHome={goHome}
    >
      <div className="space-y-4">
        <div className="space-y-2 rounded border border-line bg-surface p-3">
          <ChalkBadge tone="neutral" icon={BookOpen} label={course.code} />
          <div>
            <p className="text-xs text-ink-2">Course name</p>
            <p className="text-base font-semibold text-ink">{course.name}</p>
          </div>
          {course.description && (
            <div>
              <p className="text-xs text-ink-2">Description</p>
              <p className="text-sm text-ink">{course.description}</p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-sm text-ink-2">
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              {course.instructor_name}
            </span>
            {course.student_count != null && <span>{course.student_count} students</span>}
          </div>
        </div>

        {sections.length > 0 && (
          <ClassroomField
            as="select"
            label="Select section (optional)"
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
          >
            <option value="">No section</option>
            {sections.map(s => (
              <option key={s} value={s}>Section {s}</option>
            ))}
          </ClassroomField>
        )}

        {error && <ClassroomAlert>{error}</ClassroomAlert>}

        {course.is_enrolled ? (
          <div className="space-y-3">
            <ChalkBadge tone="success" icon={CheckCircle} label="You are already enrolled in this course" />
            <ClassroomButton variant="primary" className="w-full" onClick={() => onNavigate('courses')}>
              Go to My Courses
            </ClassroomButton>
          </div>
        ) : (
          <ClassroomButton variant="primary" className="w-full" loading={joining} onClick={handleJoin}>
            {joining ? 'Joining...' : 'Join Course'}
          </ClassroomButton>
        )}
      </div>
    </AuthFrame>
  );
}

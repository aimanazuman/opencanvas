import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import StudentDashboardPage from './student/StudentDashboardPage';

export default function DashboardPage({ onNavigate }) {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === 'lecturer') {
      onNavigate('lecturer');
    } else if (user?.role === 'admin') {
      onNavigate('admin');
    }
  }, [user, onNavigate]);

  // Students and guests use the student dashboard
  if (user?.role === 'lecturer' || user?.role === 'admin') {
    return null; // Will redirect via useEffect
  }

  return <StudentDashboardPage onNavigate={onNavigate} />;
}

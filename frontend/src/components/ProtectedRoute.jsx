import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requireRole }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!loading && isAuthenticated && requireRole && user?.role !== requireRole && user?.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [loading, isAuthenticated, requireRole, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div role="status" aria-label="Loading" className="animate-spin rounded-full h-4 w-4 border-2 border-line border-t-accent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requireRole && user?.role !== requireRole && user?.role !== 'admin') {
    return null;
  }

  return children;
};

export default ProtectedRoute;

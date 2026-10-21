import React, { useState } from 'react';
import { User, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AuthFrame from '../components/auth/AuthFrame';
import { IconField, PasswordField, Notice } from '../components/auth/AuthFields';
import { ClassroomButton } from '../components/classroom';

function LecturerLoginPage({ onNavigate }) {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(username, password);
      if (result.success) {
        if (result.user?.role === 'lecturer' || result.user?.role === 'admin') {
          onNavigate('lecturer');
        } else {
          setError('Access denied. This portal is for lecturers only.');
        }
      } else {
        setError(result.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame
      flavour="staff"
      titleId="lecturer-login-title"
      title="Staff room"
      subtitle="Access your teaching dashboard"
      onHome={() => onNavigate('home')}
    >
      {/* Error message */}
      {error && <Notice tone="error" icon={AlertCircle}>{error}</Notice>}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <IconField
          id="lecturer-username"
          label="Username"
          icon={User}
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          required
        />

        <PasswordField
          id="lecturer-password"
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
          visible={showPassword}
          onToggle={() => setShowPassword(!showPassword)}
        />

        <ClassroomButton type="submit" variant="primary" disabled={loading} className="w-full">
          {loading ? 'Please wait...' : 'Sign In'}
        </ClassroomButton>
      </form>

      {/* Back link */}
      <div className="mt-5 text-center">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="inline-flex min-h-[44px] items-center gap-1 px-2 text-sm text-ink-2 hover:text-accent-700"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          <span>Back to Home</span>
        </button>
      </div>
    </AuthFrame>
  );
}

export default LecturerLoginPage;

import React, { useState } from 'react';
import { User, ArrowRight, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import AuthFrame from '../components/auth/AuthFrame';
import { IconField, PasswordField, Notice } from '../components/auth/AuthFields';
import { ClassroomButton } from '../components/classroom';

function LoginPage({ onNavigate }) {
  const { login, loginAsGuest } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationNeeded, setVerificationNeeded] = useState(null); // email string if needs verification

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setVerificationNeeded(null);
    setLoading(true);

    try {
      const result = await login(username, password);
      if (result.success) {
        const role = result.user?.role;
        if (role === 'admin') {
          onNavigate('admin');
        } else if (role === 'lecturer') {
          onNavigate('lecturer');
        } else {
          onNavigate('dashboard');
        }
      } else if (result.requires_verification) {
        setVerificationNeeded(result.email);
      } else {
        setError(result.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestAccess = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await loginAsGuest();
      if (result.success) {
        onNavigate('dashboard');
      } else {
        setError(result.error || 'Guest login failed. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const [resendStatus, setResendStatus] = useState(''); // '' | 'sending' | 'sent'

  const handleResendVerification = async () => {
    if (!verificationNeeded || resendStatus === 'sending') return;
    setResendStatus('sending');
    try {
      await authApi.resendVerification(verificationNeeded);
      setError('');
      setResendStatus('sent');
    } catch {
      setError('Failed to resend verification email.');
      setResendStatus('');
    }
  };

  return (
    <AuthFrame
      titleId="login-title"
      title="Welcome back to class"
      subtitle="Sign in to pick up your boards."
      onHome={() => onNavigate('home')}
    >
      {/* Verification needed notice */}
      {verificationNeeded && (
        <Notice tone="warning" icon={Mail}>
          <p className="font-medium">Email not verified</p>
          <p className="mt-1">Please check your email ({verificationNeeded}) and click the verification link.</p>
          {resendStatus === 'sent' ? (
            <p className="mt-2 flex items-center gap-1 font-medium">
              <CheckCircle className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              <span>Verification email sent! Check your inbox.</span>
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendStatus === 'sending'}
              className="mt-1 inline-flex min-h-[44px] items-center font-medium text-accent-700 underline underline-offset-2 hover:text-accent-800 disabled:opacity-50"
            >
              {resendStatus === 'sending' ? 'Sending...' : 'Resend verification email'}
            </button>
          )}
        </Notice>
      )}

      {/* Error message */}
      {error && <Notice tone="error" icon={AlertCircle}>{error}</Notice>}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <IconField
          id="login-username"
          label="Username"
          icon={User}
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="johndoe"
          required
        />

        <PasswordField
          id="login-password"
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
          visible={showPassword}
          onToggle={() => setShowPassword(!showPassword)}
        />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onNavigate('forgot-password')}
            className="inline-flex min-h-[44px] items-center px-1 text-sm font-medium text-accent-700 underline-offset-4 hover:underline"
          >
            Forgot password?
          </button>
        </div>

        <ClassroomButton type="submit" variant="primary" disabled={loading} className="w-full">
          {loading ? 'Signing in...' : 'Sign In'}
        </ClassroomButton>
      </form>

      {/* Divider */}
      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-line" aria-hidden="true" />
        <span className="text-sm text-ink-2">or</span>
        <div className="h-px flex-1 bg-line" aria-hidden="true" />
      </div>

      {/* Continue as Guest */}
      <ClassroomButton variant="secondary" onClick={handleGuestAccess} disabled={loading} className="w-full">
        <span>Continue as Guest</span>
        <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
      </ClassroomButton>
      <p className="mt-2 text-center text-xs text-ink-2">Limited features available in guest mode</p>

      {/* Link to Sign Up */}
      <div className="mt-5 text-center text-sm text-ink-2">
        Don't have an account?{' '}
        <button
          type="button"
          onClick={() => onNavigate('signup')}
          className="inline-flex min-h-[44px] items-center px-1 font-semibold text-accent-700 hover:underline"
        >
          Sign up
        </button>
      </div>
    </AuthFrame>
  );
}

export default LoginPage;

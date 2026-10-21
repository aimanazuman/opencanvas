import React, { useState } from 'react';
import { Mail, User, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AuthFrame from '../components/auth/AuthFrame';
import { IconField, PasswordField, Notice } from '../components/auth/AuthFields';
import { ClassroomButton, ClassroomField } from '../components/classroom';

function SignUpPage({ onNavigate }) {
  const { register, loginAsGuest } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [resendStatus, setResendStatus] = useState(''); // '' | 'sending' | 'sent'

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const result = await register({
        username,
        email,
        password,
        password2: password,
        first_name: firstName,
        last_name: lastName,
      });
      if (result.success) {
        if (result.requires_verification) {
          setVerificationSent(true);
        } else {
          onNavigate('dashboard');
        }
      } else {
        const errors = result.errors;
        const message = errors?.username?.[0] || errors?.email?.[0] || errors?.password?.[0] || errors?.non_field_errors?.[0] || 'Registration failed.';
        setError(message);
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

  // Verification sent screen
  if (verificationSent) {
    return (
      <AuthFrame titleId="signup-sent-title" title="Check your email" onHome={() => onNavigate('home')}>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-tint">
            <Mail className="h-8 w-8 text-success" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <p className="mb-2 text-ink-2">We've sent a verification link to:</p>
          <p className="mb-6 break-all font-semibold text-ink">{email}</p>
          <p className="mb-6 text-sm text-ink-2">
            Click the link in the email to verify your account. If you don't see it, check your spam folder.
          </p>
          <ClassroomButton variant="primary" onClick={() => onNavigate('login')} className="w-full">
            Go to Sign In
          </ClassroomButton>
          <p className="mt-4 text-xs text-ink-2">
            Didn't receive the email?{' '}
            {resendStatus === 'sent' ? (
              <span className="font-medium text-success">Verification email sent!</span>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  if (resendStatus === 'sending') return;
                  setResendStatus('sending');
                  try {
                    const { authApi } = await import('../services/api');
                    await authApi.resendVerification(email);
                    setError('');
                    setResendStatus('sent');
                  } catch {
                    setError('Failed to resend. Please try again.');
                    setResendStatus('');
                  }
                }}
                disabled={resendStatus === 'sending'}
                className="inline-flex min-h-[44px] items-center px-1 font-medium text-accent-700 underline underline-offset-2 hover:text-accent-800 disabled:opacity-50"
              >
                {resendStatus === 'sending' ? 'Sending...' : 'Resend'}
              </button>
            )}
          </p>
        </div>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      titleId="signup-title"
      title="Join the class"
      subtitle="Create your account to start a board."
      onHome={() => onNavigate('home')}
    >
      {/* Error message */}
      {error && <Notice tone="error" icon={AlertCircle}>{error}</Notice>}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <IconField
          id="signup-username"
          label="Username"
          icon={User}
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="johndoe"
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <ClassroomField
            id="signup-first-name"
            label="First Name"
            type="text"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="John"
            required
          />
          <ClassroomField
            id="signup-last-name"
            label="Last Name"
            type="text"
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
            required
          />
        </div>

        <IconField
          id="signup-email"
          label="Email"
          icon={Mail}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="john@example.com"
          required
        />

        <PasswordField
          id="signup-password"
          label="Password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a password"
          required
          visible={showPassword}
          onToggle={() => setShowPassword(!showPassword)}
        />

        <PasswordField
          id="signup-confirm-password"
          label="Confirm Password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm your password"
          required
          visible={showConfirmPassword}
          onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
        />

        <ClassroomButton type="submit" variant="primary" disabled={loading} className="w-full">
          {loading ? 'Creating account...' : 'Create Account'}
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

      {/* Link to Sign In */}
      <div className="mt-5 text-center text-sm text-ink-2">
        Already have an account?{' '}
        <button
          type="button"
          onClick={() => onNavigate('login')}
          className="inline-flex min-h-[44px] items-center px-1 font-semibold text-accent-700 hover:underline"
        >
          Sign in
        </button>
      </div>
    </AuthFrame>
  );
}

export default SignUpPage;

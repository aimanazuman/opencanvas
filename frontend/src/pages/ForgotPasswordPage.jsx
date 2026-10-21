import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Mail, KeyRound, Info, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { authApi } from '../services/api';
import AuthFrame from '../components/auth/AuthFrame';
import { IconField, PasswordField, Notice } from '../components/auth/AuthFields';
import { ClassroomButton, ChalkBadge } from '../components/classroom';

function ForgotPasswordPage({ onNavigate }) {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1); // 1 = enter email, 2 = enter token + new password
  const [email, setEmail] = useState('');
  const [uid, setUid] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const uidParam = searchParams.get('uid');
    const tokenParam = searchParams.get('token');
    if (uidParam && tokenParam) {
      setUid(uidParam);
      setToken(tokenParam);
      setStep(2);
      setSuccess('Your reset link is valid. Enter your new password below.');
    }
  }, []);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await authApi.requestPasswordReset(email);
      setSuccess(response.data.message || 'If an account exists with this email, a reset link has been sent.');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.email?.[0] || 'Failed to send reset request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.confirmPasswordReset({
        uid,
        token,
        new_password: newPassword,
        new_password2: confirmPassword,
      });
      setSuccess(response.data.message || 'Your password has been reset successfully. You can now sign in with your new password.');
    } catch (err) {
      const data = err.response?.data;
      const message = data?.error || data?.new_password?.[0] || data?.token?.[0] || 'Failed to reset password. The token may be invalid or expired.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const resetDone = success.includes('reset successfully');

  return (
    <AuthFrame
      titleId="forgot-title"
      title={step === 1 ? 'Reset your password' : 'Enter your new password'}
      subtitle={step === 1 ? "We'll send a reset link to your email." : 'Use the details from your reset link.'}
      onHome={() => onNavigate('home')}
    >
      {/* Error message */}
      {error && <Notice tone="error" icon={AlertCircle}>{error}</Notice>}

      {/* Success message */}
      {success && <Notice tone="success" icon={CheckCircle}>{success}</Notice>}

      {/* Step 1: Enter Email */}
      {step === 1 && (
        <form onSubmit={handleRequestReset} className="space-y-4">
          <IconField
            id="forgot-email"
            label="Email Address"
            icon={Mail}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
            hint="Enter the email address associated with your account."
            required
          />

          <ClassroomButton type="submit" variant="primary" disabled={loading} className="w-full">
            {loading ? 'Sending...' : 'Send Reset Link'}
          </ClassroomButton>
        </form>
      )}

      {/* Step 2: Enter UID + Token + New Password */}
      {step === 2 && !resetDone && (
        <form onSubmit={handleConfirmReset} className="space-y-4">
          <IconField
            id="forgot-uid"
            label="User ID (UID)"
            icon={KeyRound}
            type="text"
            autoComplete="off"
            value={uid}
            onChange={(e) => setUid(e.target.value)}
            placeholder="UID from reset link"
            required
          />

          <IconField
            id="forgot-token"
            label="Reset Token"
            icon={KeyRound}
            type="text"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Token from reset link"
            required
          />

          <div>
            <PasswordField
              id="forgot-new-password"
              label="New Password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
              minLength={8}
              visible={showPassword}
              onToggle={() => setShowPassword(!showPassword)}
            />
            <div className="mt-2">
              <ChalkBadge label="At least 8 characters" icon={Info} />
            </div>
          </div>

          <PasswordField
            id="forgot-confirm-password"
            label="Confirm Password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            required
            minLength={8}
            visible={showConfirmPassword}
            onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
          />

          <ClassroomButton type="submit" variant="primary" disabled={loading} className="w-full">
            {loading ? 'Resetting...' : 'Reset Password'}
          </ClassroomButton>

          <button
            type="button"
            onClick={() => { setStep(1); setError(''); setSuccess(''); }}
            className="inline-flex min-h-[44px] w-full items-center justify-center text-sm text-ink-2 underline underline-offset-2 hover:text-accent-700"
          >
            Didn't receive a token? Try again
          </button>
        </form>
      )}

      {/* Success state with login redirect */}
      {resetDone && (
        <ClassroomButton variant="primary" onClick={() => onNavigate('login')} className="w-full">
          Go to Sign In
        </ClassroomButton>
      )}

      {/* Back to login link */}
      <div className="mt-5 text-center">
        <button
          type="button"
          onClick={() => onNavigate('login')}
          className="inline-flex min-h-[44px] items-center gap-1 px-2 text-sm text-ink-2 hover:text-accent-700"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          <span>Back to Sign In</span>
        </button>
      </div>
    </AuthFrame>
  );
}

export default ForgotPasswordPage;

import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { authApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import AuthFrame from '../components/auth/AuthFrame';
import { ClassroomButton } from '../components/classroom';

// Board title per state. The card keeps the original state messages.
const BOARD = {
  verifying: { title: 'Checking your link', subtitle: undefined },
  success: { title: 'Email verified', subtitle: 'Welcome to the class' },
  error: { title: 'Link not valid', subtitle: undefined },
};

function VerifyEmailPage({ onNavigate }) {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const { refreshUser } = useAuth();
  const verifyAttempted = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('No verification token provided.');
      return;
    }

    // Prevent double-execution in React StrictMode
    if (verifyAttempted.current) return;
    verifyAttempted.current = true;

    const verify = async () => {
      try {
        const res = await authApi.verifyEmail(token);
        // Store tokens from verification response
        if (res.data.tokens) {
          localStorage.setItem('access_token', res.data.tokens.access);
          localStorage.setItem('refresh_token', res.data.tokens.refresh);
          await refreshUser();
        }
        setStatus('success');
      } catch (err) {
        setStatus('error');
        setErrorMsg(err.response?.data?.error || 'Verification failed. The link may be invalid or expired.');
      }
    };

    verify();
  }, [token, refreshUser]);

  const board = BOARD[status] || BOARD.verifying;

  return (
    <AuthFrame
      titleId="verify-title"
      title={board.title}
      subtitle={board.subtitle}
      onHome={() => onNavigate('home')}
    >
      <div className="text-center" aria-live="polite">
        {status === 'verifying' && (
          <>
            <Loader2 className="mx-auto mb-4 h-12 w-12 text-accent-600 motion-safe:animate-spin" strokeWidth={1.5} aria-hidden="true" />
            <h2 className="mb-2 text-xl font-semibold text-ink">Verifying your email...</h2>
            <p className="text-sm text-ink-2">Please wait a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-tint">
              <CheckCircle className="h-8 w-8 text-success" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-ink">Email Verified!</h2>
            <p className="mb-6 text-ink-2">Your account has been verified. You're now logged in.</p>
            <ClassroomButton variant="primary" onClick={() => onNavigate('dashboard')} className="w-full">
              Go to Dashboard
            </ClassroomButton>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-danger-tint">
              <XCircle className="h-8 w-8 text-danger" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-ink">Verification Failed</h2>
            <p role="alert" className="mb-6 text-ink-2">{errorMsg}</p>
            <ClassroomButton variant="primary" onClick={() => onNavigate('login')} className="w-full">
              Go to Sign In
            </ClassroomButton>
          </>
        )}
      </div>
    </AuthFrame>
  );
}

export default VerifyEmailPage;

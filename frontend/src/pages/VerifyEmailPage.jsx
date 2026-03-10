import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Palette } from 'lucide-react';
import { authApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function VerifyEmailPage({ onNavigate }) {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const { refreshUser } = useAuth();

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('No verification token provided.');
      return;
    }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
        <div className="inline-flex items-center space-x-2 cursor-pointer mb-8" onClick={() => onNavigate('home')}>
          <Palette className="h-8 w-8 text-indigo-600" />
          <span className="text-2xl font-bold text-gray-900">OpenCanvas</span>
        </div>

        {status === 'verifying' && (
          <>
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying your email...</h2>
            <p className="text-gray-500 text-sm">Please wait a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Email Verified!</h2>
            <p className="text-gray-600 mb-6">Your account has been verified. You're now logged in.</p>
            <button
              onClick={() => onNavigate('dashboard')}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition shadow-md"
            >
              Go to Dashboard
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Verification Failed</h2>
            <p className="text-gray-600 mb-6">{errorMsg}</p>
            <button
              onClick={() => onNavigate('login')}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition shadow-md"
            >
              Go to Sign In
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default VerifyEmailPage;

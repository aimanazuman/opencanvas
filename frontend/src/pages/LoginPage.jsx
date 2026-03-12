import React, { useState } from 'react';
import { Palette, Lock, Eye, EyeOff, User, ArrowRight, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 cursor-pointer" onClick={() => onNavigate('home')}>
            <Palette className="h-10 w-10 text-indigo-600" />
            <span className="text-3xl font-bold text-gray-900">OpenCanvas</span>
          </div>
          <p className="text-gray-600 mt-2">Welcome back!</p>
        </div>

        {/* Verification needed banner */}
        {verificationNeeded && (
          <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
            <div className="flex items-start space-x-2">
              <Mail className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Email not verified</p>
                <p className="mt-1 text-amber-700">Please check your email ({verificationNeeded}) and click the verification link.</p>
                {resendStatus === 'sent' ? (
                  <p className="mt-2 text-green-600 font-medium text-xs">Verification email sent! Check your inbox.</p>
                ) : (
                  <button
                    onClick={handleResendVerification}
                    disabled={resendStatus === 'sending'}
                    className="mt-2 text-indigo-600 hover:underline font-medium text-xs disabled:opacity-50"
                  >
                    {resendStatus === 'sending' ? 'Sending...' : 'Resend verification email'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="johndoe"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="button" onClick={() => onNavigate('forgot-password')} className="text-sm text-indigo-600 hover:underline">
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-4 text-sm text-gray-500">or</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        {/* Continue as Guest */}
        <button
          onClick={handleGuestAccess}
          disabled={loading}
          className="w-full border-2 border-gray-300 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Continue as Guest</span>
          <ArrowRight className="h-4 w-4" />
        </button>
        <p className="text-xs text-gray-500 text-center mt-2">
          Limited features available in guest mode
        </p>

        {/* Link to Sign Up */}
        <div className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <button
            onClick={() => onNavigate('signup')}
            className="text-indigo-600 font-semibold hover:underline"
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

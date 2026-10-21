import React, { useState } from 'react';
import { User, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { sanitizeText } from '../utils/sanitize';
import { ClassroomAlert, ClassroomButton, ClassroomDialog } from './classroom';
import { IconField, PasswordField } from './auth/AuthFields';

const GuestRegistrationModal = ({ isOpen, onClose, onSuccess }) => {
  const { convertGuest } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (password !== password2) {
      setErrors({ password2: ['Passwords do not match.'] });
      return;
    }

    setLoading(true);
    try {
      const result = await convertGuest({ username: sanitizeText(username), email, password, password2 });
      if (result.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrors(result.errors || { non_field_errors: ['Registration failed.'] });
      }
    } catch (err) {
      setErrors({ non_field_errors: ['An unexpected error occurred.'] });
    } finally {
      setLoading(false);
    }
  };

  const getFieldError = (field) => {
    if (errors[field]) {
      return Array.isArray(errors[field]) ? errors[field][0] : errors[field];
    }
    return null;
  };

  const generalError = getFieldError('non_field_errors') || getFieldError('error');

  return (
    <ClassroomDialog
      titleId="guest-registration-title"
      title="Create your account to continue"
      onClose={onClose}
      closeLabel="Close"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {generalError && <ClassroomAlert>{generalError}</ClassroomAlert>}

        <IconField
          id="guest-username"
          icon={User}
          label="Username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Choose a username"
          required
          error={getFieldError('username')}
        />

        <IconField
          id="guest-email"
          icon={Mail}
          type="email"
          label="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          error={getFieldError('email')}
        />

        <PasswordField
          id="guest-password"
          label="Password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a password"
          required
          visible={showPassword}
          onToggle={() => setShowPassword(!showPassword)}
          error={getFieldError('password')}
        />

        <PasswordField
          id="guest-password2"
          label="Confirm Password"
          autoComplete="new-password"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          placeholder="Confirm your password"
          required
          visible={showPassword2}
          onToggle={() => setShowPassword2(!showPassword2)}
          error={getFieldError('password2')}
        />

        <ClassroomButton
          type="submit"
          variant="primary"
          disabled={loading}
          className="w-full font-semibold"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </ClassroomButton>
      </form>
    </ClassroomDialog>
  );
};

export default GuestRegistrationModal;

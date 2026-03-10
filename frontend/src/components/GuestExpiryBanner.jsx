import React, { useState, useEffect } from 'react';
import { Clock, X, UserPlus, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import GuestRegistrationModal from './GuestRegistrationModal';

const GuestExpiryBanner = () => {
  const { user, isGuest } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(null);

  useEffect(() => {
    if (!isGuest || !user?.guest_expires_at) return;

    const updateCountdown = () => {
      const expiresAt = new Date(user.guest_expires_at);
      const now = new Date();
      const diffMs = expiresAt - now;
      const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      setDaysRemaining(days);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [isGuest, user?.guest_expires_at]);

  if (!isGuest || dismissed || daysRemaining === null) return null;

  const isUrgent = daysRemaining <= 7;
  const isCritical = daysRemaining <= 3;

  const bgColor = isCritical
    ? 'bg-red-600'
    : isUrgent
    ? 'bg-amber-500'
    : 'bg-blue-600';

  const textColor = 'text-white';

  return (
    <>
      <div className={`${bgColor} ${textColor} px-4 py-3 relative z-50`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            {isCritical ? (
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <Clock className="w-5 h-5 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">
              {daysRemaining === 0 ? (
                'Your guest account expires today! Create an account now to keep your boards.'
              ) : daysRemaining === 1 ? (
                'Your guest account expires tomorrow! Create an account to keep your boards.'
              ) : (
                <>
                  Your guest account will be deleted in{' '}
                  <span className="font-bold">{daysRemaining} days</span>.
                  Create an account to make it permanent.
                </>
              )}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowModal(true)}
              className="bg-white text-gray-900 px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-100 transition flex items-center space-x-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Account</span>
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 hover:bg-white/20 rounded transition"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <GuestRegistrationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => setShowModal(false)}
      />
    </>
  );
};

export default GuestExpiryBanner;

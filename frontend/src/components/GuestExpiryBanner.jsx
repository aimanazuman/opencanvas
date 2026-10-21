import React, { useState, useEffect } from 'react';
import { Clock, X, UserPlus, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import GuestRegistrationModal from './GuestRegistrationModal';
import { StickyNote } from './classroom';

// Sticky-note colour and icon colour per urgency. Static lookups so Tailwind keeps every class.
// The message text and icon carry the urgency; colour is never the only signal.
const NOTE_BY_LEVEL = { normal: 'azure', urgent: 'amber', critical: 'orange' };
const ICON_BY_LEVEL = { normal: 'text-accent', urgent: 'text-warning', critical: 'text-danger' };

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
  const level = isCritical ? 'critical' : isUrgent ? 'urgent' : 'normal';

  return (
    <>
      <StickyNote color={NOTE_BY_LEVEL[level]} className="relative z-50 px-4 py-3">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {isCritical ? (
              <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${ICON_BY_LEVEL[level]}`} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <Clock className={`h-5 w-5 flex-shrink-0 ${ICON_BY_LEVEL[level]}`} strokeWidth={1.5} aria-hidden="true" />
            )}
            <p className="text-sm font-medium text-ink">
              {daysRemaining === 0 ? (
                'Your guest account expires today! Create an account now to keep your boards.'
              ) : daysRemaining === 1 ? (
                'Your guest account expires tomorrow! Create an account to keep your boards.'
              ) : (
                <>
                  Your guest account will be deleted in{' '}
                  <span className="font-semibold">{daysRemaining} days</span>.
                  Create an account to make it permanent.
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="btn-motion inline-flex min-h-[44px] items-center gap-1.5 rounded bg-chalk-board px-4 text-sm font-semibold text-chalk-ink hover:bg-chalk-deep"
            >
              <UserPlus className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              <span>Create Account</span>
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-1 text-ink hover:bg-black/10"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
        </div>
      </StickyNote>

      <GuestRegistrationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => setShowModal(false)}
      />
    </>
  );
};

export default GuestExpiryBanner;

import React from 'react';
import { Palette, GraduationCap, Shield } from 'lucide-react';
import { ClassroomShell, ChalkboardHeader, ChalkBadge, PaperPanel } from '../classroom';
import cx from '../classroom/cx';

// Flavours share every component; only the badge, the card stripe and the underline differ.
// Static lookup: Tailwind only sees literal class names.
const FLAVOUR = {
  student: { underline: true, badge: null, stripe: '' },
  staff: { underline: true, badge: { label: 'Lecturers and staff', icon: GraduationCap }, stripe: 'bg-note-green' },
  office: { underline: false, badge: { label: 'Administrators only', icon: Shield }, stripe: 'bg-line-strong' },
};

/**
 * Shared frame for the sign-in, sign-up, verify and reset pages.
 * Wall background (ClassroomShell), a small chalkboard banner with the page title, then one white
 * PaperPanel card holding the form. The card rises in on mount (motion-safe only).
 * `onHome` keeps the old logo behaviour: it navigates to the home route.
 */
export default function AuthFrame({ flavour = 'student', titleId, title, subtitle, onHome, children }) {
  const f = FLAVOUR[flavour] || FLAVOUR.student;
  const badge = f.badge;
  return (
    <ClassroomShell as="main" aria-labelledby={titleId} className="flex flex-col items-center justify-center px-4 py-8 md:py-12">
      <div className="w-full max-w-[360px] motion-safe:animate-oc-rise">
        <div className="mb-4 flex justify-center">
          <button
            type="button"
            onClick={onHome}
            className="btn-motion inline-flex min-h-[44px] items-center gap-2 rounded px-2 text-lg font-semibold text-ink hover:text-accent-700"
          >
            <Palette className="h-6 w-6 text-accent-600" strokeWidth={1.5} aria-hidden="true" />
            <span>OpenCanvas</span>
          </button>
        </div>

        <ChalkboardHeader
          size="banner"
          titleId={titleId}
          title={title}
          subtitle={subtitle}
          underline={f.underline}
          actions={
            badge ? (
              <ChalkBadge label={badge.label} icon={badge.icon} surface="chalk" />
            ) : undefined
          }
        />

        <PaperPanel tone="white" padded={false} className="relative mt-4 overflow-hidden p-5 md:p-6">
          {f.stripe && <span aria-hidden="true" className={cx('absolute inset-x-0 top-0 h-1.5', f.stripe)} />}
          {children}
        </PaperPanel>
      </div>
    </ClassroomShell>
  );
}

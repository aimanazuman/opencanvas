import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { X } from 'lucide-react';
import cx from './cx';

// Static lookup: Tailwind only sees literal class names.
const SIZE = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  wide: 'max-w-4xl',
};

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

// Open dialogs, outermost first. Only the top one handles Escape and Tab, so a dialog opened from another
// dialog (for example a document preview opened from a card) closes on its own and keeps focus inside itself.
const openStack = [];

/**
 * Modal dialog on a white panel. No chalkboard, cork or ruled lines inside: it holds form fields.
 * role="dialog" with aria-modal, labelled by `titleId` (the title element must carry that id).
 * Focus moves into the body on open and goes back to the opener on close. Escape closes; Tab stays inside.
 * The title is hand-font, so pass short titles only (under 40 characters).
 * Optional: `dismissOnScrim` closes on a click on the backdrop; `bodyFlush` removes the body padding so the
 * children manage their own spacing; `headerActions` sit before the close button; `closeLabel` names the close button.
 */
export default function ClassroomDialog({
  titleId,
  title,
  titleClassName = 'text-ink',
  subtitle,
  onClose,
  size = 'md',
  footer,
  headerActions = null,
  closeLabel = 'Close dialog',
  dismissOnScrim = false,
  bodyFlush = false,
  className = '',
  children,
}) {
  const panelRef = useRef(null);
  const tokenRef = useRef({});
  const pressedOnScrimRef = useRef(false);
  // Keep the latest close handler without re-binding the key listener on every render.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  // Register on the stack, focus on open, and on close restore focus to the opener and leave the stack.
  // Layout effects run during the commit, so the dialog is registered before any key event can reach it.
  // (A passive effect can run after a key press that arrives right after the dialog appears.)
  useLayoutEffect(() => {
    const token = tokenRef.current;
    openStack.push(token);
    const opener = document.activeElement;
    const panel = panelRef.current;
    if (panel) {
      const body = panel.querySelector('[data-dialog-body]');
      const first = (body && body.querySelector(FOCUSABLE)) || panel.querySelector(FOCUSABLE);
      (first || panel).focus();
    }
    return () => {
      const index = openStack.indexOf(token);
      if (index !== -1) openStack.splice(index, 1);
      if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus();
    };
  }, []);

  useLayoutEffect(() => {
    function onKeyDown(event) {
      if (openStack[openStack.length - 1] !== tokenRef.current) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }
      const panel = panelRef.current;
      if (event.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll(FOCUSABLE));
      if (items.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const inside = panel.contains(document.activeElement);
      if (event.shiftKey && (!inside || document.activeElement === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || document.activeElement === last)) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // A scrim close needs the press and the click to both start on the scrim. A text selection dragged out of a
  // field onto the backdrop fires a click on the scrim, but its mousedown was inside the panel, so it does not close.
  const onScrimMouseDown = dismissOnScrim
    ? (event) => {
        pressedOnScrimRef.current = event.target === event.currentTarget;
      }
    : undefined;
  const onScrimClick = dismissOnScrim
    ? (event) => {
        const pressedOnScrim = pressedOnScrimRef.current;
        pressedOnScrimRef.current = false;
        if (pressedOnScrim && event.target === event.currentTarget) closeRef.current();
      }
    : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--scrim)] p-4 motion-safe:animate-oc-fade-in"
      onMouseDown={onScrimMouseDown}
      onClick={onScrimClick}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(
          'flex max-h-[90vh] w-full flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-modal motion-safe:animate-oc-rise',
          SIZE[size] || SIZE.md,
          className
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line p-4 md:p-5">
          <div className="min-w-0">
            <h2 id={titleId} className={cx('font-hand text-xl leading-tight', titleClassName)}>{title}</h2>
            {subtitle && <p className="mt-1 break-words text-sm text-ink-2">{subtitle}</p>}
          </div>
          <div className="flex flex-none items-center gap-1">
            {headerActions}
            <button
              type="button"
              onClick={() => closeRef.current()}
              aria-label={closeLabel}
              className="flex h-11 w-11 flex-none items-center justify-center rounded text-ink-2 hover:bg-surface-hover md:h-8 md:w-8"
            >
              <X className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div
          data-dialog-body
          className={bodyFlush ? 'min-h-0 flex-1 overflow-y-auto' : 'min-h-0 flex-1 space-y-4 overflow-y-auto p-4 md:p-5'}
        >
          {children}
        </div>
        {footer && <div className="flex flex-wrap gap-3 border-t border-line p-4 md:p-5">{footer}</div>}
      </div>
    </div>
  );
}

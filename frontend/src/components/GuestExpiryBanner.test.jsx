/* eslint-disable testing-library/no-node-access -- the tone is a class on the note root; no accessible query exposes it */
/**
 * GuestExpiryBanner: the day-count tone mapping (normal, urgent, critical), dismiss and the
 * create-account dialog with its labelled fields. Auth is replaced so the banner gets a fixed guest.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GuestExpiryBanner from './GuestExpiryBanner';
import { useAuth } from '../contexts/AuthContext';

jest.mock('../contexts/AuthContext', () => ({ useAuth: jest.fn() }));

const DAY_MS = 24 * 60 * 60 * 1000;

function asGuest(daysFromNow) {
  useAuth.mockReturnValue({
    user: { guest_expires_at: new Date(Date.now() + daysFromNow * DAY_MS).toISOString() },
    isGuest: true,
    convertGuest: jest.fn(),
  });
}

describe('GuestExpiryBanner', () => {
  test.each([
    [10.5, 'bg-note-azure', 'text-accent'],
    [5.5, 'bg-note-amber', 'text-warning'],
    [2.5, 'bg-note-orange', 'text-danger'],
  ])('%p days left uses the note tone for its level', (days, noteClass, iconClass) => {
    asGuest(days);
    const { container } = render(<GuestExpiryBanner />);
    const note = container.firstChild;
    expect(note).toHaveClass(noteClass);
    expect(note.querySelector(`.${iconClass}`)).not.toBeNull();
  });

  test('the countdown text uses the same day count the old logic produced', () => {
    asGuest(2.5);
    render(<GuestExpiryBanner />);
    expect(screen.getByText('3 days')).toBeInTheDocument();
  });

  test('dismiss hides the banner', () => {
    asGuest(10.5);
    render(<GuestExpiryBanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss banner' }));
    expect(screen.queryByText(/will be deleted in/)).not.toBeInTheDocument();
  });

  test('Create Account opens the labelled registration dialog', () => {
    asGuest(10.5);
    render(<GuestExpiryBanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    const dialog = screen.getByRole('dialog', { name: 'Create your account to continue' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('renders nothing for a signed-in member', () => {
    useAuth.mockReturnValue({ user: {}, isGuest: false, convertGuest: jest.fn() });
    const { container } = render(<GuestExpiryBanner />);
    expect(container).toBeEmptyDOMElement();
  });
});

/**
 * Guest registration on the classroom dialog: focus on open, Tab wraps inside, Escape closes, the password
 * mismatch error is shown on the field, and the submit wiring. Auth and sanitising are real or mocked as noted.
 */
import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import GuestRegistrationModal from './GuestRegistrationModal';
import { useAuth } from '../contexts/AuthContext';

jest.mock('../contexts/AuthContext', () => ({ useAuth: jest.fn() }));

let errorSpy;
let convertGuest;

beforeEach(() => {
  convertGuest = jest.fn().mockResolvedValue({ success: true });
  useAuth.mockReturnValue({ convertGuest });
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  const reactWarnings = errorSpy.mock.calls
    .map((c) => c.map(String).join(' '))
    .filter((t) => t.startsWith('Warning:') && !/not wrapped in act|ReactDOMTestUtils\.act/.test(t));
  errorSpy.mockRestore();
  expect(reactWarnings).toEqual([]);
});

function renderModal(props = {}) {
  const onClose = jest.fn();
  const onSuccess = jest.fn();
  render(<GuestRegistrationModal isOpen onClose={onClose} onSuccess={onSuccess} {...props} />);
  return { onClose, onSuccess };
}

describe('GuestRegistrationModal', () => {
  test('is a dialog named by its title, and focus starts on the username', () => {
    renderModal();
    const dialog = screen.getByRole('dialog', { name: 'Create your account to continue' });
    expect(within(dialog).getByLabelText('Username')).toHaveFocus();
  });

  test('Escape closes; Tab from the submit button wraps to the close control', () => {
    const { onClose } = renderModal();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    const submit = screen.getByRole('button', { name: 'Create Account' });
    submit.focus();
    fireEvent.keyDown(submit, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  test('a password mismatch is shown on the confirm field and nothing is sent', async () => {
    renderModal();
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'guest1' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'g@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret-one' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'secret-two' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toHaveAttribute('aria-invalid', 'true');
    expect(convertGuest).not.toHaveBeenCalled();
  });

  test('a successful conversion calls onSuccess and onClose', async () => {
    const { onClose, onSuccess } = renderModal();
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'guest1' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'g@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret-one' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'secret-one' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(convertGuest).toHaveBeenCalledWith(expect.objectContaining({ email: 'g@example.com', password: 'secret-one' }));
  });

  test('renders nothing when closed', () => {
    render(<GuestRegistrationModal isOpen={false} onClose={jest.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

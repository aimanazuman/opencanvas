/* eslint-disable testing-library/no-node-access, testing-library/no-container -- class checks for the motion-safe rise and the DOM class scan */
/**
 * Auth pages: accessible names tied to inputs, autocomplete hints, the password show/hide toggle,
 * error announcements, flavour badges, and the login handler wiring (context mocked).
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IconField, PasswordField, Notice } from './AuthFields';
import LoginPage from '../../pages/LoginPage';
import LecturerLoginPage from '../../pages/LecturerLoginPage';
import AdminLoginPage from '../../pages/AdminLoginPage';
import { brokenClassTokens } from '../../testUtils/domChecks';

const mockAuth = { login: jest.fn(), loginAsGuest: jest.fn() };

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

let errorSpy;

beforeEach(() => {
  mockAuth.login.mockReset();
  mockAuth.loginAsGuest.mockReset();
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  const real = errorSpy.mock.calls
    .map((c) => c.map(String).join(' '))
    .filter((t) => !t.includes('ReactDOMTestUtils.act` is deprecated'));
  errorSpy.mockRestore();
  expect(real).toEqual([]);
});

describe('AuthFields', () => {
  test('IconField ties its label to the input and passes autocomplete through', () => {
    render(<IconField id="u1" label="Username" autoComplete="username" value="" onChange={() => {}} />);
    const input = screen.getByLabelText('Username');
    expect(input).toHaveAttribute('id', 'u1');
    expect(input).toHaveAttribute('autocomplete', 'username');
    expect(input).toHaveClass('pl-10', 'min-h-[44px]');
  });

  test('PasswordField toggles between password and text with a named button', () => {
    const onToggle = jest.fn();
    const { rerender } = render(
      <PasswordField id="p1" label="Password" autoComplete="current-password" value="" onChange={() => {}} visible={false} onToggle={onToggle} />
    );
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle).toHaveAttribute('type', 'button');
    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(
      <PasswordField id="p1" label="Password" autoComplete="current-password" value="" onChange={() => {}} visible onToggle={onToggle} />
    );
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument();
  });

  test('Notice errors are announced as alerts, other tones as status', () => {
    const { rerender } = render(<Notice tone="error">Nope</Notice>);
    expect(screen.getByRole('alert')).toHaveTextContent('Nope');
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
    rerender(<Notice tone="success">Done</Notice>);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });
});

describe('LoginPage', () => {
  test('keeps the form contract: names, autocomplete, and the rise animation is motion-safe only', () => {
    const { container } = render(<LoginPage onNavigate={() => {}} />);
    expect(screen.getByLabelText('Username')).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByRole('main')).toHaveAttribute('aria-labelledby', 'login-title');
    expect(container.querySelector('.motion-safe\\:animate-oc-rise')).not.toBeNull();
    expect(brokenClassTokens(container)).toEqual([]);
  });

  test('a failed login shows the returned error in an alert', async () => {
    mockAuth.login.mockResolvedValue({ success: false, error: 'Wrong password' });
    render(<LoginPage onNavigate={() => {}} />);
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'ana' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong password');
    expect(mockAuth.login).toHaveBeenCalledWith('ana', 'secret');
  });

  test('a successful admin login navigates to the admin route', async () => {
    mockAuth.login.mockResolvedValue({ success: true, user: { role: 'admin' } });
    const onNavigate = jest.fn();
    render(<LoginPage onNavigate={onNavigate} />);
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'root' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('admin'));
  });
});

describe('staff and office flavours', () => {
  test('lecturer login uses the staff badge and Staff room title', () => {
    render(<LecturerLoginPage onNavigate={() => {}} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Staff room' })).toBeInTheDocument();
    expect(screen.getByText('Lecturers and staff')).toBeInTheDocument();
  });

  test('admin login uses the sober Office variant with no staff badge', () => {
    render(<AdminLoginPage onNavigate={() => {}} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Office' })).toBeInTheDocument();
    expect(screen.getByText('Administrators only')).toBeInTheDocument();
    expect(screen.queryByText('Lecturers and staff')).not.toBeInTheDocument();
  });
});

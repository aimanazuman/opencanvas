/* eslint-disable testing-library/no-node-access -- the chalk mark is a decorative aria-hidden span with no role or name */
/**
 * Navigation: destinations per role, the current page marker (aria-current plus the chalk mark),
 * the mobile bottom bar, the hamburger menu toggle, and the account menu (a disclosure: aria-expanded,
 * aria-controls, Escape returns focus to the trigger, an outside press closes it, sign-out still works).
 */
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import Navigation from './Navigation';
import { useAuth } from '../contexts/AuthContext';

jest.mock('../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('./NotificationDropdown', () => () => null);

function asUser(role, path = '/dashboard', { isGuest = false } = {}) {
  const logout = jest.fn().mockResolvedValue(undefined);
  useAuth.mockReturnValue({
    user: { role, first_name: 'Ada', last_name: 'Lovelace', username: 'ada' },
    logout,
    isGuest,
  });
  const onNavigate = jest.fn();
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <Navigation onNavigate={onNavigate} />
    </MemoryRouter>
  );
  return { ...view, onNavigate, logout };
}

function accountTrigger() {
  return screen.getByRole('button', { name: 'Ada Lovelace' });
}

describe('Navigation', () => {
  test('a student sees the student destinations and no lecturer or admin entry', () => {
    asUser('student');
    const primary = within(screen.getByRole('navigation', { name: 'Primary' }));
    ['Dashboard', 'Archive', 'Shared', 'Courses', 'Templates'].forEach((label) => {
      expect(primary.getByRole('button', { name: label })).toBeInTheDocument();
    });
    expect(primary.queryByRole('button', { name: 'Lecturer' })).not.toBeInTheDocument();
    expect(primary.queryByRole('button', { name: 'Admin' })).not.toBeInTheDocument();
  });

  test('the current page is marked with aria-current and a chalk underline', () => {
    asUser('student', '/templates');
    const current = screen.getAllByRole('button', { name: 'Templates' })[0];
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current.querySelector('span[aria-hidden="true"]')).not.toBeNull();
    const other = screen.getAllByRole('button', { name: 'Archive' })[0];
    expect(other).not.toHaveAttribute('aria-current');
    expect(other.querySelector('span[aria-hidden="true"]')).toBeNull();
  });

  test('the bottom bar navigates through onNavigate', () => {
    const { onNavigate } = asUser('lecturer');
    const bottom = screen.getByRole('navigation', { name: 'Main' });
    fireEvent.click(within(bottom).getByRole('button', { name: /Lecturer/ }));
    expect(onNavigate).toHaveBeenCalledWith('lecturer');
  });

  test('the hamburger toggles the mobile menu and its label', () => {
    asUser('student');
    const toggle = screen.getByRole('button', { name: 'Open menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('account menu (disclosure)', () => {
  test('the trigger is a disclosure button: aria-expanded and aria-controls, and no menu roles', () => {
    asUser('student');
    const trigger = accountTrigger();
    expect(trigger).toHaveAttribute('type', 'button');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).not.toHaveAttribute('aria-controls');
    expect(trigger).not.toHaveAttribute('aria-haspopup');
    expect(screen.queryByRole('button', { name: 'Profile' })).not.toBeInTheDocument();

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(trigger.getAttribute('aria-controls'));
    expect(panel).not.toBeNull();
    expect(within(panel).getByRole('button', { name: 'Profile' })).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Settings' })).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Log Out' })).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
  });

  test('Escape closes the menu and returns focus to the trigger', () => {
    asUser('student');
    const trigger = accountTrigger();
    trigger.focus();
    fireEvent.click(trigger);
    const profile = screen.getByRole('button', { name: 'Profile' });
    profile.focus();

    fireEvent.keyDown(profile, { key: 'Escape' });

    expect(screen.queryByRole('button', { name: 'Profile' })).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  test('a press outside the menu closes it; a press inside keeps it open', () => {
    asUser('student');
    const trigger = accountTrigger();
    fireEvent.click(trigger);

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Profile' }));
    expect(screen.getByRole('button', { name: 'Profile' })).toBeInTheDocument();

    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('button', { name: 'Profile' })).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('Profile and Settings navigate and close the menu', () => {
    const { onNavigate } = asUser('student');
    fireEvent.click(accountTrigger());
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(onNavigate).toHaveBeenCalledWith('settings');
    expect(screen.queryByRole('button', { name: 'Settings' })).not.toBeInTheDocument();
  });

  test('Log Out signs out and goes home', async () => {
    const { onNavigate, logout } = asUser('student');
    fireEvent.click(accountTrigger());
    fireEvent.click(screen.getByRole('button', { name: 'Log Out' }));
    expect(logout).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('home'));
    expect(screen.queryByRole('button', { name: 'Log Out' })).not.toBeInTheDocument();
  });

  test('a guest sees Sign Up in place of Settings', () => {
    const { onNavigate } = asUser('student', '/dashboard', { isGuest: true });
    fireEvent.click(screen.getByRole('button', { name: 'Guest' }));
    expect(screen.queryByRole('button', { name: 'Settings' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }));
    expect(onNavigate).toHaveBeenCalledWith('login');
  });
});

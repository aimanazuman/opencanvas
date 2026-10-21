/* eslint-disable testing-library/no-container, jest/no-conditional-expect -- whole-page smoke checks scan the container DOM and branch on role */
/**
 * Render smoke test: mounts the real <App /> (real router, providers, pages) at every route,
 * logged out and as student, guest, lecturer and admin, with axios replaced by in-memory fixtures.
 * Each case must render without throwing and without console.error.
 * It catches runtime breakage that lint and compile cannot (bad selectors, undefined class maps, etc.).
 */
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';


import App from './App';
import { setRole } from './testUtils/axiosMock';
import { brokenClassTokens } from './testUtils/domChecks';

jest.mock('axios', () => require('./testUtils/axiosMock').axiosModule);

const PUBLIC = ['/', '/login', '/lecturer-login', '/admin-login', '/about', '/signup', '/verify-email?token=abc', '/forgot-password'];

// path -> role needed (null = any signed-in user, admin always passes)
const PROTECTED = [
  ['/dashboard', null],
  ['/workspace', null],
  ['/workspace?templateType=course-material', null],
  ['/workspace?templateType=student-notes', null],
  ['/workspace?templateType=study-planner', null],
  ['/workspace?templateType=kanban', null],
  ['/workspace?templateType=quiz', null],
  ['/workspace?boardId=1', null],
  ['/workspace?boardId=2', null],
  ['/workspace?boardId=3', null],
  ['/workspace?boardId=4', null],
  ['/workspace?boardId=5', null],
  ['/admin', 'admin'],
  ['/lecturer', 'lecturer'],
  ['/lecturer/boards', 'lecturer'],
  ['/lecturer/courses', 'lecturer'],
  ['/lecturer/students', 'lecturer'],
  ['/lecturer/analytics', 'lecturer'],
  ['/lecturer/settings', 'lecturer'],
  ['/lecturer/shared', 'lecturer'],
  ['/lecturer/archive', 'lecturer'],
  ['/lecturer/profile', 'lecturer'],
  ['/lecturer/templates', 'lecturer'],
  ['/lecturer/notifications', 'lecturer'],
  ['/courses', null],
  ['/courses/1', null],
  ['/profile', null],
  ['/archive', null],
  ['/shared', null],
  ['/templates', null],
  ['/templates/course-material', 'lecturer'],
  ['/templates/student-notes', null],
  ['/templates/study-planner', null],
  ['/templates/kanban', null],
  ['/templates/quiz', 'lecturer'],
  ['/settings', null],
  ['/notifications', null],
  ['/join/sometoken', null],
  ['/join-course/ABC123', null],
];

let errorSpy;

beforeEach(() => {
  localStorage.clear();
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
});

async function mountAt(url, role) {
  setRole(role);
  if (role) localStorage.setItem('access_token', 'test-token');
  window.history.pushState({}, '', url);
  const view = render(<App />);
  // the splash screen is removed once auth has loaded (plus its 400ms exit timer)
  await waitFor(() => expect(screen.queryByText('Loading your workspace')).not.toBeInTheDocument(), { timeout: 3000 });
  // let page-level data fetches settle inside act
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
  return view;
}

// React Testing Library 13 itself triggers this one deprecation notice on its first render; it is not app code.
const isLibraryNoise = (text) => text.includes('ReactDOMTestUtils.act` is deprecated');

function errorMessages() {
  return errorSpy.mock.calls.map((c) => c.map(String).join(' ').slice(0, 400)).filter((t) => !isLibraryNoise(t));
}

function expectCleanRender(view) {
  expect(errorMessages()).toEqual([]);
  expect(brokenClassTokens(view.container)).toEqual([]);
  expect(view.container.textContent.trim().length).toBeGreaterThan(0);
}

describe('logged out', () => {
  test.each(PUBLIC)('public page %s renders', async (url) => {
    const view = await mountAt(url, null);
    expectCleanRender(view);
    expect(window.location.pathname).toBe(url.split('?')[0]);
  });

  test.each(PROTECTED.map(([u]) => [u]))('protected %s sends the visitor to /login', async (url) => {
    await mountAt(url, null);
    await waitFor(() => expect(window.location.pathname).toBe('/login'));
  });
});

describe.each([
  ['student', 'student'],
  ['guest', 'guest'],
  ['lecturer', 'lecturer'],
  ['admin', 'admin'],
])('signed in as %s', (_label, role) => {
  const effectiveRole = role === 'guest' ? 'student' : role;

  test.each(PUBLIC)('public page %s renders', async (url) => {
    const view = await mountAt(url, role);
    expectCleanRender(view);
  });

  test.each(PROTECTED)('route %s', async (url, needs) => {
    const allowed = !needs || effectiveRole === needs || effectiveRole === 'admin';
    const view = await mountAt(url, role);
    // /dashboard sends lecturers and admins on to their own home by design
    const home = { lecturer: '/lecturer', admin: '/admin' }[effectiveRole];
    if (url === '/dashboard' && home) {
      await waitFor(() => expect(window.location.pathname).toBe(home));
      expect(errorMessages()).toEqual([]);
    } else if (allowed) {
      expectCleanRender(view);
      expect(window.location.pathname).toBe(url.split('?')[0]);
    } else {
      // wrong role: bounced to /dashboard, which then forwards to the role's home
      await waitFor(() => expect(window.location.pathname).toBe(home || '/dashboard'));
      expect(errorMessages()).toEqual([]);
    }
  });
});

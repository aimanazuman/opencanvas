/* eslint-disable testing-library/no-container, testing-library/no-node-access -- the scroll-reveal hook is checked by the .scroll-reveal class it observes */
/**
 * HomePage: scroll-reveal hook, navigation wiring and the timetable structure.
 * Route names passed to onNavigate must match the routes map in App.jsx.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import HomePage from './HomePage';
import { brokenClassTokens } from '../testUtils/domChecks';

let observers;
let errorSpy;

beforeEach(() => {
  observers = [];
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  // Record every observer so a test can report elements as intersecting.
  window.IntersectionObserver = class {
    constructor(cb) {
      this.cb = cb;
      this.targets = [];
      observers.push(this);
    }
    observe(el) { this.targets.push(el); }
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  };
});

afterEach(() => {
  // Only the React Testing Library act() deprecation notice is ignored; any other console error fails the test.
  const real = errorSpy.mock.calls
    .map((c) => c.map(String).join(' '))
    .filter((t) => !t.includes('ReactDOMTestUtils.act` is deprecated'));
  errorSpy.mockRestore();
  expect(real).toEqual([]);
});

function renderHome() {
  const onNavigate = jest.fn();
  const view = render(<HomePage onNavigate={onNavigate} />);
  return { ...view, onNavigate };
}

describe('scroll reveal', () => {
  test('observes every .scroll-reveal element and adds is-visible when it intersects', () => {
    const { container } = renderHome();
    const targets = container.querySelectorAll('.scroll-reveal');
    expect(targets.length).toBeGreaterThan(0);
    expect(observers).toHaveLength(1);
    expect(observers[0].targets).toHaveLength(targets.length);

    const [first, ...rest] = targets;
    act(() => {
      observers[0].cb([{ isIntersecting: true, target: first }]);
    });
    expect(first).toHaveClass('is-visible');
    rest.forEach((el) => expect(el).not.toHaveClass('is-visible'));
  });

  test('ignores entries that are not intersecting', () => {
    const { container } = renderHome();
    const [first] = container.querySelectorAll('.scroll-reveal');
    act(() => {
      observers[0].cb([{ isIntersecting: false, target: first }]);
    });
    expect(first).not.toHaveClass('is-visible');
  });
});

describe('navigation wiring', () => {
  test.each([
    ['Get Started', 'signup'],
    ['Get Started Free', 'signup'],
    ['Learn More', 'about'],
    ['Create Free Account', 'signup'],
    ['Sign In', 'login'],
    ['Lecturer Portal', 'lecturer-login'],
    ['Admin Portal', 'admin-login'],
    ['Student Portal', 'login'],
  ])('button "%s" navigates to %s', (label, route) => {
    const { onNavigate } = renderHome();
    fireEvent.click(screen.getAllByRole('button', { name: label })[0]);
    expect(onNavigate).toHaveBeenCalledWith(route);
  });

  test('section links point at the sections they name', () => {
    renderHome();
    expect(screen.getByRole('link', { name: 'Features' })).toHaveAttribute('href', '#features');
    expect(screen.getByRole('link', { name: 'Templates' })).toHaveAttribute('href', '#templates');
    expect(screen.getByRole('link', { name: 'Roles' })).toHaveAttribute('href', '#roles');
  });
});

describe('content and markup', () => {
  test('hero headline and stats keep their copy', () => {
    renderHome();
    expect(screen.getByRole('heading', { level: 1, name: /Where Learning Meets\s+Collaboration/ })).toBeInTheDocument();
    ['5+', '3', '100%'].forEach((v) => expect(screen.getAllByText(v).length).toBeGreaterThan(0));
    ['Board Templates', 'User Roles', 'Free to Use'].forEach((l) => expect(screen.getByText(l)).toBeInTheDocument());
  });

  test('timetable is a real table with a header row and three period rows', () => {
    renderHome();
    screen.getByRole('table', { name: /Example weekly timetable/ });
    expect(screen.getAllByRole('columnheader')).toHaveLength(6);
    // one header row plus three period rows
    expect(screen.getAllByRole('row')).toHaveLength(4);
    expect(screen.getAllByRole('rowheader')).toHaveLength(3);
  });

  test('renders without broken class tokens', () => {
    const { container } = renderHome();
    expect(brokenClassTokens(container)).toEqual([]);
  });
});

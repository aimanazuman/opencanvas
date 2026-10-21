/* eslint-disable testing-library/no-node-access -- the reveal check reads the scroll-reveal items the hook observes */
/**
 * ScrollToTop: opening About from another page starts at the top, a hash scrolls to its element, a missing hash falls
 * back to the top, browser back keeps the position, and every About reveal item is observed after navigation.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import ScrollToTop from './ScrollToTop';
import AboutPage from '../pages/AboutPage';

const TOP = { top: 0, left: 0, behavior: 'instant' };

function Go({ to, label }) {
  const navigate = useNavigate();
  return <button type="button" onClick={() => navigate(to)}>{label}</button>;
}

function Back() {
  const navigate = useNavigate();
  return <button type="button" onClick={() => navigate(-1)}>Back</button>;
}

function renderApp(start) {
  return render(
    <MemoryRouter initialEntries={[start]}>
      <ScrollToTop />
      <Go to="/about" label="Open about" />
      <Go to="/about#templates" label="Open templates" />
      <Go to="/about#nothing-here" label="Open missing" />
      <Go to="/about?tab=2" label="Open about with search" />
      <Back />
      <Routes>
        <Route path="/" element={<p>Home</p>} />
        <Route path="/about" element={<AboutPage onNavigate={() => {}} />} />
      </Routes>
    </MemoryRouter>
  );
}

let scrollSpy;
let intoView;
const originalScrollTo = window.scrollTo;
const originalIntersectionObserver = window.IntersectionObserver;

beforeEach(() => {
  scrollSpy = jest.fn();
  window.scrollTo = scrollSpy;
  intoView = jest.spyOn(Element.prototype, 'scrollIntoView');
});

afterEach(() => {
  window.scrollTo = originalScrollTo;
  window.IntersectionObserver = originalIntersectionObserver;
  intoView.mockRestore();
});

describe('ScrollToTop', () => {
  test('opening About from another page resets the window to the top', () => {
    renderApp('/');
    fireEvent.click(screen.getByRole('button', { name: 'Open about' }));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Empowering Education Through');
    expect(scrollSpy).toHaveBeenLastCalledWith(TOP);
    expect(intoView).not.toHaveBeenCalled();
  });

  test('a hash link scrolls to its element instead of the top', () => {
    renderApp('/');
    fireEvent.click(screen.getByRole('button', { name: 'Open templates' }));

    const section = screen.getByRole('region', { name: 'Board Templates' });
    expect(intoView).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' });
    expect(intoView.mock.instances[0]).toBe(section);
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  test('a hash with no matching element falls back to the top', () => {
    renderApp('/');
    fireEvent.click(screen.getByRole('button', { name: 'Open missing' }));

    expect(scrollSpy).toHaveBeenLastCalledWith(TOP);
    expect(intoView).not.toHaveBeenCalled();
  });

  test('browser back (POP) does not reset the scroll position', () => {
    renderApp('/');
    fireEvent.click(screen.getByRole('button', { name: 'Open about' }));
    expect(scrollSpy).toHaveBeenCalledTimes(1);

    scrollSpy.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(scrollSpy).not.toHaveBeenCalled();
    expect(intoView).not.toHaveBeenCalled();
  });

  test('a search-only change on the same page keeps the scroll position', () => {
    renderApp('/about');
    fireEvent.click(screen.getByRole('button', { name: 'Open about with search' }));

    expect(scrollSpy).not.toHaveBeenCalled();
  });

  test('after navigation every About reveal item is handed to the observer, so none stays hidden', () => {
    const observed = [];
    window.IntersectionObserver = class {
      constructor() {
        this.observe = (el) => observed.push(el);
        this.unobserve = () => {};
        this.disconnect = () => {};
      }
    };

    renderApp('/');
    fireEvent.click(screen.getByRole('button', { name: 'Open about' }));

    const items = Array.from(document.querySelectorAll('.scroll-reveal'));
    expect(items.length).toBeGreaterThan(0);
    items.forEach((item) => expect(observed).toContain(item));
  });
});

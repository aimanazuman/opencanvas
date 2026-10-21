/* eslint-disable testing-library/no-node-access -- the hook is checked through the DOM it observes */
/**
 * useScrollReveal: elements added after mount are observed, the js-reveal class is reference counted across
 * instances, cleanup disconnects the observer and the mutation watcher, and reduced motion reveals at once.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import useScrollReveal from './useScrollReveal';

const JS_CLASS = 'js-reveal';
let observers;
let reducedMotion;

beforeEach(() => {
  observers = [];
  reducedMotion = false;
  window.IntersectionObserver = class {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      this.observe = jest.fn();
      this.unobserve = jest.fn();
      this.disconnect = jest.fn();
      observers.push(this);
    }
  };
  window.matchMedia = jest.fn(() => ({ matches: reducedMotion }));
});

afterEach(() => {
  delete window.IntersectionObserver;
  delete window.matchMedia;
  document.documentElement.classList.remove(JS_CLASS);
});

function Probe({ threshold }) {
  const ref = useScrollReveal({ threshold });
  return (
    <div ref={ref} data-testid="root">
      <p className="scroll-reveal">first</p>
    </div>
  );
}

function Plain() {
  const ref = useScrollReveal();
  return <div ref={ref} data-testid="root"><p>plain</p></div>;
}

function revealElement(text = 'late') {
  const el = document.createElement('p');
  el.className = 'scroll-reveal';
  el.textContent = text;
  return el;
}

// Mutation observer callbacks run after a microtask; one macrotask turn lets them finish.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('useScrollReveal', () => {
  test('the js-reveal class stays on <html> until the last active instance unmounts', () => {
    const { unmount: unmountFirst } = render(<Probe />);
    const { unmount: unmountSecond } = render(<Probe />);
    expect(document.documentElement).toHaveClass(JS_CLASS);

    unmountFirst();
    expect(document.documentElement).toHaveClass(JS_CLASS);

    unmountSecond();
    expect(document.documentElement).not.toHaveClass(JS_CLASS);
  });

  test('an element added after mount is observed and revealed when it intersects', async () => {
    render(<Probe />);
    const root = screen.getByTestId('root');
    const late = revealElement();
    root.appendChild(late);

    await waitFor(() => expect(observers[0].observe).toHaveBeenCalledWith(late));
    const callback = observers[0].callback;
    callback([{ isIntersecting: true, target: late }]);
    expect(late).toHaveClass('is-visible');
  });

  test('a wrapper added later has its reveal children observed', async () => {
    render(<Probe />);
    const root = screen.getByTestId('root');
    const wrapper = document.createElement('section');
    const inner = revealElement('inner');
    wrapper.appendChild(inner);
    root.appendChild(wrapper);

    await waitFor(() => expect(observers[0].observe).toHaveBeenCalledWith(inner));
  });

  test('an element that is already observed is not observed a second time', async () => {
    render(<Probe />);
    const root = screen.getByTestId('root');
    const first = root.querySelector('.scroll-reveal');
    const late = revealElement();
    root.appendChild(first); // moved, so the mutation watcher sees it again
    root.appendChild(late);

    await waitFor(() => expect(observers[0].observe).toHaveBeenCalledWith(late));
    expect(observers[0].observe).toHaveBeenCalledTimes(2);
  });

  test('after unmount, elements added to the old root are not observed', async () => {
    const { unmount } = render(<Probe />);
    const root = screen.getByTestId('root');
    const before = observers[0].observe.mock.calls.length;

    unmount();
    root.appendChild(revealElement());
    await flush();

    expect(observers[0].observe).toHaveBeenCalledTimes(before);
    expect(observers[0].disconnect).toHaveBeenCalled();
    expect(document.documentElement).not.toHaveClass(JS_CLASS);
  });

  test('a page with no reveal content runs no observer until one appears', async () => {
    render(<Plain />);
    expect(observers).toHaveLength(0);
    expect(document.documentElement).not.toHaveClass(JS_CLASS);

    const late = revealElement();
    screen.getByTestId('root').appendChild(late);

    await waitFor(() => expect(observers).toHaveLength(1));
    expect(observers[0].observe).toHaveBeenCalledWith(late);
    expect(document.documentElement).toHaveClass(JS_CLASS);
  });

  test('a changed threshold replaces the observer without dropping the class for the same instance', () => {
    const { rerender, unmount } = render(<Probe threshold={0.15} />);
    rerender(<Probe threshold={0.3} />);

    expect(observers).toHaveLength(2);
    expect(observers[0].disconnect).toHaveBeenCalled();
    expect(observers[1].options.threshold).toBe(0.3);
    expect(document.documentElement).toHaveClass(JS_CLASS);

    unmount();
    expect(document.documentElement).not.toHaveClass(JS_CLASS);
  });

  test('reduced motion reveals elements added later at once and creates no observer', async () => {
    reducedMotion = true;
    render(<Probe />);
    const late = revealElement();
    screen.getByTestId('root').appendChild(late);

    await waitFor(() => expect(late).toHaveClass('is-visible'));
    expect(screen.getByText('first')).toHaveClass('is-visible');
    expect(observers).toHaveLength(0);
    expect(document.documentElement).not.toHaveClass(JS_CLASS);
  });
});

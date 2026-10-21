import { useLayoutEffect, useRef } from 'react';

const REVEAL = 'scroll-reveal';
const VISIBLE = 'is-visible';
// Added to <html> only while at least one observer runs. The CSS hides unrevealed items only under this class,
// so content stays visible if JavaScript never runs.
const JS_CLASS = 'js-reveal';
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

// Number of mounted instances that currently run an IntersectionObserver. The class is removed only when the last
// one stops, so one instance unmounting cannot reveal the hidden items that another instance still animates.
let activeObservers = 0;

function prefersReducedMotion() {
  return typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_QUERY).matches;
}

/**
 * Adds `is-visible` to each `.scroll-reveal` element inside the returned ref when it enters the viewport.
 * Elements added to the root later (a MutationObserver watches it) are handled the same way.
 * With reduced motion, or without IntersectionObserver, every element is marked visible at once.
 * `once` keeps an element revealed after it first shows; `once: false` hides it again when it leaves.
 */
export function useScrollReveal({ threshold = 0.15, once = true, rootMargin = '0px 0px -40px 0px' } = {}) {
  const ref = useRef(null);

  // Layout effect: the class is set before paint, so nothing flashes on mount.
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return undefined;

    const html = document.documentElement;
    const animate = !prefersReducedMotion() && typeof window.IntersectionObserver === 'function';
    const seen = new WeakSet();
    let observer = null;

    // Created on the first reveal element, so a page with no .scroll-reveal content runs no observer.
    const getObserver = () => {
      if (!observer) {
        observer = new window.IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                entry.target.classList.add(VISIBLE);
                if (once) observer.unobserve(entry.target);
              } else if (!once) {
                entry.target.classList.remove(VISIBLE);
              }
            });
          },
          { threshold, rootMargin }
        );
        activeObservers += 1;
        html.classList.add(JS_CLASS);
      }
      return observer;
    };

    const reveal = (el) => {
      if (seen.has(el)) return;
      seen.add(el);
      if (animate) getObserver().observe(el);
      else el.classList.add(VISIBLE);
    };

    // Reveal elements that appear after mount (for example content that renders later). Only added nodes are read.
    const mutations = typeof window.MutationObserver === 'function'
      ? new window.MutationObserver((records) => {
          records.forEach((record) => {
            record.addedNodes.forEach((node) => {
              if (node.nodeType !== 1) return;
              if (node.classList.contains(REVEAL)) reveal(node);
              node.querySelectorAll(`.${REVEAL}`).forEach(reveal);
            });
          });
        })
      : null;
    if (mutations) mutations.observe(root, { childList: true, subtree: true });

    root.querySelectorAll(`.${REVEAL}`).forEach(reveal);

    return () => {
      if (mutations) mutations.disconnect();
      if (observer) {
        observer.disconnect();
        activeObservers -= 1;
        if (activeObservers === 0) html.classList.remove(JS_CLASS);
      }
    };
  }, [threshold, once, rootMargin]);

  return ref;
}

export default useScrollReveal;

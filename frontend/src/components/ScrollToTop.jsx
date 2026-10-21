import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { getHashTarget, scrollElementIntoView, scrollWindowToTop } from '../utils/scrollTarget';

/**
 * Renders nothing. After a route change (PUSH or REPLACE) the window goes back to the top, so a page never opens at
 * the bottom of the one before it. A hash in the URL scrolls to the element with that id instead, and falls back to
 * the top when no such element exists. POP (browser back and forward) is skipped so the browser restores the position
 * the user left. Only the pathname and hash trigger a reset: a search-only change keeps the scroll position.
 *
 * The app's scroll container is the window. ClassroomShell and LecturerLayout do not create an inner scroller on the
 * public or lecturer pages, and the workspace and admin pages unmount their inner scroller on leaving.
 *
 * useLayoutEffect runs before paint, so the user never sees the old scroll position on the new page.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  const navigationTypeRef = useRef(navigationType);
  const lastRouteRef = useRef(null);

  // Keeps the latest navigation type in a ref, so the reset effect below depends only on the pathname and hash.
  // Declared first so it runs before the reset effect in the same commit.
  useLayoutEffect(() => {
    navigationTypeRef.current = navigationType;
  }, [navigationType]);

  useLayoutEffect(() => {
    const previous = lastRouteRef.current;
    lastRouteRef.current = { pathname, hash };
    // Same pathname and hash as the last committed route (a search-only change): keep the scroll position.
    if (previous && previous.pathname === pathname && previous.hash === hash) return;
    if (navigationTypeRef.current === 'POP') return;

    const target = getHashTarget(hash);
    if (target) {
      scrollElementIntoView(target);
    } else {
      scrollWindowToTop();
    }
  }, [pathname, hash]);

  return null;
}

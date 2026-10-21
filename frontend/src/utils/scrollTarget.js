// Scroll helpers for route changes. Each function takes the window or element it acts on, so the tests can pass fakes.

// The app sets html { scroll-behavior: smooth } when motion is allowed. A plain scrollTo(0, 0) would then animate the
// whole page back up from the bottom, so the reset asks for 'instant'. Browsers that do not know the value throw a
// TypeError, so the call falls back to the plain form.
export function scrollWindowToTop(win = window) {
  try {
    win.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  } catch {
    win.scrollTo(0, 0);
  }
}

// Puts the element at the top of the viewport (scroll-mt on sections keeps it clear of the sticky header).
export function scrollElementIntoView(el) {
  try {
    el.scrollIntoView({ block: 'start', behavior: 'instant' });
  } catch {
    el.scrollIntoView(true);
  }
}

// Returns the fragment id from a location hash, or an empty string. Malformed percent-encoding gives an empty string
// instead of throwing, so a bad link cannot break a navigation.
export function hashTargetId(hash) {
  if (typeof hash !== 'string' || hash.length < 2 || hash.charAt(0) !== '#') return '';
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return '';
  }
}

// Returns the element the hash points at, or null when there is no hash or no matching id.
export function getHashTarget(hash, doc = document) {
  const id = hashTargetId(hash);
  return id ? doc.getElementById(id) : null;
}

/**
 * Link safety helpers.
 *
 * Any URL that came from a user (a link block, a Meet link, a kanban card, a study-planner link, a video address)
 * must go through safeUrl() before it is put in an href, an iframe src or window.open(). Only http: and https: are
 * allowed, so javascript:, data:, vbscript: and file: addresses can never run code on the app's origin.
 */
const MAX_URL_LENGTH = 2048;
// local@domain.tld without quotes, spaces, brackets or the characters that start mailto headers (? & # %)
const MAILBOX_PATTERN = /^[^\s@<>"'`,;:()[\]\\?&#%]+@[^\s@<>"'`,;:()[\]\\?&#%]+\.[^\s@<>"'`,;:()[\]\\?&#%]+$/;

/** Returns the normalised URL when it is a plain http(s) address, otherwise null. */
export function safeUrl(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.href;
  } catch (e) {
    // not an absolute URL
  }
  return null;
}

/** Like safeUrl, but a bare "example.com/page" is accepted and gets https:// in front of it. */
export function safeUrlWithDefaultScheme(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) return null;
  return safeUrl(/^https?:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed);
}

/** mailto: link for an address coming from the server, or null when it does not look like an address. */
export function safeMailto(email) {
  if (typeof email !== 'string') return null;
  const trimmed = email.trim();
  if (trimmed.length > 254 || !MAILBOX_PATTERN.test(trimmed)) return null;
  return 'mailto:' + trimmed;
}

/** Sandbox for iframes that show somebody else's page: scripts may run, but never with this app's origin. */
export const EXTERNAL_IFRAME_SANDBOX = 'allow-scripts allow-popups allow-presentation';

/** Attributes for links that open a user-supplied address in a new tab. */
export const EXTERNAL_LINK_PROPS = { target: '_blank', rel: 'noopener noreferrer' };

/** Opens the mail program for an address, only when the address passes safeMailto(). */
export function openMailto(email) {
  const href = safeMailto(email);
  if (href && typeof window !== 'undefined') window.open(href, '_blank', 'noopener,noreferrer');
}

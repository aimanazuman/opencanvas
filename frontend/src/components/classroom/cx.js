/**
 * Join class names and drop falsy entries. Callers pass literal class strings so Tailwind's
 * content scanner can see every class.
 */
export default function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

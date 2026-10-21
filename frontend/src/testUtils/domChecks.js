// Scans rendered DOM for class-name damage that never throws but ships broken styling
// (the kind of leftover a scripted class rewrite produces).
export function brokenClassTokens(root) {
  const found = [];
  root.querySelectorAll('[class]').forEach((el) => {
    const raw = el.getAttribute('class');
    raw.split(/\s+/).filter(Boolean).forEach((token) => {
      const bare = token.replace(/^(?:[a-z0-9-]+:)+/i, ''); // drop variants like md: hover:
      if (
        /undefined|null|NaN|\[object/.test(token) ||
        /-$/.test(bare) || // "bg-" or "text-" left dangling
        bare === '.' ||
        bare.startsWith('.')
      ) {
        found.push(`${el.tagName.toLowerCase()} class="${raw.slice(0, 120)}" -> ${token}`);
      }
    });
  });
  return found;
}

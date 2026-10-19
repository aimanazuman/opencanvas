import { safeUrl, safeUrlWithDefaultScheme, safeMailto } from './safeUrl';

describe('safeUrl', () => {
  test('allows http and https', () => {
    expect(safeUrl('https://example.com/a?b=1')).toBe('https://example.com/a?b=1');
    expect(safeUrl(' http://example.com ')).toBe('http://example.com/');
  });

  test('refuses every other scheme', () => {
    ['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:x',
      'file:///etc/passwd', 'blob:https://x/y', 'ftp://example.com', '//example.com', 'example.com', '', null, undefined, 42,
    ].forEach((value) => expect(safeUrl(value)).toBeNull());
  });

  test('refuses very long values', () => {
    expect(safeUrl('https://example.com/' + 'a'.repeat(3000))).toBeNull();
  });
});

describe('safeUrlWithDefaultScheme', () => {
  test('adds https to bare hosts but still refuses other schemes', () => {
    expect(safeUrlWithDefaultScheme('example.com/x')).toBe('https://example.com/x');
    expect(safeUrlWithDefaultScheme('javascript:alert(1)')).toBeNull();
    expect(safeUrlWithDefaultScheme('data:text/html;base64,AAAA')).toBeNull();
  });
});

describe('safeMailto', () => {
  test('accepts plain addresses only', () => {
    expect(safeMailto('student@example.com')).toBe('mailto:student@example.com');
    expect(safeMailto('x@y.com?cc=evil@z.com')).toBeNull(); // no extra mail headers
    expect(safeMailto('a b@c.com')).toBeNull();
    expect(safeMailto('<script>@x.com')).toBeNull();
    expect(safeMailto(null)).toBeNull();
  });
});

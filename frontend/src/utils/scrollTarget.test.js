/**
 * scrollTarget: the hash is decoded safely, the hash target is found only when a hash exists, and both scroll helpers
 * fall back to the plain call in browsers that reject the 'instant' option.
 */
import { hashTargetId, getHashTarget, scrollWindowToTop, scrollElementIntoView } from './scrollTarget';

describe('hashTargetId', () => {
  test('returns the id after the hash mark', () => {
    expect(hashTargetId('#templates')).toBe('templates');
  });

  test('returns an empty string for no hash, a bare hash, or a value without the hash mark', () => {
    expect(hashTargetId('')).toBe('');
    expect(hashTargetId(undefined)).toBe('');
    expect(hashTargetId('#')).toBe('');
    expect(hashTargetId('templates')).toBe('');
  });

  test('decodes percent-encoded ids', () => {
    expect(hashTargetId('#my%20section')).toBe('my section');
  });

  test('malformed percent-encoding gives an empty string instead of throwing', () => {
    expect(hashTargetId('#%E0%A4%A')).toBe('');
  });
});

describe('getHashTarget', () => {
  test('looks up the element by id', () => {
    const el = { id: 'roles' };
    const doc = { getElementById: jest.fn(() => el) };
    expect(getHashTarget('#roles', doc)).toBe(el);
    expect(doc.getElementById).toHaveBeenCalledWith('roles');
  });

  test('returns null and does not query the document when there is no hash', () => {
    const doc = { getElementById: jest.fn() };
    expect(getHashTarget('', doc)).toBeNull();
    expect(doc.getElementById).not.toHaveBeenCalled();
  });

  test('returns null when no element has the id', () => {
    const doc = { getElementById: jest.fn(() => null) };
    expect(getHashTarget('#missing', doc)).toBeNull();
  });
});

describe('scrollWindowToTop', () => {
  test('asks for an instant jump to the top-left corner', () => {
    const win = { scrollTo: jest.fn() };
    scrollWindowToTop(win);
    expect(win.scrollTo).toHaveBeenCalledTimes(1);
    expect(win.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
  });

  test('falls back to the plain form when the object form throws', () => {
    const win = {
      scrollTo: jest.fn((arg) => {
        if (typeof arg === 'object') throw new TypeError('unsupported behavior');
      }),
    };
    scrollWindowToTop(win);
    expect(win.scrollTo).toHaveBeenLastCalledWith(0, 0);
  });
});

describe('scrollElementIntoView', () => {
  test('aligns the element to the start with an instant jump', () => {
    const el = { scrollIntoView: jest.fn() };
    scrollElementIntoView(el);
    expect(el.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' });
  });

  test('falls back to the boolean form when the object form throws', () => {
    const el = {
      scrollIntoView: jest.fn((arg) => {
        if (typeof arg === 'object') throw new TypeError('unsupported behavior');
      }),
    };
    scrollElementIntoView(el);
    expect(el.scrollIntoView).toHaveBeenLastCalledWith(true);
  });
});

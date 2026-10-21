import {
  pendingWarningLevel, percentOf, resolveStorageUsage, storageWarningKey, storageWarningToast, warningLevelFor,
} from './storageUsage';

const GB = 1024 ** 3;

describe('resolveStorageUsage', () => {
  test('uses the server figures (effective quota) when the usage response is valid', () => {
    const user = { storage_used: 1 * GB, storage_quota: 10 * GB };
    expect(resolveStorageUsage(user, { storage_used: 2 * GB, storage_quota: 5 * GB, raw_storage_quota: 10 * GB }))
      .toEqual({ used: 2 * GB, quota: 5 * GB, source: 'server' });
  });

  test('trusts a zero effective quota from the server', () => {
    expect(resolveStorageUsage({}, { storage_used: 0, storage_quota: 0 })).toEqual({ used: 0, quota: 0, source: 'server' });
  });

  test('falls back to the raw user figures when there is no usage response', () => {
    const user = { storage_used: 3, storage_quota: 10 };
    expect(resolveStorageUsage(user, null)).toEqual({ used: 3, quota: 10, source: 'user' });
    expect(resolveStorageUsage(user, undefined)).toEqual({ used: 3, quota: 10, source: 'user' });
  });

  test('falls back when the usage response is malformed', () => {
    const user = { storage_used: 3, storage_quota: 10 };
    expect(resolveStorageUsage(user, {})).toEqual({ used: 3, quota: 10, source: 'user' });
    expect(resolveStorageUsage(user, { storage_used: '5', storage_quota: 10 })).toEqual({ used: 3, quota: 10, source: 'user' });
    expect(resolveStorageUsage(user, { storage_used: -1, storage_quota: 10 })).toEqual({ used: 3, quota: 10, source: 'user' });
    expect(resolveStorageUsage(user, { storage_used: 5, storage_quota: NaN })).toEqual({ used: 3, quota: 10, source: 'user' });
  });

  test('uses zero when neither source has usable figures', () => {
    expect(resolveStorageUsage(null, null)).toEqual({ used: 0, quota: 0, source: 'user' });
    expect(resolveStorageUsage({ storage_used: null, storage_quota: undefined }, null))
      .toEqual({ used: 0, quota: 0, source: 'user' });
  });
});

describe('percentOf', () => {
  test('is the unrounded share of the quota', () => {
    expect(percentOf(1, 4)).toBe(25);
    expect(percentOf(8.5 * GB, 10 * GB)).toBeCloseTo(85);
  });

  test('is 0 without a quota or with a bad used value', () => {
    expect(percentOf(5, 0)).toBe(0);
    expect(percentOf(5, -1)).toBe(0);
    expect(percentOf(-5, 10)).toBe(0);
    expect(percentOf(undefined, 10)).toBe(0);
  });
});

describe('warningLevelFor', () => {
  test('returns the highest threshold reached', () => {
    expect(warningLevelFor(79.99)).toBeNull();
    expect(warningLevelFor(0)).toBeNull();
    expect(warningLevelFor(80)).toBe(80);
    expect(warningLevelFor(89.99)).toBe(80);
    expect(warningLevelFor(90)).toBe(90);
    expect(warningLevelFor(99.99)).toBe(90);
    expect(warningLevelFor(100)).toBe(100);
    expect(warningLevelFor(150)).toBe(100);
  });
});

describe('pendingWarningLevel', () => {
  test('announces only levels that were not shown yet this session', () => {
    const none = () => false;
    const eighty = (level) => level === 80;
    expect(pendingWarningLevel(85, none)).toBe(80);
    expect(pendingWarningLevel(85, eighty)).toBeNull();
    expect(pendingWarningLevel(92, eighty)).toBe(90);
    expect(pendingWarningLevel(100, (level) => level !== 100)).toBe(100);
    expect(pendingWarningLevel(50, none)).toBeNull();
  });
});

describe('storageWarningKey', () => {
  test('keeps one session flag per threshold', () => {
    expect(storageWarningKey(80)).not.toBe(storageWarningKey(90));
    expect(storageWarningKey(100)).toBe('storage_warning_shown_100');
  });
});

describe('storageWarningToast', () => {
  test('uses the rounded percentage in the message', () => {
    expect(storageWarningToast(80, 84.6)).toEqual({ type: 'warning', message: 'Storage is 85% full.', duration: 5000 });
    expect(storageWarningToast(90, 92.2)).toEqual({
      type: 'warning', message: 'Storage is 92% full. Consider freeing up space soon.', duration: 6000,
    });
  });

  test('uses an error toast when full', () => {
    expect(storageWarningToast(100, 100)).toEqual({
      type: 'error', message: 'Your storage is full. Please delete some files to continue uploading.', duration: 6000,
    });
  });
});

// Pure helpers for storage figures. The server's GET /api/files/usage/ response is the source of truth:
// `storage_used` and `storage_quota` are bytes, and the quota is already capped by the system limit.

const isBytes = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;

/**
 * Pick the figures to show. The usage response wins. If it is missing or malformed, use the raw figures on the user
 * object (the uncapped quota), and mark the source so callers know.
 */
export function resolveStorageUsage(user, usage) {
  if (usage && isBytes(usage.storage_used) && isBytes(usage.storage_quota)) {
    return { used: usage.storage_used, quota: usage.storage_quota, source: 'server' };
  }
  return {
    used: isBytes(user?.storage_used) ? user.storage_used : 0,
    quota: isBytes(user?.storage_quota) ? user.storage_quota : 0,
    source: 'user',
  };
}

/** Unrounded percentage used. Returns 0 when there is no quota. */
export function percentOf(used, quota) {
  if (!isBytes(used) || !(quota > 0)) return 0;
  return (used / quota) * 100;
}

/** Highest warning threshold reached (100, 90 or 80), or null below 80%. */
export function warningLevelFor(percent) {
  if (percent >= 100) return 100;
  if (percent >= 90) return 90;
  if (percent >= 80) return 80;
  return null;
}

/** Session key for one threshold, so each level warns once per session. */
export function storageWarningKey(level) {
  return `storage_warning_shown_${level}`;
}

/**
 * Threshold to announce now, or null. `isShown(level)` tells whether that level was already announced this session.
 */
export function pendingWarningLevel(percent, isShown) {
  const level = warningLevelFor(percent);
  return level && !isShown(level) ? level : null;
}

/** Toast content for a threshold. The text names the percentage and is plain text only. */
export function storageWarningToast(level, percent) {
  const rounded = Math.round(percent);
  if (level === 100) {
    return { type: 'error', message: 'Your storage is full. Please delete some files to continue uploading.', duration: 6000 };
  }
  if (level === 90) {
    return { type: 'warning', message: `Storage is ${rounded}% full. Consider freeing up space soon.`, duration: 6000 };
  }
  return { type: 'warning', message: `Storage is ${rounded}% full.`, duration: 5000 };
}

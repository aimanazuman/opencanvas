import { useEffect } from 'react';
import { useToast } from '../components/Toast';
import useStorageUsage from './useStorageUsage';
import { pendingWarningLevel, storageWarningKey, storageWarningToast } from '../utils/storageUsage';

function wasShown(key) {
  try {
    return sessionStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

function markShown(key) {
  try {
    sessionStorage.setItem(key, 'true');
  } catch {
    // Storage unavailable (for example blocked by the browser): the toast may show again on the next render.
  }
}

/**
 * Shows a toast when storage usage reaches 80%, 90% or 100%. Each threshold is announced once per session.
 * Uses the effective quota from the usage endpoint, so the percentage matches the server's own limit.
 * Waits for the usage figures before deciding, so it never warns from the uncapped raw quota while loading.
 */
export default function useStorageWarning() {
  const toast = useToast();
  const { status, quota, percent } = useStorageUsage();

  useEffect(() => {
    if (status !== 'ready' || !(quota > 0)) return;
    const level = pendingWarningLevel(percent, (candidate) => wasShown(storageWarningKey(candidate)));
    if (!level) return;
    const { type, message, duration } = storageWarningToast(level, percent);
    toast[type](message, duration);
    markShown(storageWarningKey(level));
  }, [status, quota, percent, toast]);
}

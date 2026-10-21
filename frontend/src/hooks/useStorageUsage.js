import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { filesApi } from '../services/api';
import { percentOf, resolveStorageUsage } from '../utils/storageUsage';

/**
 * Live storage figures for the signed-in user, from GET /api/files/usage/ (effective quota).
 * status: 'loading' until the request for the current user figures settles, then 'ready'.
 * If the request fails, the raw figures on the user object are used (source: 'user').
 */
export default function useStorageUsage() {
  const { user } = useAuth();
  const hasUser = Boolean(user);
  const storageUsed = user?.storage_used;
  const storageQuota = user?.storage_quota;
  // Requests are keyed by the user's figures, so a change (for example after an upload) fetches again.
  const requestKey = hasUser ? `${storageUsed}:${storageQuota}` : null;
  const [settled, setSettled] = useState({ key: null, usage: null });

  useEffect(() => {
    if (!hasUser) return undefined;
    let cancelled = false;
    filesApi.getUsage()
      .then((response) => {
        if (!cancelled) setSettled({ key: requestKey, usage: response?.data || null });
      })
      .catch(() => {
        if (!cancelled) setSettled({ key: requestKey, usage: null });
      });
    return () => {
      cancelled = true;
    };
  }, [hasUser, requestKey]);

  const status = !hasUser || settled.key === requestKey ? 'ready' : 'loading';
  const usage = status === 'ready' && hasUser ? settled.usage : null;
  const { used, quota, source } = resolveStorageUsage(user, usage);

  return { used, quota, percent: percentOf(used, quota), source, status };
}

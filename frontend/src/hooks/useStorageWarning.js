import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';

/**
 * Shows a toast warning once per session if the user's storage usage is >= 80%.
 */
export default function useStorageWarning() {
  const { user } = useAuth();
  const toast = useToast();

  useEffect(() => {
    if (!user || !user.storage_quota || user.storage_quota <= 0) return;
    if (sessionStorage.getItem('storage_warning_shown')) return;

    const pct = (user.storage_used / user.storage_quota) * 100;

    if (pct >= 100) {
      toast.error('Your storage is full. Please delete some files to continue uploading.', 6000);
      sessionStorage.setItem('storage_warning_shown', 'true');
    } else if (pct >= 90) {
      toast.warning(`Storage is ${Math.round(pct)}% full. Consider freeing up space soon.`, 6000);
      sessionStorage.setItem('storage_warning_shown', 'true');
    } else if (pct >= 80) {
      toast.warning(`Storage is ${Math.round(pct)}% full.`, 5000);
      sessionStorage.setItem('storage_warning_shown', 'true');
    }
  }, [user, toast]);
}

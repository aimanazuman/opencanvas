import { renderHook, waitFor, act } from '@testing-library/react';
import useStorageWarning from './useStorageWarning';
import { useToast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import { filesApi } from '../services/api';

jest.mock('../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../components/Toast', () => ({ useToast: jest.fn() }));
jest.mock('../services/api', () => ({ filesApi: { getUsage: jest.fn() } }));

const GB = 1024 ** 3;
const toast = { success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn() };
const setUser = (used, quota) => useAuth.mockReturnValue({ user: { storage_used: used, storage_quota: quota } });
const serverUsage = (used, quota) => Promise.resolve({ data: { storage_used: used, storage_quota: quota } });

// Lets pending promises and effects settle without relying on timers.
const flush = () => act(async () => {
  await Promise.resolve();
  await Promise.resolve();
});

beforeEach(() => {
  sessionStorage.clear();
  useToast.mockReturnValue(toast);
});

describe('useStorageWarning', () => {
  test('warns using the effective quota from the usage endpoint, not the raw user quota', async () => {
    // Raw quota would give 18%. The server's effective quota (capped by the system limit) gives 90%.
    setUser(9 * GB, 50 * GB);
    filesApi.getUsage.mockReturnValue(serverUsage(9 * GB, 10 * GB));

    renderHook(() => useStorageWarning());

    await waitFor(() => expect(toast.warning).toHaveBeenCalledWith('Storage is 90% full. Consider freeing up space soon.', 6000));
    expect(toast.warning).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();
  });

  test('stays quiet while the usage request is still pending', async () => {
    setUser(9 * GB, 10 * GB); // raw figures alone would warn
    filesApi.getUsage.mockReturnValue(new Promise(() => {}));

    renderHook(() => useStorageWarning());
    await flush();

    expect(toast.warning).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  test('does not warn below 80%', async () => {
    setUser(7.9 * GB, 10 * GB);
    filesApi.getUsage.mockReturnValue(serverUsage(7.9 * GB, 10 * GB));

    renderHook(() => useStorageWarning());
    await waitFor(() => expect(filesApi.getUsage).toHaveBeenCalledTimes(1));
    await flush();

    expect(toast.warning).not.toHaveBeenCalled();
    expect(sessionStorage.length).toBe(0);
  });

  test('announces each threshold once per session as usage climbs', async () => {
    setUser(8.5 * GB, 10 * GB);
    filesApi.getUsage.mockReturnValueOnce(serverUsage(8.5 * GB, 10 * GB));
    const { rerender } = renderHook(() => useStorageWarning());
    await waitFor(() => expect(toast.warning).toHaveBeenCalledWith('Storage is 85% full.', 5000));

    setUser(9.2 * GB, 10 * GB);
    filesApi.getUsage.mockReturnValueOnce(serverUsage(9.2 * GB, 10 * GB));
    rerender();
    await waitFor(() => expect(toast.warning).toHaveBeenCalledWith('Storage is 92% full. Consider freeing up space soon.', 6000));

    // Still in the 90% band: no new toast.
    setUser(9.4 * GB, 10 * GB);
    filesApi.getUsage.mockReturnValueOnce(serverUsage(9.4 * GB, 10 * GB));
    rerender();
    await waitFor(() => expect(filesApi.getUsage).toHaveBeenCalledTimes(3));
    await flush();
    expect(toast.warning).toHaveBeenCalledTimes(2);

    setUser(10 * GB, 10 * GB);
    filesApi.getUsage.mockReturnValueOnce(serverUsage(10 * GB, 10 * GB));
    rerender();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      'Your storage is full. Please delete some files to continue uploading.', 6000,
    ));
    expect(toast.warning).toHaveBeenCalledTimes(2);
  });

  test('does not repeat a threshold after a remount in the same session', async () => {
    setUser(8.5 * GB, 10 * GB);
    filesApi.getUsage.mockReturnValue(serverUsage(8.5 * GB, 10 * GB));

    const view = renderHook(() => useStorageWarning());
    await waitFor(() => expect(toast.warning).toHaveBeenCalledTimes(1));
    view.unmount();

    renderHook(() => useStorageWarning());
    await waitFor(() => expect(filesApi.getUsage).toHaveBeenCalledTimes(2));
    await flush();

    expect(toast.warning).toHaveBeenCalledTimes(1);
  });

  test('falls back to the raw user figures when the usage request fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    setUser(9 * GB, 10 * GB);
    filesApi.getUsage.mockRejectedValue(new Error('down'));

    renderHook(() => useStorageWarning());

    await waitFor(() => expect(toast.warning).toHaveBeenCalledWith('Storage is 90% full. Consider freeing up space soon.', 6000));
    console.error.mockRestore();
  });

  test('does nothing without a quota', async () => {
    setUser(1 * GB, 0);
    filesApi.getUsage.mockReturnValue(serverUsage(1 * GB, 0));

    renderHook(() => useStorageWarning());
    await waitFor(() => expect(filesApi.getUsage).toHaveBeenCalledTimes(1));
    await flush();

    expect(toast.warning).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });
});

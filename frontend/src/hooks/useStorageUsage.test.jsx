import { renderHook, waitFor } from '@testing-library/react';
import useStorageUsage from './useStorageUsage';
import { useAuth } from '../contexts/AuthContext';
import { filesApi } from '../services/api';

jest.mock('../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../services/api', () => ({ filesApi: { getUsage: jest.fn() } }));

const GB = 1024 ** 3;
const setUser = (user) => useAuth.mockReturnValue({ user });

describe('useStorageUsage', () => {
  test('starts loading, then uses the effective quota from the usage endpoint', async () => {
    setUser({ storage_used: 1 * GB, storage_quota: 10 * GB });
    filesApi.getUsage.mockResolvedValue({
      data: { storage_used: 2 * GB, storage_quota: 5 * GB, raw_storage_quota: 10 * GB },
    });

    const { result } = renderHook(() => useStorageUsage());
    expect(result.current.status).toBe('loading');

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.used).toBe(2 * GB);
    expect(result.current.quota).toBe(5 * GB);
    expect(result.current.source).toBe('server');
    expect(result.current.percent).toBeCloseTo(40);
  });

  test('falls back to the raw user quota when the usage request fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    setUser({ storage_used: 3 * GB, storage_quota: 10 * GB });
    filesApi.getUsage.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useStorageUsage());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    expect(result.current.source).toBe('user');
    expect(result.current.quota).toBe(10 * GB);
    expect(result.current.percent).toBeCloseTo(30);
    console.error.mockRestore();
  });

  test('does not call the endpoint without a signed-in user', () => {
    useAuth.mockReturnValue({ user: null });

    const { result } = renderHook(() => useStorageUsage());

    expect(filesApi.getUsage).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({ status: 'ready', used: 0, quota: 0, percent: 0 });
  });

  test('fetches again when the stored figures change, for example after an upload', async () => {
    setUser({ storage_used: 1 * GB, storage_quota: 10 * GB });
    filesApi.getUsage.mockResolvedValueOnce({ data: { storage_used: 1 * GB, storage_quota: 10 * GB } });

    const { result, rerender } = renderHook(() => useStorageUsage());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    setUser({ storage_used: 4 * GB, storage_quota: 10 * GB });
    filesApi.getUsage.mockResolvedValueOnce({ data: { storage_used: 4 * GB, storage_quota: 10 * GB } });
    rerender();

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.used).toBe(4 * GB);
    expect(result.current.source).toBe('server');
    expect(filesApi.getUsage).toHaveBeenCalledTimes(2);
  });
});

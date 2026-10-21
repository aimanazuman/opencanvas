import { renderHook, act, waitFor } from '@testing-library/react';
import { useLecturerData } from './useLecturerData';
import { coursesApi, enrollmentsApi } from '../services/api';

jest.mock('../services/api', () => ({
  coursesApi: { getAll: jest.fn() },
  enrollmentsApi: { getAll: jest.fn() },
}));

const ok = (data) => Promise.resolve({ data });

describe('useLecturerData loadFailed', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    coursesApi.getAll.mockReset();
    enrollmentsApi.getAll.mockReset();
  });
  afterEach(() => console.error.mockRestore());

  test('is false when both lists load', async () => {
    coursesApi.getAll.mockReturnValue(ok([{ id: 1 }]));
    enrollmentsApi.getAll.mockReturnValue(ok({ results: [] }));
    const { result } = renderHook(() => useLecturerData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.loadFailed).toBe(false);
    expect(result.current.courses).toEqual([{ id: 1 }]);
  });

  test('is true when a list fails and clears when loadCourses later succeeds', async () => {
    coursesApi.getAll.mockRejectedValueOnce(new Error('down')).mockReturnValue(ok([{ id: 2 }]));
    enrollmentsApi.getAll.mockReturnValue(ok([]));
    const { result } = renderHook(() => useLecturerData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.loadFailed).toBe(true);

    await act(async () => {
      await result.current.loadCourses();
    });
    expect(result.current.loadFailed).toBe(false);
    expect(result.current.courses).toEqual([{ id: 2 }]);
  });

  test('stays true until both failed lists have loaded again', async () => {
    coursesApi.getAll.mockRejectedValueOnce(new Error('down')).mockReturnValue(ok([]));
    enrollmentsApi.getAll.mockRejectedValueOnce(new Error('down')).mockReturnValue(ok([]));
    const { result } = renderHook(() => useLecturerData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.loadFailed).toBe(true);

    await act(async () => {
      await result.current.loadCourses();
    });
    expect(result.current.loadFailed).toBe(true);

    await act(async () => {
      await result.current.loadEnrollments();
    });
    expect(result.current.loadFailed).toBe(false);
  });

  test('reload clears the flag after a recovered failure', async () => {
    enrollmentsApi.getAll.mockRejectedValueOnce(new Error('down')).mockReturnValue(ok([]));
    coursesApi.getAll.mockReturnValue(ok([]));
    const { result } = renderHook(() => useLecturerData());
    await waitFor(() => expect(result.current.loadFailed).toBe(true));
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.loadFailed).toBe(false);
  });
});

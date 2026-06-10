import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  signInWithPopup: vi.fn(),
  // Must be a class because useAuth.ts calls `new GoogleAuthProvider()` at module level
  GoogleAuthProvider: class { constructor() {} },
}));

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { useAuth } from '../useAuth';

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useAuth', () => {
  it('starts with loading=true and user=null', () => {
    vi.mocked(onAuthStateChanged).mockReturnValue(vi.fn());
    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it('sets user and loading=false when auth callback fires with a user', async () => {
    const fakeUser = { uid: 'abc', email: 'a@b.com' };
    vi.mocked(onAuthStateChanged).mockImplementation((_auth, cb: unknown) => {
      (cb as (u: unknown) => void)(fakeUser);
      return vi.fn();
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(false);
    expect(result.current.user).toEqual(fakeUser);
  });

  it('sets user=null and loading=false when auth callback fires with null', () => {
    vi.mocked(onAuthStateChanged).mockImplementation((_auth, cb: unknown) => {
      (cb as (u: unknown) => void)(null);
      return vi.fn();
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('resolves loading after the 8-second safety timeout', () => {
    vi.mocked(onAuthStateChanged).mockReturnValue(vi.fn()); // never fires callback
    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);

    act(() => {
      vi.advanceTimersByTime(8001);
    });

    expect(result.current.loading).toBe(false);
  });

  it('calls signInWithEmailAndPassword with correct arguments', async () => {
    vi.mocked(onAuthStateChanged).mockReturnValue(vi.fn());
    vi.mocked(signInWithEmailAndPassword).mockResolvedValue({} as never);

    const { result } = renderHook(() => useAuth());
    await result.current.login('test@example.com', 'secret');

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'test@example.com',
      'secret'
    );
  });

  it('calls signOut when logout is called', async () => {
    vi.mocked(onAuthStateChanged).mockReturnValue(vi.fn());
    vi.mocked(signOut).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth());
    await result.current.logout();

    expect(signOut).toHaveBeenCalledOnce();
  });

  it('calls the unsubscribe function on unmount', () => {
    const unsub = vi.fn();
    vi.mocked(onAuthStateChanged).mockReturnValue(unsub);

    const { unmount } = renderHook(() => useAuth());
    unmount();

    expect(unsub).toHaveBeenCalledOnce();
  });
});

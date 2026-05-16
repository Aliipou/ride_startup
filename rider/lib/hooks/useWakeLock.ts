'use client';

import { useEffect, useRef, useCallback } from 'react';
import { DutyStatus } from '@/lib/types';

interface WakeLockSentinel {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
}

interface NavigatorWithWakeLock extends Navigator {
  wakeLock: {
    request: (type: 'screen') => Promise<WakeLockSentinel>;
  };
}

export function useWakeLock(status: DutyStatus): {
  isSupported: boolean;
  isActive: boolean;
} {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const isActiveRef = useRef(false);
  const isSupported =
    typeof window !== 'undefined' && 'wakeLock' in navigator;

  const requestWakeLock = useCallback(async () => {
    if (!isSupported) return;
    if (wakeLockRef.current && !wakeLockRef.current.released) return;

    try {
      const nav = navigator as NavigatorWithWakeLock;
      const sentinel = await nav.wakeLock.request('screen');
      wakeLockRef.current = sentinel;
      isActiveRef.current = true;

      sentinel.addEventListener('release', () => {
        isActiveRef.current = false;
        wakeLockRef.current = null;
      });
    } catch (err) {
      // Wake lock request failed — browser policy or not visible
      console.warn('Wake lock request failed:', err);
    }
  }, [isSupported]);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current && !wakeLockRef.current.released) {
      try {
        await wakeLockRef.current.release();
      } catch (err) {
        console.warn('Wake lock release failed:', err);
      } finally {
        wakeLockRef.current = null;
        isActiveRef.current = false;
      }
    }
  }, []);

  // Acquire or release based on duty status
  useEffect(() => {
    if (status === 'ONLINE' || status === 'ON_RIDE') {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    return () => {
      // Cleanup on unmount
      releaseWakeLock();
    };
  }, [status, requestWakeLock, releaseWakeLock]);

  // Reacquire wake lock when tab becomes visible again
  useEffect(() => {
    if (!isSupported) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (status === 'ONLINE' || status === 'ON_RIDE') {
          requestWakeLock();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isSupported, status, requestWakeLock]);

  return {
    isSupported,
    isActive: isActiveRef.current,
  };
}

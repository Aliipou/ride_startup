'use client';

import { useEffect, useRef, useCallback } from 'react';
import { DutyStatus } from '@/lib/types';
import { riderApi } from '@/lib/api';
import toast from 'react-hot-toast';

const LOCATION_UPDATE_INTERVAL = 5000; // 5 seconds

interface LocationState {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

export function useRiderLocation(status: DutyStatus): {
  currentLocation: LocationState | null;
  isTracking: boolean;
  permissionDenied: boolean;
} {
  const locationRef = useRef<LocationState | null>(null);
  const isTrackingRef = useRef(false);
  const permissionDeniedRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<number>(0);

  const sendLocation = useCallback(async (lat: number, lng: number) => {
    const now = Date.now();
    if (now - lastSentRef.current < LOCATION_UPDATE_INTERVAL - 500) return;
    lastSentRef.current = now;

    try {
      await riderApi.updateLocation(lat, lng);
    } catch (err) {
      // Silently fail location updates — don't disrupt rider
      console.warn('Location update failed:', err);
    }
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      return;
    }

    if (watchIdRef.current !== null) return; // Already watching

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        locationRef.current = {
          lat: latitude,
          lng: longitude,
          accuracy,
          timestamp: position.timestamp,
        };
        isTrackingRef.current = true;
        permissionDeniedRef.current = false;
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          permissionDeniedRef.current = true;
          isTrackingRef.current = false;
          toast.error(
            'GPS permission denied. Enable location to go online.',
            { id: 'gps-denied', duration: 5000 }
          );
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          console.warn('Position unavailable:', error.message);
        } else if (error.code === error.TIMEOUT) {
          console.warn('Geolocation timeout');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 3000,
      }
    );

    // Send location every 5 seconds
    intervalRef.current = setInterval(() => {
      if (locationRef.current && !permissionDeniedRef.current) {
        sendLocation(locationRef.current.lat, locationRef.current.lng);
      }
    }, LOCATION_UPDATE_INTERVAL);
  }, [sendLocation]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation?.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isTrackingRef.current = false;
  }, []);

  useEffect(() => {
    if (status === 'OFFLINE') {
      stopTracking();
    } else {
      startTracking();
    }

    return () => {
      stopTracking();
    };
  }, [status, startTracking, stopTracking]);

  return {
    currentLocation: locationRef.current,
    isTracking: isTrackingRef.current,
    permissionDenied: permissionDeniedRef.current,
  };
}

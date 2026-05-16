'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRiderDutyStore } from '@/lib/store/riderDutyStore';
import { useRiderAuthStore } from '@/lib/store/riderAuthStore';
import { DutyStatus, RideRequest } from '@/lib/types';
import { riderApi } from '@/lib/api';
import toast from 'react-hot-toast';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
const RECONNECT_DELAY = 3000;
const RIDE_REQUEST_TIMEOUT = 30000;

type WSMessage =
  | { type: 'new_ride_request'; data: RideRequest }
  | { type: 'ride_cancelled'; data: { rideId: string } }
  | { type: 'earnings_update'; data: { today: number; available: number; pending: number } }
  | { type: 'ping' };

export function useRiderWebSocket(status: DutyStatus): {
  isConnected: boolean;
} {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectedRef = useRef(false);
  const shouldConnectRef = useRef(false);

  const { rider, accessToken } = useRiderAuthStore();
  const {
    setIncomingRide,
    clearIncomingRide,
    setCurrentRide,
    updateEarnings,
  } = useRiderDutyStore();

  const clearRideTimer = useCallback(() => {
    if (rideTimerRef.current) {
      clearTimeout(rideTimerRef.current);
      rideTimerRef.current = null;
    }
  }, []);

  const handleAutoDecline = useCallback(
    async (rideId: string) => {
      clearIncomingRide();
      try {
        await riderApi.declineRide(rideId);
      } catch (err) {
        console.warn('Auto-decline failed:', err);
      }
    },
    [clearIncomingRide]
  );

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      let message: WSMessage;
      try {
        message = JSON.parse(event.data as string);
      } catch {
        return;
      }

      switch (message.type) {
        case 'new_ride_request': {
          const ride = message.data;
          setIncomingRide(ride);

          // Haptic feedback
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200, 100, 200]);
          }

          // Notification sound
          try {
            const audio = new Audio('/sounds/ride-request.mp3');
            audio.play().catch(() => {}); // Ignore autoplay errors
          } catch {
            // Audio not supported
          }

          // Auto-decline after 30 seconds
          clearRideTimer();
          rideTimerRef.current = setTimeout(() => {
            handleAutoDecline(ride.id);
          }, RIDE_REQUEST_TIMEOUT);

          break;
        }

        case 'ride_cancelled': {
          clearRideTimer();
          clearIncomingRide();
          setCurrentRide(null);
          toast.error('Ride was cancelled by the customer');
          break;
        }

        case 'earnings_update': {
          updateEarnings(message.data);
          break;
        }

        case 'ping': {
          // Respond to keep connection alive
          wsRef.current?.send(JSON.stringify({ type: 'pong' }));
          break;
        }
      }
    },
    [setIncomingRide, clearIncomingRide, setCurrentRide, updateEarnings, clearRideTimer, handleAutoDecline]
  );

  const connect = useCallback(() => {
    if (!rider?.id || !accessToken) return;
    if (!shouldConnectRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const url = `${WS_URL}/ws/rider/${rider.id}?token=${encodeURIComponent(accessToken)}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        isConnectedRef.current = true;
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      };

      ws.onmessage = handleMessage;

      ws.onerror = (err) => {
        console.warn('WebSocket error:', err);
      };

      ws.onclose = () => {
        isConnectedRef.current = false;
        wsRef.current = null;

        // Auto-reconnect if should be connected
        if (shouldConnectRef.current) {
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, RECONNECT_DELAY);
        }
      };
    } catch (err) {
      console.warn('WebSocket connection failed:', err);
      // Try to reconnect
      if (shouldConnectRef.current) {
        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, RECONNECT_DELAY);
      }
    }
  }, [rider?.id, accessToken, handleMessage]);

  const disconnect = useCallback(() => {
    shouldConnectRef.current = false;
    clearRideTimer();

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    isConnectedRef.current = false;
  }, [clearRideTimer]);

  useEffect(() => {
    if (status === 'OFFLINE') {
      disconnect();
    } else {
      shouldConnectRef.current = true;
      connect();
    }

    return () => {
      disconnect();
    };
  }, [status, connect, disconnect]);

  return {
    isConnected: isConnectedRef.current,
  };
}

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Flag, Bike, Zap, X, Check } from 'lucide-react';
import { RideRequest } from '@/lib/types';
import clsx from 'clsx';

interface IncomingRideCardProps {
  ride: RideRequest;
  onAccept: () => void;
  onDecline: () => void;
  timeoutSeconds?: number;
}

const TOTAL_SECONDS = 30;
const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function IncomingRideCard({
  ride,
  onAccept,
  onDecline,
  timeoutSeconds = TOTAL_SECONDS,
}: IncomingRideCardProps) {
  const [secondsLeft, setSecondsLeft] = useState(timeoutSeconds);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoDeclinedRef = useRef(false);

  const progress = secondsLeft / timeoutSeconds;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const handleDecline = useCallback(() => {
    if (isDeclining || isAccepting) return;
    setIsDeclining(true);
    if (timerRef.current) clearInterval(timerRef.current);
    onDecline();
  }, [isDeclining, isAccepting, onDecline]);

  const handleAccept = useCallback(async () => {
    if (isAccepting || isDeclining) return;
    setIsAccepting(true);
    if (timerRef.current) clearInterval(timerRef.current);
    onAccept();
  }, [isAccepting, isDeclining, onAccept]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          if (!hasAutoDeclinedRef.current) {
            hasAutoDeclinedRef.current = true;
            // Trigger auto-decline on next tick
            setTimeout(() => handleDecline(), 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [handleDecline]);

  const strokeColor =
    secondsLeft > 15
      ? '#1B9E77'
      : secondsLeft > 8
      ? '#F59E0B'
      : '#EF4444';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Incoming ride request"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative w-full max-w-lg mx-auto animate-slide-up">
        <div className="bg-white rounded-t-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-dark px-6 pt-6 pb-4 flex items-center justify-between">
            <div>
              <p className="text-primary-400 text-xs font-semibold uppercase tracking-widest">
                New Ride Request
              </p>
              <h2 className="text-white text-xl font-bold mt-0.5">
                Incoming Request
              </h2>
            </div>

            {/* Circular Timer */}
            <div className="relative flex items-center justify-center w-16 h-16">
              <svg
                className="absolute inset-0 -rotate-90"
                width="64"
                height="64"
                viewBox="0 0 100 100"
                aria-hidden="true"
              >
                {/* Background ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="none"
                  stroke="#374151"
                  strokeWidth="8"
                />
                {/* Progress ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s ease' }}
                />
              </svg>
              <span
                className="relative text-white font-bold text-lg tabular-nums"
                aria-live="polite"
                aria-label={`${secondsLeft} seconds remaining`}
              >
                {secondsLeft}
              </span>
            </div>
          </div>

          {/* Route Info */}
          <div className="px-6 py-5 space-y-4">
            {/* Pickup */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center mt-0.5">
                <MapPin className="w-4 h-4 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Pickup
                </p>
                <p className="text-dark font-semibold text-sm mt-0.5 truncate">
                  {ride.pickupAddress}
                </p>
              </div>
            </div>

            {/* Dashed connector */}
            <div className="ml-4 w-0.5 h-4 border-l-2 border-dashed border-gray-300" />

            {/* Dropoff */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center mt-0.5">
                <Flag className="w-4 h-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Dropoff
                </p>
                <p className="text-dark font-semibold text-sm mt-0.5 truncate">
                  {ride.dropoffAddress}
                </p>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-3 px-6 pb-4">
            {/* Distance */}
            <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5 text-center">
              <p className="text-xs text-gray-500 font-medium">Distance</p>
              <p className="text-dark font-bold text-base mt-0.5">
                {ride.distance.toFixed(1)} km
              </p>
            </div>

            {/* Price */}
            <div className="flex-1 bg-primary-50 rounded-xl px-3 py-2.5 text-center">
              <p className="text-xs text-primary-600 font-medium">Earnings</p>
              <p className="text-primary-700 font-bold text-base mt-0.5">
                €{ride.price.toFixed(2)}
              </p>
            </div>

            {/* Bike type */}
            <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5 text-center">
              <p className="text-xs text-gray-500 font-medium">Bike</p>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                {ride.bikeType === 'ELECTRIC' ? (
                  <Zap className="w-3.5 h-3.5 text-accent" />
                ) : (
                  <Bike className="w-3.5 h-3.5 text-gray-600" />
                )}
                <p className="text-dark font-bold text-sm">
                  {ride.bikeType === 'ELECTRIC' ? 'Electric' : 'Standard'}
                </p>
              </div>
            </div>

            {/* Surge badge */}
            {ride.surgeMultiplier && ride.surgeMultiplier > 1 && (
              <div className="flex-shrink-0 bg-accent rounded-xl px-3 py-2.5 text-center">
                <p className="text-xs text-amber-900 font-medium">Surge</p>
                <p className="text-amber-900 font-bold text-base mt-0.5">
                  {ride.surgeMultiplier.toFixed(1)}x
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="px-6 pb-8 flex gap-3">
            {/* Decline */}
            <button
              onClick={handleDecline}
              disabled={isDeclining || isAccepting}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-red-200',
                'text-red-500 font-bold text-base transition-all duration-200',
                'hover:bg-red-50 active:scale-95',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              aria-label="Decline ride"
            >
              <X className="w-5 h-5" />
              {isDeclining ? 'Declining...' : 'Decline'}
            </button>

            {/* Accept */}
            <button
              onClick={handleAccept}
              disabled={isAccepting || isDeclining}
              className={clsx(
                'flex-[2] flex items-center justify-center gap-2 py-4 rounded-2xl',
                'bg-primary text-white font-bold text-base transition-all duration-200',
                'hover:bg-primary-600 active:scale-95 shadow-lg shadow-primary/30',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'animate-pulse-green'
              )}
              aria-label="Accept ride"
            >
              <Check className="w-5 h-5" />
              {isAccepting ? 'Accepting...' : 'Accept Ride'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

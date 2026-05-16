'use client';

import { useEffect, useRef, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import clsx from 'clsx';

interface EarningsCounterProps {
  amount: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showTrend?: boolean;
  className?: string;
}

export default function EarningsCounter({
  amount,
  label = "Today's Earnings",
  size = 'md',
  showTrend = false,
  className,
}: EarningsCounterProps) {
  const prevAmountRef = useRef(amount);
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayAmount, setDisplayAmount] = useState(amount);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (amount === prevAmountRef.current) {
      setDisplayAmount(amount);
      return;
    }

    const startAmount = prevAmountRef.current;
    const endAmount = amount;
    const difference = endAmount - startAmount;
    const duration = 600; // ms
    const startTime = performance.now();

    setIsAnimating(true);

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startAmount + difference * eased;
      setDisplayAmount(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayAmount(endAmount);
        setIsAnimating(false);
        prevAmountRef.current = endAmount;
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [amount]);

  const sizeClasses = {
    sm: { amount: 'text-2xl', label: 'text-xs', symbol: 'text-lg' },
    md: { amount: 'text-4xl', label: 'text-sm', symbol: 'text-2xl' },
    lg: { amount: 'text-6xl', label: 'text-base', symbol: 'text-3xl' },
  };

  const classes = sizeClasses[size];

  return (
    <div className={clsx('flex flex-col items-center', className)}>
      <p className={clsx('text-gray-400 font-medium mb-1', classes.label)}>
        {label}
      </p>
      <div
        className={clsx(
          'flex items-baseline gap-1 tabular-nums',
          isAnimating && 'animate-count-up'
        )}
        aria-live="polite"
        aria-label={`${label}: €${displayAmount.toFixed(2)}`}
      >
        <span className={clsx('text-primary font-bold', classes.symbol)}>€</span>
        <span className={clsx('text-dark font-extrabold', classes.amount)}>
          {displayAmount.toFixed(2)}
        </span>
      </div>
      {showTrend && amount > 0 && (
        <div className="flex items-center gap-1 mt-1">
          <TrendingUp className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs text-primary font-semibold">Active earnings</span>
        </div>
      )}
    </div>
  );
}

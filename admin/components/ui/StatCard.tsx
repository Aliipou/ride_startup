import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  icon?: React.ComponentType<{ className?: string; size?: number }>;
  iconColor?: string;
  iconBg?: string;
  loading?: boolean;
  prefix?: string;
  suffix?: string;
}

export default function StatCard({
  title,
  value,
  delta,
  deltaLabel = 'vs yesterday',
  icon: Icon,
  iconColor = 'text-primary',
  iconBg = 'bg-primary/10',
  loading = false,
  prefix,
  suffix,
}: StatCardProps) {
  if (loading) {
    return (
      <div className="card p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="skeleton h-3.5 w-24 rounded" />
            <div className="skeleton h-8 w-32 rounded" />
            <div className="skeleton h-3 w-28 rounded" />
          </div>
          <div className="skeleton h-11 w-11 rounded-xl" />
        </div>
      </div>
    );
  }

  const isPositive = delta !== undefined && delta > 0;
  const isNegative = delta !== undefined && delta < 0;
  const isNeutral = delta === undefined || delta === 0;

  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 leading-tight">
            {prefix && <span className="text-lg">{prefix}</span>}
            {typeof value === 'number' ? value.toLocaleString('fi-FI') : value}
            {suffix && <span className="text-lg">{suffix}</span>}
          </p>

          {delta !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {isPositive && (
                <TrendingUp
                  size={13}
                  className="text-emerald-500 flex-shrink-0"
                  data-testid="trend-up"
                />
              )}
              {isNegative && (
                <TrendingDown
                  size={13}
                  className="text-red-500 flex-shrink-0"
                  data-testid="trend-down"
                />
              )}
              {isNeutral && (
                <Minus
                  size={13}
                  className="text-gray-400 flex-shrink-0"
                  data-testid="trend-neutral"
                />
              )}
              <span
                className={cn(
                  'text-xs font-medium',
                  isPositive && 'text-emerald-600',
                  isNegative && 'text-red-600',
                  isNeutral && 'text-gray-400',
                )}
              >
                {delta > 0 ? '+' : ''}
                {delta}%
              </span>
              <span className="text-xs text-gray-400">{deltaLabel}</span>
            </div>
          )}
        </div>

        {Icon && (
          <div
            className={cn(
              'flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center',
              iconBg,
            )}
          >
            <Icon size={22} className={iconColor} />
          </div>
        )}
      </div>
    </div>
  );
}

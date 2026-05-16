import { cn } from '@/lib/utils';
import type { RideStatus } from '@/lib/api';

type ExtendedStatus = RideStatus | 'ACTIVE' | 'BANNED' | 'ONLINE' | 'OFFLINE' | 'ON_RIDE' | 'SUSPENDED';

interface StatusBadgeProps {
  status: ExtendedStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<ExtendedStatus, { label: string; classes: string }> = {
  PENDING: {
    label: 'Pending',
    classes: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  },
  ACCEPTED: {
    label: 'Accepted',
    classes: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    classes: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  COMPLETED: {
    label: 'Completed',
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  CANCELLED: {
    label: 'Cancelled',
    classes: 'bg-red-50 text-red-700 border-red-200',
  },
  ACTIVE: {
    label: 'Active',
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  BANNED: {
    label: 'Banned',
    classes: 'bg-red-50 text-red-700 border-red-200',
  },
  ONLINE: {
    label: 'Online',
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  OFFLINE: {
    label: 'Offline',
    classes: 'bg-gray-50 text-gray-600 border-gray-200',
  },
  ON_RIDE: {
    label: 'On Ride',
    classes: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  SUSPENDED: {
    label: 'Suspended',
    classes: 'bg-orange-50 text-orange-700 border-orange-200',
  },
};

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    classes: 'bg-gray-50 text-gray-600 border-gray-200',
  };

  return (
    <span
      data-testid={`status-badge-${status}`}
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1',
        config.classes,
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0',
          status === 'COMPLETED' || status === 'ACTIVE' || status === 'ONLINE'
            ? 'bg-emerald-500'
            : status === 'CANCELLED' || status === 'BANNED' || status === 'SUSPENDED'
            ? 'bg-red-500'
            : status === 'OFFLINE'
            ? 'bg-gray-400'
            : 'bg-yellow-500',
        )}
      />
      {config.label}
    </span>
  );
}

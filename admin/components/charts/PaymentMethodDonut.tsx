'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface PaymentMethodDonutProps {
  data: Array<{ method: string; amount: number; count: number }>;
  loading?: boolean;
}

const COLORS: Record<string, string> = {
  CASH: '#1B9E77',
  CARD: '#F59E0B',
  WALLET: '#3B82F6',
};

const DEFAULT_COLORS = ['#1B9E77', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899'];

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { count: number } }>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-lg px-3 py-2">
      <p className="text-xs font-semibold text-gray-700 mb-1">{payload[0].name}</p>
      <p className="text-sm font-bold text-gray-900">€{payload[0].value.toFixed(2)}</p>
      <p className="text-xs text-gray-400">{payload[0].payload.count} rides</p>
    </div>
  );
}

export default function PaymentMethodDonut({
  data,
  loading = false,
}: PaymentMethodDonutProps) {
  if (loading) {
    return (
      <div className="card p-5">
        <div className="skeleton h-4 w-40 rounded mb-1" />
        <div className="skeleton h-3 w-32 rounded mb-5" />
        <div className="skeleton h-48 w-full rounded" />
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: d.method,
    value: d.amount,
    count: d.count,
  }));

  return (
    <div className="card p-5">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-gray-900">
          Revenue by Payment Method
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">Selected period</p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[entry.name] ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => (
              <span className="text-xs text-gray-600">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

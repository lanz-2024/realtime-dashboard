'use client';

import { Sparkline } from '@/components/charts/Sparkline';

type Trend = 'up' | 'down' | 'stable';

interface MetricCardProps {
  title: string;
  value: number;
  unit: string;
  trend?: Trend;
  sparklineData?: number[];
  color?: string;
  precision?: number;
}

export function MetricCard({
  title,
  value,
  unit,
  trend = 'stable',
  sparklineData = [],
  color = '#3b82f6',
  precision = 1,
}: MetricCardProps) {
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
  const trendColor =
    trend === 'up' ? 'text-red-400' : trend === 'down' ? 'text-green-400' : 'text-gray-400';

  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
        <span className={`text-xs ${trendColor}`}>{trendIcon}</span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <span className="text-3xl font-bold text-white">{value.toFixed(precision)}</span>
          <span className="text-gray-400 text-sm ml-1">{unit}</span>
        </div>
        {sparklineData.length > 0 && (
          <Sparkline data={sparklineData} color={color} width={80} height={40} />
        )}
      </div>
    </div>
  );
}

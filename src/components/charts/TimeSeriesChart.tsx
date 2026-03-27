'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface TimeSeriesDataPoint {
  time: number;
  value: number;
}

export interface TimeSeriesChartProps {
  data: TimeSeriesDataPoint[];
  label: string;
  color?: string;
  unit?: string;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

interface TooltipPayloadEntry {
  value: number;
  dataKey: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: number;
  unit: string;
  metricLabel: string;
}

function CustomTooltip({ active, payload, label, unit, metricLabel }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  if (!entry) return null;

  return (
    <div className="rounded border border-gray-700 bg-gray-900 px-3 py-2 text-xs shadow-lg">
      <p className="text-gray-400">{label !== undefined ? formatTime(label) : ''}</p>
      <p className="font-semibold text-gray-100">
        {metricLabel}:{' '}
        <span className="text-indigo-400">
          {typeof entry.value === 'number' ? entry.value.toFixed(2) : String(entry.value)}
          {unit ? ` ${unit}` : ''}
        </span>
      </p>
    </div>
  );
}

/**
 * Live-updating time-series line chart with axes and tooltip.
 * Animation is disabled for high-frequency updates to prevent visual jitter.
 */
export function TimeSeriesChart({
  data,
  label,
  color = '#6366f1',
  unit = '',
}: TimeSeriesChartProps) {
  const chartData = data.map((d) => ({ time: d.time, value: d.value }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
        <XAxis
          dataKey="time"
          tickFormatter={formatTime}
          tick={{ fontSize: 10, fill: '#6b7280' }}
          tickLine={false}
          axisLine={{ stroke: '#374151' }}
          minTickGap={60}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => (unit ? `${v}${unit}` : String(v))}
          width={48}
        />
        <Tooltip
          content={<CustomTooltip unit={unit} metricLabel={label} />}
          cursor={{ stroke: '#374151', strokeDasharray: '4 2' }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
          activeDot={{ r: 4, fill: color, stroke: '#111827', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

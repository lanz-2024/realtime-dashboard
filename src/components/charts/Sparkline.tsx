'use client';

import { Line, LineChart, ResponsiveContainer } from 'recharts';

export interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

interface SparklinePoint {
  v: number;
}

/**
 * Tiny inline sparkline chart — no axes, no tooltips, no legend.
 * Used inside MetricCard to show recent trend at a glance.
 */
export function Sparkline({ data, color = '#6366f1', width, height = 40 }: SparklineProps) {
  const chartData: SparklinePoint[] = data.map((v) => ({ v }));

  return (
    <ResponsiveContainer width={width ?? '100%'} height={height}>
      <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

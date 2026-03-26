'use client';

import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts';

export interface GaugeChartProps {
  value: number;
  label: string;
  color?: string;
  unit?: string;
  /** Min value for scale. Default: 0 */
  min?: number;
  /** Max value for scale. Default: 100 */
  max?: number;
}

/**
 * Semi-circular gauge built with Recharts RadialBarChart.
 * Displays current value in the center with label below.
 */
export function GaugeChart({
  value,
  label,
  color = '#6366f1',
  unit = '',
  min = 0,
  max = 100,
}: GaugeChartProps) {
  // Clamp and normalise to 0–100 for RadialBar fill
  const clamped = Math.max(min, Math.min(max, value));
  const pct = ((clamped - min) / (max - min)) * 100;

  const data = [{ value: pct, fill: color }];

  const displayValue =
    Number.isInteger(value) ? String(value) : value.toFixed(value >= 100 ? 0 : 1);

  return (
    <div className='relative flex flex-col items-center'>
      <ResponsiveContainer width='100%' height={140}>
        <RadialBarChart
          innerRadius='65%'
          outerRadius='100%'
          data={data}
          startAngle={180}
          endAngle={0}
          cx='50%'
          cy='80%'
        >
          {/* Background track */}
          <RadialBar
            dataKey='value'
            cornerRadius={4}
            background={{ fill: '#1f2937' }}
            isAnimationActive={false}
          />
          <PolarAngleAxis type='number' domain={[0, 100]} tick={false} />
        </RadialBarChart>
      </ResponsiveContainer>

      {/* Center label overlay */}
      <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-end pb-2'>
        <span className='text-2xl font-bold leading-none text-gray-100'>
          {displayValue}
          {unit && <span className='ml-0.5 text-sm font-normal text-gray-400'>{unit}</span>}
        </span>
        <span className='mt-1 text-xs text-gray-500'>{label}</span>
      </div>
    </div>
  );
}

import { aggregate, rollingAverage } from '@/lib/data/aggregator';
import type { TimeSeriesPoint } from '@/lib/data/store';
import { describe, expect, it } from 'vitest';

// ─── rollingAverage ───────────────────────────────────────────────────────────

describe('rollingAverage', () => {
  it('returns empty array for empty input', () => {
    expect(rollingAverage([], 3)).toEqual([]);
  });

  it('returns empty array when windowSize is 0', () => {
    const pts: TimeSeriesPoint[] = [{ timestamp: 1000, value: 10 }];
    expect(rollingAverage(pts, 0)).toEqual([]);
  });

  it('computes single-point average correctly', () => {
    const pts: TimeSeriesPoint[] = [{ timestamp: 1000, value: 42 }];
    const result = rollingAverage(pts, 3);
    expect(result).toHaveLength(1);
    expect(result[0]?.value).toBe(42);
  });

  it('computes moving average over a window of 3', () => {
    const pts: TimeSeriesPoint[] = [
      { timestamp: 1000, value: 10 },
      { timestamp: 2000, value: 20 },
      { timestamp: 3000, value: 30 },
      { timestamp: 4000, value: 40 },
    ];
    const result = rollingAverage(pts, 3);

    // Index 0: avg([10]) = 10
    expect(result[0]?.value).toBeCloseTo(10);
    // Index 1: avg([10,20]) = 15
    expect(result[1]?.value).toBeCloseTo(15);
    // Index 2: avg([10,20,30]) = 20
    expect(result[2]?.value).toBeCloseTo(20);
    // Index 3: avg([20,30,40]) = 30
    expect(result[3]?.value).toBeCloseTo(30);
  });

  it('preserves original timestamps', () => {
    const pts: TimeSeriesPoint[] = [
      { timestamp: 5000, value: 1 },
      { timestamp: 6000, value: 2 },
    ];
    const result = rollingAverage(pts, 2);
    expect(result[0]?.timestamp).toBe(5000);
    expect(result[1]?.timestamp).toBe(6000);
  });
});

// ─── aggregate (5s window) ────────────────────────────────────────────────────

describe('aggregate – 5s window', () => {
  it('returns empty array for empty input', () => {
    expect(aggregate([], '5s')).toEqual([]);
  });

  it('buckets a single point correctly', () => {
    const pts: TimeSeriesPoint[] = [{ timestamp: 5000, value: 50 }];
    const result = aggregate(pts, '5s');

    expect(result).toHaveLength(1);
    expect(result[0]?.avg).toBe(50);
    expect(result[0]?.min).toBe(50);
    expect(result[0]?.max).toBe(50);
    expect(result[0]?.count).toBe(1);
    expect(result[0]?.sum).toBe(50);
  });

  it('computes correct average for points within the same 5s bucket', () => {
    // All fall in the [5000, 10000) bucket
    const pts: TimeSeriesPoint[] = [
      { timestamp: 5000, value: 10 },
      { timestamp: 6500, value: 20 },
      { timestamp: 8999, value: 30 },
    ];
    const result = aggregate(pts, '5s');

    expect(result).toHaveLength(1);
    expect(result[0]?.avg).toBeCloseTo((10 + 20 + 30) / 3);
    expect(result[0]?.min).toBe(10);
    expect(result[0]?.max).toBe(30);
    expect(result[0]?.count).toBe(3);
    expect(result[0]?.sum).toBeCloseTo(60);
  });

  it('places points into separate buckets when they span two 5s windows', () => {
    const pts: TimeSeriesPoint[] = [
      { timestamp: 3000, value: 100 }, // bucket 0
      { timestamp: 7000, value: 200 }, // bucket 5000
    ];
    const result = aggregate(pts, '5s');

    expect(result).toHaveLength(2);
    // Buckets are returned sorted ascending
    expect(result[0]?.avg).toBe(100);
    expect(result[1]?.avg).toBe(200);
    expect(result[0]?.timestamp).toBeLessThan(result[1]?.timestamp ?? 0);
  });
});

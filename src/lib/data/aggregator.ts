import type { TimeSeriesPoint } from "./store";

export interface AggregatedPoint {
	timestamp: number; // bucket start time
	avg: number;
	min: number;
	max: number;
	count: number;
	sum: number;
}

export type AggregationWindow = "1s" | "5s" | "1m" | "5m";

const WINDOW_MS: Record<AggregationWindow, number> = {
	"1s": 1_000,
	"5s": 5_000,
	"1m": 60_000,
	"5m": 300_000,
};

/**
 * Aggregates time-series data into fixed-size buckets.
 * Each bucket contains avg/min/max/count/sum for points within the window.
 */
export function aggregate(
	points: TimeSeriesPoint[],
	window: AggregationWindow,
): AggregatedPoint[] {
	if (points.length === 0) return [];

	const windowMs = WINDOW_MS[window];
	const buckets = new Map<number, TimeSeriesPoint[]>();

	for (const point of points) {
		const bucketStart = Math.floor(point.timestamp / windowMs) * windowMs;
		const bucket = buckets.get(bucketStart);
		if (bucket) {
			bucket.push(point);
		} else {
			buckets.set(bucketStart, [point]);
		}
	}

	return Array.from(buckets.entries())
		.sort(([a], [b]) => a - b)
		.map(([timestamp, pts]) => {
			const values = pts.map((p) => p.value);
			const sum = values.reduce((acc, v) => acc + v, 0);
			return {
				timestamp,
				avg: sum / values.length,
				min: Math.min(...values),
				max: Math.max(...values),
				count: values.length,
				sum,
			};
		});
}

/**
 * Compute a rolling average over a sliding window of N points.
 */
export function rollingAverage(
	points: TimeSeriesPoint[],
	windowSize: number,
): TimeSeriesPoint[] {
	if (windowSize <= 0 || points.length === 0) return [];

	return points.map((point, index) => {
		const start = Math.max(0, index - windowSize + 1);
		const slice = points.slice(start, index + 1);
		const avg = slice.reduce((sum, p) => sum + p.value, 0) / slice.length;
		return { timestamp: point.timestamp, value: avg };
	});
}

/**
 * Compute percentage change between first and last value in a window.
 * Returns null if insufficient data.
 */
export function trendPercent(points: TimeSeriesPoint[]): number | null {
	if (points.length < 2) return null;
	const first = points[0];
	const last = points[points.length - 1];
	if (!first || !last || first.value === 0) return null;
	return ((last.value - first.value) / first.value) * 100;
}

/**
 * Determine trend direction from a series of points.
 */
export function trendDirection(
	points: TimeSeriesPoint[],
): "up" | "down" | "stable" {
	const pct = trendPercent(points);
	if (pct === null) return "stable";
	if (pct > 2) return "up";
	if (pct < -2) return "down";
	return "stable";
}

/**
 * Downsample a series to at most maxPoints using LTTB (Largest-Triangle-Three-Buckets) algorithm.
 * Preserves visual shape better than uniform sampling.
 */
export function downsample(
	points: TimeSeriesPoint[],
	maxPoints: number,
): TimeSeriesPoint[] {
	if (points.length <= maxPoints) return points;
	if (maxPoints < 3)
		return [
			points[0] ?? points[0],
			points[points.length - 1] ?? points[0],
		].filter(Boolean) as TimeSeriesPoint[];

	const sampled: TimeSeriesPoint[] = [points[0] as TimeSeriesPoint];
	const bucketSize = (points.length - 2) / (maxPoints - 2);

	for (let i = 0; i < maxPoints - 2; i++) {
		const bucketStart = Math.floor((i + 1) * bucketSize) + 1;
		const bucketEnd = Math.min(
			Math.floor((i + 2) * bucketSize) + 1,
			points.length,
		);

		// Average of next bucket for triangle calculation
		const nextBucketStart = Math.floor((i + 2) * bucketSize) + 1;
		const nextBucketEnd = Math.min(
			Math.floor((i + 3) * bucketSize) + 1,
			points.length,
		);
		const nextSlice = points.slice(nextBucketStart, nextBucketEnd);
		const avgX =
			nextSlice.reduce((s, p) => s + p.timestamp, 0) / (nextSlice.length || 1);
		const avgY =
			nextSlice.reduce((s, p) => s + p.value, 0) / (nextSlice.length || 1);

		const prev = sampled[sampled.length - 1] as TimeSeriesPoint;
		let maxArea = -1;
		let maxPoint: TimeSeriesPoint | null = null;

		for (let j = bucketStart; j < bucketEnd; j++) {
			const pt = points[j];
			if (!pt) continue;
			const area =
				Math.abs(
					(prev.timestamp - avgX) * (pt.value - prev.value) -
						(prev.timestamp - pt.timestamp) * (avgY - prev.value),
				) * 0.5;

			if (area > maxArea) {
				maxArea = area;
				maxPoint = pt;
			}
		}

		if (maxPoint) sampled.push(maxPoint);
	}

	sampled.push(points[points.length - 1] as TimeSeriesPoint);
	return sampled;
}

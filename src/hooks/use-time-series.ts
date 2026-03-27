"use client";

import { useCallback, useRef, useState } from "react";

export interface TimeSeriesPoint {
	timestamp: number;
	value: number;
}

export interface UseTimeSeriesOptions {
	/** Maximum number of data points to retain (ring buffer capacity). Default: 300 */
	capacity?: number;
}

export interface UseTimeSeriesReturn {
	data: TimeSeriesPoint[];
	append: (point: TimeSeriesPoint) => void;
	appendMany: (points: TimeSeriesPoint[]) => void;
	clear: () => void;
	size: number;
}

/**
 * Ring-buffer backed time-series hook.
 * Retains at most `capacity` data points — oldest are evicted automatically.
 * Designed for high-frequency chart data without memory growth.
 */
export function useTimeSeries({
	capacity = 300,
}: UseTimeSeriesOptions = {}): UseTimeSeriesReturn {
	// Use a ref for the underlying ring buffer to avoid re-creating it on render.
	// State is a snapshot array used to trigger re-renders.
	const bufferRef = useRef<TimeSeriesPoint[]>([]);
	const [data, setData] = useState<TimeSeriesPoint[]>([]);

	const append = useCallback(
		(point: TimeSeriesPoint) => {
			const buf = bufferRef.current;
			buf.push(point);
			if (buf.length > capacity) {
				// Evict oldest — slice is O(n) but capacity is bounded (≤300 by default)
				bufferRef.current = buf.slice(buf.length - capacity);
			}
			setData([...bufferRef.current]);
		},
		[capacity],
	);

	const appendMany = useCallback(
		(points: TimeSeriesPoint[]) => {
			const combined = [...bufferRef.current, ...points];
			bufferRef.current =
				combined.length > capacity
					? combined.slice(combined.length - capacity)
					: combined;
			setData([...bufferRef.current]);
		},
		[capacity],
	);

	const clear = useCallback(() => {
		bufferRef.current = [];
		setData([]);
	}, []);

	return { data, append, appendMany, clear, size: data.length };
}

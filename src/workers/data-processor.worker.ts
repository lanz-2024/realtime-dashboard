/**
 * Data Processor Web Worker
 *
 * Offloads CPU-intensive aggregation from the main thread.
 * Receives batches of raw metric points, computes moving averages and
 * percentile approximations, then posts results back.
 *
 * Message protocol uses discriminated unions for full type safety.
 */

export interface RawPoint {
	timestamp: number;
	value: number;
}

// ---- Inbound messages (main thread → worker) --------------------------------

export interface ProcessBatchMessage {
	type: "process_batch";
	metric: string;
	points: RawPoint[];
	windowSize: number; // moving average window
}

export interface ComputePercentilesMessage {
	type: "compute_percentiles";
	metric: string;
	points: RawPoint[];
	percentiles: number[]; // e.g. [50, 90, 95, 99]
}

export type WorkerInboundMessage =
	| ProcessBatchMessage
	| ComputePercentilesMessage;

// ---- Outbound messages (worker → main thread) --------------------------------

export interface MovingAverageResult {
	type: "moving_average_result";
	metric: string;
	smoothed: RawPoint[];
}

export interface PercentilesResult {
	type: "percentiles_result";
	metric: string;
	results: Record<number, number>; // percentile → value
}

export interface WorkerErrorMessage {
	type: "worker_error";
	message: string;
}

export type WorkerOutboundMessage =
	| MovingAverageResult
	| PercentilesResult
	| WorkerErrorMessage;

// ---- Algorithms -------------------------------------------------------------

function movingAverage(points: RawPoint[], windowSize: number): RawPoint[] {
	if (windowSize <= 0 || points.length === 0) return [];

	return points.map((point, index) => {
		const start = Math.max(0, index - windowSize + 1);
		const slice = points.slice(start, index + 1);
		const avg = slice.reduce((sum, p) => sum + p.value, 0) / slice.length;
		return { timestamp: point.timestamp, value: avg };
	});
}

function computePercentile(sortedValues: number[], p: number): number {
	if (sortedValues.length === 0) return 0;
	if (p <= 0) return sortedValues[0] ?? 0;
	if (p >= 100) return sortedValues[sortedValues.length - 1] ?? 0;

	const index = (p / 100) * (sortedValues.length - 1);
	const lower = Math.floor(index);
	const upper = Math.ceil(index);
	const fraction = index - lower;

	const lowerVal = sortedValues[lower] ?? 0;
	const upperVal = sortedValues[upper] ?? 0;

	return lowerVal + fraction * (upperVal - lowerVal);
}

// ---- Message handler --------------------------------------------------------

self.onmessage = (event: MessageEvent<WorkerInboundMessage>) => {
	const msg = event.data;

	try {
		switch (msg.type) {
			case "process_batch": {
				const smoothed = movingAverage(msg.points, msg.windowSize);
				const result: MovingAverageResult = {
					type: "moving_average_result",
					metric: msg.metric,
					smoothed,
				};
				self.postMessage(result);
				break;
			}

			case "compute_percentiles": {
				const values = msg.points.map((p) => p.value).sort((a, b) => a - b);

				const results: Record<number, number> = {};
				for (const p of msg.percentiles) {
					results[p] = computePercentile(values, p);
				}

				const result: PercentilesResult = {
					type: "percentiles_result",
					metric: msg.metric,
					results,
				};
				self.postMessage(result);
				break;
			}

			default: {
				const errorMsg: WorkerErrorMessage = {
					type: "worker_error",
					message: `Unknown message type: ${String((msg as { type: unknown }).type)}`,
				};
				self.postMessage(errorMsg);
			}
		}
	} catch (err) {
		const errorMsg: WorkerErrorMessage = {
			type: "worker_error",
			message: err instanceof Error ? err.message : "Unknown worker error",
		};
		self.postMessage(errorMsg);
	}
};

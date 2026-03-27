export class RingBuffer<T> {
	private readonly buffer: (T | undefined)[];
	private head = 0;
	private count = 0;

	constructor(private readonly capacity: number) {
		this.buffer = new Array<T | undefined>(capacity);
	}

	push(item: T): void {
		this.buffer[this.head] = item;
		this.head = (this.head + 1) % this.capacity;
		if (this.count < this.capacity) this.count++;
	}

	toArray(): T[] {
		if (this.count < this.capacity) {
			return this.buffer.slice(0, this.count) as T[];
		}
		const result: T[] = [];
		for (let i = 0; i < this.capacity; i++) {
			result.push(this.buffer[(this.head + i) % this.capacity] as T);
		}
		return result;
	}

	get size(): number {
		return this.count;
	}

	get isFull(): boolean {
		return this.count === this.capacity;
	}

	clear(): void {
		this.head = 0;
		this.count = 0;
		this.buffer.fill(undefined);
	}

	last(): T | undefined {
		if (this.count === 0) return undefined;
		const lastIndex = (this.head - 1 + this.capacity) % this.capacity;
		return this.buffer[lastIndex];
	}
}

export interface TimeSeriesPoint {
	timestamp: number;
	value: number;
}

export class TimeSeriesStore {
	private readonly stores = new Map<string, RingBuffer<TimeSeriesPoint>>();
	private readonly capacityPerMetric: number;

	constructor(capacityPerMetric = 300) {
		this.capacityPerMetric = capacityPerMetric;
	}

	push(metric: string, timestamp: number, value: number): void {
		if (!this.stores.has(metric)) {
			this.stores.set(
				metric,
				new RingBuffer<TimeSeriesPoint>(this.capacityPerMetric),
			);
		}
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		this.stores.get(metric)?.push({ timestamp, value });
	}

	getWindow(metric: string, windowMs: number): TimeSeriesPoint[] {
		const store = this.stores.get(metric);
		if (!store) return [];
		const cutoff = Date.now() - windowMs;
		return store.toArray().filter((p) => p.timestamp >= cutoff);
	}

	getAll(metric: string): TimeSeriesPoint[] {
		return this.stores.get(metric)?.toArray() ?? [];
	}

	getLatest(metric: string): TimeSeriesPoint | undefined {
		return this.stores.get(metric)?.last();
	}

	getMetrics(): string[] {
		return Array.from(this.stores.keys());
	}
}

type Listener<T> = (data: T) => void;

export class TypedEventEmitter<TEvents extends Record<string, unknown>> {
  private readonly listeners = new Map<keyof TEvents, Set<Listener<unknown>>>();

  on<K extends keyof TEvents>(event: K, listener: Listener<TEvents[K]>): () => void {
    const set = this.listeners.get(event) ?? new Set<Listener<unknown>>();
    set.add(listener as Listener<unknown>);
    this.listeners.set(event, set);

    // Return unsubscribe function
    return () => this.off(event, listener);
  }

  off<K extends keyof TEvents>(event: K, listener: Listener<TEvents[K]>): void {
    this.listeners.get(event)?.delete(listener as Listener<unknown>);
  }

  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
    for (const listener of this.listeners.get(event) ?? []) {
      listener(data);
    }
  }

  once<K extends keyof TEvents>(event: K, listener: Listener<TEvents[K]>): void {
    const wrapper: Listener<TEvents[K]> = (data) => {
      listener(data);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  removeAllListeners(event?: keyof TEvents): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  listenerCount(event: keyof TEvents): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}

// Global metric event emitter for SSE
export interface MetricEvents extends Record<string, unknown> {
  metric: { name: string; value: number; timestamp: number; unit: string };
  alert: { severity: 'info' | 'warning' | 'critical'; message: string; timestamp: string };
}

export const metricEmitter = new TypedEventEmitter<MetricEvents>();

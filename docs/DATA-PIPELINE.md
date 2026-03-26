# Data Pipeline

## Overview

```
MetricGenerator --> SSE Route --> useSSE Hook --> useTimeSeries (ring buffer) --> Charts
                                       |
                                   Web Worker
                                  (aggregation)
```

## 1. Generator (`src/lib/data/generator.ts`)

`MetricGenerator` produces synthetic metrics for 8 channels:

| Metric | Unit | Baseline | Volatility |
|--------|------|----------|------------|
| cpu | % | 35 | 0.3 |
| memory | % | 62 | 0.1 |
| request_rate | req/s | 450 | 0.4 |
| error_rate | % | 0.5 | 0.8 |
| latency_p50 | ms | 45 | 0.2 |
| latency_p99 | ms | 220 | 0.5 |
| active_connections | — | 1240 | 0.15 |
| cache_hit_rate | % | 87 | 0.05 |

Each tick applies a **random walk with mean reversion**:
```
delta = (random - 0.5) * volatility * range * 0.1
meanReversion = (baseline - lastValue) * 0.05
next = clamp(last + delta + meanReversion, min, max)
```

This produces realistic-looking time series without external data sources.

## 2. Event Emitter (`src/lib/events/emitter.ts`)

`metricEmitter` is a module-level singleton `EventEmitter`. The generation loop calls:
- `emit('metric', { name, value, timestamp, unit })` — once per metric per tick
- `emit('alert', { severity, message, timestamp })` — ~2% chance per tick

The emitter decouples the generator from the transport layer.

## 3. SSE Route (`src/app/api/events/route.ts`)

- `force-dynamic` — disables static caching so every request gets a live stream
- `runtime = 'nodejs'` — required for `EventSource`/Node streams (not Edge)
- One SSE stream per connected client; cleanup on `request.signal` abort
- Keep-alive ping every 15 seconds to prevent proxy timeouts

## 4. useSSE Hook (`src/hooks/use-sse.ts`)

- Creates a native `EventSource` with typed event listeners
- Auto-reconnects on close with exponential backoff (max 30s)
- `enabled` prop allows pause/resume without unmounting
- Cleanup on unmount — closes EventSource and clears reconnect timer

## 5. Ring Buffer (`src/lib/data/store.ts` + `src/hooks/use-time-series.ts`)

`RingBuffer<T>` — fixed-capacity circular buffer:
- `push()`: O(1) write, O(1) eviction via head pointer advance
- `toArray()`: O(n) ordered snapshot for rendering
- Capacity defaults to 300 points (~5 minutes at 1 Hz)

`useTimeSeries` wraps `RingBuffer` in React state:
- `bufferRef` holds the buffer (stable across renders)
- `setData([...buffer])` triggers re-render on each append
- Returns `{ data, append, appendMany, clear, size }`

## 6. Web Worker (`src/workers/data-processor.worker.ts`)

Off-thread aggregation for expensive operations:
- Moving average (sliding window)
- LTTB downsampling for chart rendering at large datasets

The worker receives `TimeSeriesPoint[]` via `postMessage` and returns `AggregatedPoint[]`.
This keeps the main thread free for rendering and user input.

## 7. Charts

`TimeSeriesChart` (Recharts `LineChart`):
- `isAnimationActive={false}` — prevents SVG re-animation on every data point, critical at 1 Hz
- `ResponsiveContainer` handles resize
- `minTickGap={60}` prevents X-axis tick crowding

`Sparkline` — stripped-down `LineChart` with no axes or tooltips, used in `MetricCard`.

# Architecture

## Data Flow

```
MetricGenerator (server)
    |
    +--> setInterval (1s) --> generateAll()
    |         |
    |         +--> metricEmitter.emit('metric', { name, value, timestamp, unit })
    |         +--> metricEmitter.emit('alert',  { severity, message, timestamp })
    |
    +--> /api/events (GET, SSE, force-dynamic)
              |
              +--> createSSEStream()
              |       |
              |       +--> on('metric') --> send({ event: 'metric', data: ... })
              |       +--> on('alert')  --> send({ event: 'alert',  data: ... })
              |       +--> keepAlive ping every 15s
              |       +--> abort signal --> cleanup
              |
              +--> Response(stream, SSE_HEADERS)

Client (browser)
    |
    +--> useSSE({ url, onEvent: { metric, alert }, enabled })
    |       |
    |       +--> EventSource (auto-reconnect, exponential backoff)
    |       +--> onEvent.metric(data) --> snapshotRef update + ring buffer append
    |       +--> onEvent.alert(data)  --> alertsRef prepend
    |
    +--> useTimeSeries({ capacity: 300 })  x3 (cpu, mem, req)
    |       |
    |       +--> RingBuffer<TimeSeriesPoint> via bufferRef
    |       +--> setData([...buffer]) on each append (triggers re-render)
    |
    +--> DashboardGrid --> MetricCard + AlertFeed + TimeSeriesChart (Recharts)
```

## WebSocket vs SSE Decision

**SSE is used for the metric stream** because:
- Metrics only flow server-to-client — SSE is the correct primitive
- SSE auto-reconnects natively; no reconnection logic needed in the protocol layer
- HTTP/2 multiplexes SSE streams without extra connections
- Works through all HTTP proxies and CDN edges

**WebSocket is used for control messages** because:
- Pause/resume and time-range changes are client-initiated
- Bidirectional — server needs to acknowledge and adjust its output
- Hono's WebSocket adapter handles the HTTP upgrade cleanly

## Ring Buffer Rationale

The dashboard receives one data point per metric per second. Without a bounded buffer:
- 300 seconds of data = 300 points per metric (fine)
- After 1 hour = 3,600 points per metric (still fine, but trending)
- Long-running tabs accumulate unbounded arrays that trigger GC pressure

`RingBuffer<T>` (capacity: 300) ensures the per-metric memory footprint is constant and predictable. The circular write pointer avoids O(n) shift operations on every append — only `toArray()` performs a linear scan, and it is called only on state updates.

## Component Boundaries

- `DashboardPage` — client component; owns all live state and SSE subscription
- `DashboardGrid` — presentational; receives props, no side effects
- `MetricCard` — pure display + Sparkline
- `AlertFeed` — pure display
- `TimeSeriesChart` — wraps Recharts LineChart; `isAnimationActive={false}` prevents jitter at 1 Hz
- `TimeRange`, `RefreshToggle` — controlled inputs; lift state to page

# realtime-dashboard

Real-time metrics dashboard with WebSocket + Server-Sent Events. Demonstrates high-frequency UI updates, ring buffer memory management, and Web Worker offloading.

## Why

Shows mastery of real-time web patterns:
- **SSE** for server to client metric streams (unidirectional, auto-reconnect)
- **WebSocket** for bidirectional control (pause, time range)
- **Ring buffer** prevents memory leaks with high-frequency data
- **Web Worker** offloads heavy aggregation from the main thread

## Architecture

```
Generator --> SSE Route /api/events --> useSSE Hook --> Ring Buffer --> Recharts Charts
Web Worker --> Ring Buffer
TimeRange/Toggle Controls --> WebSocket
```

## Quick Start

```bash
cp .env.example .env.local
pnpm install
pnpm dev
# Dashboard at http://localhost:3000
# No external deps — built-in data generator
```

## Tech Stack

| Technology | Version | Why |
|-----------|---------|-----|
| Next.js | 15.3 | App Router, SSE route, layout |
| Hono | 4.7 | WebSocket upgrade server |
| Recharts | 2.15 | Performant live charts |
| Drizzle ORM | 0.40 | Type-safe schema for metrics DB |
| TypeScript | 5.8 | Discriminated union message types |

## Features

- Live metric cards: CPU, memory, request rate, error rate
- Time-series line charts with history (ring buffer, 300 data points)
- Alert feed with severity levels (critical/warning/info)
- Pause/resume live updates
- Time range selector (1m/5m/15m/1h)
- Web Worker for moving average aggregation
- Self-contained mock data generator (no external deps)

## Mock mode

```bash
pnpm dev   # data generator produces realistic CPU/memory/request metrics
```

## Testing

```bash
pnpm test          # all tests
pnpm test:coverage # with coverage
```

## License

MIT

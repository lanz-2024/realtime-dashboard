# Changelog

## [0.1.0] - 2026-03-27

### Added
- Next.js 16 App Router with React 19 and TypeScript
- Hono 4 WebSocket server with typed message protocol (discriminated union)
- SSE endpoint for unidirectional metric streaming
- Realistic metric data generator (CPU, memory, request rate, error rate, latency)
- Time-series ring buffer with configurable window sizes
- Time-series aggregation at 1s, 5s, 1m, 5m intervals
- Drizzle ORM schema for metrics, alerts, and dashboards (PostgreSQL)
- Live-updating TimeSeriesChart, GaugeChart, Sparkline (Recharts)
- MetricCard with live value and trend indicator
- AlertFeed with real-time alert list
- Responsive DashboardGrid layout
- TimeRange selector and pause/resume toggle
- WebSocket hook with auto-reconnect and exponential backoff
- SSE hook with EventSource and reconnection
- Web Worker for heavy aggregation (off main thread)
- Vitest unit tests: aggregator, ring buffer, WebSocket protocol
- GitHub Actions CI: typecheck → lint → test → build
- Docker Compose: App + PostgreSQL + data simulator service
- docs/: ARCHITECTURE.md, TESTING.md, WEBSOCKET-PROTOCOL.md, DATA-PIPELINE.md, SSE-VS-WS.md, DEPLOYMENT.md, SECURITY.md, CHANGELOG.md

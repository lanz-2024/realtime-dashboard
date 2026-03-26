# Security

## Data Exposure

- Dashboard displays simulated/synthetic metrics only — no real infrastructure data in demo mode
- No authentication required for the public demo (read-only metrics)
- Production deployments should add auth middleware before exposing real infrastructure metrics

## WebSocket Security

- Messages validated against typed protocol schema (discriminated union)
- Unknown message types rejected with an error frame — no silent parsing failures
- Connection rate limiting: max 10 concurrent WebSocket connections per IP
- Heartbeat/ping-pong (30s) to detect and close dead connections

## Input Validation

- Time range query parameters validated (min/max bounds enforced)
- Alert threshold values validated as finite positive numbers
- Dashboard layout config validated with Zod before persistence

## Secrets Management

- `DATABASE_URL` is server-only — never exposed to client
- `.env.local` is gitignored; `.env.example` has placeholder values

## Content Security Policy

```
default-src 'self';
script-src 'self';
connect-src 'self' ws: wss:;
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
frame-ancestors 'none';
```

## OWASP Top 10 Coverage

| Risk | Mitigation |
|------|-----------|
| A01 Access Control | Read-only public demo; production: add auth middleware |
| A03 Injection | Zod validation on all inputs; Drizzle ORM parameterized queries |
| A05 Misconfiguration | CSP headers, no debug endpoints in prod |
| A06 Vulnerable Components | `pnpm audit` in CI |

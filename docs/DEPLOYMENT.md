# Deployment

## Vercel (Recommended)

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | No | — | PostgreSQL connection URL (in-memory if omitted) |
| `PORT` | No | `3000` | Server port |

### Deploy (Zero Config)

```bash
vercel --prod
# No env vars needed — in-memory data store works out of the box
```

## Docker (Full Stack)

```bash
docker compose up -d
# App:        http://localhost:3000
# PostgreSQL: localhost:5432
# Data sim:   Generates metrics every 100ms
```

## WebSocket / SSE

The app uses both WebSocket (for bidirectional control) and SSE (for metric streams):

- WebSocket: `ws://your-domain.com/api/ws`
- SSE: `GET /api/events` with `Accept: text/event-stream`

Ensure your reverse proxy (nginx/Vercel) supports:
- Long-lived connections (SSE timeout ≥ 60s)
- WebSocket upgrade headers

```nginx
location /api/ws {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
}
```

## Rollback

Vercel: roll back via dashboard → Deployments → Promote previous.
Docker: `docker compose down && docker compose up -d --scale app=0` then restore previous image tag.

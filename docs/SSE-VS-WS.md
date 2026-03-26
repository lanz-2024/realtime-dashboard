# SSE vs WebSocket

## Protocol Comparison

| Aspect | SSE | WebSocket |
|--------|-----|-----------|
| Direction | Server → Client only | Bidirectional |
| Protocol | HTTP/1.1, HTTP/2 | TCP upgrade (ws://) |
| Reconnect | Built-in (browser handles) | Manual |
| Proxy support | Excellent (plain HTTP) | Variable (needs upgrade support) |
| Multiplexing | HTTP/2 native | One connection per stream |
| Browser API | `EventSource` | `WebSocket` |
| Max connections | HTTP/2: unlimited; HTTP/1.1: 6/origin | No browser limit |
| Message format | Text only | Text or binary |
| Overhead | Low (plain text) | Low after upgrade |

## Tradeoffs

### SSE strengths
- Zero reconnection logic — `EventSource` retries automatically with Last-Event-ID
- Works through every HTTP proxy, load balancer, and CDN without configuration
- HTTP/2 multiplexes multiple SSE streams over one connection
- Simpler server implementation — just write to a `ReadableStream`
- No state machine to manage (no CONNECTING/OPEN/CLOSING/CLOSED on the protocol level)

### SSE limitations
- One direction only — cannot send data from client to server on the same connection
- Text only — binary payloads require base64 encoding
- HTTP/1.1 browsers are limited to 6 concurrent connections per origin (HTTP/2 resolves this)

### WebSocket strengths
- True bidirectional — ideal for chat, collaborative editing, game state
- Binary support — efficient for sensor data, audio, video frames
- Lower per-message overhead after the initial handshake
- Fine-grained control over reconnection strategy

### WebSocket limitations
- No built-in reconnection — must implement exponential backoff manually
- Proxy and firewall issues are common in corporate networks
- HTTP/2 does not carry WebSocket frames — each WS connection is its own TCP stream
- More complex server lifecycle (upgrade, ping/pong, close handshake)

## This Project's Dual Approach

This dashboard uses **both protocols**, each for what it does best:

### SSE for metric streams
The data generator emits a new value for every metric every second. This is purely server-push:
- The client never needs to send data back on the metric stream
- Auto-reconnect means the dashboard recovers from network blips without user action
- The SSE route works identically in development (localhost) and through Vercel's CDN

### WebSocket for control
Pause/resume and time-range changes are client-initiated. The server needs to:
1. Receive the command
2. Adjust the metric stream filter or snapshot window
3. Optionally acknowledge

This requires bidirectional communication, which is precisely WebSocket's domain.

### Alternative approaches considered

**WebSocket only** — possible, but loses SSE's built-in reconnection and proxy compatibility for the metric stream. Adds complexity for a purely push use case.

**HTTP polling** — dramatically simpler but introduces 1–5s latency and high request volume at scale (1 req/client/second). SSE eliminates polling entirely.

**HTTP/2 Server Push** — deprecated in most browsers (2022). Not a viable alternative.

# WebSocket Protocol

## Overview

The WebSocket connection (`/api/ws` via Hono) handles bidirectional control messages. Metric data flows over SSE; the WebSocket is used only for client-initiated commands and server acknowledgements.

## Message Types

All messages are JSON-serialized. Types are defined as Zod discriminated unions in `src/lib/ws/protocol.ts`.

### Client → Server

#### subscribe
```json
{ "type": "subscribe", "channels": ["cpu", "memory"] }
```
Ask the server to include these metric channels in future SSE output.

#### unsubscribe
```json
{ "type": "unsubscribe", "channels": ["cpu"] }
```
Remove channels from the active subscription set.

#### ping
```json
{ "type": "ping" }
```
Heartbeat. Server responds with `pong`.

#### set_time_range
```json
{ "type": "set_time_range", "range": "5m" }
```
Valid values: `"1m"` | `"5m"` | `"1h"` | `"24h"`. Adjusts the history window for snapshot responses.

### Server → Client

#### connected
```json
{ "type": "connected", "sessionId": "abc-123", "timestamp": 1700000000000 }
```
Sent immediately on WebSocket open.

#### pong
```json
{ "type": "pong", "timestamp": 1700000000000 }
```
Response to client `ping`. `timestamp` is server time.

#### metric_update
```json
{
  "type": "metric_update",
  "channel": "cpu",
  "data": { "timestamp": 1700000000000, "value": 72.5, "unit": "%" }
}
```
Single metric data point pushed to subscribed clients.

#### snapshot
```json
{
  "type": "snapshot",
  "channel": "cpu",
  "data": [
    { "timestamp": 1700000000000, "value": 70.1, "unit": "%" },
    { "timestamp": 1700000001000, "value": 71.4, "unit": "%" }
  ]
}
```
Historical data batch sent after `subscribe` or `set_time_range`.

#### alert
```json
{
  "type": "alert",
  "severity": "warning",
  "message": "High CPU usage detected: 87.3%",
  "timestamp": "2024-11-14T12:00:00.000Z"
}
```
Severity values: `"info"` | `"warning"` | `"critical"`.

#### error
```json
{ "type": "error", "code": "UNKNOWN_CHANNEL", "message": "Channel 'foo' is not available" }
```

## Connection Sequence

```
Client                            Server
  |                                  |
  |--- WebSocket upgrade ----------->|
  |<-- connected (sessionId, ts) ----|
  |                                  |
  |--- subscribe ["cpu","memory"] -->|
  |<-- snapshot (cpu, history) ------|
  |<-- snapshot (memory, history) ---|
  |                                  |
  |<-- metric_update (cpu, ...) -----|  (1 Hz, ongoing)
  |<-- metric_update (memory, ...) --|
  |                                  |
  |--- ping ------------------------>|
  |<-- pong (ts) --------------------|
  |                                  |
  |--- set_time_range "1h" --------->|
  |<-- snapshot (cpu, 1h history) ---|
  |                                  |
  |--- unsubscribe ["memory"] ------>|
  |                                  |  (memory updates stop)
  |<-- metric_update (cpu, ...) -----|
```

## Type Safety

TypeScript narrowing via discriminated union:

```ts
const msg = parseServerMessage(raw);
if (!msg) return;

switch (msg.type) {
  case 'metric_update':
    // msg.channel and msg.data are fully typed
    break;
  case 'alert':
    // msg.severity is 'info' | 'warning' | 'critical'
    break;
  case 'pong':
    // msg.timestamp is number
    break;
}
```

# Testing

## Commands

```bash
# Run all unit tests once
pnpm test

# Run with coverage report
pnpm test:coverage

# Watch mode during development
pnpm test:watch

# CI (JUnit output + coverage)
pnpm test:ci
```

## Test Files

### src/__tests__/ring-buffer.test.ts

Tests the `RingBuffer<T>` class in `src/lib/data/store.ts`.

Key scenarios:
- **append adds to buffer** — `push()` increments `size` and `toArray()` returns items in insertion order
- **evicts oldest when full** — once `capacity` is reached, the next `push()` drops the head item; `toArray()` returns the N most recent
- **returns correct slice** — `toArray()` always returns items oldest-first regardless of internal pointer position
- **boundary: capacity 1** — ensures the pointer arithmetic handles the degenerate case
- **`clear()`** — resets count and pointer; subsequent `toArray()` is empty

The ring buffer uses a fixed-size pre-allocated array with head/count tracking. `toArray()` reconstructs order via `(head + i) % capacity` — tests verify this produces the correct sequence after multiple overflow cycles.

### src/__tests__/aggregator.test.ts

Tests `rollingAverage` and `aggregate` from `src/lib/data/aggregator.ts`.

**rollingAverage** — sliding window average:
- Window of 3 over [10, 20, 30, 40] → [10, 15, 20, 30]
- Timestamps are preserved (not modified)
- Edge: empty input, windowSize=0

**aggregate (5s window)** — bucket-based aggregation:
- Points with timestamps in [5000, 10000) land in the same bucket
- avg/min/max/count/sum are computed per bucket
- Points spanning two windows produce two separate buckets, sorted ascending

### src/__tests__/ws-protocol.test.ts

Tests `parseClientMessage` and `parseServerMessage` from `src/lib/ws/protocol.ts`.

Key scenarios:
- **Round-trip serialize/deserialize** — `JSON.stringify(schema.parse(x))` round-trips through the parser
- **All type discriminators** — every `type` literal in the discriminated union parses to the correct variant
- **Invalid input** — malformed JSON and unknown `type` values return `null` (never throw)
- **Zod enum rejection** — invalid enum values (e.g. severity `"fatal"`, range `"99h"`) return `null`

## Framework

Tests use **Vitest** with the default Node environment. No DOM globals required for these unit tests. Path aliases (`@/`) are resolved via `tsconfig.json` `paths`.

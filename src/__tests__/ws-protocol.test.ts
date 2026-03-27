import {
  ClientMessageSchema,
  ServerMessageSchema,
  parseClientMessage,
  parseServerMessage,
} from '@/lib/ws/protocol';
import { describe, expect, it } from 'vitest';

// ─── parseClientMessage ───────────────────────────────────────────────────────

describe('parseClientMessage', () => {
  it('returns null for invalid JSON', () => {
    expect(parseClientMessage('not-json')).toBeNull();
  });

  it('returns null for valid JSON with unknown type', () => {
    expect(parseClientMessage(JSON.stringify({ type: 'unknown_type' }))).toBeNull();
  });

  it('parses subscribe message', () => {
    const msg = { type: 'subscribe', channels: ['cpu', 'memory'] };
    const result = parseClientMessage(JSON.stringify(msg));
    expect(result).not.toBeNull();
    expect(result?.type).toBe('subscribe');
    if (result?.type === 'subscribe') {
      expect(result.channels).toEqual(['cpu', 'memory']);
    }
  });

  it('parses unsubscribe message', () => {
    const msg = { type: 'unsubscribe', channels: ['cpu'] };
    const result = parseClientMessage(JSON.stringify(msg));
    expect(result?.type).toBe('unsubscribe');
  });

  it('parses ping message', () => {
    const msg = { type: 'ping' };
    const result = parseClientMessage(JSON.stringify(msg));
    expect(result?.type).toBe('ping');
  });

  it('parses set_time_range message', () => {
    const msg = { type: 'set_time_range', range: '5m' };
    const result = parseClientMessage(JSON.stringify(msg));
    expect(result?.type).toBe('set_time_range');
    if (result?.type === 'set_time_range') {
      expect(result.range).toBe('5m');
    }
  });

  it('rejects set_time_range with invalid range value', () => {
    const msg = { type: 'set_time_range', range: '99h' };
    expect(parseClientMessage(JSON.stringify(msg))).toBeNull();
  });
});

// ─── parseServerMessage ───────────────────────────────────────────────────────

describe('parseServerMessage', () => {
  it('returns null for invalid JSON', () => {
    expect(parseServerMessage('{broken')).toBeNull();
  });

  it('parses metric_update message', () => {
    const msg = {
      type: 'metric_update',
      channel: 'cpu',
      data: { timestamp: Date.now(), value: 72.5, unit: '%' },
    };
    const result = parseServerMessage(JSON.stringify(msg));
    expect(result?.type).toBe('metric_update');
    if (result?.type === 'metric_update') {
      expect(result.channel).toBe('cpu');
      expect(result.data.value).toBe(72.5);
    }
  });

  it('parses alert message', () => {
    const msg = {
      type: 'alert',
      severity: 'warning',
      message: 'High CPU',
      timestamp: new Date().toISOString(),
    };
    const result = parseServerMessage(JSON.stringify(msg));
    expect(result?.type).toBe('alert');
    if (result?.type === 'alert') {
      expect(result.severity).toBe('warning');
    }
  });

  it('parses pong message', () => {
    const msg = { type: 'pong', timestamp: 1234567890 };
    const result = parseServerMessage(JSON.stringify(msg));
    expect(result?.type).toBe('pong');
    if (result?.type === 'pong') {
      expect(result.timestamp).toBe(1234567890);
    }
  });

  it('parses error message', () => {
    const msg = {
      type: 'error',
      code: 'NOT_FOUND',
      message: 'Channel not found',
    };
    const result = parseServerMessage(JSON.stringify(msg));
    expect(result?.type).toBe('error');
  });

  it('parses snapshot message', () => {
    const msg = {
      type: 'snapshot',
      channel: 'memory',
      data: [
        { timestamp: 1000, value: 60, unit: '%' },
        { timestamp: 2000, value: 62, unit: '%' },
      ],
    };
    const result = parseServerMessage(JSON.stringify(msg));
    expect(result?.type).toBe('snapshot');
    if (result?.type === 'snapshot') {
      expect(result.data).toHaveLength(2);
    }
  });

  it('parses connected message', () => {
    const msg = {
      type: 'connected',
      sessionId: 'abc-123',
      timestamp: Date.now(),
    };
    const result = parseServerMessage(JSON.stringify(msg));
    expect(result?.type).toBe('connected');
    if (result?.type === 'connected') {
      expect(result.sessionId).toBe('abc-123');
    }
  });

  it('rejects alert with unknown severity', () => {
    const msg = {
      type: 'alert',
      severity: 'fatal',
      message: 'x',
      timestamp: new Date().toISOString(),
    };
    expect(parseServerMessage(JSON.stringify(msg))).toBeNull();
  });
});

// ─── Round-trip serialization ─────────────────────────────────────────────────

describe('round-trip serialize/deserialize', () => {
  it('client subscribe survives JSON round-trip', () => {
    const original = ClientMessageSchema.parse({
      type: 'subscribe',
      channels: ['cpu', 'memory', 'request_rate'],
    });
    const serialized = JSON.stringify(original);
    const parsed = parseClientMessage(serialized);
    expect(parsed).toEqual(original);
  });

  it('server metric_update survives JSON round-trip', () => {
    const original = ServerMessageSchema.parse({
      type: 'metric_update',
      channel: 'cpu',
      data: { timestamp: 1700000000000, value: 45.2, unit: '%' },
    });
    const serialized = JSON.stringify(original);
    const parsed = parseServerMessage(serialized);
    expect(parsed).toEqual(original);
  });

  it('all client message type discriminators parse correctly', () => {
    const messages = [
      { type: 'subscribe', channels: [] },
      { type: 'unsubscribe', channels: ['x'] },
      { type: 'ping' },
      { type: 'set_time_range', range: '1h' },
    ];
    for (const msg of messages) {
      const result = parseClientMessage(JSON.stringify(msg));
      expect(result).not.toBeNull();
      expect(result?.type).toBe(msg.type);
    }
  });

  it('all server message type discriminators parse correctly', () => {
    const now = Date.now();
    const messages = [
      {
        type: 'metric_update',
        channel: 'cpu',
        data: { timestamp: now, value: 10, unit: '%' },
      },
      {
        type: 'alert',
        severity: 'info',
        message: 'ok',
        timestamp: new Date().toISOString(),
      },
      { type: 'pong', timestamp: now },
      { type: 'error', code: 'E1', message: 'err' },
      { type: 'snapshot', channel: 'cpu', data: [] },
      { type: 'connected', sessionId: 's1', timestamp: now },
    ];
    for (const msg of messages) {
      const result = parseServerMessage(JSON.stringify(msg));
      expect(result).not.toBeNull();
      expect(result?.type).toBe(msg.type);
    }
  });
});

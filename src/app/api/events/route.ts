import { MetricGenerator } from '@/lib/data/generator';
import { metricEmitter } from '@/lib/events/emitter';
import { SSE_HEADERS, createSSEStream, formatSSEEvent } from '@/lib/events/sse';

// Ensure the generator loop is running for SSE clients.
// This module-level singleton starts once per process.
let generationStarted = false;

function ensureGenerationLoop(): void {
  if (generationStarted) return;
  generationStarted = true;

  const generator = new MetricGenerator();

  setInterval(() => {
    const allMetrics = generator.generateAll();

    for (const [name, point] of Object.entries(allMetrics)) {
      const def = MetricGenerator.getMetricDef(name);
      metricEmitter.emit('metric', {
        name,
        value: point.value,
        timestamp: point.timestamp,
        unit: def?.unit ?? '',
      });
    }

    // Random alerts (~2% chance each second)
    if (Math.random() < 0.02) {
      const cpuValue = allMetrics.cpu?.value ?? 0;
      const errorValue = allMetrics.error_rate?.value ?? 0;
      const latencyValue = allMetrics.latency_p99?.value ?? 0;

      let message = 'System health check: all metrics within normal range';
      if (cpuValue > 85) message = `High CPU usage detected: ${cpuValue.toFixed(1)}%`;
      else if (errorValue > 5) message = `Elevated error rate: ${errorValue.toFixed(2)}%`;
      else if (latencyValue > 500) message = `P99 latency spike: ${latencyValue.toFixed(0)}ms`;

      const severity =
        cpuValue > 90 || errorValue > 5 || latencyValue > 1000
          ? 'critical'
          : cpuValue > 70 || errorValue > 2 || latencyValue > 500
            ? 'warning'
            : 'info';

      metricEmitter.emit('alert', {
        severity,
        message,
        timestamp: new Date().toISOString(),
      });
    }
  }, 1000);
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request): Promise<Response> {
  ensureGenerationLoop();

  const { stream, send, close } = createSSEStream();

  // Send initial connection event
  send({
    event: 'connected',
    data: JSON.stringify({ timestamp: Date.now() }),
    retry: 3000,
  });

  let eventId = 0;

  // Subscribe to metric updates
  const unsubMetric = metricEmitter.on('metric', (data) => {
    send({
      event: 'metric',
      id: String(++eventId),
      data: JSON.stringify(data),
    });
  });

  // Subscribe to alerts
  const unsubAlert = metricEmitter.on('alert', (data) => {
    send({
      event: 'alert',
      id: String(++eventId),
      data: JSON.stringify(data),
    });
  });

  // Keep-alive ping every 15 seconds
  const keepAliveInterval = setInterval(() => {
    try {
      const encoder = new TextEncoder();
      // SSE comment line — keeps the connection alive through proxies
      const comment = encoder.encode(': ping\n\n');
      void comment; // used below via send
      send({ event: 'ping', data: JSON.stringify({ ts: Date.now() }) });
    } catch {
      // Stream closed
    }
  }, 15_000);

  // Clean up when client disconnects
  request.signal.addEventListener('abort', () => {
    unsubMetric();
    unsubAlert();
    clearInterval(keepAliveInterval);
    close();
  });

  return new Response(stream, {
    headers: {
      ...SSE_HEADERS,
    },
  });
}

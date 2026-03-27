import { MetricGenerator } from '@/lib/data/generator';
import { TimeSeriesStore } from '@/lib/data/store';

// Module-level singleton — shared across requests in the same process
const generator = new MetricGenerator();
const store = new TimeSeriesStore(300);

// Seed initial data so the first request has something to show
function ensureSeeded(): void {
  const metricNames = MetricGenerator.getMetricNames();
  const firstMetric = metricNames[0];
  if (!firstMetric) return;

  // If the store already has data, skip
  if (store.getLatest(firstMetric) !== undefined) return;

  // Generate 60 back-filled seconds of initial data
  const now = Date.now();
  for (let i = 59; i >= 0; i--) {
    const ts = now - i * 1000;
    const allMetrics = generator.generateAll();
    for (const [name, point] of Object.entries(allMetrics)) {
      store.push(name, ts, point.value);
    }
  }
}

export async function GET(): Promise<Response> {
  ensureSeeded();

  const metricNames = MetricGenerator.getMetricNames();
  const snapshot: Record<
    string,
    {
      latest: { value: number; timestamp: number } | null;
      unit: string;
      name: string;
      history: Array<{ timestamp: number; value: number }>;
    }
  > = {};

  for (const name of metricNames) {
    const latest = store.getLatest(name);
    const def = MetricGenerator.getMetricDef(name);
    // Last 60 seconds of history for initial render
    const history = store.getWindow(name, 60_000);

    snapshot[name] = {
      latest: latest ?? null,
      unit: def?.unit ?? '',
      name: def?.name ?? name,
      history,
    };
  }

  return Response.json(snapshot, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

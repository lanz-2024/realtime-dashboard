export interface MetricDefinition {
  name: string;
  unit: string;
  min: number;
  max: number;
  baseline: number;
  volatility: number; // 0–1, controls fluctuation amplitude
  warnThreshold?: number;
  criticalThreshold?: number;
}

const METRICS: Record<string, MetricDefinition> = {
  cpu: {
    name: 'CPU Usage',
    unit: '%',
    min: 0,
    max: 100,
    baseline: 35,
    volatility: 0.3,
    warnThreshold: 70,
    criticalThreshold: 90,
  },
  memory: {
    name: 'Memory Usage',
    unit: '%',
    min: 0,
    max: 100,
    baseline: 62,
    volatility: 0.1,
    warnThreshold: 80,
    criticalThreshold: 95,
  },
  request_rate: {
    name: 'Requests/sec',
    unit: 'req/s',
    min: 0,
    max: 2000,
    baseline: 450,
    volatility: 0.4,
  },
  error_rate: {
    name: 'Error Rate',
    unit: '%',
    min: 0,
    max: 20,
    baseline: 0.5,
    volatility: 0.8,
    warnThreshold: 2,
    criticalThreshold: 5,
  },
  latency_p50: {
    name: 'Latency P50',
    unit: 'ms',
    min: 0,
    max: 5000,
    baseline: 45,
    volatility: 0.2,
    warnThreshold: 200,
    criticalThreshold: 500,
  },
  latency_p99: {
    name: 'Latency P99',
    unit: 'ms',
    min: 0,
    max: 10000,
    baseline: 220,
    volatility: 0.5,
    warnThreshold: 500,
    criticalThreshold: 1000,
  },
  active_connections: {
    name: 'Active Connections',
    unit: '',
    min: 0,
    max: 10000,
    baseline: 1240,
    volatility: 0.15,
  },
  cache_hit_rate: {
    name: 'Cache Hit Rate',
    unit: '%',
    min: 0,
    max: 100,
    baseline: 87,
    volatility: 0.05,
    warnThreshold: 60,
    criticalThreshold: 40,
  },
};

export class MetricGenerator {
  private readonly lastValues: Map<string, number> = new Map();

  generate(metricName: string): { value: number; timestamp: number } {
    const def = METRICS[metricName];
    if (!def) throw new Error(`Unknown metric: ${metricName}`);

    const last = this.lastValues.get(metricName) ?? def.baseline;

    // Random walk with mean reversion to baseline
    const delta = (Math.random() - 0.5) * def.volatility * (def.max - def.min) * 0.1;
    const meanReversion = (def.baseline - last) * 0.05;
    const next = Math.max(def.min, Math.min(def.max, last + delta + meanReversion));

    this.lastValues.set(metricName, next);
    return { value: Math.round(next * 100) / 100, timestamp: Date.now() };
  }

  generateAll(): Record<string, { value: number; timestamp: number }> {
    return Object.fromEntries(
      Object.keys(METRICS).map((name) => [name, this.generate(name)]),
    );
  }

  static getMetricNames(): string[] {
    return Object.keys(METRICS);
  }

  static getMetricDef(name: string): MetricDefinition | undefined {
    return METRICS[name];
  }

  static getAllMetricDefs(): Record<string, MetricDefinition> {
    return { ...METRICS };
  }

  getMetricStatus(name: string, value: number): 'normal' | 'warning' | 'critical' {
    const def = METRICS[name];
    if (!def) return 'normal';

    // For cache_hit_rate, lower is worse
    if (name === 'cache_hit_rate') {
      if (def.criticalThreshold !== undefined && value <= def.criticalThreshold)
        return 'critical';
      if (def.warnThreshold !== undefined && value <= def.warnThreshold) return 'warning';
      return 'normal';
    }

    if (def.criticalThreshold !== undefined && value >= def.criticalThreshold) return 'critical';
    if (def.warnThreshold !== undefined && value >= def.warnThreshold) return 'warning';
    return 'normal';
  }
}

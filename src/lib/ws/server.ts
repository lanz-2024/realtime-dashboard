import { Hono } from "hono";
import { upgradeWebSocket } from "hono/bun";
import { MetricGenerator } from "../data/generator";
import { TimeSeriesStore } from "../data/store";
import {
	type ClientMessage,
	type ServerMessage,
	parseClientMessage,
} from "./protocol";

interface ClientSession {
	id: string;
	subscribedChannels: Set<string>;
	timeRange: "1m" | "5m" | "1h" | "24h";
	lastPing: number;
}

// Shared state across all connections
const generator = new MetricGenerator();
const store = new TimeSeriesStore();
const sessions = new Map<string, ClientSession>();

// Broadcast helper — sends to all connected websockets with matching channels
type WsSend = (message: string) => void;
const connectionSenders = new Map<string, WsSend>();

function broadcast(channel: string, message: ServerMessage): void {
	const payload = JSON.stringify(message);
	for (const [sessionId, session] of sessions) {
		if (
			session.subscribedChannels.has(channel) ||
			session.subscribedChannels.has("*")
		) {
			const send = connectionSenders.get(sessionId);
			send?.(payload);
		}
	}
}

// Start the metric generation loop — runs once per process
let generationInterval: ReturnType<typeof setInterval> | null = null;

function startGenerationLoop(): void {
	if (generationInterval !== null) return;

	generationInterval = setInterval(() => {
		const allMetrics = generator.generateAll();

		for (const [metricName, point] of Object.entries(allMetrics)) {
			store.push(metricName, point.timestamp, point.value);
			const def = MetricGenerator.getMetricDef(metricName);
			const msg: ServerMessage = {
				type: "metric_update",
				channel: metricName,
				data: {
					timestamp: point.timestamp,
					value: point.value,
					unit: def?.unit ?? "",
				},
			};
			broadcast(metricName, msg);
		}

		// Occasionally emit alerts for demonstration
		if (Math.random() < 0.02) {
			const alertMsg: ServerMessage = {
				type: "alert",
				severity:
					Math.random() < 0.1
						? "critical"
						: Math.random() < 0.3
							? "warning"
							: "info",
				message: generateAlertMessage(allMetrics),
				timestamp: new Date().toISOString(),
			};
			for (const send of connectionSenders.values()) {
				send(JSON.stringify(alertMsg));
			}
		}
	}, 1000);
}

function generateAlertMessage(
	metrics: Record<string, { value: number; timestamp: number }>,
): string {
	const cpuValue = metrics.cpu?.value ?? 0;
	const errorValue = metrics.error_rate?.value ?? 0;
	const latencyValue = metrics.latency_p99?.value ?? 0;

	if (cpuValue > 85) return `High CPU usage detected: ${cpuValue.toFixed(1)}%`;
	if (errorValue > 5) return `Elevated error rate: ${errorValue.toFixed(2)}%`;
	if (latencyValue > 500)
		return `P99 latency spike: ${latencyValue.toFixed(0)}ms`;
	return "System health check: all metrics within normal range";
}

let sessionCounter = 0;

export const wsApp = new Hono();

wsApp.get(
	"/ws",
	upgradeWebSocket(() => {
		const sessionId = `session-${++sessionCounter}-${Date.now()}`;

		const session: ClientSession = {
			id: sessionId,
			subscribedChannels: new Set(["*"]), // subscribe to all by default
			timeRange: "5m",
			lastPing: Date.now(),
		};

		return {
			onOpen(_event, ws) {
				sessions.set(sessionId, session);
				connectionSenders.set(sessionId, (msg: string) => ws.send(msg));

				startGenerationLoop();

				// Send connected acknowledgment
				ws.send(
					JSON.stringify({
						type: "connected",
						sessionId,
						timestamp: Date.now(),
					} satisfies ServerMessage),
				);

				// Send snapshot of recent data for all metrics
				const windowMs = 300_000; // 5 min default
				for (const metricName of MetricGenerator.getMetricNames()) {
					const data = store.getWindow(metricName, windowMs);
					if (data.length > 0) {
						const def = MetricGenerator.getMetricDef(metricName);
						ws.send(
							JSON.stringify({
								type: "snapshot",
								channel: metricName,
								data: data.map((p) => ({
									timestamp: p.timestamp,
									value: p.value,
									unit: def?.unit ?? "",
								})),
							} satisfies ServerMessage),
						);
					}
				}
			},

			onMessage(event, ws) {
				const raw =
					typeof event.data === "string" ? event.data : String(event.data);
				const msg: ClientMessage | null = parseClientMessage(raw);

				if (!msg) {
					ws.send(
						JSON.stringify({
							type: "error",
							code: "INVALID_MESSAGE",
							message: "Failed to parse message",
						} satisfies ServerMessage),
					);
					return;
				}

				switch (msg.type) {
					case "subscribe":
						for (const channel of msg.channels) {
							session.subscribedChannels.add(channel);
						}
						break;

					case "unsubscribe":
						for (const channel of msg.channels) {
							session.subscribedChannels.delete(channel);
						}
						break;

					case "ping":
						session.lastPing = Date.now();
						ws.send(
							JSON.stringify({
								type: "pong",
								timestamp: Date.now(),
							} satisfies ServerMessage),
						);
						break;

					case "set_time_range": {
						session.timeRange = msg.range;
						const windowMap: Record<string, number> = {
							"1m": 60_000,
							"5m": 300_000,
							"1h": 3_600_000,
							"24h": 86_400_000,
						};
						const windowMs = windowMap[msg.range] ?? 300_000;

						for (const metricName of session.subscribedChannels.has("*")
							? MetricGenerator.getMetricNames()
							: Array.from(session.subscribedChannels)) {
							const data = store.getWindow(metricName, windowMs);
							if (data.length > 0) {
								const def = MetricGenerator.getMetricDef(metricName);
								ws.send(
									JSON.stringify({
										type: "snapshot",
										channel: metricName,
										data: data.map((p) => ({
											timestamp: p.timestamp,
											value: p.value,
											unit: def?.unit ?? "",
										})),
									} satisfies ServerMessage),
								);
							}
						}
						break;
					}
				}
			},

			onClose() {
				sessions.delete(sessionId);
				connectionSenders.delete(sessionId);
			},

			onError(error) {
				console.error(`WebSocket error for session ${sessionId}:`, error);
				sessions.delete(sessionId);
				connectionSenders.delete(sessionId);
			},
		};
	}),
);

export { store, generator };

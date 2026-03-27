"use client";

import { RefreshToggle } from "@/components/controls/RefreshToggle";
import { TimeRange } from "@/components/controls/TimeRange";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { useSSE } from "@/hooks/use-sse";
import { useTimeSeries } from "@/hooks/use-time-series";
import { useCallback, useRef, useState } from "react";

export interface MetricSnapshot {
	cpu: number;
	memory: number;
	requestRate: number;
	errorRate: number;
	latency: number;
	alerts: Array<{
		id: string;
		severity: "critical" | "warning" | "info";
		message: string;
		time: string;
	}>;
}

// Raw event shapes emitted by /api/events
interface MetricEvent {
	name: string;
	value: number;
	timestamp: number;
	unit: string;
}

interface AlertEvent {
	severity: "critical" | "warning" | "info";
	message: string;
	timestamp: string;
}

export default function DashboardPage() {
	const [isLive, setIsLive] = useState(true);
	const [timeRange, setTimeRange] = useState("5m");
	const cpuSeries = useTimeSeries({ capacity: 300 });
	const memSeries = useTimeSeries({ capacity: 300 });
	const reqSeries = useTimeSeries({ capacity: 300 });
	const [latest, setLatest] = useState<MetricSnapshot | null>(null);

	// Accumulate current snapshot across individual metric events
	const snapshotRef = useRef<Omit<MetricSnapshot, "alerts">>({
		cpu: 0,
		memory: 0,
		requestRate: 0,
		errorRate: 0,
		latency: 0,
	});
	const alertsRef = useRef<MetricSnapshot["alerts"]>([]);
	let alertCounter = useRef(0).current;

	const handleMetric = useCallback(
		(data: MetricEvent) => {
			if (!isLive) return;
			const snap = snapshotRef.current;

			switch (data.name) {
				case "cpu":
					snap.cpu = data.value;
					cpuSeries.append({ timestamp: data.timestamp, value: data.value });
					break;
				case "memory":
					snap.memory = data.value;
					memSeries.append({ timestamp: data.timestamp, value: data.value });
					break;
				case "request_rate":
					snap.requestRate = data.value;
					reqSeries.append({ timestamp: data.timestamp, value: data.value });
					break;
				case "error_rate":
					snap.errorRate = data.value;
					break;
				case "latency_p99":
					snap.latency = data.value;
					break;
			}

			setLatest({ ...snap, alerts: alertsRef.current });
		},
		[isLive, cpuSeries.append, memSeries.append, reqSeries.append],
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: alertCounter is a mutable ref value intentionally excluded to avoid stale-closure re-creation
	const handleAlert = useCallback(
		(data: AlertEvent) => {
			if (!isLive) return;
			alertCounter += 1;
			const newAlert = {
				id: String(alertCounter),
				severity: data.severity,
				message: data.message,
				time: new Date(data.timestamp).toLocaleTimeString(),
			};
			// Keep max 50 alerts in the ref; newest first
			alertsRef.current = [newAlert, ...alertsRef.current].slice(0, 50);
			setLatest((prev) =>
				prev ? { ...prev, alerts: alertsRef.current } : prev,
			);
		},
		[isLive],
	);

	useSSE<{ metric: MetricEvent; alert: AlertEvent }>({
		url: "/api/events",
		enabled: isLive,
		onEvent: {
			metric: handleMetric,
			alert: handleAlert,
		},
	});

	return (
		<div className="min-h-screen bg-gray-950 text-gray-100 p-6">
			<div className="max-w-7xl mx-auto">
				<div className="flex items-center justify-between mb-8">
					<div>
						<h1 className="text-2xl font-semibold text-white">
							System Dashboard
						</h1>
						<p className="text-gray-400 text-sm mt-1">
							Real-time metrics via Server-Sent Events
						</p>
					</div>
					<div className="flex items-center gap-4">
						<TimeRange value={timeRange} onChange={setTimeRange} />
						<RefreshToggle
							isLive={isLive}
							onToggle={() => setIsLive((v) => !v)}
						/>
					</div>
				</div>
				<DashboardGrid
					latest={latest}
					cpuSeries={cpuSeries.data}
					memSeries={memSeries.data}
					reqSeries={reqSeries.data}
				/>
			</div>
		</div>
	);
}

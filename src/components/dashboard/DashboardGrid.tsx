"use client";

import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import type { TimeSeriesPoint } from "@/hooks/use-time-series";
import { AlertFeed } from "./AlertFeed";
import { MetricCard } from "./MetricCard";

interface Alert {
	id: string;
	severity: "critical" | "warning" | "info";
	message: string;
	time: string;
}

interface Props {
	latest: {
		cpu: number;
		memory: number;
		requestRate: number;
		errorRate: number;
		latency: number;
		alerts: Alert[];
	} | null;
	cpuSeries: TimeSeriesPoint[];
	memSeries: TimeSeriesPoint[];
	reqSeries: TimeSeriesPoint[];
}

export function DashboardGrid({
	latest,
	cpuSeries,
	memSeries,
	reqSeries,
}: Props) {
	if (!latest) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-gray-500 text-center">
					<div className="animate-pulse w-8 h-8 bg-blue-500 rounded-full mx-auto mb-3" />
					<p>Connecting to live metrics...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Top row: metric cards */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<MetricCard
					title="CPU Usage"
					value={latest.cpu}
					unit="%"
					color="#3b82f6"
					sparklineData={cpuSeries.slice(-20).map((p) => p.value)}
					trend={latest.cpu > 80 ? "up" : "stable"}
				/>
				<MetricCard
					title="Memory"
					value={latest.memory}
					unit="%"
					color="#8b5cf6"
					sparklineData={memSeries.slice(-20).map((p) => p.value)}
					trend={latest.memory > 85 ? "up" : "stable"}
				/>
				<MetricCard
					title="Request Rate"
					value={latest.requestRate}
					unit="req/s"
					color="#10b981"
					sparklineData={reqSeries.slice(-20).map((p) => p.value)}
					precision={0}
				/>
				<MetricCard
					title="Error Rate"
					value={latest.errorRate}
					unit="%"
					color="#ef4444"
					sparklineData={[]}
					trend={latest.errorRate > 1 ? "up" : "down"}
				/>
			</div>

			{/* Middle row: CPU history + alerts */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				<div className="lg:col-span-2 bg-gray-900 rounded-xl p-5 border border-gray-800">
					<h3 className="text-gray-400 text-sm font-medium mb-4">
						CPU History
					</h3>
					<TimeSeriesChart
						data={cpuSeries.map((p) => ({ time: p.timestamp, value: p.value }))}
						label="CPU %"
						color="#3b82f6"
						unit="%"
					/>
				</div>
				<AlertFeed alerts={latest.alerts} />
			</div>

			{/* Bottom row: memory + request rate history */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
					<h3 className="text-gray-400 text-sm font-medium mb-4">
						Memory History
					</h3>
					<TimeSeriesChart
						data={memSeries.map((p) => ({ time: p.timestamp, value: p.value }))}
						label="Memory %"
						color="#8b5cf6"
						unit="%"
					/>
				</div>
				<div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
					<h3 className="text-gray-400 text-sm font-medium mb-4">
						Request Rate
					</h3>
					<TimeSeriesChart
						data={reqSeries.map((p) => ({ time: p.timestamp, value: p.value }))}
						label="req/s"
						color="#10b981"
						unit="req/s"
					/>
				</div>
			</div>
		</div>
	);
}

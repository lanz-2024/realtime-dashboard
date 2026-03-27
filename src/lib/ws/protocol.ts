import { z } from "zod";

// Metric data point schema — defined first so it can be referenced below
const MetricPointSchema = z.object({
	timestamp: z.number(),
	value: z.number(),
	unit: z.string(),
	labels: z.record(z.string()).optional(),
});

// Client → Server messages
export const ClientMessageSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("subscribe"), channels: z.array(z.string()) }),
	z.object({ type: z.literal("unsubscribe"), channels: z.array(z.string()) }),
	z.object({ type: z.literal("ping") }),
	z.object({
		type: z.literal("set_time_range"),
		range: z.enum(["1m", "5m", "1h", "24h"]),
	}),
]);

// Server → Client messages
export const ServerMessageSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("metric_update"),
		channel: z.string(),
		data: MetricPointSchema,
	}),
	z.object({
		type: z.literal("alert"),
		severity: z.enum(["info", "warning", "critical"]),
		message: z.string(),
		timestamp: z.string(),
	}),
	z.object({
		type: z.literal("pong"),
		timestamp: z.number(),
	}),
	z.object({
		type: z.literal("error"),
		code: z.string(),
		message: z.string(),
	}),
	z.object({
		type: z.literal("snapshot"),
		channel: z.string(),
		data: z.array(MetricPointSchema),
	}),
	z.object({
		type: z.literal("connected"),
		sessionId: z.string(),
		timestamp: z.number(),
	}),
]);

export type ClientMessage = z.infer<typeof ClientMessageSchema>;
export type ServerMessage = z.infer<typeof ServerMessageSchema>;
export type MetricPoint = z.infer<typeof MetricPointSchema>;
export type TimeRange = "1m" | "5m" | "1h" | "24h";

export const TIME_RANGE_MS: Record<TimeRange, number> = {
	"1m": 60_000,
	"5m": 300_000,
	"1h": 3_600_000,
	"24h": 86_400_000,
};

export function parseClientMessage(raw: string): ClientMessage | null {
	try {
		return ClientMessageSchema.parse(JSON.parse(raw));
	} catch {
		return null;
	}
}

export function parseServerMessage(raw: string): ServerMessage | null {
	try {
		return ServerMessageSchema.parse(JSON.parse(raw));
	} catch {
		return null;
	}
}

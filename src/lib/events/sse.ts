export interface SSEEvent {
	data: string;
	event?: string;
	id?: string;
	retry?: number;
}

/**
 * Serialize an SSE event to the wire format.
 */
export function formatSSEEvent(event: SSEEvent): string {
	const parts: string[] = [];

	if (event.retry !== undefined) {
		parts.push(`retry: ${event.retry}`);
	}
	if (event.id !== undefined) {
		parts.push(`id: ${event.id}`);
	}
	if (event.event !== undefined) {
		parts.push(`event: ${event.event}`);
	}

	// Data field may contain newlines — each line must be prefixed
	for (const line of event.data.split("\n")) {
		parts.push(`data: ${line}`);
	}

	parts.push("", ""); // Double newline to end event
	return parts.join("\n");
}

/**
 * Create a ReadableStream that emits SSE events via a push-based callback.
 * Returns both the stream and a send function.
 */
export function createSSEStream(): {
	stream: ReadableStream<Uint8Array>;
	send: (event: SSEEvent) => void;
	close: () => void;
} {
	const encoder = new TextEncoder();
	let controller: ReadableStreamDefaultController<Uint8Array> | null = null;

	const stream = new ReadableStream<Uint8Array>({
		start(ctrl) {
			controller = ctrl;
		},
		cancel() {
			controller = null;
		},
	});

	const send = (event: SSEEvent): void => {
		if (!controller) return;
		try {
			controller.enqueue(encoder.encode(formatSSEEvent(event)));
		} catch {
			// Stream was closed
			controller = null;
		}
	};

	const close = (): void => {
		if (!controller) return;
		try {
			controller.close();
		} catch {
			// Already closed
		}
		controller = null;
	};

	return { stream, send, close };
}

export const SSE_HEADERS = {
	"Content-Type": "text/event-stream",
	"Cache-Control": "no-cache, no-transform",
	Connection: "keep-alive",
	"X-Accel-Buffering": "no",
} as const;

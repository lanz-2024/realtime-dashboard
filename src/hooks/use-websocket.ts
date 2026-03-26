'use client';

// Re-export from the existing lib/ws/client.ts to keep a stable hook path
// while the implementation lives alongside the WebSocket server code.
export {
  useWebSocket,
  type ConnectionState,
  type UseWebSocketOptions,
  type UseWebSocketReturn,
} from '@/lib/ws/client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ChatSocketFrame = { type: "message" | "typing" | "note" | "ping" | "pong"; tutorId?: string };

export type ChatConnectionStatus = "connecting" | "connected" | "disconnected" | "reconnecting";

/** Hook to track browser online/offline connectivity */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return online;
}

/** `wss://` on an https page, `ws://` otherwise - same origin the app itself is served from. */
function buildChatSocketUrl(query: string) {
  if (typeof window === "undefined") return null;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/chat${query}`;
}

const HEARTBEAT_INTERVAL_MS = 25000;
const INITIAL_RECONNECT_MS = 1500;
const MAX_RECONNECT_MS = 15000;

/**
 * A push channel for the Admin-Tutor chat, reconnecting on drop with exponential backoff
 * and heartbeat ping/pong keepalive.
 */
function useRawChatSocket(
  url: string | null,
  onFrame: (frame: ChatSocketFrame) => void,
  onStatusChange?: (status: ChatConnectionStatus) => void
) {
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!url) {
      onStatusChangeRef.current?.("disconnected");
      return;
    }

    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let heartbeatTimer: number | null = null;
    let reconnectDelay = INITIAL_RECONNECT_MS;
    let stopped = false;

    const clearHeartbeat = () => {
      if (heartbeatTimer !== null) {
        window.clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    };

    const startHeartbeat = () => {
      clearHeartbeat();
      heartbeatTimer = window.setInterval(() => {
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "ping" }));
        }
      }, HEARTBEAT_INTERVAL_MS);
    };

    const connect = () => {
      if (stopped) return;
      onStatusChangeRef.current?.(socket ? "reconnecting" : "connecting");

      try {
        socket = new WebSocket(url);
        socketRef.current = socket;

        socket.onopen = () => {
          if (stopped) return;
          reconnectDelay = INITIAL_RECONNECT_MS; // reset on successful connection
          onStatusChangeRef.current?.("connected");
          startHeartbeat();
        };

        socket.onmessage = event => {
          try {
            const frame = JSON.parse(event.data);
            if (frame?.type === "pong") return; // Keepalive ack
            onFrameRef.current(frame);
          } catch {
            // A malformed frame is ignored - the slow poll still covers it.
          }
        };

        socket.onclose = () => {
          clearHeartbeat();
          if (stopped) return;
          onStatusChangeRef.current?.("disconnected");
          reconnectTimer = window.setTimeout(() => {
            reconnectDelay = Math.min(reconnectDelay * 1.5, MAX_RECONNECT_MS);
            connect();
          }, reconnectDelay);
        };

        socket.onerror = () => {
          socket?.close();
        };
      } catch {
        onStatusChangeRef.current?.("disconnected");
      }
    };

    connect();

    return () => {
      stopped = true;
      clearHeartbeat();
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      socketRef.current = null;
      socket?.close();
    };
  }, [url]);

  return useCallback((frame: ChatSocketFrame) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(frame));
    }
  }, []);
}

/** The Tutor's own thread - `token` is the Tutor Portal proof */
export function useTutorChatSocket(
  token: string | null,
  onFrame: (frame: ChatSocketFrame) => void,
  onStatusChange?: (status: ChatConnectionStatus) => void
) {
  const url = useMemo(() => (token ? buildChatSocketUrl(`?token=${encodeURIComponent(token)}`) : null), [token]);
  return useRawChatSocket(url, onFrame, onStatusChange);
}

/** Any Admin's session cookie authenticates the handshake */
export function useAdminChatSocket(
  onFrame: (frame: ChatSocketFrame) => void,
  onStatusChange?: (status: ChatConnectionStatus) => void
) {
  const url = useMemo(() => buildChatSocketUrl(""), []);
  return useRawChatSocket(url, onFrame, onStatusChange);
}

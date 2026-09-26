import { useCallback, useEffect, useMemo, useRef } from "react";

type ChatSocketFrame = { type: "message" | "typing"; tutorId?: string };

/** `wss://` on an https page, `ws://` otherwise - same origin the app itself is served from. */
function buildChatSocketUrl(query: string) {
  if (typeof window === "undefined") return null;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/chat${query}`;
}

/**
 * A push channel for the Admin-Tutor chat, reconnecting on drop. Polling
 * stays underneath as a slow fallback (see the callers), so a socket that
 * never connects - a proxy that blocks upgrades, a stretch offline - degrades
 * to the old behaviour rather than going silent. Returns a `send` function
 * for the one frame this channel accepts from the client: a typing ping.
 */
function useRawChatSocket(url: string | null, onFrame: (frame: ChatSocketFrame) => void) {
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!url) return;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let stopped = false;

    const connect = () => {
      if (stopped) return;
      socket = new WebSocket(url);
      socketRef.current = socket;
      socket.onmessage = event => {
        try {
          onFrameRef.current(JSON.parse(event.data));
        } catch {
          // A malformed frame is ignored - the slow poll still covers it.
        }
      };
      socket.onclose = () => {
        if (stopped) return;
        reconnectTimer = window.setTimeout(connect, 3000);
      };
      socket.onerror = () => socket?.close();
    };
    connect();

    return () => {
      stopped = true;
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      socketRef.current = null;
      socket?.close();
    };
  }, [url]);

  return useCallback((frame: ChatSocketFrame) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify(frame));
  }, []);
}

/** The Tutor's own thread - `token` is the Tutor Portal proof, carried as a query param since a browser `WebSocket` cannot set a custom header. */
export function useTutorChatSocket(token: string | null, onFrame: (frame: ChatSocketFrame) => void) {
  const url = useMemo(() => token ? buildChatSocketUrl(`?token=${encodeURIComponent(token)}`) : null, [token]);
  return useRawChatSocket(url, onFrame);
}

/** Any Admin's session cookie authenticates the handshake, so no token is carried here. */
export function useAdminChatSocket(onFrame: (frame: ChatSocketFrame) => void) {
  const url = useMemo(() => buildChatSocketUrl(""), []);
  return useRawChatSocket(url, onFrame);
}

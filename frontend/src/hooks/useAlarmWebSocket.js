import { useEffect, useRef, useCallback } from "react";

const useAlarmWebSocket = (onMessage) => {
  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  
  const connect = useCallback(() => {
    // Hardcode for now to resolve all resolution/env issues
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname || "localhost";
    const wsUrl = `${protocol}//${host}:8001/ws/alarms`;

    console.log("[WS] Connecting to", wsUrl);
    ws.current = new WebSocket(wsUrl);

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) onMessage(data);
      } catch (err) {
        console.error("[WS] Failed to parse message", err);
      }
    };

    ws.current.onopen = (e) => {
      console.log("[WS] Opened successfully", e);
    };

    ws.current.onclose = (e) => {
      console.log("[WS] Disconnected. Code:", e.code, "Reason:", e.reason);
      if (!ws.current || ws.current.unmounted) return;
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.current.onerror = (err) => {
      // Don't flood console with errors during reloads
      console.warn("[WS] Connection error. Reconnecting in 3s...");
    };
  }, [onMessage]);

  useEffect(() => {
    connect();
    return () => {
      if (ws.current) {
        // Prevent closing a closed socket
        ws.current.unmounted = true;
        if (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING) {
          ws.current.close();
        }
      }
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connect]);

  return ws.current;
};

export default useAlarmWebSocket;

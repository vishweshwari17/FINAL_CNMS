import { useState, useEffect, useCallback, useRef } from "react";

/**
 * useWarRoomSocket()
 * 
 * Manages real-time updates for clusters, incidents, and events.
 * Reconnects automatically on failure.
 */
export default function useWarRoomSocket(initialData = { clusters: [], incidents: [], events: [] }) {
  const [data, setData] = useState(initialData);
  const [status, setStatus] = useState("DISCONNECTED");
  const wsRef = useRef(null);

  const connect = useCallback(() => {
    const wsUrl = `ws://${window.location.hostname}:8001/ws/war-room`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[NOC-WS] Connected to Command Center");
      setStatus("CONNECTED");
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "WAR_ROOM_UPDATE") {
          setData(prev => ({
            ...prev,
            ...payload.data
          }));
        } else if (payload.type === "NEW_EVENT") {
          setData(prev => ({
            ...prev,
            events: [payload.event, ...prev.events].slice(0, 50)
          }));
        }
      } catch (err) {
        console.error("[NOC-WS] Error parsing message:", err);
      }
    };

    ws.onclose = () => {
      console.log("[NOC-WS] Disconnected. Reconnecting in 5s...");
      setStatus("DISCONNECTED");
      if (ws.unmounted) return;
      setTimeout(connect, 5000);
    };

    ws.onerror = (err) => {
      console.error("[NOC-WS] Connection error:", err);
      setStatus("ERROR");
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
         wsRef.current.unmounted = true;
         wsRef.current.close();
      }
    };
  }, [connect]);

  return { data, setData, status };
}

# app/services/ws_manager.py
import json
import logging
import asyncio
from typing import List, Dict
from fastapi import WebSocket

log = logging.getLogger("cnms.ws")


class WebSocketManager:
    def __init__(self):
        self._connections: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        self._connections.append(ws)
        log.info(f"[WS] Client added to manager. Total: {len(self._connections)}")

    def disconnect(self, ws: WebSocket):
        if ws in self._connections:
            self._connections.remove(ws)
        log.info(f"[WS] Client disconnected. Total: {len(self._connections)}")

    async def broadcast(self, data: Dict):
        log.info(f"[WS] Broadcasting message to {len(self._connections)} clients")
        msg = json.dumps(data, default=str)
        
        async def send(ws: WebSocket):
            try:
                await ws.send_text(msg)
            except Exception:
                return ws
            return None

        # Send to all clients in parallel
        results = await asyncio.gather(*(send(ws) for ws in self._connections), return_exceptions=True)
        
        dead = [r for r in results if isinstance(r, WebSocket)]
        for ws in dead:
            self.disconnect(ws)

# Global singleton for easy import
ws_manager = WebSocketManager()
# app/services/ws_manager.py
import json
import logging
import asyncio
<<<<<<< HEAD
from typing import List, Dict
=======
>>>>>>> c479efac988271e703a2f56f5bee5c6883f6234c
from fastapi import WebSocket

log = logging.getLogger("cnms.ws")


class WebSocketManager:
    def __init__(self):
<<<<<<< HEAD
        self._connections: List[WebSocket] = []
=======
        self._connections: list[WebSocket] = []
>>>>>>> c479efac988271e703a2f56f5bee5c6883f6234c

    async def connect(self, ws: WebSocket):
        self._connections.append(ws)
        log.info(f"[WS] Client added to manager. Total: {len(self._connections)}")

    def disconnect(self, ws: WebSocket):
        if ws in self._connections:
            self._connections.remove(ws)
        log.info(f"[WS] Client disconnected. Total: {len(self._connections)}")

<<<<<<< HEAD
    async def broadcast(self, data: Dict):
=======
    async def broadcast(self, data: dict):
>>>>>>> c479efac988271e703a2f56f5bee5c6883f6234c
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
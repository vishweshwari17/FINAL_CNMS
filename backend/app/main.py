# app/main.py

import logging
from dotenv import load_dotenv
load_dotenv()

from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.models import db as database
from app.routers import nodes, alarms, devices, tickets, dashboard, admin, webhook, incidents, sla_risk, major_incidents, war_room
import app.routers.webhook as webhook_mod
from app.services import dual_lnms_sync, sla_manager, advanced_correlation
from app.services.ws_manager import WebSocketManager, ws_manager
from app.services import dual_lnms_sync as sync_module
from app.services.sla_manager import sla_manager
from app.services.zabbix_poller import ZabbixPoller

# ✅ TCP SERVER (CNMS side)
from app.services.cnms_tcp_server import start_cnms_tcp_server

import asyncio

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
log = logging.getLogger("cnms.main")

poller = sync_module.DualLNMSPoller()
zabbix_poller = ZabbixPoller()


# ===============================
# 🚀 APP LIFECYCLE
# ===============================
@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Starting CNMS backend...")

    await database.init_pool()
    log.info("[DB] Pool ready")

    # Attach WS manager to modules
    sync_module.ws_manager = ws_manager
    webhook_mod.ws_manager = ws_manager

    # Start LNMS sync poller
    poller.start()
    log.info("[DualPoller] Both LNMS sync started")
    
    # Start Zabbix Poller
    # zabbix_poller.start()
    # log.info("[ZabbixPoller] Started")
    
    # Start SLA Manager
    sla_manager.start()

    # ✅ Start TCP Server (CNMS side)
    server_task = asyncio.create_task(start_cnms_tcp_server("0.0.0.0", 7776))
    log.info("[TCP] Server started on 7776")

    yield

    log.info("Shutting down...")
    await poller.stop()
    # await zabbix_poller.stop()
    await sla_manager.stop()
    await database.close_pool()


# ===============================
# 🚀 FASTAPI INIT
# ===============================
app = FastAPI(
    title="CNMS API",
    version="2.0.0",
    lifespan=lifespan,
    redirect_slashes=True
)


# ===============================
# 🌐 CORS
# ===============================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ===============================
# 📦 ROUTERS
# ===============================
app.include_router(nodes.router)
app.include_router(alarms.router)
app.include_router(devices.router)
app.include_router(tickets.router)
app.include_router(dashboard.router)
app.include_router(admin.router)
app.include_router(webhook.router)
app.include_router(incidents.router)
app.include_router(sla_risk.router)
app.include_router(major_incidents.router)
app.include_router(war_room.router)

async def periodic_jobs():
    while True:
        try:
            # Existing jobs
            await dual_lnms_sync.run_sync()
            await sla_manager.check_slas()
            # New Phase 2 job
            await advanced_correlation.run_correlation_cycle()
        except Exception as e:
            print(f"[Main] Error in periodic jobs: {e}")
        await asyncio.sleep(60)


# ===============================
# 🔌 WEBSOCKET (REAL-TIME UI)
# ===============================
@app.websocket("/ws/alarms")
async def websocket_endpoint(ws: WebSocket):
    try:
        await ws.accept()
        # Log details AFTER acceptance to ensure handshake isn't delayed
        origin = ws.headers.get("origin")
        log.info(f"[WS] Accepted connection from {ws.client} (Origin: {origin})")
        
        await ws_manager.connect(ws)
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(ws)
    except Exception as e:
        log.error(f"[WS] Error in websocket loop: {e}")
        ws_manager.disconnect(ws)


@app.websocket("/ws/war-room")
async def war_room_ws(ws: WebSocket):
    try:
        await ws.accept()
        await ws_manager.connect(ws)
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(ws)
    except Exception as e:
        log.error(f"[WS-WarRoom] Error: {e}")
        ws_manager.disconnect(ws)


# ===============================
# ❤️ HEALTH CHECK
# ===============================
@app.get("/health")
async def health():
    nodes_rows = await database.fetchall(
        "SELECT node_id, display_name, ip_address, status, tcp_live, last_seen FROM lnms_nodes"
    )
    counts = await database.fetchone(
        "SELECT COUNT(*) as alarms FROM alarms WHERE status='ACTIVE'"
    )
    tickets_open = await database.fetchone(
        "SELECT COUNT(*) as tickets FROM tickets WHERE status='OPEN'"
    )

    return {
        "status": "ok",
        "lnms_nodes": nodes_rows,
        "active_alarms": counts["alarms"] if counts else 0,
        "open_tickets": tickets_open["tickets"] if tickets_open else 0,
        "ws_clients": len(ws_manager._connections),
    }
import asyncio
import json
import httpx
import logging

log = logging.getLogger("cnms.tcp_server")

LNMS_API = "http://localhost:8000/tickets/update_from_cnms"

async def handle_client(reader, writer):
    addr = writer.get_extra_info("peername")
    log.info(f"[TCP] Connected: {addr}")

    async with httpx.AsyncClient() as client:
        while True:
            try:
                data = await reader.readline()

                if not data:
                    break

                msg = json.loads(data.decode())
                log.info(f"[TCP] Received: {msg}")

                # HANDLE MESSAGE
                if msg["msg_type"] == "CREATE_TICKET":
                    # simulate ACK
                    try:
                        await client.put(LNMS_API, json={
                            "ticket_id": msg["ticket_id"],
                            "status": "ACK"
                        }, timeout=5.0)
                    except Exception as e:
                        log.error(f"[TCP] Failed to push ACK to LNMS: {e}")

                elif msg["msg_type"] == "TICKET_RESOLVED":
                    try:
                        await client.put(LNMS_API, json={
                            "ticket_id": msg["ticket_id"],
                            "status": "Resolved",
                            "resolved_at": msg["resolved_at"],
                            "resolution_note": msg.get("resolution_note")
                        }, timeout=5.0)
                    except Exception as e:
                        log.error(f"[TCP] Failed to push RESOLVE to LNMS: {e}")

            except Exception as e:
                log.error(f"[TCP] Error in client handler: {e}")
                break

    writer.close()
    await writer.wait_closed()
    log.info(f"[TCP] Disconnected: {addr}")


async def start_cnms_tcp_server(host="0.0.0.0", port=7776):
    attempts = 0
    server = None
    while attempts < 5:
        try:
            server = await asyncio.start_server(handle_client, host, port)
            log.info(f"[TCP] Server successfully bound to {host}:{port}")
            break
        except OSError as e:
            if e.errno == 98: # Address already in use
                attempts += 1
                log.warning(f"[TCP] Port {port} in use, retrying in 2s... (Attempt {attempts}/5)")
                await asyncio.sleep(2)
            else:
                log.error(f"[TCP] Failed to bind to {host}:{port}: {e}")
                return

    if not server:
        log.error(f"[TCP] Could not start server on port {port} after multiple attempts.")
        return

    async with server:
        await server.serve_forever()

async def main():
    # Setup basic logging for standalone run
    logging.basicConfig(level=logging.INFO)
    await start_cnms_tcp_server()

if __name__ == "__main__":
    asyncio.run(main())
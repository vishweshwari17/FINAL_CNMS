import asyncio
import json
<<<<<<< HEAD
import httpx
import logging

log = logging.getLogger("cnms.tcp_server")
=======
import requests # type: ignore
>>>>>>> c479efac988271e703a2f56f5bee5c6883f6234c

LNMS_API = "http://localhost:8000/tickets/update_from_cnms"

async def handle_client(reader, writer):
<<<<<<< HEAD
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
=======

    addr = writer.get_extra_info("peername")
    print(f"[CNMS] Connected: {addr}")

    while True:
        try:
            data = await reader.readline()

            if not data:
                break

            msg = json.loads(data.decode())
            print("[CNMS] Received:", msg)

            # HANDLE MESSAGE
            if msg["msg_type"] == "CREATE_TICKET":

                # simulate ACK
                requests.put(LNMS_API, json={
                    "ticket_id": msg["ticket_id"],
                    "status": "ACK"
                })

            elif msg["msg_type"] == "TICKET_RESOLVED":

                requests.put(LNMS_API, json={
                    "ticket_id": msg["ticket_id"],
                    "status": "Resolved",
                    "resolved_at": msg["resolved_at"],
                    "resolution_note": msg.get("resolution_note")
                })

        except Exception as e:
            print("[CNMS] Error:", e)
            break

    writer.close()
    await writer.wait_closed()


async def start_cnms_tcp_server(host="0.0.0.0", port=7776):
    server = await asyncio.start_server(handle_client, host, port)
    print(f"[CNMS] TCP Server running on port {port}")
>>>>>>> c479efac988271e703a2f56f5bee5c6883f6234c

    async with server:
        await server.serve_forever()

async def main():
<<<<<<< HEAD
    # Setup basic logging for standalone run
    logging.basicConfig(level=logging.INFO)
=======
>>>>>>> c479efac988271e703a2f56f5bee5c6883f6234c
    await start_cnms_tcp_server()

if __name__ == "__main__":
    asyncio.run(main())
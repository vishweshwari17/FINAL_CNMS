import asyncio
import json
import requests # type: ignore

LNMS_API = "http://localhost:8000/tickets/update_from_cnms"

async def handle_client(reader, writer):

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

    async with server:
        await server.serve_forever()

async def main():
    await start_cnms_tcp_server()

if __name__ == "__main__":
    asyncio.run(main())
import asyncio
import json
import websockets
import sys

async def test_broadcast():
    uri = "ws://localhost:8001/ws/alarms"
    try:
        async with websockets.connect(uri) as websocket:
            print(f"Connected to {uri}")
            
            # Since we can't easily trigger a backend broadcast from here without making a real request
            # We will just wait for a message if we trigger one manually OR 
            # we can try to send a message IF the backend was echo-ing (it's not, it's broadcast only)
            
            print("Waiting for messages... (Trigger an alarm via webhook or sync to see it here)")
            while True:
                message = await websocket.recv()
                data = json.loads(message)
                print(f"Received: {json.dumps(data, indent=2)}")
                if data.get("type") == "NEW_ALARM":
                    print("✅ Successfully received NEW_ALARM broadcast!")
                    break
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_broadcast())

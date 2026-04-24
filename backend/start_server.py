import asyncio
import uvicorn
import sys

# Shim for Python 3.6
if not hasattr(asyncio, "run"):
    def run(coro):
        loop = asyncio.get_event_loop()
        return loop.run_until_complete(coro)
    asyncio.run = run

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8001
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)

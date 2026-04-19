import asyncio
from app.routers import dashboard
async def test():
    try:
        res = await dashboard.get_incident_stats()
        print("Success:", res)
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(test())

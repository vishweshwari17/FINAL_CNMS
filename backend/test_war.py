import asyncio
from app.models import db
import app.routers.war_room as war

async def test():
    await db.init_pool()
    try:
        res = await war.get_war_room_data()
        print("Success!", len(res['clusters']))
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(test())

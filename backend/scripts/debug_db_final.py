import asyncio
import os
import aiomysql
from dotenv import load_dotenv

load_dotenv()

async def debug_db():
    try:
        pool = await aiomysql.create_pool(
            unix_socket = "/var/lib/mysql/mysql.sock",
            user        = os.getenv("DB_USER",     "cnms_user"),
            password    = os.getenv("DB_PASSWORD", "cnms1234"),
            db          = os.getenv("DB_NAME",     "cnms_db"),
            charset     = "utf8mb4",
            cursorclass = aiomysql.DictCursor,
            autocommit  = True,
        )
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT COUNT(*) as c FROM correlation_incidents")
                cnt = await cur.fetchone()
                print(f"Total incidents: {cnt['c']}")
                
                await cur.execute("SELECT id, title, status FROM correlation_incidents LIMIT 5")
                rows = await cur.fetchall()
                for r in rows:
                    print(r)
        pool.close()
        await pool.wait_closed()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(debug_db())

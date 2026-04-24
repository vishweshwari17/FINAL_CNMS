import asyncio
import os
import aiomysql
from dotenv import load_dotenv

load_dotenv()

async def final_check():
    pool = await aiomysql.create_pool(
        unix_socket = "/var/lib/mysql/mysql.sock",
        user        = "cnms_user",
        password    = "cnms1234",
        db          = "cnms_db",
        charset     = "utf8mb4",
        cursorclass = aiomysql.DictCursor,
        autocommit  = True,
    )
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            # Check 1
            await cur.execute("SELECT COUNT(*) as c FROM correlation_incidents WHERE is_deleted = 0")
            print(f"Count: {await cur.fetchone()}")
            
            # Check 2
            await cur.execute("SELECT id, title FROM correlation_incidents WHERE is_deleted = 0 ORDER BY created_at DESC LIMIT 5")
            print(f"Recent: {await cur.fetchall()}")
    pool.close()
    await pool.wait_closed()

if __name__ == "__main__":
    asyncio.run(final_check())

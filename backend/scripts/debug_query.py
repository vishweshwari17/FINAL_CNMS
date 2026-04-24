import asyncio
import os
import aiomysql
from dotenv import load_dotenv

load_dotenv()

async def debug_query():
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
            sql = """
                SELECT 
                    COUNT(CASE WHEN UPPER(status) = 'OPEN' THEN 1 END) as open_i,
                    COUNT(CASE WHEN UPPER(status) = 'RESOLVED' THEN 1 END) as res_i,
                    COUNT(CASE WHEN UPPER(severity) = 'CRITICAL' AND UPPER(status) = 'OPEN' THEN 1 END) as crit_i
                FROM correlation_incidents
            """
            await cur.execute(sql)
            res = await cur.fetchone()
            print(f"Results: {res}")
    pool.close()
    await pool.wait_closed()

if __name__ == "__main__":
    asyncio.run(debug_query())

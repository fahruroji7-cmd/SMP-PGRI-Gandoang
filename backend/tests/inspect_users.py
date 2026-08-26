import asyncio, os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import dotenv_values

env = dotenv_values("/app/backend/.env")

async def main():
    c = AsyncIOMotorClient(env["MONGO_URL"])
    db = c[env["DB_NAME"]]
    users = await db.users.find({}, {"_id": 0}).to_list(100)
    for u in users:
        print({k: (v[:7] + "..." if k == "password_hash" else v) for k, v in u.items()})
    print("indexes:", list((await db.users.index_information()).keys()))

asyncio.run(main())

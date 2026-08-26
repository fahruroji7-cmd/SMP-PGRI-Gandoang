"""One-off cleanup of TEST_-prefixed data created by iteration 8 tests."""
import asyncio

from dotenv import dotenv_values
from motor.motor_asyncio import AsyncIOMotorClient

env = dotenv_values("/app/backend/.env")


async def main():
    cl = AsyncIOMotorClient(env["MONGO_URL"])
    db = cl[env["DB_NAME"]]
    r1 = await db.attendance.delete_many({"entries.student": {"$regex": "^TEST_"}})
    r2 = await db.journals.delete_many({"topic": {"$regex": "^TEST_"}})
    r3 = await db.students.delete_many({"name": {"$regex": "^(TEST_|ZZ UI)"}})
    r4 = await db.classes.delete_many({"name": {"$regex": "^(TEST_|ZZ UI)"}})
    r5 = await db.subjects.delete_many({"name": {"$regex": "^(TEST_|ZZ UI)"}})
    r6 = await db.teachers.delete_many({"name": {"$regex": "^(TEST_|ZZ UI)"}})
    r7 = await db.schedules.delete_many({"room": {"$regex": "^(TEST_|Lab UI|Guru Room)"}})
    r8 = await db.grades.delete_many({"entries.student": {"$regex": "^TEST_"}})
    print({k: v.deleted_count for k, v in zip(
        ["attendance", "journals", "students", "classes", "subjects", "teachers", "schedules", "grades"],
        [r1, r2, r3, r4, r5, r6, r7, r8])})
    cl.close()


asyncio.run(main())

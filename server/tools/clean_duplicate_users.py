# Moved from project root: server/clean_duplicate_users.py
# Utility script to tidy duplicate/null phone fields in the users collection.

import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

async def clean_duplicate_phone_nulls():
    mongodb_uri = os.getenv('MONGODB_URL')
    client = AsyncIOMotorClient(mongodb_uri)
    db = client['ai_code_optimizer']
    try:
        users_with_null_phone = await db.users.find({"phone": None}).to_list(length=None)
        print(f"Found {len(users_with_null_phone)} users with null phone")
        if len(users_with_null_phone) > 1:
            keep_user = users_with_null_phone[0]
            print(f"Keeping user: {keep_user.get('email', 'Unknown')} (ID: {keep_user['_id']})")
            for i, user in enumerate(users_with_null_phone[1:], 1):
                user_email = user.get('email', 'Unknown')
                user_id = user['_id']
                existing_with_email = await db.users.find_one({"_id": {"$ne": user_id}, "email": user_email})
                if existing_with_email:
                    print(f"Deleting duplicate user {i}: {user_email} (ID: {user_id})")
                    await db.users.delete_one({"_id": user_id})
                else:
                    print(f"Removing phone field from user {i}: {user_email} (ID: {user_id})")
                    await db.users.update_one({"_id": user_id}, {"$unset": {"phone": ""}})
        remaining_null_phone = await db.users.count_documents({"phone": None})
        print(f"Remaining users with null phone: {remaining_null_phone}")
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(clean_duplicate_phone_nulls())

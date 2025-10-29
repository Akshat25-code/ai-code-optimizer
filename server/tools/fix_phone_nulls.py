import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Load environment variables
load_dotenv()

async def fix_phone_null_issue():
    """Remove phone field from all users who have null phone values"""
    mongodb_uri = os.getenv('MONGODB_URL')
    
    client = AsyncIOMotorClient(mongodb_uri)
    db = client['ai_code_optimizer']
    
    try:
        # Remove phone field entirely from users with null phone values
        result = await db.users.update_many(
            {"phone": None},
            {"$unset": {"phone": ""}}
        )
        print(f"✅ Removed phone field from {result.modified_count} users")
        
        # Also remove phone field from users where phone is empty string
        result2 = await db.users.update_many(
            {"phone": ""},
            {"$unset": {"phone": ""}}
        )
        print(f"✅ Removed empty phone field from {result2.modified_count} users")
        
        # Verify no more null phone values
        null_phone_count = await db.users.count_documents({"phone": None})
        empty_phone_count = await db.users.count_documents({"phone": ""})
        print(f"Remaining users with null phone: {null_phone_count}")
        print(f"Remaining users with empty phone: {empty_phone_count}")
        
        # Show all users for verification
        all_users = await db.users.find({}, {"email": 1, "phone": 1}).to_list(length=None)
        print(f"\nAll users in database ({len(all_users)}):")
        for user in all_users:
            phone_value = user.get('phone', '[NO PHONE FIELD]')
            print(f"  - {user.get('email', 'No email')} | Phone: {phone_value}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(fix_phone_null_issue())
import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Load environment variables
load_dotenv()

async def fix_phone_null_issue():
    """Remove phone field from all users who have null phone values"""
    mongodb_uri = os.getenv('MONGODB_URL')
    
    client = AsyncIOMotorClient(mongodb_uri)
    db = client['ai_code_optimizer']
    
    try:
        # Remove phone field entirely from users with null phone values
        result = await db.users.update_many(
            {"phone": None},
            {"$unset": {"phone": ""}}
        )
        print(f"✅ Removed phone field from {result.modified_count} users")
        
        # Also remove phone field from users where phone is empty string
        result2 = await db.users.update_many(
            {"phone": ""},
            {"$unset": {"phone": ""}}
        )
        print(f"✅ Removed empty phone field from {result2.modified_count} users")
        
        # Verify no more null phone values
        null_phone_count = await db.users.count_documents({"phone": None})
        empty_phone_count = await db.users.count_documents({"phone": ""})
        print(f"Remaining users with null phone: {null_phone_count}")
        print(f"Remaining users with empty phone: {empty_phone_count}")
        
        # Show all users for verification
        all_users = await db.users.find({}, {"email": 1, "phone": 1}).to_list(length=None)
        print(f"\nAll users in database ({len(all_users)}):")
        for user in all_users:
            phone_value = user.get('phone', '[NO PHONE FIELD]')
            print(f"  - {user.get('email', 'No email')} | Phone: {phone_value}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(fix_phone_null_issue())

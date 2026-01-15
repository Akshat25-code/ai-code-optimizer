import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Load environment variables
load_dotenv()

async def clean_duplicate_phone_nulls():
    """Clean up duplicate null phone entries"""
    mongodb_uri = os.getenv('MONGODB_URL')
    
    client = AsyncIOMotorClient(mongodb_uri)
    db = client['ai_code_optimizer']
    
    try:
        # Find all users with null phone
        users_with_null_phone = await db.users.find({"phone": None}).to_list(length=None)
        print(f"Found {len(users_with_null_phone)} users with null phone")
        
        if len(users_with_null_phone) > 1:
            # Keep the first one, remove the rest
            keep_user = users_with_null_phone[0]
            print(f"Keeping user: {keep_user.get('email', 'Unknown')} (ID: {keep_user['_id']})")
            
            for i, user in enumerate(users_with_null_phone[1:], 1):
                # Instead of deleting, let's update their phone to a unique temporary value
                # or merge them if they're duplicates
                user_email = user.get('email', 'Unknown')
                user_id = user['_id']
                
                # Check if this is a duplicate by email
                existing_with_email = await db.users.find_one({
                    "_id": {"$ne": user_id},
                    "email": user_email
                })
                
                if existing_with_email:
                    print(f"Deleting duplicate user {i}: {user_email} (ID: {user_id})")
                    await db.users.delete_one({"_id": user_id})
                else:
                    # This is a unique user, just remove the phone field entirely
                    print(f"Removing phone field from user {i}: {user_email} (ID: {user_id})")
                    await db.users.update_one(
                        {"_id": user_id},
                        {"$unset": {"phone": ""}}
                    )
        
        # Verify no more duplicates
        remaining_null_phone = await db.users.count_documents({"phone": None})
        print(f"Remaining users with null phone: {remaining_null_phone}")
        
        # Show all users for verification
        all_users = await db.users.find({}, {"email": 1, "phone": 1, "created_at": 1}).to_list(length=None)
        print(f"\nAll users in database ({len(all_users)}):")
        for user in all_users:
            print(f"  - {user.get('email', 'No email')} | Phone: {user.get('phone', 'None')} | ID: {user['_id']}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(clean_duplicate_phone_nulls())
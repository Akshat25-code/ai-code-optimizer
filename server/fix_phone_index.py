import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Load environment variables
load_dotenv()

async def fix_phone_index():
    """Fix the phone index to allow multiple null values"""
    mongodb_uri = os.getenv('MONGODB_URL')
    
    client = AsyncIOMotorClient(mongodb_uri)
    db = client['ai_code_optimizer']
    
    try:
        # Get existing indexes
        indexes = await db.users.list_indexes().to_list(length=None)
        print("Existing indexes:")
        for idx in indexes:
            print(f"  - {idx}")
        
        # Check if phone index exists and drop it
        try:
            await db.users.drop_index("phone_1")
            print("✅ Dropped existing phone_1 index")
        except Exception as e:
            print(f"ℹ️  No phone_1 index to drop: {e}")
        
        # Create new sparse unique index for phone
        await db.users.create_index("phone", unique=True, sparse=True)
        print("✅ Created new sparse unique phone index")
        
        # Verify the new index
        indexes = await db.users.list_indexes().to_list(length=None)
        print("\nUpdated indexes:")
        for idx in indexes:
            if 'phone' in str(idx.get('key', {})):
                print(f"  - Phone index: {idx}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(fix_phone_index())
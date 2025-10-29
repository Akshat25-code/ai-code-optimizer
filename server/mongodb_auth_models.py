"""
MongoDB Authentication Models for AI Code Optimizer
Replaces SQLAlchemy models with MongoDB document models
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from bson import ObjectId
from mongodb_database import get_database, serialize_doc, get_object_id
import asyncio

class MongoUser:
    """User document model for MongoDB"""
    
    @staticmethod
    async def create_user(user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new user in MongoDB"""
        db = get_database()
        
        user_doc = {
            "name": user_data["name"],
            # Only include email if provided to avoid unique index conflicts on None
            # "email": user_data.get("email"),
            "password_hash": user_data["password_hash"],
            "role": "user",
            "preferences": {
                "theme": "system",
                "language": "auto",
                "editor": {
                    "font_size": 14,
                    "theme": "vs-dark",
                    "keybinding": "vscode"
                },
                "ai": {
                    "default_provider": None,
                    "custom_prompts": {}
                },
                "notifications": {
                    "email_updates": True,
                    "security_alerts": True,
                    "optimization_results": True
                }
            },
            "is_verified": False,
            "profile_picture": None,
            # Enhanced profile fields
            "bio": None,
            "location": {
                "city": None,
                "country": None,
                "timezone": None
            },
            "professional": {
                "job_title": None,
                "company": None,
                "experience_level": None
            },
            "social_links": {
                "github": None,
                "linkedin": None,
                "twitter": None,
                "website": None
            },
            # Phone verification status
            "phone_verified": False,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "last_login_at": None
        }
        if user_data.get("email"):
            user_doc["email"] = user_data["email"]
        
        # Only add phone field if phone is provided and not empty
        if user_data.get("phone"):
            user_doc["phone"] = user_data["phone"]  # stored in E.164 format if provided
        
        try:
            result = await db.users.insert_one(user_doc)
            user_doc["id"] = str(result.inserted_id)
            if "_id" in user_doc:
                del user_doc["_id"]
            return user_doc
        except Exception as e:
            if "duplicate key error" in str(e).lower():
                # Could be email or phone; surface a generic message
                raise ValueError("Duplicate key error (email or phone)")
            raise e
    
    @staticmethod
    async def find_user_by_email(email: str) -> Optional[Dict[str, Any]]:
        """Find user by email"""
        db = get_database()
        user = await db.users.find_one({"email": email})
        return serialize_doc(user) if user else None
    
    @staticmethod
    async def find_user_by_phone(phone: str) -> Optional[Dict[str, Any]]:
        """Find user by phone (E.164)"""
        db = get_database()
        user = await db.users.find_one({"phone": phone})
        return serialize_doc(user) if user else None
    
    @staticmethod
    async def find_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
        """Find user by ID"""
        db = get_database()
        try:
            user = await db.users.find_one({"_id": get_object_id(user_id)})
            return serialize_doc(user) if user else None
        except ValueError:
            return None
    
    @staticmethod
    async def update_last_login(user_id: str):
        """Update user's last login time"""
        db = get_database()
        try:
            await db.users.update_one(
                {"_id": get_object_id(user_id)},
                {"$set": {"last_login_at": datetime.now(timezone.utc)}}
            )
        except ValueError:
            pass

class MongoUserSession:
    """User session document model for MongoDB"""
    
    @staticmethod
    async def create_session(session_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new session in MongoDB"""
        db = get_database()
        
        session_doc = {
            "user_id": session_data["user_id"],
            "session_id": session_data["session_id"],
            "access_token_hash": session_data["access_token_hash"],
            "refresh_token_hash": session_data["refresh_token_hash"],
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "expires_at": session_data.get("expires_at", datetime.now(timezone.utc) + timedelta(days=30)),
            "ip_address": session_data.get("ip_address"),
            "user_agent": session_data.get("user_agent"),
            "last_accessed_at": datetime.now(timezone.utc),
            "logged_out_at": None
        }
        
        result = await db.user_sessions.insert_one(session_doc)
        session_doc["id"] = str(result.inserted_id)
        if "_id" in session_doc:
            del session_doc["_id"]
        return session_doc
    
    @staticmethod
    async def find_active_session(user_id: str, token_hash: str) -> Optional[Dict[str, Any]]:
        """Find active session by user and token hash"""
        db = get_database()
        session = await db.user_sessions.find_one({
            "user_id": user_id,
            "access_token_hash": token_hash,
            "is_active": True
        })
        return serialize_doc(session) if session else None
    
    @staticmethod
    async def find_session_by_refresh_token(user_id: str, refresh_token_hash: str) -> Optional[Dict[str, Any]]:
        """Find session by refresh token"""
        db = get_database()
        session = await db.user_sessions.find_one({
            "user_id": user_id,
            "refresh_token_hash": refresh_token_hash,
            "is_active": True
        })
        return serialize_doc(session) if session else None
    
    @staticmethod
    async def update_session_access_token(session_id: str, new_access_token_hash: str):
        """Update session with new access token"""
        db = get_database()
        await db.user_sessions.update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "access_token_hash": new_access_token_hash,
                    "last_accessed_at": datetime.now(timezone.utc)
                }
            }
        )
    
    @staticmethod
    async def deactivate_session(session_id: str):
        """Deactivate session"""
        db = get_database()
        await db.user_sessions.update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "is_active": False,
                    "logged_out_at": datetime.now(timezone.utc)
                }
            }
        )
    
    @staticmethod
    async def deactivate_user_sessions(user_id: str):
        """Deactivate all sessions for a user"""
        db = get_database()
        await db.user_sessions.update_many(
            {"user_id": user_id},
            {
                "$set": {
                    "is_active": False,
                    "logged_out_at": datetime.now(timezone.utc)
                }
            }
        )
    
    @staticmethod
    async def get_user_sessions(user_id: str) -> List[Dict[str, Any]]:
        """Get all active sessions for a user"""
        db = get_database()
        sessions = await db.user_sessions.find({
            "user_id": user_id,
            "is_active": True
        }).to_list(100)
        
        return [serialize_doc(session) for session in sessions]

class MongoPasswordResetToken:
    """Password reset token document model for MongoDB"""
    
    @staticmethod
    async def create_reset_token(user_id: str, token_hash: str) -> Dict[str, Any]:
        """Create password reset token"""
        db = get_database()
        
        # Remove old tokens for this user
        await db.password_reset_tokens.delete_many({"user_id": user_id})
        
        reset_doc = {
            "user_id": user_id,
            "token_hash": token_hash,
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),  # 1 hour expiry
            "used": False
        }
        
        result = await db.password_reset_tokens.insert_one(reset_doc)
        reset_doc["id"] = str(result.inserted_id)
        if "_id" in reset_doc:
            del reset_doc["_id"]
        return reset_doc
    
    @staticmethod
    async def find_valid_token(token_hash: str) -> Optional[Dict[str, Any]]:
        """Find valid (unused, not expired) reset token"""
        db = get_database()
        token = await db.password_reset_tokens.find_one({
            "token_hash": token_hash,
            "used": False,
            "expires_at": {"$gt": datetime.now(timezone.utc)}
        })
        return serialize_doc(token) if token else None

class MongoOAuthProvider:
    """OAuth provider document model for MongoDB"""
    
    @staticmethod
    async def create_oauth_link(user_id: str, provider: str, provider_id: str, access_token: str) -> Dict[str, Any]:
        """Link OAuth provider to user"""
        db = get_database()
        
        oauth_doc = {
            "user_id": user_id,
            "provider": provider,  # google, facebook, github, etc.
            "provider_id": provider_id,
            "access_token": access_token,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        # Use upsert to update if exists
        result = await db.oauth_providers.replace_one(
            {"user_id": user_id, "provider": provider},
            oauth_doc,
            upsert=True
        )
        
        oauth_doc["id"] = str(result.upserted_id) if result.upserted_id else None
        return oauth_doc

class MongoPhoneOTP:
    """One-time password (OTP) storage for phone login verification"""

    @staticmethod
    async def create_otp(phone: str, code_hash: str, ttl_minutes: int = 5, code_plain: str | None = None) -> Dict[str, Any]:
        import os
        db = get_database()
        # remove old pending for phone
        await db.phone_login_otps.delete_many({"phone": phone})
        doc = {
            "phone": phone,
            "code_hash": code_hash,
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes),
            "verified": False
        }
        # Only store plaintext for development if explicitly enabled
        if os.getenv("DEV_OTP_DEBUG") == "1" and code_plain:
            doc["code_plain"] = code_plain
        result = await db.phone_login_otps.insert_one(doc)
        doc["id"] = str(result.inserted_id)
        if "_id" in doc: del doc["_id"]
        return doc

    @staticmethod
    async def verify_otp(phone: str, code_hash: str) -> bool:
        db = get_database()
        found = await db.phone_login_otps.find_one({
            "phone": phone,
            "code_hash": code_hash,
            "verified": False,
            "expires_at": {"$gt": datetime.now(timezone.utc)}
        })
        if not found:
            return False
        await db.phone_login_otps.update_one({"_id": found["_id"]}, {"$set": {"verified": True}})
        return True

# Database connection dependency for FastAPI
async def get_mongodb():
    """FastAPI dependency to get MongoDB database"""
    from mongodb_database import mongodb
    if mongodb.database is None:
        from mongodb_database import connect_to_mongo
        await connect_to_mongo()
    return mongodb.database

# Helper functions for authentication
async def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    """Authenticate user with email and password"""
    from jwt_utils import PasswordManager
    
    user = await MongoUser.find_user_by_email(email)
    if not user:
        return None
    
    if not PasswordManager.verify_password(password, user["password_hash"]):
        return None
    
    return user

async def create_user_session(user_id: str, access_token: str, refresh_token: str, **kwargs) -> Dict[str, Any]:
    """Create a new user session"""
    from jwt_utils import SessionManager
    
    session_data = {
        "user_id": user_id,
        "session_id": SessionManager.generate_session_id(),
        "access_token_hash": SessionManager.hash_token(access_token),
        "refresh_token_hash": SessionManager.hash_token(refresh_token),
        **kwargs
    }
    
    return await MongoUserSession.create_session(session_data)

if __name__ == "__main__":
    # Test the MongoDB models
    async def test_models():
        from mongodb_database import connect_to_mongo
        from jwt_utils import PasswordManager
        
        print("🧪 Testing MongoDB Authentication Models")
        print("=" * 50)
        
        # Connect to MongoDB
        await connect_to_mongo()
        
        # Test user creation
        print("1️⃣ Testing User Creation...")
        try:
            test_user_data = {
                "name": "Test User",
                "email": "test@mongodb.example.com",
                "password_hash": PasswordManager.hash_password("testpassword123")
            }
            
            user = await MongoUser.create_user(test_user_data)
            print(f"✅ User created: {user['name']} ({user['email']})")
            
            # Test user lookup
            found_user = await MongoUser.find_user_by_email("test@mongodb.example.com")
            print(f"✅ User found: {found_user['id']}")
            
            # Test session creation
            session = await create_user_session(
                user_id=user["id"],
                access_token="test_access_token",
                refresh_token="test_refresh_token"
            )
            print(f"✅ Session created: {session['session_id']}")
            
        except ValueError as e:
            print(f"ℹ️ User might already exist: {e}")
        except Exception as e:
            print(f"❌ Test failed: {e}")
        
        print("\n🎉 MongoDB models test completed!")
    
    asyncio.run(test_models())
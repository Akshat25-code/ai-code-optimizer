"""
MongoDB Database Configuration for AI Code Optimizer
Reads connection from environment (MONGODB_URL) and avoids hard-coded secrets.
"""
import os
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import asyncio
from bson import ObjectId
from dotenv import load_dotenv
try:
    import certifi  # Use robust CA bundle for TLS handshakes (Atlas, etc.)
    _CERTIFI_CA = certifi.where()
except Exception:
    certifi = None
    _CERTIFI_CA = None

load_dotenv()

# MongoDB connection string and DB name from env
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017/ai_code_optimizer")
DATABASE_NAME = os.getenv("MONGODB_DB", "ai_code_optimizer")
SERVER_SELECTION_TIMEOUT_MS = int(os.getenv("MONGODB_SELECT_TIMEOUT_MS", "30000"))  # 30s default
CONNECT_TIMEOUT_MS = int(os.getenv("MONGODB_CONNECT_TIMEOUT_MS", "20000"))        # 20s default
SOCKET_TIMEOUT_MS = int(os.getenv("MONGODB_SOCKET_TIMEOUT_MS", "20000"))          # 20s default
RETRY_CONNECT_ATTEMPTS = int(os.getenv("MONGODB_CONNECT_RETRIES", "2"))           # additional retries after first
INSECURE_TLS_FALLBACK = os.getenv("MONGODB_INSECURE_TLS", "0") == "1"            # debug only
MONGODB_TLS = os.getenv("MONGODB_TLS", "").strip()
MONGODB_TLS_CA_FILE = os.getenv("MONGODB_TLS_CA_FILE", "").strip()
MONGODB_APPNAME = os.getenv("MONGODB_APPNAME", "ai-code-optimizer")
MONGODB_REPLICA_SET = os.getenv("MONGODB_REPLICA_SET", "").strip()
MONGODB_RETRY_WRITES = os.getenv("MONGODB_RETRY_WRITES", "1") == "1"

class MongoDB:
    """MongoDB connection manager for AI Code Optimizer"""

    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.database = None

    async def connect(self):
        """Connect to MongoDB Atlas with retries and clearer diagnostics"""
        last_error = None
        # Ensure SRV URLs include a database path or DATABASE_NAME fallback remains
        effective_url = MONGODB_URL
        # Provide hint if user forgot to append db name in URL (not required but helps clarity)
        if "mongodb+srv://" in effective_url and "/" in effective_url.split("mongodb+srv://",1)[1]:
            # ok â€“ has a path; nothing to do
            pass
        # Attempt connections
        for attempt in range(1, RETRY_CONNECT_ATTEMPTS + 2):  # first + retries
            try:
                print(f"ðŸ”Œ MongoDB connect attempt {attempt} (timeout={SERVER_SELECTION_TIMEOUT_MS}ms)")
                # Base client options
                client_kwargs: Dict[str, Any] = {
                    "serverSelectionTimeoutMS": SERVER_SELECTION_TIMEOUT_MS,
                    "connectTimeoutMS": CONNECT_TIMEOUT_MS,
                    "socketTimeoutMS": SOCKET_TIMEOUT_MS,
                    "appname": MONGODB_APPNAME,
                    "retryWrites": MONGODB_RETRY_WRITES,
                }

                # Enable TLS for SRV URLs by default or if explicitly requested
                using_srv = "mongodb+srv://" in effective_url
                use_tls = using_srv or (MONGODB_TLS == "1" or MONGODB_TLS.lower() == "true")
                if use_tls:
                    client_kwargs["tls"] = True
                    # Prefer explicit env CA file, else certifi, else default
                    ca_file = MONGODB_TLS_CA_FILE or _CERTIFI_CA
                    if ca_file:
                        client_kwargs["tlsCAFile"] = ca_file
                        print(f"   ðŸ” TLS enabled (CA={os.path.basename(ca_file) if ca_file else 'system default'})")
                    else:
                        print("   ðŸ” TLS enabled (system CA store)")

                # Optional replica set name (can help avoid ReplicaSetNoPrimary when URI lacks it)
                if MONGODB_REPLICA_SET:
                    client_kwargs["replicaSet"] = MONGODB_REPLICA_SET
                    print(f"   ðŸ§© replicaSet={MONGODB_REPLICA_SET}")

                self.client = AsyncIOMotorClient(
                    effective_url,
                    **client_kwargs,
                )
                self.database = self.client[DATABASE_NAME]
                await self.client.admin.command('ping')
                print("âœ… MongoDB connected successfully!")
                print(f"   ðŸŒ Database: {DATABASE_NAME}")
                print(f"   ðŸ”— URL Host: {MONGODB_URL.split('@')[-1].split('/')[0] if '@' in MONGODB_URL else MONGODB_URL}")
                return True
            except Exception as e:
                last_error = e
                error_msg = str(e)
                if "DNS" in error_msg or "resolution" in error_msg or "srv" in error_msg.lower():
                    print(f"âš ï¸  Attempt {attempt} failed with DNS error: {e}")
                    print("   ðŸ’¡ Hint: Try using direct mongodb:// connection instead of mongodb+srv://")
                else:
                    print(f"âš ï¸  Attempt {attempt} failed: {e}")
                await asyncio.sleep(min(2 * attempt, 5))  # backoff
        # Optional insecure TLS fallback (debug only)
        if INSECURE_TLS_FALLBACK:
            try:
                print("ðŸ›Ÿ Trying insecure TLS fallback (NOT for production)")
                client_kwargs: Dict[str, Any] = {
                    "serverSelectionTimeoutMS": SERVER_SELECTION_TIMEOUT_MS,
                    "connectTimeoutMS": CONNECT_TIMEOUT_MS,
                    "socketTimeoutMS": SOCKET_TIMEOUT_MS,
                    "appname": MONGODB_APPNAME,
                    "retryWrites": MONGODB_RETRY_WRITES,
                    "tls": True,
                    "tlsAllowInvalidCertificates": True,
                }
                self.client = AsyncIOMotorClient(
                    effective_url,
                    **client_kwargs,
                )
                self.database = self.client[DATABASE_NAME]
                await self.client.admin.command('ping')
                print("âœ… Connected with insecure TLS fallback")
                return True
            except Exception as e2:
                last_error = e2
                print(f"âŒ Insecure TLS fallback also failed: {e2}")
        print(f"âŒ MongoDB connection failed after retries: {last_error}")
        return False

    async def disconnect(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            print("âŒ MongoDB connection closed")

    def get_database(self):
        """Get database instance"""
        return self.database

# Global MongoDB instance
mongodb = MongoDB()

async def connect_to_mongo():
    """Initialize MongoDB connection"""
    return await mongodb.connect()

async def close_mongo_connection():
    """Close MongoDB connection"""
    await mongodb.disconnect()

def get_database():
    """Get MongoDB database instance"""
    return mongodb.get_database()

# Synchronous connection for testing
def test_connection():
    """Test MongoDB connection synchronously"""
    try:
        # Mirror async client options for parity
        client_kwargs: Dict[str, Any] = {
            "serverSelectionTimeoutMS": SERVER_SELECTION_TIMEOUT_MS,
            "connectTimeoutMS": CONNECT_TIMEOUT_MS,
            "socketTimeoutMS": SOCKET_TIMEOUT_MS,
            "appname": MONGODB_APPNAME,
            "retryWrites": MONGODB_RETRY_WRITES,
        }
        using_srv = "mongodb+srv://" in MONGODB_URL
        use_tls = using_srv or (MONGODB_TLS == "1" or MONGODB_TLS.lower() == "true")
        if use_tls:
            client_kwargs["tls"] = True
            ca_file = MONGODB_TLS_CA_FILE or _CERTIFI_CA
            if ca_file:
                client_kwargs["tlsCAFile"] = ca_file
        if MONGODB_REPLICA_SET:
            client_kwargs["replicaSet"] = MONGODB_REPLICA_SET
        client = MongoClient(MONGODB_URL, **client_kwargs)
        client.admin.command('ping')
        print("âœ… MongoDB connection test successful!")
        client.close()
        return True
    except Exception as e:
        print(f"âŒ MongoDB connection test failed: {e}")
        return False

async def init_mongodb():
    """Initialize MongoDB collections and indexes"""
    try:
        if mongodb.database is None:
            await connect_to_mongo()

        db = mongodb.database

        print("ðŸ—„ï¸ Initializing MongoDB Collections...")

        # Collections will be created automatically when first document is inserted
        # But we'll create indexes for better performance

        # Users collection indexes
        await db.users.create_index("email", unique=True)
        await db.users.create_index("created_at")
        # Optional phone number (sparse means documents without phone are ignored for uniqueness)
        try:
            await db.users.create_index("phone", unique=True, sparse=True)
            print("   ðŸ“ Users.phone sparse unique index created")
        except Exception as e:
            print(f"   âš ï¸  Could not create phone index (may already exist): {e}")
        print("   ðŸ“ Users collection indexed")

        # User sessions collection indexes
        await db.user_sessions.create_index("user_id")
        await db.user_sessions.create_index("session_id", unique=True)
        await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
        await db.user_sessions.create_index([("user_id", 1), ("is_active", 1)])
        print("   ðŸ“ User sessions collection indexed")

        # OAuth providers collection indexes
        await db.oauth_providers.create_index([("user_id", 1), ("provider", 1)], unique=True)
        print("   ðŸ“ OAuth providers collection indexed")

        # Password reset tokens collection indexes
        await db.password_reset_tokens.create_index("user_id")
        await db.password_reset_tokens.create_index("token_hash", unique=True)
        await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
        print("   ðŸ“ Password reset tokens collection indexed")

        # Phone login OTP collection indexes
        try:
            await db.phone_login_otps.create_index("phone")
            await db.phone_login_otps.create_index([("phone", 1), ("verified", 1)])
            # Ensure TTL index on expires_at. If a non-TTL index exists, drop it first to avoid IndexOptionsConflict.
            try:
                idx_info = await db.phone_login_otps.index_information()
                # Find any index on expires_at
                to_drop = []
                for name, info in idx_info.items():
                    keys = info.get("key") or info.get("keyPattern")
                    # keys comes as list of tuples [(field, direction)] in index_information
                    if keys and isinstance(keys, list) and len(keys) == 1 and keys[0][0] == "expires_at" and keys[0][1] == 1:
                        # If not TTL or TTL value differs, schedule drop
                        if info.get("expireAfterSeconds") not in (0,):
                            to_drop.append(name)
                for name in to_drop:
                    await db.phone_login_otps.drop_index(name)
                    print(f"   ðŸ”§ Dropped non-TTL expires_at index: {name}")
            except Exception as ie:
                print(f"   â„¹ï¸  Could not inspect/drop existing expires_at index (may not exist): {ie}")
            # Create TTL index on expires_at (documents expire at that datetime)
            await db.phone_login_otps.create_index("expires_at", expireAfterSeconds=0)
            print("   ðŸ“ Phone login OTP collection indexed (TTL on expires_at)")
        except Exception as e:
            print(f"   âš ï¸  Phone OTP index creation issue: {e}")

        # Email verification tokens collection indexes
        await db.email_verification_tokens.create_index("user_id")
        await db.email_verification_tokens.create_index("token_hash", unique=True)
        await db.email_verification_tokens.create_index("expires_at", expireAfterSeconds=0)
        print("   ðŸ“ Email verification tokens collection indexed")

        # Login history collection indexes
        await db.login_history.create_index("user_id")
        await db.login_history.create_index("created_at")
        await db.login_history.create_index([("user_id", 1), ("created_at", -1)])
        print("   ðŸ“ Login history collection indexed")

        # Optimize sessions collection indexes
        await db.optimize_sessions.create_index("user_id")
        await db.optimize_sessions.create_index("created_at")

        # User analytics collection indexes
        await db.user_analytics.create_index("user_id", unique=True)
        await db.user_analytics.create_index("updated_at")
        print("   ðŸ“ User analytics collection indexed")

        # Daily usage quota collection indexes
        await db.daily_usage.create_index([("user_id", 1), ("date", 1)], unique=True)
        print("   ðŸ“ Daily usage collection indexed")

        # AI response cache collection indexes (TTL on expires_at)
        await db.ai_response_cache.create_index("cache_key", unique=True)
        await db.ai_response_cache.create_index("expires_at", expireAfterSeconds=0)
        print("   ðŸ“ AI response cache collection indexed (TTL on expires_at)")

        # Projects collection indexes (multi-file workspace)
        await db.projects.create_index("user_id")
        await db.projects.create_index("created_at")
        print("   ðŸ“ Projects collection indexed")

        # Quality snapshots collection indexes (analytics / trending)
        await db.quality_snapshots.create_index("user_id")
        await db.quality_snapshots.create_index("ts")
        await db.quality_snapshots.create_index([("user_id", 1), ("ts", -1)])
        print("   ðŸ“ Quality snapshots collection indexed")

        # Teams collection indexes (collaboration)
        await db.teams.create_index("owner_id")
        await db.teams.create_index("created_at")
        print("   ðŸ“ Teams collection indexed")

        # Shared sessions collection indexes (share links)
        await db.shared_sessions.create_index("token", unique=True)
        await db.shared_sessions.create_index("expires_at", expireAfterSeconds=0)
        await db.shared_sessions.create_index("owner_id")
        print("   ðŸ“ Shared sessions collection indexed")

        # Comments collection indexes (line comments)
        await db.comments.create_index("session_id")
        await db.comments.create_index("user_id")
        await db.comments.create_index([("session_id", 1), ("line", 1)])
        print("   ðŸ“ Comments collection indexed")

        # User rules collection indexes (custom linting rules)
        await db.user_rules.create_index("user_id", unique=True)
        print("   ðŸ“ User rules collection indexed")

        # BYO-API: encrypted user API keys
        await db.user_api_keys.create_index(
            [("user_id", 1), ("provider", 1)], unique=True
        )
        print("   ðŸ”‘ User API keys collection indexed")

        print("âœ… MongoDB collections and indexes initialized successfully!")
        return True

    except Exception as e:
        print(f"âŒ MongoDB initialization error: {e}")
        return False

# Helper function to convert ObjectId to string
def serialize_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Convert MongoDB document ObjectId to string. Returns a new dict."""
    if not doc:
        return doc
    out = dict(doc)
    if "_id" in out:
        out["id"] = str(out["_id"])
        del out["_id"]
    return out


# Keys that must NEVER be returned to API consumers.
_SENSITIVE_USER_FIELDS = {
    "password_hash",
    "access_token",         # OAuth plaintext (should already be encrypted at rest)
    "refresh_token",        # legacy
    "code_hash",            # phone OTP
    "code_plain",           # phone OTP plaintext (legacy)
    "token_hash",           # password reset tokens
    "verification_code",
    "verification_token",
}


def redact_user(user: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Strip sensitive fields from a user document before returning it to callers."""
    if not user:
        return user
    safe = {k: v for k, v in user.items() if k not in _SENSITIVE_USER_FIELDS}
    return safe

# Helper function to convert string ID to ObjectId
def get_object_id(id_str: str) -> ObjectId:
    """Convert string ID to ObjectId"""
    try:
        return ObjectId(id_str)
    except Exception:
        raise ValueError(f"Invalid ObjectId: {id_str}")

async def check_mongodb_connection():
    """Check if MongoDB is connected and working"""
    try:
        if mongodb.database is None:
            await connect_to_mongo()

        # Test with a simple ping
        await mongodb.client.admin.command('ping')

        # Test collections access
        collections = await mongodb.database.list_collection_names()
        print(f"ðŸ“ Available collections: {collections if collections else 'None (will be created on first use)'}")

        return True
    except Exception as e:
        print(f"âŒ MongoDB connection check failed: {e}")
        return False

async def mongo_diagnostics() -> Dict[str, Any]:
    """Return basic diagnostics about the current MongoDB connection/topology."""
    info: Dict[str, Any] = {
        "url": MONGODB_URL,
        "db": DATABASE_NAME,
        "timeouts": {
            "serverSelectionMS": SERVER_SELECTION_TIMEOUT_MS,
            "connectMS": CONNECT_TIMEOUT_MS,
            "socketMS": SOCKET_TIMEOUT_MS,
        },
        "env": {
            "tls": bool("mongodb+srv://" in MONGODB_URL or (MONGODB_TLS == "1" or MONGODB_TLS.lower() == "true")),
            "tls_ca_file": MONGODB_TLS_CA_FILE or _CERTIFI_CA,
            "replica_set": MONGODB_REPLICA_SET or None,
            "retryWrites": MONGODB_RETRY_WRITES,
            "appName": MONGODB_APPNAME,
            "insecure_tls_fallback": INSECURE_TLS_FALLBACK,
        },
    }
    try:
        if mongodb.client is None:
            await connect_to_mongo()
        hello = await mongodb.client.admin.command("hello")
        info["hello"] = hello
    except Exception as e:
        info["hello_error"] = str(e)
    try:
        await mongodb.client.admin.command('ping')
        info["ping"] = True
    except Exception as e:
        info["ping"] = False
        info["ping_error"] = str(e)
    return info

if __name__ == "__main__":
    # Test the MongoDB connection
    print("ðŸ§ª Testing MongoDB Atlas Connection")
    print("=" * 50)

    # Synchronous test
    test_connection()

    # Async test
    async def test_async():
        await connect_to_mongo()
        await check_mongodb_connection()
        await init_mongodb()
        await close_mongo_connection()

    asyncio.run(test_async())

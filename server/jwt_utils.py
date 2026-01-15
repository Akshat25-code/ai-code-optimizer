"""
JWT Token Management Utilities
Handle JWT token creation, validation, and refresh
"""
import os
import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from passlib.context import CryptContext
from dotenv import load_dotenv
import secrets
import hashlib

load_dotenv()

# JWT Configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class JWTManager:
    """JWT token management class"""
    
    @staticmethod
    def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def create_refresh_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT refresh token"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def verify_token(token: str, token_type: str = "access") -> Optional[Dict[str, Any]]:
        """Verify JWT token"""
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            
            # Check token type
            if payload.get("type") != token_type:
                return None
            
            # Check expiration
            if datetime.fromtimestamp(payload["exp"], tz=timezone.utc) < datetime.now(timezone.utc):
                return None
            
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.JWTError:
            return None
    
    @staticmethod
    def get_token_payload(token: str) -> Optional[Dict[str, Any]]:
        """Get token payload without verification (for debugging)"""
        try:
            payload = jwt.decode(token, options={"verify_signature": False})
            return payload
        except jwt.JWTError:
            return None

class PasswordManager:
    """Password management utilities"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password using bcrypt"""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def generate_reset_token() -> str:
        """Generate secure password reset token"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def generate_verification_token() -> str:
        """Generate secure email verification token"""
        return secrets.token_urlsafe(32)

class SessionManager:
    """Session management utilities"""
    
    @staticmethod
    def generate_session_id() -> str:
        """Generate unique session ID"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def hash_token(token: str) -> str:
        """Hash token for secure storage"""
        return hashlib.sha256(token.encode()).hexdigest()
    
    @staticmethod
    def create_token_pair(user_data: Dict[str, Any]) -> Dict[str, str]:
        """Create access and refresh token pair"""
        access_token = JWTManager.create_access_token(user_data)
        refresh_token = JWTManager.create_refresh_token(user_data)
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60  # seconds
        }

def create_tokens_for_user(user_id: str, email: str | None, name: str) -> Dict[str, str]:
    """Create JWT tokens for authenticated user"""
    user_data = {
        "sub": str(user_id),  # Subject (user ID) - ensure it's string
    "email": email or "",
        "name": name,
        "iat": datetime.now(timezone.utc)  # Issued at
    }
    
    return SessionManager.create_token_pair(user_data)

def extract_user_from_token(token: str) -> Optional[Dict[str, Any]]:
    """Extract user information from JWT token"""
    payload = JWTManager.verify_token(token, "access")
    
    if not payload:
        return None
    
    return {
        "id": payload.get("sub"),  # Keep as string for MongoDB ObjectId
        "email": payload.get("email"),
        "name": payload.get("name")
    }

# Token validation helpers
def is_token_valid(token: str, token_type: str = "access") -> bool:
    """Check if token is valid"""
    return JWTManager.verify_token(token, token_type) is not None

def get_token_expiry(token: str) -> Optional[datetime]:
    """Get token expiry datetime"""
    payload = JWTManager.get_token_payload(token)
    if payload and "exp" in payload:
        return datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    return None

# Initialize on import
print("JWT Manager initialized")
print(f"   • Access token expiry: {ACCESS_TOKEN_EXPIRE_MINUTES} minutes")
print(f"   • Refresh token expiry: {REFRESH_TOKEN_EXPIRE_DAYS} days")
print(f"   • Algorithm: {JWT_ALGORITHM}")
if JWT_SECRET_KEY == "your-secret-key-change-in-production":
    print("   WARNING: Using default JWT secret key. Change in production!")
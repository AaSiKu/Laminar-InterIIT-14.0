import re
from datetime import datetime, timedelta, timezone
from typing import Optional
from passlib.context import CryptContext
from jose import jwt, JWTError
from fastapi import HTTPException, status
from . import config
from .schemas import TokenData
from fastapi.security import OAuth2PasswordRequestForm

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --------- Password utils ---------
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def is_password_strong(password: str) -> bool:
    """
    Password must be at least 8 chars long,
    contain uppercase, lowercase, number, special char.
    """
    if len(password) < 8:
        return False
    if not re.search(r"[A-Z]", password):
        return False
    if not re.search(r"[a-z]", password):
        return False
    if not re.search(r"[0-9]", password):
        return False
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False
    return True

# --------- Email utils ---------
def is_email_valid(email: str) -> bool:
    """Simple regex email validation."""
    regex = r"^[\w\.-]+@[\w\.-]+\.\w+$"
    return re.match(regex, email) is not None

# --------- JWT utils ---------
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)  # timezone-aware UTC
    expire = now + (expires_delta or timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": now})
    return jwt.encode(to_encode, config.SECRET_KEY, algorithm=config.ALGORITHM)

def decode_token(token: str) -> TokenData:
    try:
        payload = jwt.decode(token, config.SECRET_KEY, algorithms=[config.ALGORITHM])
        return TokenData(email=payload.get("sub"))
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

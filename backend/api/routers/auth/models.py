from sqlalchemy import Column, String, Boolean, DateTime, Integer
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

from pydantic import BaseModel, EmailStr, Field
from typing import Optional

# class FileStructure(BaseModel):
#     name: str
#     type: str
#     id: str
#     children: Optional[List['FileStructure']] = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None
    # fileStructure:Optional[FileStructure]={}

class UserOut(BaseModel):
    id: str
    email: EmailStr
    full_name: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    email: Optional[str] = None


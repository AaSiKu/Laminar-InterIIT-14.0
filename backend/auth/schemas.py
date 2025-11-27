from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List

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

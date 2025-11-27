from datetime import datetime
from .utils import get_password_hash

async def get_user_by_email(user_collection, email: str):
    return await user_collection.find_one({"email": email})

async def create_user(user_collection, data):
    user_doc = {
    "email": data.email,
    "hashed_password": get_password_hash(data.password),
    "full_name": data.full_name or "",
    "is_active": True,
    "created_at": datetime.utcnow(),
}
    result = await user_collection.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    return user_doc

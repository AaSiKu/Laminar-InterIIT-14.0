from fastapi import APIRouter, Depends, HTTPException, Request, status, Response
from datetime import timedelta
from jose import JWTError, jwt
from . import crud, utils
from .schemas import UserCreate, UserOut
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# ------------------ SIGNUP ------------------ #
@router.post("/signup", response_model=UserOut)
async def signup(request: Request,response: Response, data: UserCreate):
    user_collection = request.app.state.user_collection

    # Validate email & password
    if not utils.is_email_valid(data.email):
        raise HTTPException(status_code=400, detail="Invalid email format")
    if not utils.is_password_strong(data.password):
        raise HTTPException(
            status_code=400,
            detail="Password must be 8+ chars, include uppercase, lowercase, number, and special char"
        )

    email_normalized = data.email.strip().lower()
    existing = await crud.get_user_by_email(user_collection, email_normalized)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    data.email = email_normalized
    user = await crud.create_user(user_collection, data)

    access_token_expires = timedelta(minutes=request.app.state.access_token_expire_minutes)
    refresh_token_expires = timedelta(minutes=request.app.state.refresh_token_expire_minutes)

    access_token = utils.create_access_token(
        data={"sub": user["email"], "user_id": str(user["_id"])},
        expires_delta=access_token_expires
    )
    refresh_token = utils.create_access_token(
        data={"sub": user["email"], "type": "refresh"},
        expires_delta=refresh_token_expires
    )

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,  # True in production
        samesite="Lax",  # or "None" if frontend & backend are on different domains
        max_age=int(access_token_expires.total_seconds()),
    path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="Lax",
        max_age=int(refresh_token_expires.total_seconds()),
    path="/",
    )

    return UserOut(id=str(user["_id"]), email=user["email"], full_name=user.get("full_name"))


# ------------------ LOGIN ------------------ #
@router.post("/login", response_model=dict)
async def login(request: Request, response: Response, form_data: utils.OAuth2PasswordRequestForm = Depends()):
    user_collection = request.app.state.user_collection
    user_email = form_data.username.strip().lower()

    user = await crud.get_user_by_email(user_collection, user_email)
    if not user or not utils.verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token_expires = timedelta(minutes=request.app.state.access_token_expire_minutes)
    refresh_token_expires = timedelta(minutes=request.app.state.refresh_token_expire_minutes)

    access_token = utils.create_access_token(
        data={"sub": user["email"], "user_id": str(user["_id"])},
        expires_delta=access_token_expires
    )
    refresh_token = utils.create_access_token(
        data={"sub": user["email"], "type": "refresh"},
        expires_delta=refresh_token_expires
    )

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,  # True in production
        samesite="Lax",  # or "None" if frontend & backend are on different domains
        max_age=int(access_token_expires.total_seconds()),
    path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="Lax",
        max_age=int(refresh_token_expires.total_seconds()),
    path="/",
    )

    return {"message": "Login successful", "access_token": access_token, "refresh_token": refresh_token}


# ------------------ LOGOUT ------------------ #
@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}


# ------------------ GET CURRENT USER ------------------ #
async def get_current_user(request: Request):
    """Extract token from cookies instead of Authorization header"""
    token = request.cookies.get("access_token")
    
    if not token:
        print("DEBUG: No access token found in cookies", flush=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    try:
        payload = jwt.decode(
            token,
            request.app.state.secret_key,
            algorithms=[request.app.state.algorithm],
        )
        email: str = payload.get("sub")
        print(f"DEBUG: Token decoded, email: {email}", flush=True)  # ADD THIS
        
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        user = await request.app.state.user_collection.find_one({"email": email})
        print(f"DEBUG: User lookup result: {user is not None}", flush=True)  # ADD THIS
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return user

    except JWTError as e:
        logger.error(f"JWT Error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

# ------------------ REFRESH TOKEN ------------------ #
@router.post("/refresh")
async def refresh_token(request: Request, response: Response):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token found")

    try:
        payload = jwt.decode(
            refresh_token,
            request.app.state.secret_key,
            algorithms=[request.app.state.algorithm],
        )

        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token type")

        email = payload.get("sub")
        user = await request.app.state.user_collection.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        new_access_token = utils.create_access_token(
            data={"sub": user["email"], "user_id": str(user["_id"])},
            expires_delta=timedelta(minutes=request.app.state.access_token_expire_minutes),
        )

        response.set_cookie(
            key="access_token",
            value=new_access_token,
            httponly=True,
            secure=False,
            samesite="Lax",
            max_age=int(timedelta(minutes=request.app.state.access_token_expire_minutes).total_seconds()),
        )

        return {"message": "Token refreshed successfully"}

    except JWTError as e:
        logger.error(f"JWT Error: {e}")
        raise HTTPException(status_code=401, detail="Invalid refresh token")


# ------------------ ME ------------------ #
@router.get("/me", response_model=UserOut)
async def get_me(request: Request, current_user: dict = Depends(get_current_user)):
    return UserOut(id=str(current_user["_id"]), email=current_user["email"], full_name=current_user.get("full_name"))

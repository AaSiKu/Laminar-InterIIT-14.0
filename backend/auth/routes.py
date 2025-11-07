
from fastapi import APIRouter, Depends, HTTPException, Request, status, FastAPI
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import timedelta
from . import crud, utils
from .schemas import UserCreate, UserOut, Token
from fastapi.middleware.cors import CORSMiddleware

from fastapi.responses import JSONResponse
from fastapi.requests import Request


app = FastAPI()

# Allow your frontend origin(s)
origins = [
    "http://localhost:5173",  # frontend
    "http://127.0.0.1:5173", 
    "http://localhost:4173",  # frontend
    "http://127.0.0.1:4173",  # sometimes used
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,        # allow your frontend
    allow_credentials=True,       # allow cookies, auth headers
    allow_methods=["*"],          # allow all HTTP methods
    allow_headers=["*"],          # allow all headers
)
router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth")



@router.post("/signup", response_model=UserOut)
async def signup(request: Request, data: UserCreate):
    user_collection = request.app.state.user_collection

    # Validate email & password
    if not utils.is_email_valid(data.email):
        raise HTTPException(status_code=400, detail="Invalid email format")
    if not utils.is_password_strong(data.password):
        raise HTTPException(
            status_code=400, 
            detail="Password must be 8+ chars, include uppercase, lowercase, number, special char"
        )
    ## if you want i can merge the error into one for safety
    # Check if user exists
    existing = await crud.get_user_by_email(user_collection, data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    # Normalize email
    email_normalized = data.email.strip().lower()

    # Check if user exists
    existing = await crud.get_user_by_email(user_collection, email_normalized)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Save user
    data.email = email_normalized

    user = await crud.create_user(user_collection, data)
    return UserOut(id=str(user["_id"]), email=user["email"], full_name=user.get("full_name"))




@router.post("/login", response_model=dict)
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    user_collection = request.app.state.user_collection
    # Normalize login email
    user_email = form_data.username.strip().lower()

    user = await crud.get_user_by_email(user_collection, user_email)
    if not user or not utils.verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = utils.create_access_token(
        data={"sub": user["email"], "user_id": str(user["_id"])},
        expires_delta=timedelta(minutes=request.app.state.access_token_expire_minutes)
    )
    refresh_token = utils.create_access_token(
        data={"sub": user["email"], "type": "refresh"},
        expires_delta=timedelta(minutes=request.app.state.refresh_token_expire_minutes)
    )

    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}




@router.post("/refresh", response_model=Token)
async def refresh_token(request: Request, token: str = Depends(oauth2_scheme)):
    token_data = utils.decode_token(token)
    user_collection = request.app.state.user_collection
    user = await crud.get_user_by_email(user_collection, token_data.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    access_token = utils.create_access_token(
        data={"sub": user["email"], "user_id": str(user["_id"])},
        expires_delta=timedelta(minutes=request.app.state.access_token_expire_minutes)
    )
    return Token(access_token=access_token)




@router.post("/logout")
async def logout(request: Request, token: str = Depends(oauth2_scheme)):
    if not hasattr(request.app.state, "revoked_tokens"):
        request.app.state.revoked_tokens = set()
    request.app.state.revoked_tokens.add(token)
    return {"message": "Token revoked successfully"}




@router.get("/me", response_model=UserOut)
async def get_me(request: Request, token: str = Depends(oauth2_scheme)):
    token_data = utils.decode_token(token)
    user_collection = request.app.state.user_collection
    user = await crud.get_user_by_email(user_collection, token_data.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut(id=str(user["_id"]), email=user["email"], full_name=user.get("full_name"))



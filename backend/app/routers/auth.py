from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    create_email_verification_token,
    decode_email_verification_token,
    hash_password,
    verify_password,
)
from app.db.database import get_db
from app.models.profile import Profile
from app.models.user import User
from app.schemas.auth import LoginRequest, MessageResponse, RegisterRequest, TokenResponse, VerifyEmailRequest
from app.services.email import send_verification_email

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(email=payload.email, hashed_password=hash_password(payload.password), is_active=False)
    db.add(user)
    db.flush()

    db.add(Profile(user_id=user.id))
    db.flush()

    token = create_email_verification_token(subject=str(user.id))
    try:
        send_verification_email(user.email, token)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not send verification email. Please try registering again in a moment.",
        )

    db.commit()

    return MessageResponse(message="Registration successful. Please check your email to activate your account.")


@router.post("/verify-email", response_model=TokenResponse)
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    user_id = decode_email_verification_token(payload.token)
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not user.is_active:
        user.is_active = True
        db.commit()

    token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account not verified. Please check your email.")

    token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=token)

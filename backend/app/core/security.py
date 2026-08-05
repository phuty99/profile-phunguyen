from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def _create_token(subject: str, scope: str, expire_minutes: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
    to_encode = {"sub": subject, "scope": scope, "exp": expire}
    return jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)


def _decode_token(token: str, expected_scope: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except JWTError:
        return None
    if payload.get("scope") != expected_scope:
        return None
    return payload.get("sub")


def create_access_token(subject: str) -> str:
    return _create_token(subject, scope="access", expire_minutes=settings.access_token_expire_minutes)


def decode_access_token(token: str) -> str | None:
    return _decode_token(token, expected_scope="access")


def create_email_verification_token(subject: str) -> str:
    return _create_token(subject, scope="email_verification", expire_minutes=settings.email_verification_expire_minutes)


def decode_email_verification_token(token: str) -> str | None:
    return _decode_token(token, expected_scope="email_verification")

from datetime import datetime

from pydantic import BaseModel


class ProfileUpdateRequest(BaseModel):
    full_name: str | None = None
    headline: str | None = None
    bio: str | None = None


class ProfileImageResponse(BaseModel):
    id: str
    url: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ProfileResponse(BaseModel):
    id: str
    full_name: str
    headline: str
    bio: str
    avatar_url: str | None = None
    images: list[ProfileImageResponse] = []

    model_config = {"from_attributes": True}

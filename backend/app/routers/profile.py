from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.models.profile import Profile, ProfileImage
from app.models.user import User
from app.schemas.profile import ProfileImageResponse, ProfileResponse, ProfileUpdateRequest
from app.services.s3 import delete_image, get_presigned_url, upload_image

router = APIRouter(prefix="/profile", tags=["profile"])


def _serialize(profile: Profile) -> ProfileResponse:
    return ProfileResponse(
        id=str(profile.id),
        full_name=profile.full_name,
        headline=profile.headline,
        bio=profile.bio,
        avatar_url=get_presigned_url(profile.avatar_s3_key) if profile.avatar_s3_key else None,
        images=[
            ProfileImageResponse(id=str(img.id), url=get_presigned_url(img.s3_key), created_at=img.created_at)
            for img in profile.images
        ],
    )


@router.get("/me", response_model=ProfileResponse)
def get_my_profile(current_user: User = Depends(get_current_user)):
    return _serialize(current_user.profile)


@router.put("/me", response_model=ProfileResponse)
def update_my_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = current_user.profile
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return _serialize(profile)


@router.get("/{profile_id}", response_model=ProfileResponse)
def get_public_profile(profile_id: str, db: Session = Depends(get_db)):
    profile = db.get(Profile, profile_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return _serialize(profile)


@router.post("/me/avatar", response_model=ProfileResponse)
def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = current_user.profile
    old_key = profile.avatar_s3_key
    profile.avatar_s3_key = upload_image(file, folder=f"avatars/{current_user.id}")
    db.commit()
    db.refresh(profile)

    if old_key:
        delete_image(old_key)

    return _serialize(profile)


@router.post("/me/images", response_model=ProfileResponse)
def upload_gallery_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = current_user.profile
    key = upload_image(file, folder=f"gallery/{current_user.id}")
    db.add(ProfileImage(profile_id=profile.id, s3_key=key))
    db.commit()
    db.refresh(profile)
    return _serialize(profile)


@router.delete("/me/images/{image_id}", response_model=ProfileResponse)
def delete_gallery_image(
    image_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = current_user.profile
    image = db.get(ProfileImage, image_id)
    if not image or image.profile_id != profile.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")

    delete_image(image.s3_key)
    db.delete(image)
    db.commit()
    db.refresh(profile)
    return _serialize(profile)

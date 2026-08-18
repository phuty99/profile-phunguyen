import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.models.profile import Education, Experience, Profile, ProfileImage, Project
from app.models.user import User
from app.schemas.profile import (
    CvScanResponse,
    EducationListRequest,
    EducationResponse,
    ExperienceListRequest,
    ExperienceResponse,
    ProfileImageResponse,
    ProfileResponse,
    ProfileUpdateRequest,
    ProjectResponse,
)
from app.services.cv_parser import extract_markdown, parse_cv, parse_cv_with_gemini
from app.services.s3 import delete_image, delete_object, get_presigned_url, upload_bytes, upload_image

router = APIRouter(prefix="/profile", tags=["profile"])

MAX_CV_SIZE_BYTES = 5 * 1024 * 1024


def _serialize(profile: Profile) -> ProfileResponse:
    return ProfileResponse(
        id=str(profile.id),
        full_name=profile.full_name,
        headline=profile.headline,
        bio=profile.bio,
        avatar_url=get_presigned_url(profile.avatar_s3_key) if profile.avatar_s3_key else None,
        cv_url=get_presigned_url(profile.cv_s3_key) if profile.cv_s3_key else None,
        phone=profile.phone,
        location=profile.location,
        website_url=profile.website_url,
        linkedin_url=profile.linkedin_url,
        github_url=profile.github_url,
        skills=profile.skills,
        interests=profile.interests,
        is_public=profile.is_public,
        images=[
            ProfileImageResponse(id=str(img.id), url=get_presigned_url(img.s3_key), created_at=img.created_at)
            for img in profile.images
        ],
        experiences=[
            ExperienceResponse(
                id=str(exp.id),
                title=exp.title,
                company=exp.company,
                start_date=exp.start_date,
                end_date=exp.end_date,
                description=exp.description,
            )
            for exp in profile.experiences
        ],
        educations=[
            EducationResponse(
                id=str(edu.id),
                school=edu.school,
                degree=edu.degree,
                start_date=edu.start_date,
                end_date=edu.end_date,
                description=edu.description,
            )
            for edu in profile.educations
        ],
        projects=[
            ProjectResponse(
                id=str(proj.id),
                title=proj.title,
                description=proj.description,
                tech_stack=proj.tech_stack,
                demo_url=proj.demo_url,
                github_url=proj.github_url,
                thumbnail_url=get_presigned_url(proj.thumbnail_s3_key) if proj.thumbnail_s3_key else None,
            )
            for proj in profile.projects
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


@router.put("/me/experiences", response_model=ProfileResponse)
def replace_experiences(
    payload: ExperienceListRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = current_user.profile
    profile.experiences.clear()
    db.flush()
    for order, item in enumerate(payload.items):
        db.add(Experience(profile_id=profile.id, sort_order=order, **item.model_dump()))
    db.commit()
    db.refresh(profile)
    return _serialize(profile)


@router.put("/me/educations", response_model=ProfileResponse)
def replace_educations(
    payload: EducationListRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = current_user.profile
    profile.educations.clear()
    db.flush()
    for order, item in enumerate(payload.items):
        db.add(Education(profile_id=profile.id, sort_order=order, **item.model_dump()))
    db.commit()
    db.refresh(profile)
    return _serialize(profile)


@router.post("/me/projects", response_model=ProfileResponse)
def create_project(
    title: str = Form(""),
    description: str = Form(""),
    tech_stack: str = Form(""),
    demo_url: str = Form(""),
    github_url: str = Form(""),
    thumbnail: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = current_user.profile
    thumbnail_key = upload_image(thumbnail, folder=f"projects/{current_user.id}") if thumbnail else None
    sort_order = len(profile.projects)
    db.add(
        Project(
            profile_id=profile.id,
            title=title,
            description=description,
            tech_stack=tech_stack,
            demo_url=demo_url,
            github_url=github_url,
            thumbnail_s3_key=thumbnail_key,
            sort_order=sort_order,
        )
    )
    db.commit()
    db.refresh(profile)
    return _serialize(profile)


@router.put("/me/projects/{project_id}", response_model=ProfileResponse)
def update_project(
    project_id: str,
    title: str = Form(""),
    description: str = Form(""),
    tech_stack: str = Form(""),
    demo_url: str = Form(""),
    github_url: str = Form(""),
    thumbnail: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = current_user.profile
    project = db.get(Project, project_id)
    if not project or project.profile_id != profile.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    project.title = title
    project.description = description
    project.tech_stack = tech_stack
    project.demo_url = demo_url
    project.github_url = github_url

    if thumbnail:
        old_key = project.thumbnail_s3_key
        project.thumbnail_s3_key = upload_image(thumbnail, folder=f"projects/{current_user.id}")
        if old_key:
            delete_image(old_key)

    db.commit()
    db.refresh(profile)
    return _serialize(profile)


@router.delete("/me/projects/{project_id}", response_model=ProfileResponse)
def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = current_user.profile
    project = db.get(Project, project_id)
    if not project or project.profile_id != profile.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if project.thumbnail_s3_key:
        delete_image(project.thumbnail_s3_key)
    db.delete(project)
    db.commit()
    db.refresh(profile)
    return _serialize(profile)


@router.post("/me/cv/scan", response_model=CvScanResponse)
def scan_cv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are supported")

    contents = file.file.read()
    if len(contents) > MAX_CV_SIZE_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large (max 5MB)")

    markdown = extract_markdown(contents)
    if not markdown.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not extract text from this PDF")

    try:
        parsed = parse_cv_with_gemini(markdown)
    except Exception:
        logging.exception("Gemini CV parsing failed, falling back to local parser")
        parsed = parse_cv(markdown)

    profile = current_user.profile
    old_key = profile.cv_s3_key
    profile.cv_s3_key = upload_bytes(contents, folder=f"cv/{current_user.id}", ext="pdf", content_type="application/pdf")
    db.commit()
    if old_key:
        delete_object(old_key)

    return CvScanResponse(**parsed)


@router.get("/{profile_id}", response_model=ProfileResponse)
def get_public_profile(profile_id: str, db: Session = Depends(get_db)):
    profile = db.get(Profile, profile_id)
    if not profile or not profile.is_public:
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

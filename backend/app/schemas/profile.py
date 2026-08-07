from datetime import datetime

from pydantic import BaseModel


class ExperienceItem(BaseModel):
    title: str = ""
    company: str = ""
    start_date: str = ""
    end_date: str = ""
    description: str = ""


class EducationItem(BaseModel):
    school: str = ""
    degree: str = ""
    start_date: str = ""
    end_date: str = ""
    description: str = ""


class ExperienceResponse(ExperienceItem):
    id: str

    model_config = {"from_attributes": True}


class EducationResponse(EducationItem):
    id: str

    model_config = {"from_attributes": True}


class ExperienceListRequest(BaseModel):
    items: list[ExperienceItem]


class EducationListRequest(BaseModel):
    items: list[EducationItem]


class ProfileUpdateRequest(BaseModel):
    full_name: str | None = None
    headline: str | None = None
    bio: str | None = None
    phone: str | None = None
    location: str | None = None
    website_url: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None
    skills: str | None = None
    interests: str | None = None
    is_public: bool | None = None


class CvScanResponse(BaseModel):
    full_name: str = ""
    headline: str = ""
    bio: str = ""
    phone: str = ""
    website_url: str = ""
    linkedin_url: str = ""
    github_url: str = ""
    skills: str = ""
    interests: str = ""
    experiences: list[ExperienceItem] = []
    educations: list[EducationItem] = []


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
    cv_url: str | None = None
    phone: str
    location: str
    website_url: str
    linkedin_url: str
    github_url: str
    skills: str
    interests: str
    is_public: bool
    images: list[ProfileImageResponse] = []
    experiences: list[ExperienceResponse] = []
    educations: list[EducationResponse] = []

    model_config = {"from_attributes": True}

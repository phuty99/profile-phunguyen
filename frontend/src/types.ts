export interface Experience {
  id?: string
  title: string
  company: string
  start_date: string
  end_date: string
  description: string
}

export interface Education {
  id?: string
  school: string
  degree: string
  start_date: string
  end_date: string
  description: string
}

export interface Project {
  id: string
  title: string
  description: string
  tech_stack: string
  demo_url: string
  github_url: string
  thumbnail_url: string | null
}

export interface ProfileImage {
  id: string
  url: string
  created_at: string
}

export interface Profile {
  id: string
  full_name: string
  headline: string
  bio: string
  avatar_url: string | null
  cv_url: string | null
  phone: string
  location: string
  website_url: string
  linkedin_url: string
  github_url: string
  skills: string
  interests: string
  is_public: boolean
  images: ProfileImage[]
  experiences: Experience[]
  educations: Education[]
  projects: Project[]
}

export interface CvScanResponse {
  full_name: string
  headline: string
  bio: string
  phone: string
  website_url: string
  linkedin_url: string
  github_url: string
  skills: string
  interests: string
  experiences: Experience[]
  educations: Education[]
}

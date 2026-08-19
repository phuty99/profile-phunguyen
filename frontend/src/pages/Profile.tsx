import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import apiClient from '../api/client'
import CvView from '../components/CvView'
import type { Education, Experience, Profile as ProfileType, Project } from '../types'

type NewProject = Omit<Project, 'id' | 'thumbnail_url'>

type ScalarForm = {
  full_name: string
  headline: string
  bio: string
  phone: string
  location: string
  website_url: string
  linkedin_url: string
  github_url: string
  skills: string
  interests: string
  is_public: boolean
}

const emptyExperience: Experience = { title: '', company: '', start_date: '', end_date: '', description: '' }
const emptyEducation: Education = { school: '', degree: '', start_date: '', end_date: '', description: '' }
const emptyProject: NewProject = { title: '', description: '', tech_stack: '', demo_url: '', github_url: '' }

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
const MAX_CV_SIZE_BYTES = 5 * 1024 * 1024

const validateImageFile = (file: File): string => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return 'Please choose a JPEG, PNG, WEBP, or GIF image.'
  if (file.size > MAX_IMAGE_SIZE_BYTES) return 'Image is too large (max 5MB).'
  return ''
}

const validateCvFile = (file: File): string => {
  if (file.type !== 'application/pdf') return 'Please choose a PDF file.'
  if (file.size > MAX_CV_SIZE_BYTES) return 'File is too large (max 5MB).'
  return ''
}

const scalarFields = (data: ProfileType): ScalarForm => ({
  full_name: data.full_name || '',
  headline: data.headline || '',
  bio: data.bio || '',
  phone: data.phone || '',
  location: data.location || '',
  website_url: data.website_url || '',
  linkedin_url: data.linkedin_url || '',
  github_url: data.github_url || '',
  skills: data.skills || '',
  interests: data.interests || '',
  is_public: data.is_public,
})

export default function Profile() {
  const [profile, setProfile] = useState<ProfileType | null>(null)
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [form, setForm] = useState<ScalarForm | null>(null)
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [educations, setEducations] = useState<Education[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [projectFiles, setProjectFiles] = useState<Record<string, File>>({})
  const [newProject, setNewProject] = useState<NewProject>({ ...emptyProject })
  const [newProjectFile, setNewProjectFile] = useState<File | null>(null)
  const [savingProjectId, setSavingProjectId] = useState<string | null>(null)
  const [addingProject, setAddingProject] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')

  const loadProfile = async () => {
    const { data } = await apiClient.get<ProfileType>('/profile/me')
    setProfile(data)
    setForm(scalarFields(data))
    setExperiences(data.experiences.length ? data.experiences : [])
    setEducations(data.educations.length ? data.educations : [])
    setProjects(data.projects)
    setMode(data.full_name ? 'view' : 'edit')
  }

  useEffect(() => {
    loadProfile()
  }, [])

  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => setError(''), 6000)
    return () => clearTimeout(timer)
  }, [error])

  const startEdit = () => {
    if (!profile) return
    setForm(scalarFields(profile))
    setExperiences(profile.experiences.length ? profile.experiences : [])
    setEducations(profile.educations.length ? profile.educations : [])
    setProjects(profile.projects)
    setMode('edit')
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!form) return
    setSaving(true)
    setError('')
    try {
      await apiClient.put('/profile/me', form)
      await apiClient.put('/profile/me/experiences', { items: experiences })
      const { data } = await apiClient.put('/profile/me/educations', { items: educations })
      setProfile(data)
      setMode('view')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const validationError = validateImageFile(file)
    if (validationError) {
      setError(validationError)
      e.target.value = ''
      return
    }
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await apiClient.post('/profile/me/avatar', formData)
      setProfile(data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleGalleryUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const validationError = validateImageFile(file)
    if (validationError) {
      setError(validationError)
      e.target.value = ''
      return
    }
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await apiClient.post('/profile/me/images', formData)
      setProfile(data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteImage = async (imageId: string) => {
    const { data } = await apiClient.delete(`/profile/me/images/${imageId}`)
    setProfile(data)
  }

  const handleAddProject = async (e: FormEvent) => {
    e.preventDefault()
    if (newProjectFile) {
      const validationError = validateImageFile(newProjectFile)
      if (validationError) {
        setError(validationError)
        return
      }
    }
    setAddingProject(true)
    setError('')
    try {
      const formData = new FormData()
      Object.entries(newProject).forEach(([key, value]) => formData.append(key, value))
      if (newProjectFile) formData.append('thumbnail', newProjectFile)
      const { data } = await apiClient.post('/profile/me/projects', formData)
      setProfile(data)
      setProjects(data.projects)
      setNewProject({ ...emptyProject })
      setNewProjectFile(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not add project')
    } finally {
      setAddingProject(false)
    }
  }

  const handleSaveProject = async (projectId: string) => {
    const proj = projects.find((p) => p.id === projectId)
    if (!proj) return
    if (projectFiles[projectId]) {
      const validationError = validateImageFile(projectFiles[projectId])
      if (validationError) {
        setError(validationError)
        return
      }
    }
    setSavingProjectId(projectId)
    setError('')
    try {
      const formData = new FormData()
      for (const key of ['title', 'description', 'tech_stack', 'demo_url', 'github_url'] as const) {
        formData.append(key, proj[key])
      }
      if (projectFiles[projectId]) formData.append('thumbnail', projectFiles[projectId])
      const { data } = await apiClient.put(`/profile/me/projects/${projectId}`, formData)
      setProfile(data)
      setProjects(data.projects)
      setProjectFiles((prev) => {
        const next = { ...prev }
        delete next[projectId]
        return next
      })
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not save project')
    } finally {
      setSavingProjectId(null)
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    const { data } = await apiClient.delete(`/profile/me/projects/${projectId}`)
    setProfile(data)
    setProjects(data.projects)
  }

  const handleNewProjectFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const validationError = validateImageFile(file)
    if (validationError) {
      setError(validationError)
      e.target.value = ''
      return
    }
    setNewProjectFile(file)
  }

  const handleProjectFileChange = (projectId: string, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const validationError = validateImageFile(file)
    if (validationError) {
      setError(validationError)
      e.target.value = ''
      return
    }
    setProjectFiles((prev) => ({ ...prev, [projectId]: file }))
  }

  const handleCvScan = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const validationError = validateCvFile(file)
    if (validationError) {
      setError(validationError)
      e.target.value = ''
      return
    }
    setScanning(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await apiClient.post('/profile/me/cv/scan', formData)
      setForm((prev) => {
        if (!prev) return prev
        const next = { ...prev }
        for (const key of [
          'full_name',
          'headline',
          'bio',
          'phone',
          'website_url',
          'linkedin_url',
          'github_url',
          'skills',
          'interests',
        ] as const) {
          next[key] = data[key]
        }
        return next
      })
      setExperiences(data.experiences)
      setEducations(data.educations)
      const { data: freshProfile } = await apiClient.get('/profile/me')
      setProfile(freshProfile)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not scan this CV')
    } finally {
      setScanning(false)
      e.target.value = ''
    }
  }

  if (!profile || !form) return <p className="text-center mt-16 text-earth-700">Loading...</p>

  const publicUrl = `${window.location.origin}/u/${profile.id}`
  const busy = saving || uploading || scanning || addingProject || Boolean(savingProjectId)

  const loadingOverlay = busy && (
    <div className="fixed inset-0 bg-earth-900/40 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-earth-100 rounded-lg px-6 py-4 shadow-lg flex items-center gap-3">
        <svg className="animate-spin h-5 w-5 text-fire-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-earth-800 text-sm font-medium">Please wait...</span>
      </div>
    </div>
  )

  const errorToast = error && (
    <div className="fixed top-4 right-4 z-50 max-w-sm bg-white dark:bg-earth-100 border border-fire-300 rounded-lg shadow-lg p-4 flex items-start gap-3">
      <span className="text-fire-600 text-lg leading-none">⚠</span>
      <p className="text-sm text-earth-800 flex-1">{error}</p>
      <button
        type="button"
        onClick={() => setError('')}
        className="text-earth-400 hover:text-earth-600 text-sm leading-none"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )

  if (mode === 'view') {
    return (
      <div className="mt-10 mb-10 px-4">
        {loadingOverlay}
        {errorToast}
        <div className="max-w-3xl mx-auto flex justify-between items-center mb-4">
          {profile.is_public ? (
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-fire-600 hover:text-fire-700 font-medium truncate">
              {publicUrl}
            </a>
          ) : (
            <span className="text-sm text-earth-500">Profile is private</span>
          )}
          <button
            type="button"
            onClick={startEdit}
            className="text-sm text-fire-600 hover:text-fire-700 font-medium shrink-0 ml-4"
          >
            Edit profile
          </button>
        </div>
        <CvView profile={profile} />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 mb-10 p-8 bg-white dark:bg-earth-100 rounded-xl shadow-sm border border-earth-200">
      {loadingOverlay}
      {errorToast}
      <div className="flex items-center gap-4 mb-6">
        <img
          src={profile.avatar_url || 'https://placehold.co/96x96?text=?'}
          alt="Avatar"
          className="w-24 h-24 rounded-full object-cover border-2 border-earth-300"
        />
        <label className="cursor-pointer text-sm bg-earth-100 hover:bg-earth-200 text-earth-800 px-3 py-1.5 rounded-md">
          {uploading ? 'Uploading...' : 'Change avatar'}
          <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </label>
      </div>

      <div className="mb-6 p-3 bg-earth-50 border border-earth-200 rounded-md flex items-center justify-between gap-3">
        <p className="text-sm text-earth-600">
          Upload a PDF CV to auto-fill the fields below. This replaces the current form data. Extraction is best-effort — please review before saving.
        </p>
        <label className="cursor-pointer text-sm bg-earth-100 hover:bg-earth-200 text-earth-800 px-3 py-1.5 rounded-md shrink-0">
          {scanning ? 'Scanning...' : 'Scan CV'}
          <input type="file" accept="application/pdf" className="hidden" onChange={handleCvScan} disabled={scanning} />
        </label>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Full name"
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500"
        />
        <input
          type="text"
          placeholder="Headline"
          value={form.headline}
          onChange={(e) => setForm({ ...form, headline: e.target.value })}
          className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500"
        />
        <textarea
          placeholder="Bio"
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          rows={4}
          className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500"
        />

        <h2 className="text-sm font-semibold text-earth-800 mt-2">Contact & links</h2>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500"
          />
          <input
            type="text"
            placeholder="Location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500"
          />
          <input
            type="text"
            placeholder="Website URL"
            value={form.website_url}
            onChange={(e) => setForm({ ...form, website_url: e.target.value })}
            className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500"
          />
          <input
            type="text"
            placeholder="LinkedIn URL"
            value={form.linkedin_url}
            onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
            className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500"
          />
          <input
            type="text"
            placeholder="GitHub URL"
            value={form.github_url}
            onChange={(e) => setForm({ ...form, github_url: e.target.value })}
            className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500 col-span-2"
          />
        </div>

        <h2 className="text-sm font-semibold text-earth-800 mt-2">Experience</h2>
        <div className="flex flex-col gap-4">
          {experiences.map((exp, i) => (
            <div key={i} className="border border-earth-200 rounded-md p-3 flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Title"
                  value={exp.title}
                  onChange={(e) => setExperiences(experiences.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                  className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500"
                />
                <input
                  type="text"
                  placeholder="Company"
                  value={exp.company}
                  onChange={(e) => setExperiences(experiences.map((x, j) => (j === i ? { ...x, company: e.target.value } : x)))}
                  className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500"
                />
                <input
                  type="text"
                  placeholder="Start (e.g. Jan 2022)"
                  value={exp.start_date}
                  onChange={(e) => setExperiences(experiences.map((x, j) => (j === i ? { ...x, start_date: e.target.value } : x)))}
                  className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500"
                />
                <input
                  type="text"
                  placeholder="End (e.g. Present)"
                  value={exp.end_date}
                  onChange={(e) => setExperiences(experiences.map((x, j) => (j === i ? { ...x, end_date: e.target.value } : x)))}
                  className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500"
                />
              </div>
              <textarea
                placeholder="Description"
                value={exp.description}
                onChange={(e) => setExperiences(experiences.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
                rows={2}
                className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500"
              />
              <button
                type="button"
                onClick={() => setExperiences(experiences.filter((_, j) => j !== i))}
                className="text-fire-600 text-sm self-start"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setExperiences([...experiences, { ...emptyExperience }])}
            className="text-sm bg-earth-100 hover:bg-earth-200 text-earth-800 px-3 py-1.5 rounded-md self-start"
          >
            + Add experience
          </button>
        </div>

        <h2 className="text-sm font-semibold text-earth-800 mt-2">Education</h2>
        <div className="flex flex-col gap-4">
          {educations.map((edu, i) => (
            <div key={i} className="border border-earth-200 rounded-md p-3 flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="School"
                  value={edu.school}
                  onChange={(e) => setEducations(educations.map((x, j) => (j === i ? { ...x, school: e.target.value } : x)))}
                  className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500"
                />
                <input
                  type="text"
                  placeholder="Degree"
                  value={edu.degree}
                  onChange={(e) => setEducations(educations.map((x, j) => (j === i ? { ...x, degree: e.target.value } : x)))}
                  className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500"
                />
                <input
                  type="text"
                  placeholder="Start (e.g. 2016)"
                  value={edu.start_date}
                  onChange={(e) => setEducations(educations.map((x, j) => (j === i ? { ...x, start_date: e.target.value } : x)))}
                  className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500"
                />
                <input
                  type="text"
                  placeholder="End (e.g. 2020)"
                  value={edu.end_date}
                  onChange={(e) => setEducations(educations.map((x, j) => (j === i ? { ...x, end_date: e.target.value } : x)))}
                  className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500"
                />
              </div>
              <textarea
                placeholder="Description"
                value={edu.description}
                onChange={(e) => setEducations(educations.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
                rows={2}
                className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500"
              />
              <button
                type="button"
                onClick={() => setEducations(educations.filter((_, j) => j !== i))}
                className="text-fire-600 text-sm self-start"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setEducations([...educations, { ...emptyEducation }])}
            className="text-sm bg-earth-100 hover:bg-earth-200 text-earth-800 px-3 py-1.5 rounded-md self-start"
          >
            + Add education
          </button>
        </div>

        <h2 className="text-sm font-semibold text-earth-800 mt-2">Skills & interests</h2>
        <input
          type="text"
          placeholder="Skills, comma separated (e.g. React, Python, SQL)"
          value={form.skills}
          onChange={(e) => setForm({ ...form, skills: e.target.value })}
          className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500"
        />
        <input
          type="text"
          placeholder="Interests, comma separated (e.g. Photography, Chess)"
          value={form.interests}
          onChange={(e) => setForm({ ...form, interests: e.target.value })}
          className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500"
        />

        <label className="flex items-center gap-2 text-sm text-earth-700 mt-2">
          <input
            type="checkbox"
            checked={form.is_public}
            onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
            className="accent-fire-600"
          />
          Make my profile public (shareable at {publicUrl})
        </label>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-fire-600 hover:bg-fire-700 text-white rounded-md py-2 px-4 font-medium"
          >
            {saving ? 'Saving...' : 'Save profile'}
          </button>
          {profile.full_name && (
            <button
              type="button"
              onClick={() => setMode('view')}
              className="text-earth-700 hover:text-earth-900 text-sm font-medium"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-earth-800 mb-3">Projects</h2>
        <div className="flex flex-col gap-4">
          {projects.map((proj) => (
            <div key={proj.id} className="border border-earth-200 rounded-md p-3 flex flex-col gap-2">
              <div className="flex gap-3">
                <img
                  src={
                    projectFiles[proj.id]
                      ? URL.createObjectURL(projectFiles[proj.id])
                      : proj.thumbnail_url || 'https://placehold.co/96x64?text=+'
                  }
                  alt=""
                  className="w-24 h-16 object-cover rounded-md border border-earth-200 shrink-0"
                />
                <label className="cursor-pointer text-xs bg-earth-100 hover:bg-earth-200 text-earth-800 px-2 py-1 rounded-md self-start">
                  Change image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleProjectFileChange(proj.id, e)}
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Title"
                  value={proj.title}
                  onChange={(e) => setProjects(projects.map((p) => (p.id === proj.id ? { ...p, title: e.target.value } : p)))}
                  className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500"
                />
                <input
                  type="text"
                  placeholder="Tech stack, comma separated"
                  value={proj.tech_stack}
                  onChange={(e) => setProjects(projects.map((p) => (p.id === proj.id ? { ...p, tech_stack: e.target.value } : p)))}
                  className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500"
                />
                <input
                  type="text"
                  placeholder="Demo URL"
                  value={proj.demo_url}
                  onChange={(e) => setProjects(projects.map((p) => (p.id === proj.id ? { ...p, demo_url: e.target.value } : p)))}
                  className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500"
                />
                <input
                  type="text"
                  placeholder="GitHub URL"
                  value={proj.github_url}
                  onChange={(e) => setProjects(projects.map((p) => (p.id === proj.id ? { ...p, github_url: e.target.value } : p)))}
                  className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500"
                />
              </div>
              <textarea
                placeholder="Description"
                value={proj.description}
                onChange={(e) => setProjects(projects.map((p) => (p.id === proj.id ? { ...p, description: e.target.value } : p)))}
                rows={2}
                className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleSaveProject(proj.id)}
                  disabled={savingProjectId === proj.id}
                  className="text-sm bg-earth-100 hover:bg-earth-200 text-earth-800 px-3 py-1.5 rounded-md self-start"
                >
                  {savingProjectId === proj.id ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteProject(proj.id)}
                  className="text-fire-600 text-sm self-start"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          <form onSubmit={handleAddProject} className="border border-dashed border-earth-300 rounded-md p-3 flex flex-col gap-2">
            <p className="text-sm font-medium text-earth-700">Add a project</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Title"
                value={newProject.title}
                onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500"
              />
              <input
                type="text"
                placeholder="Tech stack, comma separated"
                value={newProject.tech_stack}
                onChange={(e) => setNewProject({ ...newProject, tech_stack: e.target.value })}
                className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500"
              />
              <input
                type="text"
                placeholder="Demo URL"
                value={newProject.demo_url}
                onChange={(e) => setNewProject({ ...newProject, demo_url: e.target.value })}
                className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500"
              />
              <input
                type="text"
                placeholder="GitHub URL"
                value={newProject.github_url}
                onChange={(e) => setNewProject({ ...newProject, github_url: e.target.value })}
                className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500"
              />
            </div>
            <textarea
              placeholder="Description"
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              rows={2}
              className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500"
            />
            <label className="cursor-pointer text-xs bg-earth-100 hover:bg-earth-200 text-earth-800 px-2 py-1 rounded-md self-start">
              {newProjectFile ? newProjectFile.name : 'Choose thumbnail'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleNewProjectFileChange}
              />
            </label>
            <button
              type="submit"
              disabled={addingProject}
              className="text-sm bg-fire-600 hover:bg-fire-700 text-white px-3 py-1.5 rounded-md self-start"
            >
              {addingProject ? 'Adding...' : '+ Add project'}
            </button>
          </form>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-earth-800">Gallery</h2>
          <label className="cursor-pointer text-sm bg-earth-100 hover:bg-earth-200 text-earth-800 px-3 py-1.5 rounded-md">
            Add image
            <input type="file" accept="image/*" className="hidden" onChange={handleGalleryUpload} />
          </label>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {profile.images.map((img) => (
            <div key={img.id} className="relative group">
              <img src={img.url} alt="" className="w-full h-28 object-cover rounded-md border border-earth-200" />
              <button
                type="button"
                onClick={() => handleDeleteImage(img.id)}
                className="absolute top-1 right-1 bg-fire-600 text-white text-xs rounded-full w-6 h-6 opacity-0 group-hover:opacity-100"
              >
                x
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

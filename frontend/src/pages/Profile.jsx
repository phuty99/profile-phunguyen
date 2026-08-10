import { useEffect, useState } from 'react'
import apiClient from '../api/client'
import CvView from '../components/CvView'

const emptyExperience = { title: '', company: '', start_date: '', end_date: '', description: '' }
const emptyEducation = { school: '', degree: '', start_date: '', end_date: '', description: '' }

const scalarFields = (data) => ({
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
  const [profile, setProfile] = useState(null)
  const [mode, setMode] = useState('view')
  const [form, setForm] = useState(null)
  const [experiences, setExperiences] = useState([])
  const [educations, setEducations] = useState([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')

  const loadProfile = async () => {
    const { data } = await apiClient.get('/profile/me')
    setProfile(data)
    setForm(scalarFields(data))
    setExperiences(data.experiences.length ? data.experiences : [])
    setEducations(data.educations.length ? data.educations : [])
    setMode(data.full_name ? 'view' : 'edit')
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const startEdit = () => {
    setForm(scalarFields(profile))
    setExperiences(profile.experiences.length ? profile.experiences : [])
    setEducations(profile.educations.length ? profile.educations : [])
    setMode('edit')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await apiClient.put('/profile/me', form)
      await apiClient.put('/profile/me/experiences', { items: experiences })
      const { data } = await apiClient.put('/profile/me/educations', { items: educations })
      setProfile(data)
      setMode('view')
    } catch (err) {
      setError(err.response?.data?.detail || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await apiClient.post('/profile/me/avatar', formData)
      setProfile(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleGalleryUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await apiClient.post('/profile/me/images', formData)
      setProfile(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteImage = async (imageId) => {
    const { data } = await apiClient.delete(`/profile/me/images/${imageId}`)
    setProfile(data)
  }

  const handleCvScan = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setScanning(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await apiClient.post('/profile/me/cv/scan', formData)
      setForm((prev) => {
        const next = { ...prev }
        for (const key of ['full_name', 'headline', 'bio', 'phone', 'website_url', 'linkedin_url', 'github_url', 'skills', 'interests']) {
          next[key] = data[key]
        }
        return next
      })
      setExperiences(data.experiences)
      setEducations(data.educations)
      const { data: freshProfile } = await apiClient.get('/profile/me')
      setProfile(freshProfile)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not scan this CV')
    } finally {
      setScanning(false)
      e.target.value = ''
    }
  }

  if (!profile || !form) return <p className="text-center mt-16 text-earth-700">Loading...</p>

  const publicUrl = `${window.location.origin}/u/${profile.id}`

  if (mode === 'view') {
    return (
      <div className="mt-10 mb-10 px-4">
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
    <div className="max-w-2xl mx-auto mt-10 mb-10 p-8 bg-white rounded-xl shadow-sm border border-earth-200">
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

        {error && <p className="text-fire-600 text-sm">{error}</p>}
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

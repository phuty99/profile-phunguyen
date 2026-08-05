import { useEffect, useState } from 'react'
import apiClient from '../api/client'

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ full_name: '', headline: '', bio: '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const loadProfile = async () => {
    const { data } = await apiClient.get('/profile/me')
    setProfile(data)
    setForm({ full_name: data.full_name, headline: data.headline, bio: data.bio })
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const { data } = await apiClient.put('/profile/me', form)
      setProfile(data)
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

  if (!profile) return <p className="text-center mt-16 text-earth-700">Loading...</p>

  return (
    <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-xl shadow-sm border border-earth-200">
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
        {error && <p className="text-fire-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="bg-fire-600 hover:bg-fire-700 text-white rounded-md py-2 font-medium"
        >
          {saving ? 'Saving...' : 'Save profile'}
        </button>
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

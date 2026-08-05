import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import apiClient from '../api/client'

export default function PublicProfile() {
  const { profileId } = useParams()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiClient
      .get(`/profile/${profileId}`)
      .then(({ data }) => setProfile(data))
      .catch(() => setError('Profile not found'))
  }, [profileId])

  if (error) return <p className="text-center mt-16 text-fire-600">{error}</p>
  if (!profile) return <p className="text-center mt-16 text-earth-700">Loading...</p>

  return (
    <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-xl shadow-sm border border-earth-200 text-center">
      <img
        src={profile.avatar_url || 'https://placehold.co/96x96?text=?'}
        alt="Avatar"
        className="w-24 h-24 rounded-full object-cover border-2 border-earth-300 mx-auto mb-4"
      />
      <h1 className="text-2xl font-semibold text-earth-800">{profile.full_name || 'Unnamed'}</h1>
      <p className="text-earth-600 mb-4">{profile.headline}</p>
      <p className="text-earth-800 whitespace-pre-line mb-6">{profile.bio}</p>

      <div className="grid grid-cols-3 gap-3">
        {profile.images.map((img) => (
          <img key={img.id} src={img.url} alt="" className="w-full h-28 object-cover rounded-md border border-earth-200" />
        ))}
      </div>
    </div>
  )
}

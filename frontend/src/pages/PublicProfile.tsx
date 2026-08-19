import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import apiClient from '../api/client'
import CvView from '../components/CvView'
import type { Profile } from '../types'

export default function PublicProfile() {
  const { profileId } = useParams()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiClient
      .get(`/profile/${profileId}`)
      .then(({ data }) => setProfile(data))
      .catch(() => setError('This profile does not exist or is not public.'))
  }, [profileId])

  if (error) return <p className="text-center mt-16 text-fire-600">{error}</p>
  if (!profile) return <p className="text-center mt-16 text-earth-700">Loading...</p>

  return (
    <div className="mt-10 mb-10 px-4">
      <CvView profile={profile} />
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { verifyEmail } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState('verifying')
  const calledRef = useRef(false)

  useEffect(() => {
    if (calledRef.current) return
    calledRef.current = true

    if (!token) {
      setStatus('error')
      return
    }

    verifyEmail(token)
      .then(() => {
        setStatus('success')
        setTimeout(() => navigate('/profile'), 1500)
      })
      .catch(() => setStatus('error'))
  }, [token, verifyEmail, navigate])

  return (
    <div className="max-w-sm mx-auto mt-16 p-8 bg-white rounded-xl shadow-sm border border-earth-200 text-center">
      {status === 'verifying' && <p className="text-earth-700">Activating your account...</p>}
      {status === 'success' && <p className="text-earth-700">Account activated! Redirecting...</p>}
      {status === 'error' && (
        <>
          <p className="text-fire-600 mb-4">This link is invalid or has expired.</p>
          <Link to="/login" className="text-fire-600 font-medium">
            Back to login
          </Link>
        </>
      )}
    </div>
  )
}

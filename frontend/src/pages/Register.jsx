import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const { register } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      const msg = await register(email, password)
      setMessage(msg)
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    }
  }

  if (message) {
    return (
      <div className="max-w-sm mx-auto mt-16 p-8 bg-white rounded-xl shadow-sm border border-earth-200 text-center">
        <h1 className="text-2xl font-semibold text-earth-800 mb-4">Kiểm tra email của bạn</h1>
        <p className="text-earth-700">{message}</p>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto mt-16 p-8 bg-white rounded-xl shadow-sm border border-earth-200">
      <h1 className="text-2xl font-semibold text-earth-800 mb-6">Create account</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500"
        />
        {error && <p className="text-fire-600 text-sm">{error}</p>}
        <button
          type="submit"
          className="bg-fire-600 hover:bg-fire-700 text-white rounded-md py-2 font-medium"
        >
          Register
        </button>
      </form>
      <p className="text-sm text-earth-700 mt-4">
        Already have an account?{' '}
        <Link to="/login" className="text-fire-600 font-medium">
          Login
        </Link>
      </p>
    </div>
  )
}

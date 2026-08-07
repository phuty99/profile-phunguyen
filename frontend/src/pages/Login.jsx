import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate('/profile')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16 p-8 bg-white rounded-xl shadow-sm border border-earth-200">
      <h1 className="text-2xl font-semibold text-earth-800 mb-6">Login</h1>
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
          type={showPassword ? 'text' : 'password'}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="border border-earth-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fire-500"
        />
        <label className="flex items-center gap-2 text-sm text-earth-700">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
            className="accent-fire-600"
          />
          Show password
        </label>
        {error && <p className="text-fire-600 text-sm">{error}</p>}
        <button
          type="submit"
          className="bg-fire-600 hover:bg-fire-700 text-white rounded-md py-2 font-medium"
        >
          Login
        </button>
      </form>
      <p className="text-sm text-earth-700 mt-4">
        No account?{' '}
        <Link to="/register" className="text-fire-600 font-medium">
          Register
        </Link>
      </p>
    </div>
  )
}

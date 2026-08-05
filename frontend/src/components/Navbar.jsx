import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-earth-800 text-earth-50 px-6 py-4 flex items-center justify-between">
      <Link to="/" className="font-semibold text-lg text-earth-100">
        My Profile
      </Link>
      <div className="flex gap-4 items-center">
        {isAuthenticated ? (
          <>
            <Link to="/profile" className="hover:text-fire-500">
              My Profile
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="bg-fire-600 hover:bg-fire-700 px-3 py-1.5 rounded-md text-sm"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="hover:text-fire-500">
              Login
            </Link>
            <Link
              to="/register"
              className="bg-earth-500 hover:bg-earth-400 px-3 py-1.5 rounded-md text-sm"
            >
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}

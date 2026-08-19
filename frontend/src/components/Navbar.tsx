import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-earth-950 text-white px-6 py-4 flex items-center justify-between">
      <Link to="/" className="font-semibold text-lg text-white">
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
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          className="text-lg leading-none rounded-full w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </nav>
  )
}

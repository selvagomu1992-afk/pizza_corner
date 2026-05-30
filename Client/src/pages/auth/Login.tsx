import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import Spinner from '../../components/ui/Spinner'
import useSettings from '../../hooks/useSettings'

const Login = () => {
  const { settings } = useSettings()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)
  const deliveryLogin = useAuthStore((s) => s.deliveryLogin)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Login successful')
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message || (err instanceof Error ? err.message : 'Login failed')
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleDeliveryLogin = async () => {
    setLoading(true)
    try {
      await deliveryLogin(email, password)
      toast.success('Delivery partner login successful')
      navigate('/delivery/dashboard')
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message || (err instanceof Error ? err.message : 'Login failed')
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          {settings.logo ? <img src={settings.logo} alt="" className="h-12 w-auto mx-auto" /> : <span className="text-4xl">🍕</span>}
          <h1 className="text-2xl font-bold text-stone-800 mt-2">Welcome Back</h1>
          <p className="text-stone-500 text-sm">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Spinner size="sm" />}
            Sign In
          </button>
        </form>

        <div className="mt-4 text-center">
          <button onClick={handleDeliveryLogin} disabled={loading}
            className="text-sm text-amber-600 hover:text-amber-700 font-medium">
            Login as Delivery Partner
          </button>
        </div>

        <p className="text-center text-sm text-stone-500 mt-6">
          Don't have an account? <Link to="/register" className="text-amber-600 font-medium hover:text-amber-700">Sign Up</Link>
        </p>
      </div>
    </div>
  )
}

export default Login

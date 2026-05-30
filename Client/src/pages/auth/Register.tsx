import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import Spinner from '../../components/ui/Spinner'
import useSettings from '../../hooks/useSettings'

const Register = () => {
  const { settings } = useSettings()
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const register = useAuthStore((s) => s.register)
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await register(form.name, form.email, form.password, form.phone)
      toast.success('Account created!')
      navigate('/products')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed'
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
          <h1 className="text-2xl font-bold text-stone-800 mt-2">Create Account</h1>
          <p className="text-stone-500 text-sm">Join {settings.companyName} today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Name</label>
            <input type="text" name="name" required value={form.name} onChange={handleChange}
              className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
            <input type="email" name="email" required value={form.email} onChange={handleChange}
              className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Phone</label>
            <input type="tel" name="phone" value={form.phone} onChange={handleChange}
              className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
            <input type="password" name="password" required value={form.password} onChange={handleChange}
              className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Spinner size="sm" />}
            Create Account
          </button>
        </form>

        <p className="text-center text-sm text-stone-500 mt-6">
          Already have an account? <Link to="/login" className="text-amber-600 font-medium hover:text-amber-700">Sign In</Link>
        </p>
      </div>
    </div>
  )
}

export default Register

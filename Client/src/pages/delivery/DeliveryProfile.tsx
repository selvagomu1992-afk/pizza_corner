import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client'
import toast from 'react-hot-toast'
import Spinner from '../../components/ui/Spinner'

const DeliveryProfile = () => {
  const navigate = useNavigate()
  const stored = JSON.parse(localStorage.getItem('delivery_user') || '{}')
  const [name, setName] = useState(stored.name || '')
  const [phone, setPhone] = useState(stored.phone || '')
  const [vehicleType, setVehicleType] = useState(stored.vehicleType || 'bike')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.patch('/delivery/profile', { name, phone, vehicleType })
      if (data.success) {
        localStorage.setItem('delivery_user', JSON.stringify(data.partner))
        toast.success('Profile updated')
      }
    } catch { toast.error('Failed to update') }
    finally { setLoading(false) }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPassword || !newPassword) { toast.error('Fill both fields'); return }
    setLoading(true)
    try {
      const { data } = await api.patch('/delivery/change-password', { currentPassword, newPassword })
      if (data.success) { toast.success('Password changed'); setCurrentPassword(''); setNewPassword('') }
    } catch { toast.error('Failed to change password') }
    finally { setLoading(false) }
  }

  const handleLogout = () => {
    localStorage.removeItem('delivery_token')
    localStorage.removeItem('delivery_user')
    navigate('/login')
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">My Profile</h1>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="font-bold text-stone-800 mb-4">Personal Info</h2>
        <form onSubmit={handleUpdate} className="space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" placeholder="Name" />
          <input value={stored.email || ''} disabled
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 text-stone-500" placeholder="Email" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" placeholder="Phone" />
          <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none">
            <option value="bike">Bike</option>
            <option value="scooter">Scooter</option>
            <option value="car">Car</option>
            <option value="bicycle">Bicycle</option>
          </select>
          <button type="submit" disabled={loading}
            className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2">
            {loading && <Spinner size="sm" />} Save
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="font-bold text-stone-800 mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <input type="password" placeholder="Current Password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" />
          <input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" />
          <button type="submit" disabled={loading}
            className="bg-stone-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-900 disabled:opacity-50 flex items-center gap-2">
            {loading && <Spinner size="sm" />} Change Password
          </button>
        </form>
      </div>

      <button onClick={handleLogout} className="text-red-500 hover:text-red-600 text-sm font-medium">Sign Out</button>
    </div>
  )
}

export default DeliveryProfile

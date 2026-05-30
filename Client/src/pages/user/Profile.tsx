import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import api from '../../api/client'
import type { Address } from '../../types'
import toast from 'react-hot-toast'
import Spinner from '../../components/ui/Spinner'
import { HiOutlineLocationMarker, HiOutlineTrash, HiOutlineStar } from 'react-icons/hi'

const Profile = () => {
  const { user, isDelivery, updateProfile, logout } = useAuthStore()
  const navigate = useNavigate()
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [addresses, setAddresses] = useState<Address[]>([])
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [addressForm, setAddressForm] = useState({ label: '', address: '', city: '', state: '', zip: '', phone: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user && !isDelivery) { navigate('/login'); return }
    api.get('/addresses').then(({ data }) => {
      if (data.success) setAddresses(data.addresses)
    })
  }, [user, isDelivery, navigate])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await updateProfile({ name, phone })
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data } = await api.post('/addresses', addressForm)
      if (data.success) {
        setAddresses([...addresses, data.address])
        setShowAddressForm(false)
        setAddressForm({ label: '', address: '', city: '', state: '', zip: '', phone: '' })
        toast.success('Address added')
      }
    } catch {
      toast.error('Failed to add address')
    }
  }

  const handleDeleteAddress = async (id: string) => {
    try {
      const { data } = await api.delete(`/addresses/${id}`)
      if (data.success) {
        setAddresses(addresses.filter((a) => a.id !== id))
        toast.success('Address deleted')
      }
    } catch {
      toast.error('Failed to delete address')
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      const { data } = await api.patch(`/addresses/${id}/default`)
      if (data.success) {
        setAddresses(addresses.map((a) => ({ ...a, isDefault: a.id === id })))
        toast.success('Default address updated')
      }
    } catch {
      toast.error('Failed to set default address')
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-3xl font-bold text-stone-800">My Profile</h1>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="font-bold text-lg text-stone-800 mb-4">Personal Information</h2>
        <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
            <input type="email" value={user?.email || ''} disabled
              className="w-full px-4 py-2 border border-stone-200 rounded-lg bg-stone-50 text-stone-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" />
          </div>
          <button type="submit" disabled={loading}
            className="bg-amber-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2">
            {loading && <Spinner size="sm" />}
            Save Changes
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg text-stone-800">Saved Addresses</h2>
          <button onClick={() => setShowAddressForm(!showAddressForm)}
            className="text-amber-600 text-sm font-medium hover:text-amber-700">
            + Add Address
          </button>
        </div>

        {showAddressForm && (
          <form onSubmit={handleAddAddress} className="mb-6 grid grid-cols-2 gap-3 p-4 bg-stone-50 rounded-xl">
            <input placeholder="Label (Home, Work)" value={addressForm.label} onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
              className="col-span-2 border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" required />
            <input placeholder="Address" value={addressForm.address} onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
              className="col-span-2 border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" required />
            <input placeholder="City" value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" required />
            <input placeholder="State" value={addressForm.state} onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" required />
            <input placeholder="ZIP Code" value={addressForm.zip} onChange={(e) => setAddressForm({ ...addressForm, zip: e.target.value })}
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" required />
            <input placeholder="Phone" value={addressForm.phone} onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" required />
            <button type="submit" className="col-span-2 bg-amber-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-amber-700">
              Save Address
            </button>
          </form>
        )}

        {addresses.length === 0 ? (
          <p className="text-stone-500 text-sm">No addresses saved yet.</p>
        ) : (
          <div className="space-y-3">
            {addresses.map((addr) => (
              <div key={addr.id} className="flex items-start justify-between p-4 border border-stone-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <HiOutlineLocationMarker className="h-5 w-5 text-stone-400 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-stone-800">{addr.label}</span>
                      {addr.isDefault && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded flex items-center gap-1"><HiOutlineStar className="h-3 w-3" /> Default</span>}
                    </div>
                    <p className="text-sm text-stone-500">{addr.address}, {addr.city}, {addr.state} - {addr.zip}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!addr.isDefault && (
                    <button onClick={() => handleSetDefault(addr.id)} className="text-amber-600 text-xs hover:text-amber-700 font-medium">Set Default</button>
                  )}
                  <button onClick={() => handleDeleteAddress(addr.id)} className="text-stone-400 hover:text-red-500">
                    <HiOutlineTrash className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <button onClick={() => { logout(); navigate('/login') }}
          className="text-red-500 hover:text-red-600 font-medium text-sm">
          Sign Out
        </button>
      </div>
    </div>
  )
}

export default Profile

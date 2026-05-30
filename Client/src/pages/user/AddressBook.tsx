import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import api from '../../api/client'
import toast from 'react-hot-toast'
import Spinner from '../../components/ui/Spinner'
import { HiOutlineLocationMarker, HiOutlineTrash, HiOutlineStar, HiOutlinePlus, HiOutlinePencil } from 'react-icons/hi'
import { HiOutlineMapPin } from 'react-icons/hi2'

interface Address {
  id: string
  label: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
  lat: number
  lng: number
  isDefault: boolean
}

const LABELS = ['Home', 'Work', 'Office'] as const

const initForm = { label: 'Home' as string, address: '', city: '', state: '', zip: '', phone: '', lat: 0, lng: 0 }

const AddressBook = () => {
  const { user, isDelivery } = useAuthStore()
  const navigate = useNavigate()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(initForm)
  const [submitting, setSubmitting] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)

  useEffect(() => {
    if (!user && !isDelivery) { navigate('/login'); return }
    loadAddresses()
  }, [user, isDelivery, navigate])

  const loadAddresses = async () => {
    try {
      const { data } = await api.get('/addresses')
      if (data.success) setAddresses(data.addresses)
    } catch {
      toast.error('Failed to load addresses')
    } finally {
      setLoading(false)
    }
  }

  const hasOffice = addresses.some(a => a.label === 'Office')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.label) { toast.error('Please select a label'); return }
    if (form.label !== 'Office' && !hasOffice) {
      toast.error('Please add an Office address first')
      return
    }
    setSubmitting(true)
    try {
      if (editingId) {
        const { data } = await api.patch(`/addresses/${editingId}`, form)
        if (data.success) {
          setAddresses(prev => prev.map(a => a.id === editingId ? data.address : a))
          toast.success('Address updated')
        }
      } else {
        const { data } = await api.post('/addresses', form)
        if (data.success) {
          setAddresses(prev => [data.address, ...prev])
          toast.success('Address added')
        }
      }
      setForm(initForm); setEditingId(null); setShowForm(false)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save address')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (addr: Address) => {
    setForm({ label: addr.label, address: addr.address, city: addr.city, state: addr.state, zip: addr.zip, phone: addr.phone, lat: addr.lat, lng: addr.lng })
    setEditingId(addr.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this address?')) return
    try {
      const { data } = await api.delete(`/addresses/${id}`)
      if (data.success) {
        setAddresses(prev => prev.filter(a => a.id !== id))
        toast.success('Address deleted')
      }
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      const { data } = await api.patch(`/addresses/${id}/default`)
      if (data.success) {
        setAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === id })))
        toast.success('Default address updated')
      }
    } catch {
      toast.error('Failed to set default')
    }
  }

  const openAddForm = () => {
    if (!hasOffice) {
      setForm({ ...initForm, label: 'Office' })
    } else {
      setForm(initForm)
    }
    setEditingId(null)
    setShowForm(true)
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }
    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        setForm(prev => ({ ...prev, lat, lng }))
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 6000)
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
            {
              headers: { 'Accept-Language': 'en', 'User-Agent': 'PizzaCornerApp/1.0' },
              signal: controller.signal,
            }
          )
          clearTimeout(timeoutId)
          if (!res.ok) throw new Error('Geocode service unavailable')
          const data = await res.json()
          if (data.address) {
            const a = data.address
            const road   = a.road || a.pedestrian || a.street || a.path || ''
            const area   = a.suburb || a.neighbourhood || a.locality || a.hamlet || ''
            const city   = a.city || a.town || a.village || a.municipality || a.county || a.state_district || ''
            const state  = a.state || ''
            const zip    = a.postcode || ''
            const parts  = [a.house_number || '', road, area].filter(Boolean)
            setForm(prev => ({
              ...prev,
              address: parts.join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
              city: city || prev.city,
              state: state || prev.state,
              zip: zip || prev.zip,
            }))
            toast.success('Location detected and address filled')
          }
        } catch {
          toast(`Coordinates detected (${lat.toFixed(4)}, ${lng.toFixed(4)}). Please fill the address details.`, { icon: '📍' })
        }
        setGettingLocation(false)
      },
      (err) => {
        const msgs: Record<number, string> = {
          1: 'Location access denied. Enable location permissions in your browser.',
          2: 'Location unavailable right now. Try again.',
          3: 'Location request timed out. Try again.',
        }
        toast.error(msgs[err.code] || 'Failed to get location')
        setGettingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-stone-800">Delivery Addresses</h1>
          <p className="text-stone-500 text-sm mt-1">Manage your delivery locations</p>
        </div>
        <button onClick={openAddForm} className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 flex items-center gap-2">
          <HiOutlinePlus className="h-4 w-4" />
          Add Address
        </button>
      </div>

      {/* Office requirement notice */}
      {!hasOffice && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
          <strong>Office address required:</strong> Please add your Office address first. You can then add Home and Work addresses.
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-stone-200 rounded-xl p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-stone-800">{editingId ? 'Edit' : 'Add'} Address</h2>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Label</label>
            <div className="flex gap-3">
              {LABELS.map(lbl => (
                <label key={lbl} className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer text-sm font-medium ${form.label === lbl ? 'border-amber-600 bg-amber-50 text-amber-700' : 'border-stone-300 text-stone-600 hover:border-stone-400'}`}>
                  <input type="radio" name="label" value={lbl} checked={form.label === lbl} onChange={e => setForm({ ...form, label: e.target.value })}
                    className="accent-amber-600" disabled={lbl !== 'Office' && !hasOffice} />
                  {lbl}
                </label>
              ))}
            </div>
            {!hasOffice && <p className="text-xs text-stone-400 mt-1">Only Office is available until you add an Office address</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Address</label>
            <div className="flex gap-2">
              <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" required />
              <button type="button" onClick={getCurrentLocation} disabled={gettingLocation}
                className="flex items-center gap-1.5 px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-600 hover:bg-stone-50 hover:border-stone-400 disabled:opacity-50 whitespace-nowrap">
                {gettingLocation ? <Spinner size="sm" /> : <HiOutlineMapPin className="h-4 w-4" />}
                {gettingLocation ? 'Locating...' : 'Current Location'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">City</label>
              <input type="text" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">State</label>
              <input type="text" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">ZIP Code</label>
              <input type="text" value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Phone</label>
              <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" required />
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={submitting}
              className="bg-amber-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2">
              {submitting && <Spinner size="sm" />}
              {editingId ? 'Update' : 'Save'} Address
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setForm(initForm) }}
              className="text-stone-500 text-sm hover:text-stone-700">Cancel</button>
          </div>
        </form>
      )}

      {/* Address list */}
      {addresses.length === 0 ? (
        <div className="text-center py-16 bg-white border border-stone-200 rounded-xl">
          <HiOutlineLocationMarker className="h-12 w-12 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 font-medium">No addresses saved yet</p>
          <p className="text-stone-400 text-sm mt-1">Add a delivery address to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map(addr => (
            <div key={addr.id} className="bg-white border border-stone-200 rounded-xl p-4 flex items-start gap-4">
              <div className={`p-2 rounded-lg ${addr.label === 'Office' ? 'bg-purple-100' : addr.label === 'Work' ? 'bg-blue-100' : 'bg-amber-100'}`}>
                <HiOutlineLocationMarker className={`h-5 w-5 ${addr.label === 'Office' ? 'text-purple-600' : addr.label === 'Work' ? 'text-blue-600' : 'text-amber-600'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-stone-800">{addr.label}</span>
                  {addr.isDefault && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <HiOutlineStar className="h-3 w-3" /> Default
                    </span>
                  )}
                </div>
                <p className="text-sm text-stone-600 mt-0.5">{addr.address}</p>
                <p className="text-sm text-stone-500">{addr.city}, {addr.state} - {addr.zip}</p>
                {addr.phone && <p className="text-sm text-stone-400 mt-0.5">📞 {addr.phone}</p>}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!addr.isDefault && (
                  <button onClick={() => handleSetDefault(addr.id)} className="p-1.5 text-stone-400 hover:text-amber-600 rounded" title="Set as default">
                    <HiOutlineStar className="h-4 w-4" />
                  </button>
                )}
                <button onClick={() => handleEdit(addr)} className="p-1.5 text-stone-400 hover:text-blue-600 rounded" title="Edit">
                  <HiOutlinePencil className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(addr.id)} className="p-1.5 text-stone-400 hover:text-red-600 rounded" title="Delete">
                  <HiOutlineTrash className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AddressBook
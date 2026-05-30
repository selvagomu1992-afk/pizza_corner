import { useEffect, useState } from 'react'
import api from '../../api/client'
import type { DeliveryPartner } from '../../types'
import Spinner from '../../components/ui/Spinner'
import toast from 'react-hot-toast'
import { HiOutlineTrash } from 'react-icons/hi'

const DeliveryPartners = () => {
  const [partners, setPartners] = useState<DeliveryPartner[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', vehicleType: 'bike' })
  const [passwords, setPasswords] = useState<Record<string, string>>({})

  useEffect(() => { loadPartners() }, [])

  const loadPartners = () => {
    setLoading(true)
    api.get('/admin/delivery-partners').then(({ data }) => {
      if (data.success) setPartners(data.partners)
    }).finally(() => setLoading(false))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data } = await api.post('/admin/delivery-partners', form)
      if (data.success) {
        const pwd = form.password
        setPasswords((prev) => ({ ...prev, [data.partner.id]: pwd }))
        toast.success(`Partner created — Password: ${pwd}`)
        setShowForm(false)
        setForm({ name: '', email: '', password: '', phone: '', vehicleType: 'bike' })
        loadPartners()
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create partner'
      toast.error(msg)
    }
  }

  const toggleActive = async (id: string) => {
    try {
      const { data } = await api.patch(`/admin/delivery-partners/${id}/toggle`)
      if (data.success) { toast.success(data.message); loadPartners() }
    } catch { toast.error('Failed to toggle') }
  }

  const deletePartner = async (id: string) => {
    if (!confirm('Delete this delivery partner?')) return
    try {
      const { data } = await api.delete(`/admin/delivery-partners/${id}`)
      if (data.success) { toast.success('Deleted'); loadPartners() }
    } catch { toast.error('Failed to delete') }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Delivery Partners</h1>
        <button onClick={() => setShowForm(true)}
          className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700">
          + Add Partner
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-stone-800 mb-4">New Delivery Partner</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <input placeholder="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" />
              <input type="email" placeholder="Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" />
              <input type="text" placeholder="Password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" />
              <input placeholder="Phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" />
              <select value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none">
                <option value="bike">Bike</option>
                <option value="scooter">Scooter</option>
                <option value="car">Car</option>
                <option value="bicycle">Bicycle</option>
              </select>
              <button type="submit" className="w-full bg-amber-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-amber-700">Create</button>
            </form>
          </div>
        </div>
      )}

      {loading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-600">
              <tr>
                <th className="text-left p-4 font-medium">Name</th>
                <th className="text-left p-4 font-medium">Email</th>
                <th className="text-left p-4 font-medium">Password</th>
                <th className="text-left p-4 font-medium">Phone</th>
                <th className="text-left p-4 font-medium">Vehicle</th>
                <th className="text-left p-4 font-medium">Deliveries</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.id} className="border-t border-stone-100 hover:bg-stone-50">
                  <td className="p-4 font-medium">{p.name}</td>
                  <td className="p-4 text-stone-500">{p.email}</td>
                  <td className="p-4 font-mono text-xs">
                    {passwords[p.id] ? (
                      <span className="text-amber-700 font-medium">{passwords[p.id]}</span>
                    ) : (
                      <span className="text-stone-300">• Set</span>
                    )}
                  </td>
                  <td className="p-4 text-stone-500">{p.phone}</td>
                  <td className="p-4 text-xs capitalize">{p.vehicleType}</td>
                  <td className="p-4 text-xs">{p.todayDeliveries ?? 0} today / {p.totalDeliveries ?? 0} total</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleActive(p.id)}
                        className={`text-xs px-2 py-1 rounded ${p.isActive ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                        {p.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => deletePartner(p.id)} className="text-red-500 hover:text-red-600"><HiOutlineTrash className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {partners.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-stone-400">No partners</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default DeliveryPartners

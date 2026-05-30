import { useEffect, useState } from 'react'
import api from '../../api/client'
import Spinner from '../../components/ui/Spinner'
import toast from 'react-hot-toast'
import { HiOutlineTrash, HiOutlineCheckCircle, HiOutlineXCircle } from 'react-icons/hi'

interface Pincode {
  id: string
  pincode: string
  deliveryFee: number
  isActive: boolean
}

const AdminPincodes = () => {
  const [pincodes, setPincodes] = useState<Pincode[]>([])
  const [loading, setLoading] = useState(true)
  const [pincode, setPincode] = useState('')
  const [deliveryFee, setDeliveryFee] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => { loadPincodes() }, [])

  const loadPincodes = () => {
    setLoading(true)
    api.get('/admin/pincodes').then(({ data }) => {
      if (data.success) setPincodes(data.pincodes)
    }).finally(() => setLoading(false))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pincode.trim()) { toast.error('Enter pincode'); return }
    try {
      if (editingId) {
        const { data } = await api.patch(`/admin/pincodes/${editingId}`, { pincode: pincode.trim(), deliveryFee: Number(deliveryFee) || 0 })
        if (data.success) { toast.success('Pincode updated') }
      } else {
        const { data } = await api.post('/admin/pincodes', { pincode: pincode.trim(), deliveryFee: Number(deliveryFee) || 0 })
        if (data.success) { toast.success('Pincode added') }
      }
      setPincode(''); setDeliveryFee(''); setEditingId(null)
      loadPincodes()
    } catch { toast.error(editingId ? 'Failed to update' : 'Failed to add') }
  }

  const editPincode = (p: Pincode) => {
    setPincode(p.pincode)
    setDeliveryFee(String(p.deliveryFee))
    setEditingId(p.id)
  }

  const toggleActive = async (p: Pincode) => {
    try {
      const { data } = await api.patch(`/admin/pincodes/${p.id}`, { isActive: !p.isActive })
      if (data.success) { toast.success(p.isActive ? 'Disabled' : 'Enabled'); loadPincodes() }
    } catch { toast.error('Failed to toggle') }
  }

  const deletePincode = async (id: string) => {
    if (!confirm('Delete this pincode?')) return
    try {
      const { data } = await api.delete(`/admin/pincodes/${id}`)
      if (data.success) { toast.success('Pincode deleted'); loadPincodes() }
    } catch { toast.error('Failed to delete') }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Serviceable Pincodes</h1>

      <div className="bg-white rounded-xl p-5 shadow-sm mb-6">
        <h2 className="font-bold text-stone-700 mb-3">{editingId ? 'Edit Pincode' : 'Add Pincode'}</h2>
        <form onSubmit={handleSubmit} className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs text-stone-500 mb-1">Pincode</label>
            <input type="text" value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="e.g. 600001"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div className="w-32">
            <label className="block text-xs text-stone-500 mb-1">Delivery Fee (₹)</label>
            <input type="number" step="0.01" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <button type="submit" className="bg-amber-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 whitespace-nowrap">
            {editingId ? 'Update' : 'Add'}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setPincode(''); setDeliveryFee(''); setEditingId(null) }}
              className="px-4 py-2 border border-stone-300 rounded-lg text-sm text-stone-600 hover:bg-stone-50">Cancel</button>
          )}
        </form>
      </div>

      {loading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-600">
              <tr>
                <th className="text-left p-4 font-medium">Pincode</th>
                <th className="text-left p-4 font-medium">Delivery Fee</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pincodes.map((p) => (
                <tr key={p.id} className="border-t border-stone-100 hover:bg-stone-50">
                  <td className="p-4 font-mono font-medium">{p.pincode}</td>
                  <td className="p-4">₹{p.deliveryFee.toFixed(2)}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {p.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => editPincode(p)} className="text-amber-600 hover:text-amber-700 text-xs font-medium">Edit</button>
                      <button onClick={() => toggleActive(p)} title={p.isActive ? 'Disable' : 'Enable'}>
                        {p.isActive ? <HiOutlineXCircle className="h-4 w-4 text-red-400 hover:text-red-600" /> : <HiOutlineCheckCircle className="h-4 w-4 text-green-400 hover:text-green-600" />}
                      </button>
                      <button onClick={() => deletePincode(p.id)} className="text-red-500 hover:text-red-600"><HiOutlineTrash className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {pincodes.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-stone-400">No pincodes added yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default AdminPincodes
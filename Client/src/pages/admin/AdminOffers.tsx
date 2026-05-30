import { useEffect, useState } from 'react'
import api from '../../api/client'
import Spinner from '../../components/ui/Spinner'
import { Pencil, Trash2, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

export interface Offer {
  id: string
  title: string
  description: string
  discountType: string
  discountValue: number
  freeItem: string
  minPurchase: number
  startDate: string
  endDate: string
  isActive: boolean
}

const EMPTY_FORM = {
  title: '', description: '', discountType: 'percent',
  discountValue: '0', freeItem: '', minPurchase: '0', startDate: '', endDate: '',
}

const AdminOffers = () => {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sendingNotify, setSendingNotify] = useState<string | null>(null)

  useEffect(() => { loadOffers() }, [])

  const loadOffers = () => {
    setLoading(true)
    api.get('/admin/offers').then(({ data }) => {
      if (data.success) setOffers(data.offers)
    }).finally(() => setLoading(false))
  }

  const resetForm = () => { setForm({ ...EMPTY_FORM }); setEditingId(null) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.startDate || !form.endDate) {
      toast.error('Title, start & end date required'); return
    }
    try {
      const payload = {
        ...form,
        discountValue: Number(form.discountValue),
        minPurchase: Number(form.minPurchase),
      }
      if (editingId) {
        const { data } = await api.patch(`/admin/offers/${editingId}`, payload)
        if (data.success) toast.success('Offer updated')
        else toast.error(data.message || 'Failed to update')
      } else {
        const { data } = await api.post('/admin/offers', payload)
        if (data.success) toast.success('Offer created')
        else toast.error(data.message || 'Failed to create')
      }
      resetForm(); loadOffers()
    } catch (err: unknown) {
      toast.error((err as any)?.response?.data?.message || 'Failed to save offer')
    }
  }

  const editOffer = (o: Offer) => {
    setForm({
      title: o.title,
      description: o.description || '',
      discountType: o.discountType,
      discountValue: String(o.discountValue),
      freeItem: o.freeItem || '',
      minPurchase: String(o.minPurchase),
      startDate: o.startDate.slice(0, 16),
      endDate: o.endDate.slice(0, 16),
    })
    setEditingId(o.id)
  }

  const deleteOffer = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return
    try {
      const { data } = await api.delete(`/admin/offers/${id}`)
      if (data.success) { toast.success('Offer deleted'); loadOffers() }
    } catch { toast.error('Failed to delete') }
  }

  const toggleActive = async (o: Offer) => {
    try {
      const { data } = await api.patch(`/admin/offers/${o.id}`, { isActive: !o.isActive })
      if (data.success) { toast.success(o.isActive ? 'Offer disabled' : 'Offer enabled'); loadOffers() }
    } catch { toast.error('Failed to toggle') }
  }

  const notifyOffer = async (o: Offer) => {
    if (!confirm(`Send email about "${o.title}" to all users?`)) return
    setSendingNotify(o.id)
    try {
      const { data } = await api.post('/admin/offers/notify', {
        offerId: o.id,
        title: o.title,
        description: o.description,
        discountType: o.discountType,
        discountValue: o.discountValue,
        freeItem: o.freeItem,
        minPurchase: o.minPurchase,
        endDate: o.endDate,
      })
      if (data.success) toast.success(`Notification sent to ${data.userCount || 'all'} users`)
      else toast.error(data.message || 'Failed to send')
    } catch { toast.error('Failed to send notifications') }
    finally { setSendingNotify(null) }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Manage Offers</h1>

      <div className="bg-white rounded-xl p-5 shadow-sm mb-6">
        <h2 className="font-bold text-stone-700 mb-3">{editingId ? 'Edit Offer' : 'Create Offer'}</h2>
        <form onSubmit={handleSubmit} className="space-y-3 max-w-2xl">
          <div>
            <label className="block text-xs text-stone-500 mb-1">Title *</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" rows={2} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-stone-500 mb-1">Discount Type *</label>
              <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none">
                <option value="percent">Percentage (%)</option>
                <option value="flat">Flat (₹)</option>
                <option value="free_item">Free Item / Combo</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Discount Value *</label>
              <input type="number" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Min Purchase (₹)</label>
              <input type="number" value={form.minPurchase} onChange={(e) => setForm({ ...form, minPurchase: e.target.value })}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none" />
            </div>
          </div>
          {form.discountType === 'free_item' && (
            <div>
              <label className="block text-xs text-stone-500 mb-1">Free Item / Combo Description</label>
              <input type="text" value={form.freeItem} onChange={(e) => setForm({ ...form, freeItem: e.target.value })}
                placeholder="e.g. Free Garlic Bread on orders above ₹399"
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-stone-500 mb-1">Start Date & Time *</label>
              <input type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">End Date & Time *</label>
              <input type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-amber-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-amber-700">
              {editingId ? 'Update' : 'Create'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm}
                className="px-4 py-2 border border-stone-300 rounded-lg text-sm text-stone-600 hover:bg-stone-50">Cancel</button>
            )}
          </div>
        </form>
      </div>

      {loading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <div className="space-y-3">
          {offers.length === 0 && <p className="text-stone-400 text-center py-12">No offers yet</p>}
          {offers.map((o) => (
            <div key={o.id} className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${o.isActive ? 'border-green-500' : 'border-stone-300'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-stone-800">{o.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${o.isActive ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
                      {o.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {o.description && <p className="text-sm text-stone-500 mt-1">{o.description}</p>}
                  <div className="flex gap-4 mt-2 text-xs text-stone-500 flex-wrap">
                    <span className="font-medium text-amber-700">
                      {o.discountType === 'free_item' ? '🎁 Free Item' : o.discountType === 'percent' ? `${o.discountValue}% OFF` : `₹${o.discountValue} OFF`}
                    </span>
                    {o.freeItem && <span className="text-green-600">{o.freeItem}</span>}
                    {o.minPurchase > 0 && <span>Min: ₹{o.minPurchase}</span>}
                    <span>{new Date(o.startDate).toLocaleDateString()} → {new Date(o.endDate).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => toggleActive(o)} className={`p-1.5 rounded text-xs font-medium ${o.isActive ? 'text-stone-500 hover:bg-stone-100' : 'text-green-600 hover:bg-green-50'}`}>
                    {o.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => editOffer(o)} className="text-amber-600 hover:text-amber-700 p-1"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => notifyOffer(o)} disabled={sendingNotify === o.id}
                    className="text-blue-500 hover:text-blue-600 p-1 disabled:opacity-40" title="Email to all users">
                    {sendingNotify === o.id ? <Spinner size="sm" /> : <Mail className="h-4 w-4" />}
                  </button>
                  <button onClick={() => deleteOffer(o.id, o.title)} className="text-red-500 hover:text-red-600 p-1"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminOffers

export const getActiveOffers = async (): Promise<Offer[]> => {
    try {
        const { data } = await api.get('/offers')
        if (data.success) return data.offers
        return []
    } catch { return [] }
}

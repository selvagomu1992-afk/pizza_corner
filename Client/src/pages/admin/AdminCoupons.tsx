import { useEffect, useState } from 'react'
import api from '../../api/client'
import toast from 'react-hot-toast'
import Spinner from '../../components/ui/Spinner'
import { Mail } from 'lucide-react'
import { HiOutlineTrash, HiOutlinePencil, HiOutlineCheck, HiOutlineX } from 'react-icons/hi'

interface Coupon {
  id: string
  code: string
  description: string
  discountPercent: number
  discountFlat: number
  minPurchase: number
  maxUses: number
  usedCount: number
  expiresAt: string | null
  isActive: boolean
}

const initForm = {
  code: '', description: '', discountPercent: 0, discountFlat: 0,
  minPurchase: 0, maxUses: 0, expiresAt: '',
}

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(initForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sendingNotify, setSendingNotify] = useState<string | null>(null)

  useEffect(() => {
    api.get('/coupons').then(({ data }) => {
      if (data.success) setCoupons(data.coupons)
    }).catch(() => toast.error('Failed to load coupons'))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.code.trim()) { toast.error('Coupon code is required'); return }
    try {
      const payload = { ...form, discountPercent: Number(form.discountPercent), discountFlat: Number(form.discountFlat), minPurchase: Number(form.minPurchase), maxUses: Number(form.maxUses) }
      if (editingId) {
        const { data } = await api.patch(`/coupons/${editingId}`, payload)
        if (data.success) {
          setCoupons((prev) => prev.map((c) => c.id === editingId ? data.coupon : c))
          toast.success('Coupon updated')
        }
      } else {
        const { data } = await api.post('/coupons', payload)
        if (data.success) {
          setCoupons((prev) => [data.coupon, ...prev])
          toast.success('Coupon created')
        }
      }
      setForm(initForm); setEditingId(null)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save coupon')
    }
  }

  const handleEdit = (coupon: Coupon) => {
    setForm({
      code: coupon.code, description: coupon.description || '',
      discountPercent: coupon.discountPercent, discountFlat: coupon.discountFlat,
      minPurchase: coupon.minPurchase, maxUses: coupon.maxUses,
      expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 16) : '',
    })
    setEditingId(coupon.id)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this coupon?')) return
    try {
      const { data } = await api.delete(`/coupons/${id}`)
      if (data.success) { setCoupons((prev) => prev.filter((c) => c.id !== id)); toast.success('Coupon deleted') }
    } catch { toast.error('Failed to delete') }
  }

  const toggleActive = async (coupon: Coupon) => {
    try {
      const { data } = await api.patch(`/coupons/${coupon.id}`, { isActive: !coupon.isActive })
      if (data.success) setCoupons((prev) => prev.map((c) => c.id === coupon.id ? data.coupon : c))
    } catch { toast.error('Failed to toggle') }
  }

  const notifyCoupon = async (c: Coupon) => {
    if (!confirm(`Send email about coupon "${c.code}" to all users?`)) return
    setSendingNotify(c.id)
    try {
      const { data } = await api.post('/coupons/notify', {
        code: c.code,
        description: c.description,
        discountPercent: c.discountPercent,
        discountFlat: c.discountFlat,
        minPurchase: c.minPurchase,
        expiresAt: c.expiresAt,
      })
      if (data.success) toast.success(`Notification sent to ${data.userCount || 'all'} users`)
      else toast.error(data.message || 'Failed to send')
    } catch { toast.error('Failed to send notifications') }
    finally { setSendingNotify(null) }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Coupon Codes</h1>

      <form onSubmit={handleSubmit} className="bg-white border border-stone-200 rounded-xl p-4 mb-8 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-stone-500 mb-1">Code</label>
            <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm" placeholder="SAVE20" />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">Discount %</label>
            <input type="number" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: Number(e.target.value) })}
              className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm" />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">Flat Discount (₹)</label>
            <input type="number" value={form.discountFlat} onChange={(e) => setForm({ ...form, discountFlat: Number(e.target.value) })}
              className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm" />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">Min Purchase (₹)</label>
            <input type="number" value={form.minPurchase} onChange={(e) => setForm({ ...form, minPurchase: Number(e.target.value) })}
              className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm" />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">Max Uses (0 = unlimited)</label>
            <input type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: Number(e.target.value) })}
              className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm" />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">Expires At</label>
            <input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-stone-500 mb-1">Description</label>
            <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm" placeholder="Get 20% off on orders above ₹500" />
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700">
            {editingId ? 'Update' : 'Create'} Coupon
          </button>
          {editingId && <button type="button" onClick={() => { setForm(initForm); setEditingId(null) }} className="text-stone-500 text-sm">Cancel</button>}
        </div>
      </form>

      {loading ? (
        <div className="flex justify-center py-10"><Spinner size="lg" /></div>
      ) : coupons.length === 0 ? (
        <p className="text-stone-400">No coupons created yet.</p>
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="bg-white border border-stone-200 rounded-xl p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-amber-700 text-lg">{coupon.code}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${coupon.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {coupon.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {coupon.discountPercent > 0 && <span className="text-sm text-stone-600">{coupon.discountPercent}% off</span>}
                  {coupon.discountFlat > 0 && <span className="text-sm text-stone-600">₹{coupon.discountFlat} off</span>}
                  {coupon.minPurchase > 0 && <span className="text-sm text-stone-400">Min ₹{coupon.minPurchase}</span>}
                  {coupon.maxUses > 0 && <span className="text-sm text-stone-400">Used {coupon.usedCount}/{coupon.maxUses}</span>}
                </div>
                {coupon.description && <p className="text-sm text-stone-500 mt-1">{coupon.description}</p>}
                {coupon.expiresAt && (
                  <p className="text-xs text-stone-400 mt-0.5">Expires: {new Date(coupon.expiresAt).toLocaleDateString()}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => toggleActive(coupon)} title={coupon.isActive ? 'Deactivate' : 'Activate'}
                  className={`p-1.5 rounded ${coupon.isActive ? 'text-green-600 hover:bg-green-50' : 'text-stone-400 hover:bg-stone-100'}`}>
                  {coupon.isActive ? <HiOutlineCheck className="h-5 w-5" /> : <HiOutlineX className="h-5 w-5" />}
                </button>
                <button onClick={() => handleEdit(coupon)} className="p-1.5 text-stone-400 hover:text-amber-600 hover:bg-stone-100 rounded">
                  <HiOutlinePencil className="h-5 w-5" />
                </button>
                <button onClick={() => notifyCoupon(coupon)} disabled={sendingNotify === coupon.id}
                  className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-stone-100 rounded disabled:opacity-50">
                  {sendingNotify === coupon.id ? <Spinner size="sm" /> : <Mail className="h-5 w-5" />}
                </button>
                <button onClick={() => handleDelete(coupon.id)} className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-stone-100 rounded">
                  <HiOutlineTrash className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminCoupons

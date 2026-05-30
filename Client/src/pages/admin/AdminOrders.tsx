import { useEffect, useState } from 'react'
import api from '../../api/client'
import type { Order, DeliveryPartner, Pagination } from '../../types'
import Spinner from '../../components/ui/Spinner'
import toast from 'react-hot-toast'

const statuses = ['Placed', 'Confirmed', 'Assigned', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled']

const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [partners, setPartners] = useState<DeliveryPartner[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    loadOrders()
    api.get('/admin/delivery-partners', { params: { active: 'true' } }).then(({ data }) => {
      if (data.success) setPartners(data.partners)
    })
  }, [statusFilter, page])

  const loadOrders = () => {
    setLoading(true)
    const params: Record<string, string> = { page: String(page), limit: '20' }
    if (statusFilter) params.status = statusFilter
    api.get('/admin/orders', { params }).then(({ data }) => {
      if (data.success) { setOrders(data.orders); setPagination(data.pagination) }
    }).finally(() => setLoading(false))
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      const { data } = await api.patch(`/admin/orders/${id}/status`, { status })
      if (data.success) { toast.success('Status updated'); loadOrders() }
    } catch { toast.error('Failed to update status') }
  }

  const assignPartner = async (orderId: string, deliveryPartnerId: string) => {
    if (!deliveryPartnerId) { toast.error('Select a partner'); return }
    try {
      const { data } = await api.patch(`/admin/orders/${orderId}/assign`, { deliveryPartnerId })
      if (data.success) { toast.success('Partner assigned'); loadOrders() }
    } catch { toast.error('Failed to assign partner') }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Orders</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => { setStatusFilter(''); setPage(1) }}
          className={`px-4 py-1.5 rounded-full text-sm font-medium ${!statusFilter ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600'}`}>All</button>
        {statuses.map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium ${statusFilter === s ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600'}`}>{s}</button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-600">
              <tr>
                <th className="text-left p-4 font-medium">Order</th>
                <th className="text-left p-4 font-medium">Customer</th>
                <th className="text-left p-4 font-medium">Total</th>
                <th className="text-left p-4 font-medium">Payment</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Partner</th>
                <th className="text-left p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-stone-100 hover:bg-stone-50">
                  <td className="p-4 font-mono text-xs">#{order.id.slice(0, 8)}</td>
                  <td className="p-4">{(order.user as { name?: string })?.name || 'N/A'}</td>
                  <td className="p-4 font-medium">₹{order.total.toFixed(2)}</td>
                  <td className="p-4 text-xs">
                    <span className={order.isPaid ? 'text-green-600 font-medium' : 'text-orange-600 font-medium'}>
                      {order.isPaid ? 'Paid' : order.paymentMethod === 'cash' ? 'COD' : 'Unpaid'}
                    </span>
                  </td>
                  <td className="p-4">
                    <select value={order.status} onChange={(e) => updateStatus(order.id, e.target.value)}
                      className="border border-stone-300 rounded px-2 py-1 text-xs outline-none">
                      {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="p-4 text-xs">
                    {order.deliveryPartner ? (
                      <span>{order.deliveryPartner.name}</span>
                    ) : (
                      <select onChange={(e) => assignPartner(order.id, e.target.value)} defaultValue=""
                        className="border border-stone-300 rounded px-2 py-1 text-xs outline-none">
                        <option value="" disabled>Assign...</option>
                        {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="text-xs text-stone-500">{new Date(order.createdAt!).toLocaleDateString('en-IN')}</span>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={7} className="p-4 text-center text-stone-400">No orders</td></tr>
              )}
            </tbody>
          </table>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 p-4">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-3 py-1 rounded text-sm ${page === p ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600'}`}>{p}</button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AdminOrders

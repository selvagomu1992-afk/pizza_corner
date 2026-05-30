import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import Spinner from '../../components/ui/Spinner'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { HiOutlineTruck } from 'react-icons/hi'

interface OrderItem {
  image: string
  name: string
  price: number
  quantity: number
}

interface Order {
  id: string
  status: string
  total: number
  subtotal: number
  deliveryFee: number
  tax: number
  paymentMethod: string
  isPaid: boolean
  createdAt: string
  items: OrderItem[]
  deliveryPartner: { id: string; name: string; phone: string; vehicleType: string } | null
  liveLocation: { lat: number; lng: number; updatedAt: string } | null
  shippingAddress: { lat: number; lng: number }
}

interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

const statusColors: Record<string, string> = {
  'Pending Payment': 'bg-yellow-100 text-yellow-700',
  Placed: 'bg-blue-100 text-blue-700',
  Confirmed: 'bg-indigo-100 text-indigo-700',
  Assigned: 'bg-purple-100 text-purple-700',
  Packed: 'bg-cyan-100 text-cyan-700',
  'Out for Delivery': 'bg-orange-100 text-orange-700',
  Delivered: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
}

const deliveryIcon = L.divIcon({
  className: '',
  html: '<div style="background:#d97706;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:3px solid #fff">📍</div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
})

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    const params: Record<string, string> = { page: String(page), limit: '10' }
    if (statusFilter) params.status = statusFilter
    api.get('/orders/my', { params }).then(({ data }) => {
      if (data.success) {
        setOrders(data.orders)
        setPagination(data.pagination)
      }
    }).finally(() => setLoading(false))
  }, [statusFilter, page])

  const liveOrders = orders.filter(o =>
    o.status === 'Out for Delivery' && o.deliveryPartner && o.liveLocation
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-stone-800 mb-6">My Orders</h1>

      {liveOrders.length > 0 && (
        <div className="mb-6 space-y-4">
          {liveOrders.map(order => {
            const addr = order.shippingAddress as { lat?: number; lng?: number }
            const loc = order.liveLocation!
            return (
              <Link key={order.id} to={`/orders/${order.id}`}
                className="block bg-white border border-green-200 rounded-xl overflow-hidden hover:shadow-md transition">
                <div className="p-4 bg-green-50 border-b border-green-200 flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-100 px-2.5 py-1 rounded-full font-semibold">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    LIVE
                  </span>
                  <HiOutlineTruck className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-stone-700">
                    {order.deliveryPartner!.name} is delivering your order
                  </span>
                  <span className="ml-auto text-xs text-stone-500">Order #{order.id.slice(0, 8)}</span>
                </div>
                <div className="h-40">
                  <MapContainer
                    center={[loc.lat, loc.lng]}
                    zoom={14}
                    className="h-full w-full"
                    zoomControl={false}
                    dragging={false}
                    scrollWheelZoom={false}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {addr.lat != null && addr.lng != null && (
                      <Marker position={[addr.lat, addr.lng]}>
                        <Popup>Delivery Address</Popup>
                      </Marker>
                    )}
                    <Marker position={[loc.lat, loc.lng]} icon={deliveryIcon}>
                      <Popup>Delivery Partner</Popup>
                    </Marker>
                  </MapContainer>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => { setStatusFilter(''); setPage(1) }}
          className={`px-4 py-1.5 rounded-full text-sm font-medium ${!statusFilter ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600'}`}>All</button>
        {['Placed', 'Confirmed', 'Out for Delivery', 'Delivered', 'Cancelled'].map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium ${statusFilter === s ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600'}`}>{s}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-stone-500 mb-4">No orders found</p>
          <Link to="/products" className="text-amber-600 font-medium">Browse Menu</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link key={order.id} to={`/orders/${order.id}`}
              className="block bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-stone-500">Order #{order.id.slice(0, 8)}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-stone-100 text-stone-600'}`}>
                    {order.status}
                  </span>
                  {order.status === 'Out for Delivery' && order.deliveryPartner && (
                    <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                      Live
                    </span>
                  )}
                </div>
                <span className="font-bold text-amber-700">₹{order.total.toFixed(2)}</span>
              </div>
              <div className="text-sm text-stone-600">
                <span>{order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                <span className="mx-2">•</span>
                <span>{order.paymentMethod === 'cash' ? 'Cash on Delivery' : 'Online Payment'}</span>
                {order.deliveryPartner && (
                  <>
                    <span className="mx-2">•</span>
                    <span>{order.deliveryPartner.name}</span>
                  </>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                {(order.items as OrderItem[]).slice(0, 4).map((item, i) => (
                  <img key={i} src={item.image} alt={item.name} className="h-10 w-10 rounded-lg object-cover bg-stone-100" />
                ))}
                {(order.items as OrderItem[]).length > 4 && (
                  <div className="h-10 w-10 rounded-lg bg-stone-200 flex items-center justify-center text-xs text-stone-600 font-medium">
                    +{(order.items as OrderItem[]).length - 4}
                  </div>
                )}
              </div>
            </Link>
          ))}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${page === p ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600'}`}>{p}</button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Orders
import { useEffect, useRef, useState } from 'react'
import api from '../../api/client'
import type { Order, Pagination } from '../../types'
import Spinner from '../../components/ui/Spinner'
import toast from 'react-hot-toast'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'

const deliveryIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

const customerIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'hue-rotate-120',
})

const DeliveryOrders = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'active' | 'completed'>('active')
  const [page, setPage] = useState(1)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [otp, setOtp] = useState('')
  const [tracking, setTracking] = useState<Record<string, boolean>>({})
  const [showMap, setShowMap] = useState<Record<string, boolean>>({})
  const [locations, setLocations] = useState<Record<string, { lat: number; lng: number }>>({})
  const [traces, setTraces] = useState<Record<string, { lat: number; lng: number }[]>>({})
  const watchIds = useRef<Record<string, number>>({})

  useEffect(() => { loadOrders() }, [tab, page])

  const loadOrders = () => {
    setLoading(true)
    api.get('/delivery/orders', { params: { tab, page: String(page), limit: '20' } }).then(({ data }) => {
      if (data.success) { setOrders(data.orders); setPagination(data.pagination) }
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    return () => {
      Object.values(watchIds.current).forEach((id) => navigator.geolocation.clearWatch(id))
    }
  }, [])

  const updateStatus = async (id: string, status: string) => {
    try {
      const { data } = await api.patch(`/delivery/orders/${id}/status`, { status })
      if (data.success) { toast.success('Status updated'); loadOrders() }
    } catch { toast.error('Failed to update') }
  }

  const handleDeliver = async (id: string) => {
    if (!otp) { toast.error('Enter OTP'); return }
    try {
      const { data } = await api.patch(`/delivery/orders/${id}/deliver`, { otp })
      if (data.success) { toast.success('Delivered!'); setSelectedOrder(null); setOtp(''); stopTracking(id); loadOrders() }
    } catch { toast.error('Invalid OTP') }
  }

  const sendLocation = async (id: string, lat: number, lng: number) => {
    try {
      const { data } = await api.patch(`/delivery/orders/${id}/location`, { lat, lng })
      if (data.success) {
        setLocations((prev) => ({ ...prev, [id]: { lat, lng } }))
        setTraces((prev) => ({ ...prev, [id]: [...(prev[id] || []), { lat, lng }] }))
      }
    } catch { /* silent */ }
  }

  const startTracking = (id: string) => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return }
    setTracking((prev) => ({ ...prev, [id]: true }))
    setTraces((prev) => ({ ...prev, [id]: [] }))
    const watchId = navigator.geolocation.watchPosition(
      (pos) => sendLocation(id, pos.coords.latitude, pos.coords.longitude),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
    watchIds.current[id] = watchId
    toast.success('Live tracking started')
  }

  const stopTracking = (id: string) => {
    if (watchIds.current[id] !== undefined) {
      navigator.geolocation.clearWatch(watchIds.current[id])
      delete watchIds.current[id]
    }
    setTracking((prev) => ({ ...prev, [id]: false }))
  }

  const getCurrentLocation = (id: string) => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => sendLocation(id, pos.coords.latitude, pos.coords.longitude),
      (err) => {
        const msg = err.code === 1 ? 'Location permission denied — enable location in browser settings and refresh'
          : err.code === 2 ? 'Location unavailable — try again'
          : 'Location request timed out — try again'
        toast.error(msg)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">My Orders</h1>
        <div className="flex gap-2">
          <button onClick={() => { setTab('active'); setPage(1) }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium ${tab === 'active' ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600'}`}>Active</button>
          <button onClick={() => { setTab('completed'); setPage(1) }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium ${tab === 'completed' ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600'}`}>Completed</button>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <div className="space-y-4">
          {orders.map((order) => {
            const addr = order.shippingAddress as Record<string, unknown>
            const custLoc = addr.lat != null && addr.lng != null ? { lat: Number(addr.lat), lng: Number(addr.lng) } : null
            const partnerLoc = locations[order.id] || null
            const tracePts = (traces[order.id] || []).map((p) => [p.lat, p.lng] as [number, number])

            return (
              <div key={order.id} className="bg-white rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-sm text-stone-500">Order #{order.id.slice(0, 8)}</span>
                    <span className={`ml-3 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                      order.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>{order.status}</span>
                    {tracking[order.id] && <span className="ml-2 text-xs text-green-600 font-medium animate-pulse">● LIVE</span>}
                  </div>
                  <span className="font-bold text-amber-700">₹{order.total.toFixed(2)}</span>
                </div>

                <div className="text-sm text-stone-600 mb-3">
                  <p><strong>Customer:</strong> {(order.user as { name: string })?.name} - {(order.user as { phone: string })?.phone}</p>
                  <p><strong>Address:</strong> {addr.address as string}, {addr.city as string}</p>
                </div>

                {/* Map showing customer delivery location */}
                {custLoc && (showMap[order.id] || order.status === 'Out for Delivery' || tracking[order.id]) && (
                  <div className="h-40 rounded-lg overflow-hidden mb-3">
                    <MapContainer center={[custLoc.lat, custLoc.lng]} zoom={14} className="h-full w-full" zoomControl={false}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={[custLoc.lat, custLoc.lng]} icon={customerIcon}>
                        <Popup>{addr.address as string}, {addr.city as string}</Popup>
                      </Marker>
                      {partnerLoc && (
                        <Marker position={[partnerLoc.lat, partnerLoc.lng]} icon={deliveryIcon}>
                          <Popup>Your Location</Popup>
                        </Marker>
                      )}
                      {tracePts.length > 1 && <Polyline positions={tracePts} color="#d97706" weight={3} opacity={0.7} />}
                    </MapContainer>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {tab === 'active' && order.status !== 'Delivered' && order.status !== 'Cancelled' && (
                    <>
                      {order.status === 'Assigned' && (
                        <button onClick={() => updateStatus(order.id, 'Packed')}
                          className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-700">Mark Packed</button>
                      )}
                      {order.status === 'Packed' && (
                        <button onClick={() => updateStatus(order.id, 'Out for Delivery')}
                          className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-orange-700">Out for Delivery</button>
                      )}
                      {order.status === 'Out for Delivery' && (
                        <button onClick={() => setSelectedOrder(order)}
                          className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700">Confirm Delivery</button>
                      )}
                      <button onClick={() => updateStatus(order.id, 'Cancelled')}
                        className="text-red-500 hover:text-red-600 text-xs px-3 py-1.5">Cancel</button>
                    </>
                  )}

                  <div className="flex items-center gap-2 ml-auto">
                    <button onClick={() => setShowMap((prev) => ({ ...prev, [order.id]: !prev[order.id] }))}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium border border-stone-300 text-stone-600 hover:bg-stone-100">
                      {showMap[order.id] ? 'Hide Map' : 'Show Map'}
                    </button>
                    <button onClick={() => getCurrentLocation(order.id)}
                      className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-amber-200">Share Location</button>
                    {order.status === 'Out for Delivery' && (
                      tracking[order.id] ? (
                        <button onClick={() => stopTracking(order.id)}
                          className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-700">Stop Tracking</button>
                      ) : (
                        <button onClick={() => startTracking(order.id)}
                          className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-700">Start Live Tracking</button>
                      )
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {orders.length === 0 && <p className="text-center py-12 text-stone-500">No orders found</p>}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-3 py-1 rounded text-sm ${page === p ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600'}`}>{p}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setSelectedOrder(null); setOtp('') }}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-stone-800 mb-4">Confirm Delivery</h2>
            <p className="text-sm text-stone-500 mb-4">Enter the OTP shared by the customer to confirm delivery.</p>
            <input type="text" placeholder="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-4 py-3 text-lg text-center tracking-widest outline-none focus:ring-2 focus:ring-amber-500 mb-4" maxLength={6} />
            <div className="flex gap-3">
              <button onClick={() => handleDeliver(selectedOrder.id)}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700">Confirm Delivery</button>
              <button onClick={() => { setSelectedOrder(null); setOtp('') }}
                className="px-4 py-2 border border-stone-300 rounded-lg text-sm text-stone-600">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DeliveryOrders

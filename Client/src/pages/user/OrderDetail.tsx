import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../api/client'
import type { Order } from '../../types'
import Spinner from '../../components/ui/Spinner'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import { HiOutlineTruck, HiOutlineLocationMarker, HiOutlineClock } from 'react-icons/hi'

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

const orderSteps = ['Placed', 'Confirmed', 'Assigned', 'Packed', 'Out for Delivery', 'Delivered']

const deliveryIcon = L.divIcon({
  className: '',
  html: '<div style="background:#d97706;color:#fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:3px solid #fff">📍</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
})

const addressIcon = L.divIcon({
  className: '',
  html: '<div style="background:#1B3022;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.2)">🏠</div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
})

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number; updatedAt: string } | null>(null)
  const [locationHistory, setLocationHistory] = useState<{ lat: number; lng: number }[]>([])

  useEffect(() => {
    if (!id) return
    api.get(`/orders/${id}`).then(({ data }) => {
      if (data.success) {
        setOrder(data.order)
        setLiveLocation(data.order.liveLocation || null)
      }
    }).finally(() => setLoading(false))
  }, [id])

  // Poll live location every 5 seconds when delivery is active
  useEffect(() => {
    if (!id || !order || order.status === 'Delivered' || order.status === 'Cancelled' || order.status === 'Pending Payment') return
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/orders/${id}/location`)
        if (data.success) {
          if (data.liveLocation) setLiveLocation(data.liveLocation)
          if (data.locationHistory) {
            setLocationHistory(data.locationHistory.map((p: { lat: number; lng: number }) => ({ lat: p.lat, lng: p.lng })))
          }
        }
      } catch { /* silent */ }
    }, 5000)
    return () => clearInterval(interval)
  }, [id, order?.status])

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!order) return <div className="text-center py-20 text-stone-500">Order not found</div>

  const currentStepIndex = orderSteps.indexOf(order.status)
  const loc = liveLocation || (order.liveLocation as { lat: number; lng: number; updatedAt: string } | null)
  const addr = order.shippingAddress as Record<string, unknown>
  const addressLat = addr.lat as number | undefined
  const addressLng = addr.lng as number | undefined
  const tracePts = locationHistory.length > 0
    ? locationHistory.map((p) => [p.lat, p.lng] as [number, number])
    : []
  const isDelivering = order.status === 'Out for Delivery' || order.status === 'Delivered'
  const hasDeliveryPartner = !!order.deliveryPartner
  const trackingActive = isDelivering && hasDeliveryPartner && !!loc

  const mapCenter: [number, number] = loc
    ? [loc.lat, loc.lng]
    : addressLat != null && addressLng != null
      ? [addressLat, addressLng]
      : [20, 78]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/orders" className="text-amber-600 hover:text-amber-700 text-sm font-medium mb-4 inline-block">&larr; Back to Orders</Link>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold text-stone-800">Order #{order.id.slice(0, 8)}</h1>
                <p className="text-sm text-stone-500">{new Date(order.createdAt!).toLocaleString('en-IN')}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status] || ''}`}>{order.status}</span>
            </div>

            {order.status !== 'Cancelled' && (
              <div className="flex items-center gap-0 mb-6">
                {orderSteps.map((step, i) => (
                  <div key={step} className="flex items-center flex-1">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      i <= currentStepIndex ? 'bg-amber-600 text-white' : 'bg-stone-200 text-stone-400'
                    }`}>
                      {i < currentStepIndex ? '✓' : i + 1}
                    </div>
                    {i < orderSteps.length - 1 && (
                      <div className={`flex-1 h-0.5 ${i < currentStepIndex ? 'bg-amber-600' : 'bg-stone-200'}`} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {order.deliveryPartner && (
              <div className={`rounded-lg p-4 mb-4 ${isDelivering ? 'bg-green-50 border border-green-200' : 'bg-amber-50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${isDelivering ? 'bg-green-200' : 'bg-amber-200'}`}>
                    <HiOutlineTruck className={`h-5 w-5 ${isDelivering ? 'text-green-700' : 'text-amber-700'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-stone-700">{order.deliveryPartner.name}</p>
                    <p className="text-sm text-stone-500">{order.deliveryPartner.phone} · {order.deliveryPartner.vehicleType || 'bike'}</p>
                  </div>
                  {trackingActive && (
                    <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full font-medium">
                      <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      LIVE
                    </span>
                  )}
                </div>
              </div>
            )}

            {order.deliveryOtp && order.status !== 'Delivered' && order.status !== 'Cancelled' && (
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-stone-700">Delivery OTP: <span className="text-xl tracking-wider text-blue-700">{order.deliveryOtp}</span></p>
                <p className="text-xs text-stone-500">Share this OTP with the delivery partner to confirm delivery</p>
              </div>
            )}

            {/* Live tracking map */}
            {(addressLat != null && addressLng != null) && (hasDeliveryPartner || isDelivering || (order.status !== 'Placed' && order.status !== 'Pending Payment' && order.status !== 'Cancelled')) && (
              <div className="rounded-lg overflow-hidden mb-4 border border-stone-200">
                <div className={`relative ${isDelivering ? 'h-64' : 'h-52'}`}>
                  <MapContainer center={mapCenter} zoom={isDelivering ? 15 : 14} className="h-full w-full" zoomControl={false}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {addressLat != null && addressLng != null && (
                      <Marker position={[addressLat, addressLng]} icon={addressIcon}>
                        <Popup>Delivery Address</Popup>
                      </Marker>
                    )}
                    {loc && (
                      <Marker position={[loc.lat, loc.lng]} icon={deliveryIcon}>
                        <Popup>
                          <div className="text-sm">
                            <p className="font-semibold">Delivery Partner</p>
                            {(loc as any).updatedAt && <p className="text-xs text-stone-500">Updated: {new Date((loc as any).updatedAt).toLocaleTimeString('en-IN')}</p>}
                          </div>
                        </Popup>
                      </Marker>
                    )}
                    {tracePts.length > 1 && <Polyline positions={tracePts} color="#d97706" weight={3} opacity={0.7} />}
                  </MapContainer>
                  {trackingActive && (
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur rounded-lg px-3 py-1.5 text-xs shadow flex items-center gap-2 z-[1000]">
                      <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-green-700 font-medium">Live Tracking</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="font-bold text-stone-800 mb-3">Items</h2>
            <div className="space-y-3">
              {(order.items as Array<{ image: string; name: string; price: number; quantity: number }>).map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <img src={item.image} alt={item.name} className="h-14 w-14 rounded-lg object-cover bg-stone-100" />
                  <div className="flex-1">
                    <p className="font-medium text-stone-800">{item.name}</p>
                    <p className="text-sm text-stone-500">Qty: {item.quantity}</p>
                  </div>
                  <span className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-stone-800 mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-stone-500">Subtotal</span><span>₹{order.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Delivery</span><span>{order.deliveryFee && order.deliveryFee > 0 ? `₹${order.deliveryFee.toFixed(2)}` : <span className="text-green-600">FREE</span>}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Tax</span><span>₹{(order.tax || 0).toFixed(2)}</span></div>
              <div className="border-t pt-2 flex justify-between font-bold text-lg"><span>Total</span><span className="text-amber-700">₹{order.total.toFixed(2)}</span></div>
              <div className="flex justify-between text-xs mt-2">
                <span className="text-stone-500">Payment</span>
                <span>{order.isPaid ? <span className="text-green-600 font-medium">Paid</span> : <span className="text-orange-600 font-medium">{order.paymentMethod === 'cash' ? 'Pending' : 'Unpaid'}</span>}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-stone-800 mb-3">Delivery Address</h3>
            <div className="text-sm text-stone-600">
              <p className="font-medium text-stone-700">{order.shippingAddress.label as string}</p>
              <p>{order.shippingAddress.address as string}</p>
              <p>{order.shippingAddress.city as string}, {order.shippingAddress.state as string} - {order.shippingAddress.zip as string}</p>
            </div>
          </div>

          {order.statusHistory && (
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-stone-800 mb-3">Status History</h3>
              <div className="space-y-3">
                {(order.statusHistory as Array<{ status: string; note: string; timestamp: string }>).slice().reverse().map((entry, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <div className="h-2 w-2 rounded-full bg-amber-600 mt-1.5 shrink-0" />
                    <div>
                      <p className="font-medium text-stone-700">{entry.status}</p>
                      <p className="text-stone-500 text-xs">{entry.note}</p>
                      <p className="text-stone-400 text-xs">{new Date(entry.timestamp).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OrderDetail

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { useCartStore } from '../../store/cartStore'
import type { Address } from '../../types'
import toast from 'react-hot-toast'
import Spinner from '../../components/ui/Spinner'
import { Tag } from 'lucide-react'

declare global {
  interface Window {
    Cashfree: (opts: { mode: 'sandbox' | 'production' }) => {
      checkout: (opts: {
        paymentSessionId: string
        redirectTarget: '_self' | '_blank' | '_modal'
      }) => Promise<{ redirect?: boolean; error?: unknown }>
    }
  }
}

const Checkout = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { items, subtotal, clearCart } = useCartStore()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddress, setSelectedAddress] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState('online')
  const [loading, setLoading] = useState(false)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [addressForm, setAddressForm] = useState({
    label: '', address: '', city: '', state: '', zip: '', phone: '',
  })
  const [pincodeStatus, setPincodeStatus] = useState<{ available: boolean; deliveryFee?: number; message?: string } | null>(null)
  const [checkingPincode, setCheckingPincode] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; description?: string } | null>(null)
  const [applyingCoupon, setApplyingCoupon] = useState(false)

  const deliveryFee = subtotal() >= 20 ? 0 : (pincodeStatus?.deliveryFee ?? 2.99)
  const couponDiscount = appliedCoupon?.discount ?? 0
  const afterDiscount = Math.max(0, subtotal() - couponDiscount)
  const tax = parseFloat((afterDiscount * 0.05).toFixed(2))
  const total = parseFloat((afterDiscount + deliveryFee + tax).toFixed(2))

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    api.get('/addresses').then(({ data }) => {
      if (data.success) {
        setAddresses(data.addresses)
        const def = data.addresses.find((a: Address) => a.isDefault)
        if (def) setSelectedAddress(def.id)
      }
    })
  }, [user, navigate])

  // Check pincode when selected address changes
  useEffect(() => {
    const address = addresses.find((a) => a.id === selectedAddress)
    if (!address?.zip) { setPincodeStatus(null); return }
    setCheckingPincode(true)
    api.get(`/pincodes/${address.zip}`).then(({ data }) => {
      if (data.success) setPincodeStatus({ available: data.available, deliveryFee: data.deliveryFee, message: data.message })
    }).catch(() => setPincodeStatus({ available: false, message: 'Could not verify pincode' }))
      .finally(() => setCheckingPincode(false))
  }, [selectedAddress, addresses])

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data } = await api.post('/addresses', addressForm)
      if (data.success) {
        setAddresses([...addresses, data.address])
        setSelectedAddress(data.address.id)
        setShowAddressForm(false)
        setAddressForm({ label: '', address: '', city: '', state: '', zip: '', phone: '' })
        toast.success('Address added')
      }
    } catch {
      toast.error('Failed to add address')
    }
  }

  const applyCoupon = async () => {
    const code = couponCode.trim()
    if (!code) { toast.error('Enter a coupon code'); return }
    setApplyingCoupon(true)
    try {
      const { data } = await api.post('/coupons/validate', { code, subtotal: subtotal() })
      if (data.valid) {
        setAppliedCoupon({ code: data.coupon.code, discount: data.discount, description: data.coupon.description })
        toast.success(`Coupon applied! You save ₹${data.discount.toFixed(2)}`)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid coupon'
      toast.error(msg)
    } finally { setApplyingCoupon(false) }
  }

  const removeCoupon = () => {
    setAppliedCoupon(null)
    setCouponCode('')
  }

  const handlePlaceOrder = async () => {
    if (!selectedAddress) { toast.error('Please select a delivery address'); return }
    const address = addresses.find((a) => a.id === selectedAddress)
    if (!address) { toast.error('Address not found'); return }

    // Re-check pincode availability before submitting
    if (address.zip) {
      try {
        const { data } = await api.get(`/pincodes/${address.zip}`)
        if (!data.available) { toast.error(data.message || 'Delivery not available in this area'); return }
      } catch { toast.error('Could not verify delivery availability'); return }
    }

    setLoading(true)
    try {
      const shippingAddress = {
        label: address.label,
        address: address.address,
        city: address.city,
        state: address.state,
        zip: address.zip,
        lat: address.lat,
        lng: address.lng,
      }

      const orderItems = items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      }))

      const commonPayload: Record<string, unknown> = {
        items: orderItems,
        shippingAddress,
        paymentMethod,
      }
      if (appliedCoupon) commonPayload.couponCode = appliedCoupon.code

      if (paymentMethod === 'cash') {
        const { data } = await api.post('/orders', commonPayload)
        if (data.success) {
          toast.success('Order placed! Pay on delivery.')
          clearCart()
          navigate(`/orders/${data.order.id}`)
        }
      } else {
        const { data } = await api.post('/payment/create-order', commonPayload)
        if (data.success && data.paymentSessionId) {
          clearCart()
          try {
            const cashfree = window.Cashfree({ mode: data.cashfreeMode || 'production' })
            cashfree.checkout({
              paymentSessionId: data.paymentSessionId,
              redirectTarget: '_self',
            })
          } catch (cfErr) {
            console.error('Cashfree checkout error:', cfErr)
            toast.error('Payment gateway failed to load. Please try again.')
          }
        }
      }
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message || (err instanceof Error ? err.message : 'Order failed')
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    navigate('/cart')
    return null
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-stone-800 mb-8">Checkout</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="font-bold text-lg text-stone-800 mb-4">Delivery Address</h2>
            {addresses.length > 0 ? (
              <div className="space-y-3">
                {addresses.map((addr) => (
                  <label key={addr.id} className={`block p-4 rounded-lg border-2 cursor-pointer transition ${
                    selectedAddress === addr.id ? 'border-amber-500 bg-amber-50' : 'border-stone-200 hover:border-stone-300'
                  }`}>
                    <input type="radio" name="address" value={addr.id} checked={selectedAddress === addr.id}
                      onChange={() => setSelectedAddress(addr.id)} className="sr-only" />
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-semibold text-stone-800">{addr.label}</span>
                        {addr.isDefault && <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Default</span>}
                        <p className="text-sm text-stone-600 mt-1">{addr.address}, {addr.city}, {addr.state} - {addr.zip}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-stone-500 text-sm mb-4">No addresses saved yet.</p>
            )}
            {pincodeStatus && !pincodeStatus.available && (
              <p className="text-red-500 text-xs mt-2 font-medium">{pincodeStatus.message || 'Delivery not available in this area'}</p>
            )}
            {pincodeStatus && pincodeStatus.available && (
              <p className="text-green-600 text-xs mt-2 font-medium">Delivery available · Fee: ₹{(pincodeStatus.deliveryFee ?? 0).toFixed(2)}</p>
            )}
            {checkingPincode && <p className="text-stone-400 text-xs mt-2">Checking pincode…</p>}
            <button onClick={() => setShowAddressForm(!showAddressForm)}
              className="mt-3 text-amber-600 text-sm font-medium hover:text-amber-700">
              {showAddressForm ? 'Cancel' : '+ Add New Address'}
            </button>

            {showAddressForm && (
              <form onSubmit={handleAddAddress} className="mt-4 grid grid-cols-2 gap-3">
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
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="font-bold text-lg text-stone-800 mb-4 flex items-center gap-2"><Tag size={20} /> Coupon</h2>
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-green-800">{appliedCoupon.code}</p>
                    <p className="text-xs text-green-600">{appliedCoupon.description} — Save ₹{appliedCoupon.discount.toFixed(2)}</p>
                  </div>
                  <button onClick={removeCoupon} className="text-xs text-red-500 hover:text-red-700 font-medium">Remove</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input type="text" placeholder="Enter coupon code" value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 uppercase" />
                  <button onClick={applyCoupon} disabled={applyingCoupon || !couponCode.trim()}
                    className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 whitespace-nowrap">
                    {applyingCoupon ? 'Applying…' : 'Apply'}
                  </button>
                </div>
              )}
            </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="font-bold text-lg text-stone-800 mb-4">Payment Method</h2>
            <div className="space-y-3">
              {[
                { value: 'online', label: 'Online (Card / UPI / Net Banking)', desc: 'Pay securely via Cashfree' },
                { value: 'cash', label: 'Cash on Delivery', desc: 'Pay when your order arrives' },
              ].map((method) => (
                <label key={method.value} className={`block p-4 rounded-lg border-2 cursor-pointer transition ${
                  paymentMethod === method.value ? 'border-amber-500 bg-amber-50' : 'border-stone-200 hover:border-stone-300'
                }`}>
                  <input type="radio" name="payment" value={method.value} checked={paymentMethod === method.value}
                    onChange={() => setPaymentMethod(method.value)} className="sr-only" />
                  <span className="font-semibold text-stone-800">{method.label}</span>
                  <p className="text-sm text-stone-500">{method.desc}</p>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm h-fit">
          <h3 className="font-bold text-stone-800 text-lg mb-4">Order Summary</h3>
          <div className="space-y-3 text-sm max-h-60 overflow-y-auto mb-4">
            {items.map((item) => (
              <div key={item.productId} className="flex items-center gap-3">
                <img src={item.image} alt={item.name} className="h-10 w-10 rounded object-cover bg-stone-100" />
                <div className="flex-1 min-w-0">
                  <p className="text-stone-800 truncate font-medium text-xs">{item.name}</p>
                  <p className="text-stone-500 text-xs">x{item.quantity}</p>
                </div>
                <span className="font-medium text-xs">₹{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2 text-sm border-t pt-3">
            <div className="flex justify-between"><span className="text-stone-500">Subtotal</span><span>₹{subtotal().toFixed(2)}</span></div>
            {couponDiscount > 0 && <div className="flex justify-between"><span className="text-green-600">Coupon Discount</span><span className="text-green-600">-₹{couponDiscount.toFixed(2)}</span></div>}
            <div className="flex justify-between"><span className="text-stone-500">Delivery</span><span>{deliveryFee === 0 ? <span className="text-green-600">FREE</span> : `₹${deliveryFee.toFixed(2)}`}</span></div>
            <div className="flex justify-between"><span className="text-stone-500">Tax</span><span>₹{tax.toFixed(2)}</span></div>
            <div className="border-t pt-2 flex justify-between font-bold text-lg"><span>Total</span><span className="text-amber-700">₹{total.toFixed(2)}</span></div>
          </div>
          <button onClick={handlePlaceOrder} disabled={loading}
            className="mt-6 w-full bg-amber-600 text-white py-3 rounded-lg font-semibold hover:bg-amber-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Spinner size="sm" />}
            {paymentMethod === 'cash' ? 'Place Order' : 'Proceed to Pay'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Checkout

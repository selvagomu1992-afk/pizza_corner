import { useEffect, useState } from 'react'
import api from '../../api/client'
import type { Product } from '../../types'
import Spinner from '../../components/ui/Spinner'
import toast from 'react-hot-toast'
import useSettings from '../../hooks/useSettings'

interface BillItem {
  productId: string
  name: string
  price: number
  quantity: number
}

interface LastOrder {
  id: string
  items: BillItem[]
  customerName: string
  customerPhone: string
  paymentMethod: string
  counterNo: string
  subtotal: number
  tax: number
  total: number
  createdAt: string
}

const AdminCounterBill = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [billItems, setBillItems] = useState<BillItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [counterNo, setCounterNo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lastOrder, setLastOrder] = useState<LastOrder | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [recentBills, setRecentBills] = useState<LastOrder[]>([])
  const [loadingRecent, setLoadingRecent] = useState(false)
  const { settings } = useSettings()

  useEffect(() => {
    api.get('/products', { params: { limit: '100' } }).then(({ data }) => {
      if (data.success) setProducts(data.products)
    }).finally(() => setLoading(false))
    loadRecentBills()
  }, [])

  const loadRecentBills = () => {
    setLoadingRecent(true)
    api.get('/admin/orders', { params: { status: 'Delivered', limit: '20' } }).then(({ data }) => {
      if (data.success) {
        const bills: LastOrder[] = data.orders
          .filter((o: any) => (o.user as any)?.email === 'counter@pizzacorner.com')
          .slice(0, 10)
          .map((o: any) => {
            const addr = o.shippingAddress as Record<string, unknown>
            return {
              id: o.id,
              items: (o.items as any[]).map((i: any) => ({ productId: i.product, name: i.name, price: i.price, quantity: i.quantity })),
              customerName: (addr.label as string) || '',
              customerPhone: (addr.phone as string) || '',
              counterNo: (addr.counterNo as string) || '',
              paymentMethod: o.paymentMethod,
              subtotal: o.subtotal,
              tax: o.tax || 0,
              total: o.total,
              createdAt: o.createdAt,
            }
          })
        setRecentBills(bills)
      }
    }).finally(() => setLoadingRecent(false))
  }

  const addItem = (product: Product) => {
    setBillItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id)
      if (existing) {
        return prev.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1 }]
    })
  }

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) { setBillItems((prev) => prev.filter((i) => i.productId !== productId)); return }
    setBillItems((prev) => prev.map((i) => i.productId === productId ? { ...i, quantity: qty } : i))
  }

  const subtotal = billItems.reduce((s, i) => s + i.price * i.quantity, 0)
  const tax = parseFloat((subtotal * 0.05).toFixed(2))
  const total = parseFloat((subtotal + tax).toFixed(2))

  const filtered = products.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase())
  )

  const resetForm = () => {
    setBillItems([])
    setCustomerName('')
    setCustomerPhone('')
    setPaymentMethod('cash')
    setCounterNo('')
    setEditingId(null)
  }

  const loadBill = async (id: string) => {
    try {
      const { data } = await api.get(`/admin/counter-bill/${id}`)
      if (data.success) {
        const o = data.order
        const addr = o.shippingAddress as Record<string, unknown>
        setBillItems((o.items as any[]).map((i: any) => ({ productId: i.product, name: i.name, price: i.price, quantity: i.quantity })))
        setCustomerName((addr.label as string) || '')
        setCustomerPhone((addr.phone as string) || '')
        setPaymentMethod(o.paymentMethod)
        setCounterNo((addr.counterNo as string) || '')
        setEditingId(id)
        setLastOrder(null)
      }
    } catch { toast.error('Failed to load bill') }
  }

  const handleSubmit = async () => {
    if (!customerName.trim()) { toast.error('Enter customer name'); return }
    if (billItems.length === 0) { toast.error('Add at least one item'); return }
    setSubmitting(true)
    try {
      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        items: billItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        paymentMethod,
        counterNo: counterNo || undefined,
      }

      let data
      if (editingId) {
        const res = await api.patch(`/admin/counter-bill/${editingId}`, payload)
        data = res.data
      } else {
        const res = await api.post('/admin/counter-bill', payload)
        data = res.data
      }

      if (data.success) {
        setLastOrder({
          id: editingId || data.order.id,
          items: [...billItems],
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          paymentMethod,
          counterNo,
          subtotal,
          tax,
          total,
          createdAt: new Date().toISOString(),
        })
        toast.success(editingId ? 'Bill updated' : 'Counter bill created')
        resetForm()
        loadRecentBills()
      }
    } catch { toast.error('Failed to save bill') }
    finally { setSubmitting(false) }
  }

  const printBill = () => {
    if (!lastOrder) return

    const itemsHTML = lastOrder.items.map((i) => `
      <tr>
        <td style="padding:4px 0">${i.name}</td>
        <td style="padding:4px 0;text-align:right">${i.quantity}</td>
        <td style="padding:4px 0;text-align:right">${i.price.toFixed(2)}</td>
        <td style="padding:4px 0;text-align:right">${(i.price * i.quantity).toFixed(2)}</td>
      </tr>
    `).join('')

    const phoneHTML = lastOrder.customerPhone
      ? `<p style="margin:4px 0"><strong>Phone:</strong> ${lastOrder.customerPhone}</p>`
      : ''

    const w = window.open('', '_blank')
    if (!w) { toast.error('Please allow pop-ups for this site'); return }
    w.document.write(`
      <html>
      <head><title>Bill</title>
      <style>
        body { font-family:'Courier New',monospace;margin:20px;font-size:13px; }
        .bill { max-width:300px;margin:0 auto; }
        .hdr { text-align:center;border-bottom:1px dashed #000;padding-bottom:8px;margin-bottom:8px; }
        .hdr h1 { font-size:18px;margin:0; }
        .hdr p { margin:2px 0;font-size:11px; }
        table { width:100%;border-collapse:collapse; }
        th { text-align:left;border-bottom:1px dashed #000;padding:4px 0;font-size:11px; }
        .sum { border-top:1px dashed #000;margin-top:8px;padding-top:8px; }
        .sum div { display:flex;justify-content:space-between; }
        .big { font-size:16px;font-weight:bold;border-top:1px solid #000;padding-top:4px;margin-top:4px; }
        .ftr { text-align:center;margin-top:16px;font-size:11px;border-top:1px dashed #000;padding-top:8px; }
      </style>
      </head>
      <body><div class="bill">
        <div class="hdr">
          <h1>${settings.companyName}</h1>
          <p>Counter Bill</p>
          <p>${new Date(lastOrder.createdAt).toLocaleString('en-IN')}</p>
        </div>
        <p style="margin:4px 0"><strong>Customer:</strong> ${lastOrder.customerName}</p>
        ${lastOrder.counterNo ? `<p style="margin:4px 0"><strong>Counter:</strong> #${lastOrder.counterNo}</p>` : ''}
        ${phoneHTML}
        <p style="margin:4px 0"><strong>Payment:</strong> ${lastOrder.paymentMethod.toUpperCase()}</p>
        <p style="margin:4px 0"><strong>Bill #:</strong> ${lastOrder.id.slice(0, 8)}</p>
        <table>
          <thead><tr><th>Item</th><th style="text-align:right">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead>
          <tbody>${itemsHTML}</tbody>
        </table>
        <div class="sum">
          <div><span>Subtotal</span><span>₹${lastOrder.subtotal.toFixed(2)}</span></div>
          <div><span>Tax (5%)</span><span>₹${lastOrder.tax.toFixed(2)}</span></div>
          <div class="big"><span>Total</span><span>₹${lastOrder.total.toFixed(2)}</span></div>
        </div>
        <div class="ftr"><p style="margin:2px 0">Thank you!</p></div>
      </div>
      <script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
      </body>
      </html>
    `)
    w.document.close()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Counter Bill</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Product list */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="font-bold text-stone-700 mb-3">Products</h2>
          <input type="text" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 mb-3" />
          {loading ? <div className="flex justify-center py-8"><Spinner size="md" /></div> : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filtered.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50 cursor-pointer" onClick={() => addItem(p)}>
                  <img src={p.image} alt={p.name} className="h-10 w-10 rounded object-cover bg-stone-100" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">{p.name}</p>
                    <p className="text-xs text-stone-500">₹{p.price} {p.unit ? `/ ${p.unit}` : ''} | Stock: {p.stock ?? 'N/A'}</p>
                  </div>
                  <button className="text-xs bg-amber-600 text-white px-2 py-1 rounded hover:bg-amber-700">Add</button>
                </div>
              ))}
              {filtered.length === 0 && <p className="text-sm text-stone-400 text-center py-4">No products found</p>}
            </div>
          )}
        </div>

        {/* Bill */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h2 className="font-bold text-stone-700 mb-3">{editingId ? 'Edit Bill' : 'New Bill'}</h2>

            <div className="space-y-2 mb-4">
              <input type="text" placeholder="Customer name *" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" />
              <input type="text" placeholder="Customer phone (optional)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" />
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 bg-white">
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
              </select>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setCounterNo(String(n))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${counterNo === String(n) ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-stone-600 border-stone-300 hover:border-amber-400'}`}>
                    #{n}
                  </button>
                ))}
              </div>
            </div>

            {billItems.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-8">No items added yet</p>
            ) : (
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                {billItems.map((item) => (
                  <div key={item.productId} className="flex items-center gap-2 p-2 bg-stone-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800 truncate">{item.name}</p>
                      <p className="text-xs text-stone-500">₹{item.price} each</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.productId, item.quantity - 1)}
                        className="h-6 w-6 rounded bg-stone-200 text-xs font-bold hover:bg-stone-300">−</button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button onClick={() => updateQty(item.productId, item.quantity + 1)}
                        className="h-6 w-6 rounded bg-stone-200 text-xs font-bold hover:bg-stone-300">+</button>
                    </div>
                    <span className="text-sm font-medium w-16 text-right">₹{(item.price * item.quantity).toFixed(2)}</span>
                    <button onClick={() => setBillItems((prev) => prev.filter((i) => i.productId !== item.productId))}
                      className="text-red-400 hover:text-red-600 text-xs ml-1">✕</button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-stone-500"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-stone-500"><span>Tax (5%)</span><span>₹{tax.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-lg text-stone-800"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={handleSubmit} disabled={submitting || billItems.length === 0}
                className="flex-1 bg-amber-600 text-white py-2.5 rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 text-sm">
                {submitting ? 'Saving…' : editingId ? 'Update Bill' : 'Create Bill'}
              </button>
              {editingId && (
                <button onClick={resetForm}
                  className="px-4 py-2.5 border border-stone-300 rounded-lg text-sm text-stone-600 hover:bg-stone-50">Cancel</button>
              )}
            </div>

            {lastOrder && (
              <div className="mt-4 border-t pt-4">
                <div className="bg-green-50 rounded-lg p-3 mb-3">
                  <p className="text-sm font-medium text-green-800">Bill saved</p>
                  <p className="text-xs text-green-600">Total: ₹{lastOrder.total.toFixed(2)} | {lastOrder.paymentMethod.toUpperCase()}</p>
                </div>
                <button onClick={printBill}
                  className="w-full bg-stone-800 text-white py-2.5 rounded-lg font-medium hover:bg-stone-900 text-sm">Print Bill</button>
              </div>
            )}
          </div>

          {/* Recent Bills */}
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h2 className="font-bold text-stone-700 mb-3">Recent Bills</h2>
            {loadingRecent ? <div className="flex justify-center py-4"><Spinner size="md" /></div> : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {recentBills.map((b) => (
                  <div key={b.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-stone-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800 truncate">{b.customerName}</p>
                      <p className="text-xs text-stone-500">₹{b.total.toFixed(2)} · {new Date(b.createdAt).toLocaleString('en-IN')}</p>
                    </div>
                    {b.counterNo && <span className="text-xs bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded">#{b.counterNo}</span>}
                    <span className="text-xs text-stone-400 uppercase">{b.paymentMethod}</span>
                    <button onClick={() => loadBill(b.id)}
                      className="text-xs text-amber-600 hover:text-amber-700 font-medium px-2 py-1">Edit</button>
                  </div>
                ))}
                {recentBills.length === 0 && <p className="text-sm text-stone-400 text-center py-4">No counter bills yet</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminCounterBill
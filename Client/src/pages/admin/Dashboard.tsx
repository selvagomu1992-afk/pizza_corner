import { useEffect, useState } from 'react'
import api from '../../api/client'
import type { Order } from '../../types'
import Spinner from '../../components/ui/Spinner'
import { HiOutlineShoppingBag, HiOutlineUsers, HiOutlineClipboardList, HiOutlineTruck, HiOutlineExclamationCircle } from 'react-icons/hi'

interface DashboardStats {
  totalOrders: number
  totalUsers: number
  totalProducts: number
  outOfStock: number
  totalPartners: number
  totalRevenue: number
}

interface LowStockProduct {
  id: string
  name: string
  stock: number
  minQty: number
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/dashboard').then(({ data }) => {
      if (data.success) {
        setStats(data.stats)
        setRecentOrders(data.recentOrders || [])
        setLowStockProducts(data.lowStockProducts || [])
      }
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!stats) return <div className="text-center py-20 text-stone-500">Failed to load dashboard</div>

  const cards = [
    { label: 'Total Orders', value: stats.totalOrders, icon: HiOutlineClipboardList, color: 'bg-blue-500' },
    { label: 'Total Users', value: stats.totalUsers, icon: HiOutlineUsers, color: 'bg-green-500' },
    { label: 'Total Products', value: stats.totalProducts, icon: HiOutlineShoppingBag, color: 'bg-amber-500' },
    { label: 'Total Revenue', value: `₹${stats.totalRevenue.toFixed(2)}`, icon: HiOutlineTruck, color: 'bg-purple-500' },
    { label: 'Delivery Partners', value: stats.totalPartners, icon: HiOutlineTruck, color: 'bg-indigo-500' },
    { label: 'Out of Stock', value: stats.outOfStock, icon: HiOutlineShoppingBag, color: 'bg-red-500' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-stone-500">{card.label}</p>
                <p className="text-2xl font-bold text-stone-800">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {lowStockProducts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm mb-8">
          <div className="p-5 flex items-center gap-2">
            <HiOutlineExclamationCircle className="h-5 w-5 text-orange-500" />
            <h2 className="font-bold text-stone-800">Low Stock Products</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-stone-600">
                <tr>
                  <th className="text-left p-4 font-medium">Product</th>
                  <th className="text-left p-4 font-medium">Stock</th>
                  <th className="text-left p-4 font-medium">Min Qty</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50">
                    <td className="p-4 font-medium">{p.name}</td>
                    <td className="p-4 text-orange-600 font-medium">{p.stock}</td>
                    <td className="p-4 text-stone-500">{p.minQty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-5">
          <h2 className="font-bold text-stone-800">Recent Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-600">
              <tr>
                <th className="text-left p-4 font-medium">Order ID</th>
                <th className="text-left p-4 font-medium">Customer</th>
                <th className="text-left p-4 font-medium">Total</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-stone-50">
                  <td className="p-4 font-mono text-xs">#{order.id.slice(0, 8)}</td>
                  <td className="p-4">{(order.user as { name?: string })?.name || 'N/A'}</td>
                  <td className="p-4 font-medium">₹{order.total.toFixed(2)}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                      order.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                      order.status === 'Out for Delivery' ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>{order.status}</span>
                  </td>
                  <td className="p-4 text-stone-500">{new Date(order.createdAt!).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-center text-stone-400">No orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

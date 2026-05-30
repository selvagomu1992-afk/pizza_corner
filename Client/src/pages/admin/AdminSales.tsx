import { useEffect, useState } from 'react'
import api from '../../api/client'
import Spinner from '../../components/ui/Spinner'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'

interface CategorySale {
  category: string
  quantity: number
  revenue: number
}

interface MonthlyData {
  category: string
  month: string
  quantity: number
  revenue: number
}

const COLORS = ['#d97706', '#059669', '#2563eb', '#dc2626', '#7c3aed', '#0891b2', '#ca8a04', '#be185d']

const AdminSales = () => {
  const [sales, setSales] = useState<CategorySale[]>([])
  const [monthly, setMonthly] = useState<MonthlyData[]>([])
  const [totals, setTotals] = useState({ totalOrders: 0, totalQty: 0, totalRevenue: 0 })
  const [loading, setLoading] = useState(true)
  const [chartMode, setChartMode] = useState<'revenue' | 'quantity'>('revenue')
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all')

  useEffect(() => {
    api.get('/admin/sales-by-category').then(({ data }) => {
      if (data.success) {
        setSales(data.sales)
        setMonthly(data.monthly)
        setTotals(data.totals)
      }
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const categories = ['all', ...sales.map(s => s.category)]

  const filteredMonthly = selectedCategory === 'all'
    ? monthly
    : monthly.filter(m => m.category === selectedCategory)

  const months = [...new Set(monthly.map(m => m.month))].sort()

  const monthlyAggregated = selectedCategory === 'all'
    ? months.map(month => {
        const items = monthly.filter(m => m.month === month)
        return {
          month,
          quantity: items.reduce((s, i) => s + i.quantity, 0),
          revenue: items.reduce((s, i) => s + i.revenue, 0),
        }
      })
    : months.map(month => {
        const items = monthly.filter(m => m.month === month && m.category === selectedCategory)
        return {
          month,
          quantity: items.reduce((s, i) => s + i.quantity, 0),
          revenue: items.reduce((s, i) => s + i.revenue, 0),
        }
      })

  const formatRevenue = (v: number) => `₹${v.toLocaleString('en-IN')}`

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">Category-wise Sales</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide">Total Orders</p>
          <p className="text-2xl font-bold text-stone-800 mt-1">{totals.totalOrders}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide">Total Qty Sold</p>
          <p className="text-2xl font-bold text-stone-800 mt-1">{totals.totalQty}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide">Total Revenue</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{formatRevenue(totals.totalRevenue)}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide">Categories</p>
          <p className="text-2xl font-bold text-stone-800 mt-1">{sales.length}</p>
        </div>
      </div>

      {/* Pie + Bar side by side on desktop */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-stone-700 mb-3">Revenue Distribution</h2>
          {sales.length === 0 ? (
            <p className="text-stone-400 text-sm py-8 text-center">No sales data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={sales} dataKey="revenue" nameKey="category" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                  {sales.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => formatRevenue(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar Chart */}
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-stone-700 mb-3">Sales by Category</h2>
          {sales.length === 0 ? (
            <p className="text-stone-400 text-sm py-8 text-center">No sales data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sales}>
                <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: any, name: any) => name === 'revenue' ? formatRevenue(Number(v)) : v} />
                <Bar dataKey={chartMode} radius={[4, 4, 0, 0]}>
                  {sales.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="flex justify-center gap-4 mt-3">
            <button onClick={() => setChartMode('revenue')} className={`text-xs px-3 py-1 rounded-full font-medium ${chartMode === 'revenue' ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600'}`}>Revenue</button>
            <button onClick={() => setChartMode('quantity')} className={`text-xs px-3 py-1 rounded-full font-medium ${chartMode === 'quantity' ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600'}`}>Quantity</button>
          </div>
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="bg-white border border-stone-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-stone-700">Monthly Trend</h2>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="text-xs border border-stone-300 rounded-lg px-2 py-1"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
            ))}
          </select>
        </div>
        {monthlyAggregated.length === 0 ? (
          <p className="text-stone-400 text-sm py-8 text-center">No monthly data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyAggregated}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any, name: any) => name === 'revenue' ? formatRevenue(Number(v)) : v} />
              <Legend />
              <Bar dataKey={chartMode === 'revenue' ? 'revenue' : 'quantity'} fill="#d97706" radius={[4, 4, 0, 0]} name={chartMode === 'revenue' ? 'Revenue' : 'Quantity'} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-stone-200 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-stone-700 mb-3">Category Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-stone-500">
                <th className="py-2 px-3 font-medium">Category</th>
                <th className="py-2 px-3 font-medium text-right">Qty Sold</th>
                <th className="py-2 px-3 font-medium text-right">Revenue</th>
                <th className="py-2 px-3 font-medium text-right">Share (%)</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s, i) => (
                <tr key={s.category} className="border-b border-stone-100">
                  <td className="py-2 px-3 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    {s.category}
                  </td>
                  <td className="py-2 px-3 text-right">{s.quantity}</td>
                  <td className="py-2 px-3 text-right font-medium">{formatRevenue(s.revenue)}</td>
                  <td className="py-2 px-3 text-right">{totals.totalRevenue > 0 ? ((s.revenue / totals.totalRevenue) * 100).toFixed(1) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AdminSales
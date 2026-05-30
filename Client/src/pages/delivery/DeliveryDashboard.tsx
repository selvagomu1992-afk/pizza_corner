import { useEffect, useState } from 'react'
import api from '../../api/client'
import Spinner from '../../components/ui/Spinner'
import toast from 'react-hot-toast'
import { HiOutlineClipboardList, HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineCurrencyRupee } from 'react-icons/hi'

interface Stats {
  active: number
  completed: number
  cancelled: number
  pending: number
  earnings: number
}

const DeliveryDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/delivery/orders/stats').then(({ data }) => {
      if (data.success) setStats(data.stats)
      else toast.error(data.message || 'Failed to load stats')
    }).catch((err) => {
      toast.error(err.response?.data?.message || 'Failed to load stats')
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!stats) return <div className="text-center py-20 text-stone-500">Failed to load stats</div>

  const cards = [
    { label: 'Active Deliveries', value: stats.active, icon: HiOutlineClipboardList, color: 'bg-blue-500' },
    { label: 'Completed', value: stats.completed, icon: HiOutlineCheckCircle, color: 'bg-green-500' },
    { label: 'Cancelled', value: stats.cancelled, icon: HiOutlineXCircle, color: 'bg-red-500' },
    { label: 'Total Earnings', value: `₹${stats.earnings.toFixed(2)}`, icon: HiOutlineCurrencyRupee, color: 'bg-amber-500' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Delivery Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

      <div className="bg-amber-50 rounded-xl p-6 text-center">
        <p className="text-lg font-semibold text-stone-700">You're making a difference!</p>
        <p className="text-stone-500 text-sm mt-1">Stay safe on the road.</p>
      </div>
    </div>
  )
}

export default DeliveryDashboard

import { Outlet, Link, useLocation, Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { Toaster } from 'react-hot-toast'
import { useState, useEffect } from 'react'
import api from '../../api/client'
import { HiOutlineViewGrid, HiOutlineUsers, HiOutlineShoppingBag, HiOutlineClipboardList, HiOutlineTruck, HiOutlineLocationMarker, HiOutlineTag, HiOutlineAdjustments, HiOutlineReceiptTax, HiOutlineArrowLeft, HiOutlineGlobeAlt, HiOutlineMenu, HiOutlineStar, HiOutlineCurrencyRupee, HiOutlineChartBar } from 'react-icons/hi'
import useSettings from '../../hooks/useSettings'
import Navbar from './Navbar'

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: HiOutlineViewGrid },
  { to: '/admin/counter-bill', label: 'Counter Bill', icon: HiOutlineReceiptTax },
  { to: '/admin/orders', label: 'Orders', icon: HiOutlineClipboardList },
  { to: '/admin/products', label: 'Products', icon: HiOutlineShoppingBag },
  { to: '/admin/users', label: 'Users', icon: HiOutlineUsers },
  { to: '/admin/delivery-partners', label: 'Partners', icon: HiOutlineTruck },
  { to: '/admin/addresses', label: 'Addresses', icon: HiOutlineLocationMarker },
  { to: '/admin/offers', label: 'Offers', icon: HiOutlineTag },
  { to: '/admin/coupons', label: 'Coupons', icon: HiOutlineCurrencyRupee },
  { to: '/admin/branding', label: 'Branding', icon: HiOutlineAdjustments },
  { to: '/admin/menu', label: 'Menu', icon: HiOutlineMenu },
  { to: '/admin/pincodes', label: 'Pincodes', icon: HiOutlineGlobeAlt },
  { to: '/admin/reviews', label: 'Reviews', icon: HiOutlineStar },
  { to: '/admin/sales', label: 'Sales', icon: HiOutlineChartBar },
]

const AdminLayout = () => {
  const { isAdmin, user } = useAuthStore()
  const location = useLocation()
  const { settings } = useSettings()
  const [unassignedCount, setUnassignedCount] = useState(0)

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/orders/unassigned-count')
        if (data.success) setUnassignedCount(data.count)
      } catch { /* ignore */ }
    }
    fetch()
    const interval = setInterval(fetch, 30000)
    return () => clearInterval(interval)
  }, [])

  if (!isAdmin && !user) return <Navigate to="/login" replace />
  if (!isAdmin && user) return <Navigate to="/" replace />

  return (
    <div className="flex min-h-screen bg-stone-100">
      <aside className="w-64 bg-white border-r border-stone-200 hidden md:block">
        <div className="p-4 border-b border-stone-200">
          <Link to="/admin/dashboard" className="flex items-center gap-2">
            {settings.logo ? <img src={settings.logo} alt="" className="h-7 w-auto" /> : <span className="text-xl">🍕</span>}
            <span className="font-bold text-stone-800">{settings.companyName}</span>
            {unassignedCount > 0 && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
            )}
          </Link>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
                location.pathname === to ? 'bg-amber-50 text-amber-700' : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
              {to === '/admin/orders' && unassignedCount > 0 && (
                <span className="ml-auto bg-green-500 text-white text-xs rounded-full h-5 min-w-5 flex items-center justify-center px-1">{unassignedCount}</span>
              )}
            </Link>
          ))}
          <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-stone-500 hover:bg-stone-50 mt-4">
            <HiOutlineArrowLeft className="h-5 w-5" />
            Back to Store
          </Link>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col">
        <Navbar />
        <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between md:hidden">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-lg">🍕</span>
            <span className="font-bold text-stone-800 text-sm">Admin</span>
            {unassignedCount > 0 && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
            )}
          </Link>
          <div className="flex gap-2 overflow-x-auto text-xs">
            {navItems.map(({ to, label }) => (
              <Link key={to} to={to} className={`px-2 py-1 rounded whitespace-nowrap ${location.pathname === to ? 'bg-amber-100 text-amber-700' : 'text-stone-500'}`}>
                {label}
              </Link>
            ))}
          </div>
        </header>

        <div className="flex-1 p-6">
          <Outlet />
        </div>
      </div>
      <Toaster position="top-right" />
    </div>
  )
}

export default AdminLayout

import { Outlet, Link, useLocation, Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { Toaster } from 'react-hot-toast'
import { HiOutlineClipboardList, HiOutlineUser, HiOutlineArrowLeft } from 'react-icons/hi'
import Navbar from './Navbar'

const DeliveryLayout = () => {
  const { isDelivery, token } = useAuthStore()
  const location = useLocation()

  const deliveryToken = localStorage.getItem('delivery_token')

  if (!isDelivery && !deliveryToken) return <Navigate to="/login" replace />

  return (
    <div className="flex min-h-screen bg-stone-100">
      <aside className="w-64 bg-white border-r border-stone-200 hidden md:block">
        <div className="p-4 border-b border-stone-200">
          <Link to="/delivery/dashboard" className="flex items-center gap-2">
            <span className="text-xl">🛵</span>
            <span className="font-bold text-stone-800">Delivery Panel</span>
          </Link>
        </div>
        <nav className="p-4 space-y-1">
          <Link to="/delivery/dashboard" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${location.pathname === '/delivery/dashboard' ? 'bg-amber-50 text-amber-700' : 'text-stone-600 hover:bg-stone-50'}`}>
            <HiOutlineClipboardList className="h-5 w-5" />
            Dashboard
          </Link>
          <Link to="/delivery/orders" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${location.pathname === '/delivery/orders' ? 'bg-amber-50 text-amber-700' : 'text-stone-600 hover:bg-stone-50'}`}>
            <HiOutlineClipboardList className="h-5 w-5" />
            Orders
          </Link>
          <Link to="/delivery/profile" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${location.pathname === '/delivery/profile' ? 'bg-amber-50 text-amber-700' : 'text-stone-600 hover:bg-stone-50'}`}>
            <HiOutlineUser className="h-5 w-5" />
            Profile
          </Link>
          <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-stone-500 hover:bg-stone-50 mt-4">
            <HiOutlineArrowLeft className="h-5 w-5" />
            Back to Store
          </Link>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col">
        <Navbar />
        <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center gap-4 md:hidden">
          <Link to="/" className="text-stone-500"><HiOutlineArrowLeft className="h-5 w-5" /></Link>
          <span className="font-bold text-stone-800">Delivery</span>
          <div className="flex gap-2 ml-auto text-xs">
            <Link to="/delivery/dashboard" className="px-2 py-1 rounded bg-amber-100 text-amber-700">Dashboard</Link>
            <Link to="/delivery/orders" className="px-2 py-1 rounded text-stone-500">Orders</Link>
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

export default DeliveryLayout

import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useCartStore } from '../../store/cartStore'
import { HiOutlineShoppingBag, HiOutlineUser, HiOutlineLogout, HiOutlineMenu, HiOutlineX, HiOutlineSearch } from 'react-icons/hi'
import { useState } from 'react'
import useSettings from '../../hooks/useSettings'

const Navbar = () => {
  const { user, isAdmin, isDelivery, logout } = useAuthStore()
  const itemCount = useCartStore((s) => s.itemCount())
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { settings } = useSettings()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  const isLoggedIn = !!user

  return (
    <nav className="bg-white shadow-sm border-b border-stone-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            {settings.logo ? (
              <img src={settings.logo} alt="" className="h-10 w-auto" />
            ) : (
              <span className="text-2xl">🍕</span>
            )}
            <span className="text-xl font-bold text-stone-800">{settings.companyName}</span>
          </Link>

          <div className="hidden md:flex items-center justify-center gap-6 flex-1">
            <Link to="/" className={`${isActive('/') ? 'text-amber-600' : 'text-stone-600'} hover:text-amber-600 font-medium`}>Home</Link>
            <Link to="/products" className={`${isActive('/products') ? 'text-amber-600' : 'text-stone-600'} hover:text-amber-600 font-medium`}>Menu</Link>
            <Link to="/offers" className={`${isActive('/offers') ? 'text-amber-600' : 'text-stone-600'} hover:text-amber-600 font-medium`}>Offers</Link>

            {isLoggedIn && !isAdmin && !isDelivery && (
              <>
                <Link to="/orders" className={`${isActive('/orders') ? 'text-amber-600' : 'text-stone-600'} hover:text-amber-600 font-medium`}>Orders</Link>
                <Link to="/addresses" className={`${isActive('/addresses') ? 'text-amber-600' : 'text-stone-600'} hover:text-amber-600 font-medium`}>Addresses</Link>
                <Link to="/cart" className={`relative ${isActive('/cart') ? 'text-amber-600' : 'text-stone-600'} hover:text-amber-600`}>
                  <HiOutlineShoppingBag className="h-6 w-6" />
                  {itemCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-amber-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {itemCount}
                    </span>
                  )}
                </Link>
              </>
            )}

            {isAdmin && (
              <Link to="/admin/dashboard" className={`${isActive('/admin/dashboard') ? 'text-amber-600' : 'text-stone-600'} hover:text-amber-600 font-medium`}>Admin</Link>
            )}
            {isDelivery && (
              <Link to="/delivery/dashboard" className={`${isActive('/delivery/dashboard') ? 'text-amber-600' : 'text-stone-600'} hover:text-amber-600 font-medium`}>Deliveries</Link>
            )}

            <form onSubmit={handleSearch} className="relative">
              <input type="text" placeholder="Search Your Favourite food" value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 border border-stone-300 rounded-lg pl-3 pr-8 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-500" />
              <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400">
                <HiOutlineSearch className="h-4 w-4" />
              </button>
            </form>
          </div>

          <div className="hidden md:flex items-center gap-4">
            {isLoggedIn ? (
              <div className="flex items-center gap-4">
                <Link to="/profile" className="flex items-center gap-1 text-stone-600 hover:text-amber-600">
                  <HiOutlineUser className="h-5 w-5" />
                  <span className="text-sm">{user?.name}</span>
                </Link>
                <button onClick={handleLogout} className="text-stone-500 hover:text-red-500">
                  <HiOutlineLogout className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="text-stone-600 hover:text-amber-600 font-medium">Login</Link>
                <Link to="/register" className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 font-medium">Sign Up</Link>
              </div>
            )}
          </div>

          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <HiOutlineX className="h-6 w-6" /> : <HiOutlineMenu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white px-4 py-4 space-y-3">
          <Link to="/products" className={`block ${isActive('/products') ? 'text-amber-600' : 'text-stone-600'} font-medium`} onClick={() => setMenuOpen(false)}>Menu</Link>
          <Link to="/" className={`block ${isActive('/') ? 'text-amber-600' : 'text-stone-600'} font-medium`} onClick={() => setMenuOpen(false)}>Home</Link>
          <Link to="/offers" className={`block ${isActive('/offers') ? 'text-amber-600' : 'text-stone-600'} font-medium`} onClick={() => setMenuOpen(false)}>Offers</Link>
          {isLoggedIn && !isAdmin && !isDelivery && (
            <>
              <Link to="/orders" className={`block ${isActive('/orders') ? 'text-amber-600' : 'text-stone-600'} font-medium`} onClick={() => setMenuOpen(false)}>Orders</Link>
              <Link to="/addresses" className={`block ${isActive('/addresses') ? 'text-amber-600' : 'text-stone-600'} font-medium`} onClick={() => setMenuOpen(false)}>Addresses</Link>
              <Link to="/cart" className={`block ${isActive('/cart') ? 'text-amber-600' : 'text-stone-600'} font-medium`} onClick={() => setMenuOpen(false)}>Cart ({itemCount})</Link>
            </>
          )}
          {isAdmin && <Link to="/admin/dashboard" className={`block ${isActive('/admin/dashboard') ? 'text-amber-600' : 'text-stone-600'} font-medium`} onClick={() => setMenuOpen(false)}>Admin</Link>}
          {isDelivery && <Link to="/delivery/dashboard" className={`block ${isActive('/delivery/dashboard') ? 'text-amber-600' : 'text-stone-600'} font-medium`} onClick={() => setMenuOpen(false)}>Deliveries</Link>}
          {isLoggedIn ? (
            <>
              <Link to="/profile" className="block text-stone-600 font-medium" onClick={() => setMenuOpen(false)}>Profile</Link>
              <button onClick={() => { handleLogout(); setMenuOpen(false) }} className="block text-red-500 font-medium">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="block text-stone-600 font-medium" onClick={() => setMenuOpen(false)}>Login</Link>
              <Link to="/register" className="block text-amber-600 font-medium" onClick={() => setMenuOpen(false)}>Sign Up</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}

export default Navbar

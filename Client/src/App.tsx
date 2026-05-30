import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import AdminLayout from './components/layout/AdminLayout'
import DeliveryLayout from './components/layout/DeliveryLayout'

import Home from './pages/user/Home'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Products from './pages/user/Products'
import ProductDetail from './pages/user/ProductDetail'
import Cart from './pages/user/Cart'
import Checkout from './pages/user/Checkout'
import Orders from './pages/user/Orders'
import OrderDetail from './pages/user/OrderDetail'
import Profile from './pages/user/Profile'
import Offers from './pages/user/Offers'
import AddressBook from './pages/user/AddressBook'
import PaymentVerify from './pages/user/PaymentVerify'
import { CartProvider } from './Context/CartContext'

// Admin pages
import AdminDashboard from './pages/admin/Dashboard'
import AdminOrders from './pages/admin/AdminOrders'
import AdminProducts from './pages/admin/AdminProducts'
import AdminUsers from './pages/admin/AdminUsers'
import DeliveryPartners from './pages/admin/DeliveryPartners'
import AdminAddresses from './pages/admin/AdminAddresses'
import AdminOffers from './pages/admin/AdminOffers'
import AdminBranding from './pages/admin/AdminBranding'
import AdminCounterBill from './pages/admin/AdminCounterBill'
import AdminPincodes from './pages/admin/AdminPincodes'
import AdminMenu from './pages/admin/AdminMenu'
import AdminReviews from './pages/admin/AdminReviews'
import AdminCoupons from './pages/admin/AdminCoupons'
import AdminSales from './pages/admin/AdminSales'

// Delivery pages
import DeliveryDashboard from './pages/delivery/DeliveryDashboard'
import DeliveryOrders from './pages/delivery/DeliveryOrders'
import DeliveryProfile from './pages/delivery/DeliveryProfile'

const App = () => (
  <BrowserRouter>
    <CartProvider>
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/addresses" element={<AddressBook />} />
        <Route path="/offers" element={<Offers />} />
        <Route path="/checkout/verify" element={<PaymentVerify />} />
      </Route>

      <Route path="/admin" element={<AdminLayout />}>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="delivery-partners" element={<DeliveryPartners />} />
        <Route path="addresses" element={<AdminAddresses />} />
        <Route path="offers" element={<AdminOffers />} />
        <Route path="branding" element={<AdminBranding />} />
        <Route path="counter-bill" element={<AdminCounterBill />} />
        <Route path="pincodes" element={<AdminPincodes />} />
        <Route path="menu" element={<AdminMenu />} />
        <Route path="reviews" element={<AdminReviews />} />
        <Route path="coupons" element={<AdminCoupons />} />
        <Route path="sales" element={<AdminSales />} />
      </Route>

      <Route path="/delivery" element={<DeliveryLayout />}>
        <Route path="dashboard" element={<DeliveryDashboard />} />
        <Route path="orders" element={<DeliveryOrders />} />
        <Route path="profile" element={<DeliveryProfile />} />
      </Route>
    </Routes>
    </CartProvider>
  </BrowserRouter>
)

export default App

import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import { Toaster } from 'react-hot-toast'

const Layout = () => (
  <div className="flex flex-col min-h-screen">
    <Navbar />
    <main className="flex-1">
      <Outlet />
    </main>
    <Footer />
    <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
  </div>
)

export default Layout

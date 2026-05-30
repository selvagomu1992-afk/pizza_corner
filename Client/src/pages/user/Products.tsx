import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../../api/client'
import { useCartStore } from '../../store/cartStore'
import type { Product, Pagination } from '../../types'
import Spinner from '../../components/ui/Spinner'
import toast from 'react-hot-toast'
import { HiOutlineFilter, HiOutlineX } from 'react-icons/hi'

const sorts = [
  { value: '', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
]

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<string[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const addItem = useCartStore((s) => s.addItem)

  const category = searchParams.get('category') || 'All'
  const sort = searchParams.get('sort') || ''
  const search = searchParams.get('search') || ''
  const page = parseInt(searchParams.get('page') || '1')

  useEffect(() => {
    api.get('/categories').then(({ data }) => {
      if (data.success) setCategories(data.categories.map((c: { name: string }) => c.name))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params: Record<string, string> = { page: String(page), limit: '12' }
    if (category !== 'All') params.category = category
    if (sort) params.sort = sort
    if (search) params.search = search

    api.get('/products', { params }).then(({ data }) => {
      if (data.success) {
        setProducts(data.products)
        setPagination(data.pagination)
      }
    }).finally(() => setLoading(false))
  }, [category, sort, search, page])

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value && value !== 'All') params.set(key, value)
    else params.delete(key)
    if (key !== 'page') params.delete('page')
    setSearchParams(params)
  }

  const handleAddToCart = (product: Product) => {
    addItem({
      productId: product.id,
      name: product.name,
      image: product.image,
      price: product.price,
      quantity: 1,
      unit: product.unit || 'piece',
      stock: product.stock || 0,
    })
    toast.success(`${product.name} added to cart`)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-stone-800">Our Menu</h1>
        <button onClick={() => setSidebarOpen(true)} className="md:hidden flex items-center gap-1 text-stone-600 border border-stone-300 rounded-lg px-3 py-2 text-sm">
          <HiOutlineFilter className="h-5 w-5" /> Filters
        </button>
      </div>

      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden md:block w-52 flex-shrink-0 bg-white border border-stone-200 rounded-xl p-4">
          <h2 className="font-bold text-stone-800 text-lg mb-4">Categories</h2>
          <div className="flex flex-col gap-2">
            <button onClick={() => updateParam('category', 'All')}
              className={`px-4 py-2 rounded-lg text-sm font-medium text-left transition ${
                category === 'All' ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}>All</button>
            {categories.map((cat) => (
              <button key={cat.charAt(0).toUpperCase() + cat.slice(1)} onClick={() => updateParam('category', cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-left transition ${
                  category === cat ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 bg-white border border-stone-200 rounded-xl p-6">
          {/* Overlay */}
          {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSidebarOpen(false)} />}

          {/* Mobile slide sidebar */}
          <div className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-stone-800 text-lg">Categories</h2>
                <button onClick={() => setSidebarOpen(false)}><HiOutlineX className="h-6 w-6 text-stone-600" /></button>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => { updateParam('category', 'All'); setSidebarOpen(false) }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium text-left ${
                    category === 'All' ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}>All</button>
                {categories.map((cat) => (
                  <button key={cat.charAt(0).toUpperCase() + cat.slice(1)} onClick={() => { updateParam('category', cat); setSidebarOpen(false) }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium text-left ${
                      category === cat ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex mb-8 justify-end">
            <select value={sort} onChange={(e) => updateParam('sort', e.target.value)}
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500">
              {sorts.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          ) : products.length === 0 ? (
            <p className="text-center text-stone-500 py-20">No products found</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-6">
                {products.map((product) => (
                  <div key={product.id} className="w-52 bg-white border border-stone-200 rounded-xl shadow-sm hover:shadow-md transition overflow-hidden group flex flex-col">
                    <Link to={`/products/${product.id}`} className="block">
                      <div className="w-full h-36 bg-stone-100 overflow-hidden">
                        <img src={product.image} alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                      </div>
                    </Link>
                    <div className="p-4 flex flex-col flex-1">
                      <span className="text-xs text-amber-600 font-medium uppercase">{product.category}</span>
                      <Link to={`/products/${product.id}`}>
                        <h3 className="font-semibold text-stone-800 mt-1">{product.name}</h3>
                      </Link>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-lg font-bold text-amber-700">₹{product.price}</span>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="text-sm text-stone-400 line-through">₹{product.originalPrice}</span>
                        )}
                      </div>
                      <div className="mt-auto">
                        <button onClick={() => handleAddToCart(product)} disabled={product.stock === 0}
                          className={`mt-3 w-full py-2 rounded-lg text-sm font-medium transition ${product.stock === 0 ? 'bg-stone-200 text-stone-400 cursor-not-allowed' : 'bg-amber-600 text-white hover:bg-amber-700'}`}>
                          {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-10">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                    <button key={p} onClick={() => updateParam('page', String(p))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        page === p ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}>
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Products

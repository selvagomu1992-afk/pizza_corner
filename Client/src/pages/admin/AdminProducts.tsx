import { useEffect, useState } from 'react'
import api from '../../api/client'
import type { Product, Pagination } from '../../types'
import Spinner from '../../components/ui/Spinner'
import toast from 'react-hot-toast'
import { HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi'

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState({
    name: '', description: '', price: '', originalPrice: '', category: 'Pizza',
    unit: 'piece', stock: '0', minQty: '0', isOrganic: false,
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    api.get('/categories').then(({ data }) => {
      if (data.success) setCategories(data.categories.map((c: { name: string }) => c.name))
    }).catch(() => {})
    loadProducts()
  }, [page])

  const loadProducts = () => {
    setLoading(true)
    api.get('/products', { params: { page: String(page), limit: '20' } }).then(({ data }) => {
      if (data.success) { setProducts(data.products); setPagination(data.pagination) }
    }).finally(() => setLoading(false))
  }

  const resetForm = () => {
    setForm({ name: '', description: '', price: '', originalPrice: '', category: 'Pizza', unit: 'piece', stock: '0', minQty: '0', isOrganic: false })
    setImageFile(null)
    setEditing(null)
    setShowForm(false)
  }

  const editProduct = (product: Product) => {
    setForm({
      name: product.name, description: product.description || '',
      price: String(product.price), originalPrice: String(product.originalPrice || ''),
      category: product.category, unit: product.unit || 'piece',
      stock: String(product.stock || '0'), minQty: String(product.minQty || '0'), isOrganic: product.isOrganic || false,
    })
    setEditing(product)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const fd = new FormData()
    fd.append('name', form.name)
    fd.append('description', form.description)
    fd.append('price', form.price)
    fd.append('originalPrice', form.originalPrice || form.price)
    fd.append('category', form.category)
    fd.append('unit', form.unit)
    fd.append('stock', form.stock)
    fd.append('minQty', form.minQty)
    fd.append('isOrganic', String(form.isOrganic))
    if (imageFile) fd.append('image', imageFile)

    try {
      if (editing) {
        const { data } = await api.patch(`/products/${editing.id}`, fd)
        if (data.success) { toast.success('Product updated'); resetForm(); loadProducts() }
      } else {
        const { data } = await api.post('/products', fd)
        if (data.success) { toast.success('Product created'); resetForm(); loadProducts() }
      }
    } catch { toast.error(editing ? 'Failed to update' : 'Failed to create') }
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return
    try {
      const { data } = await api.delete(`/products/${id}`)
      if (data.success) { toast.success('Product deleted'); loadProducts() }
    } catch { toast.error('Failed to delete') }
  }

  const markOutOfStock = async (id: string) => {
    try {
      const { data } = await api.patch(`/products/${id}/out-of-stock`)
      if (data.success) { toast.success('Marked out of stock'); loadProducts() }
    } catch { toast.error('Failed') }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Products</h1>
        <button onClick={() => { resetForm(); setShowForm(true) }}
          className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700">
          + Add Product
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => resetForm()}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-stone-800 mb-4">{editing ? 'Edit Product' : 'New Product'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-stone-700 mb-1">Name</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" rows={3} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Price (₹)</label>
                  <input type="number" step="0.01" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Original Price</label>
                  <input type="number" step="0.01" value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none">
                    {categories.length > 0 ? categories.map((c) => <option key={c}>{c}</option>) : ['Pizza', 'Burger', 'Sandwich', 'Fries', 'Beverages'].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Unit</label>
                  <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Stock</label>
                  <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Min Qty (alert)</label>
                  <input type="number" value={form.minQty} onChange={(e) => setForm({ ...form, minQty: e.target.value })}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input type="checkbox" id="organic" checked={form.isOrganic} onChange={(e) => setForm({ ...form, isOrganic: e.target.checked })}
                    className="rounded border-stone-300" />
                  <label htmlFor="organic" className="text-sm text-stone-700">Organic</label>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-stone-700 mb-1">Image</label>
                  <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="w-full text-sm" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-amber-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-amber-700">
                  {editing ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={resetForm}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-sm text-stone-600 hover:bg-stone-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-600">
              <tr>
                <th className="text-left p-4 font-medium">Product</th>
                <th className="text-left p-4 font-medium">Category</th>
                <th className="text-left p-4 font-medium">Price</th>
                <th className="text-left p-4 font-medium">Stock</th>
                <th className="text-left p-4 font-medium">Min</th>
                <th className="text-left p-4 font-medium">Rating</th>
                <th className="text-left p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t border-stone-100 hover:bg-stone-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img src={product.image} alt={product.name} className="h-10 w-10 rounded-lg object-cover bg-stone-100" />
                      <span className="font-medium">{product.name}</span>
                      {product.stock === 0 && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Out</span>}
                    </div>
                  </td>
                  <td className="p-4 text-xs">{product.category}</td>
                  <td className="p-4 font-medium">₹{product.price}</td>
                  <td className="p-4">
                    <span className={product.stock === 0 ? 'text-red-500 font-medium' : ''}>
                      {product.stock ?? 0}
                    </span>
                    {product.minQty && product.stock !== undefined && product.stock > 0 && product.stock <= product.minQty && (
                      <span className="ml-1.5 inline-block bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0.5 rounded font-medium">Low</span>
                    )}
                  </td>
                  <td className="p-4 text-xs text-stone-500">{product.minQty ?? 0}</td>
                  <td className="p-4 text-xs">{product.rating ? `${product.rating} (${product.reviewCount})` : '-'}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => editProduct(product)} className="text-amber-600 hover:text-amber-700"><HiOutlinePencil className="h-4 w-4" /></button>
                      <button onClick={() => markOutOfStock(product.id)} className="text-orange-500 hover:text-orange-600 text-xs">Out</button>
                      <button onClick={() => deleteProduct(product.id)} className="text-red-500 hover:text-red-600"><HiOutlineTrash className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-stone-400">No products</td></tr>}
            </tbody>
          </table>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 p-4">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-3 py-1 rounded text-sm ${page === p ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600'}`}>{p}</button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AdminProducts

import { useEffect, useState, useRef } from 'react'
import api from '../../api/client'
import Spinner from '../../components/ui/Spinner'
import toast from 'react-hot-toast'
import { HiOutlineTrash, HiOutlinePencil, HiOutlineUpload } from 'react-icons/hi'

interface Category {
  id: string
  name: string
  image: string
}

const AdminMenu = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [image, setImage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set())
  const fileRef = useRef<HTMLInputElement>(null)

  const markBroken = (id: string) => setBrokenImages(prev => new Set(prev).add(id))

  useEffect(() => { loadCategories() }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const { data } = await api.post('/upload/image?folder=pizzacorner/categories', fd)
      if (data.success) {
        setImage(data.url)
        toast.success('Image uploaded')
      } else {
        toast.error(data.message || 'Upload failed')
      }
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message || (err as any)?.message || 'Image upload failed'
      toast.error(msg)
      console.error('Upload error:', err)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const loadCategories = () => {
    setLoading(true)
    api.get('/admin/categories').then(({ data }) => {
      if (data.success) setCategories(data.categories)
    }).finally(() => setLoading(false))
  }

  const resetForm = () => { setName(''); setImage(''); setEditingId(null) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('Enter category name'); return }
    try {
      if (editingId) {
        const { data } = await api.patch(`/admin/categories/${editingId}`, { name: name.trim(), image: image.trim() || '' })
        if (data.success) toast.success('Category updated')
        else toast.error(data.message || 'Failed to update')
      } else {
        const { data } = await api.post('/admin/categories', { name: name.trim(), image: image.trim() || '' })
        if (data.success) toast.success('Category added')
        else toast.error(data.message || 'Failed to add')
      }
      resetForm(); loadCategories()
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message || (editingId ? 'Failed to update' : 'Failed to add')
      toast.error(msg)
    }
  }

  const editCategory = (c: Category) => {
    setName(c.name); setImage(c.image || ''); setEditingId(c.id)
  }

  const deleteCategory = async (id: string, catName: string) => {
    if (!confirm(`Delete "${catName}"? Products using this category won't be affected.`)) return
    try {
      const { data } = await api.delete(`/admin/categories/${id}`)
      if (data.success) { toast.success('Category deleted'); loadCategories() }
    } catch { toast.error('Failed to delete category') }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Menu Categories</h1>

      <div className="bg-white rounded-xl p-5 shadow-sm mb-6">
        <h2 className="font-bold text-stone-700 mb-3">{editingId ? 'Edit Category' : 'Add Category'}</h2>
        <form onSubmit={handleSubmit} className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-40">
            <label className="block text-xs text-stone-500 mb-1">Category Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pasta"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div className="flex-1 min-w-40">
            <label className="block text-xs text-stone-500 mb-1">Image URL / Upload</label>
            <div className="flex gap-2">
              <input type="text" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://…"
                className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" />
              <input type="file" accept="image/*" ref={fileRef} onChange={handleFileUpload} className="hidden" />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex items-center gap-1 px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-50">
                {uploading ? <Spinner size="sm" /> : <HiOutlineUpload className="h-4 w-4" />}
                Upload
              </button>
            </div>
            {image && (
              <div className="mt-2 h-16 w-16 rounded-lg overflow-hidden bg-stone-100 bg-cover bg-center"
                style={{ backgroundImage: `url(${image})` }} />
            )}
          </div>
          <button type="submit" className="bg-amber-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-amber-700">
            {editingId ? 'Update' : 'Add'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm}
              className="px-4 py-2 border border-stone-300 rounded-lg text-sm text-stone-600 hover:bg-stone-50">Cancel</button>
          )}
        </form>
      </div>

      {loading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {categories.map((c) => (
              <div key={c.id} className="flex-shrink-0 w-40 bg-white rounded-xl shadow-sm overflow-hidden group">
              <div className="w-full h-32 bg-stone-100 overflow-hidden relative flex items-center justify-center">
                {c.image && !brokenImages.has(c.id) ? (
                  <img src={c.image} alt={c.name} className="w-full h-full object-cover"
                    onError={() => markBroken(c.id)} />
                ) : (
                  <span className="text-stone-300 text-4xl font-bold">{c.name[0]}</span>
                )}
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="font-semibold text-stone-800 text-sm">{c.name}</span>
                <div className="flex gap-1">
                  <button onClick={() => editCategory(c)} className="text-amber-600 hover:text-amber-700 p-1"><HiOutlinePencil className="h-4 w-4" /></button>
                  <button onClick={() => deleteCategory(c.id, c.name)} className="text-red-500 hover:text-red-600 p-1"><HiOutlineTrash className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
          {categories.length === 0 && <p className="text-center text-stone-400 py-12 w-full">No categories yet</p>}
        </div>
      )}
    </div>
  )
}

export default AdminMenu
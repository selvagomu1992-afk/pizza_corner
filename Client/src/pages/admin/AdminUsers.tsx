import { useEffect, useState } from 'react'
import api from '../../api/client'
import type { User, Pagination } from '../../types'
import Spinner from '../../components/ui/Spinner'
import toast from 'react-hot-toast'
import { HiOutlineTrash, HiOutlineSearch } from 'react-icons/hi'

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    const params: Record<string, string> = { page: String(page), limit: '20' }
    if (search) params.search = search
    api.get('/admin/users', { params }).then(({ data }) => {
      if (data.success) { setUsers(data.users); setPagination(data.pagination) }
    }).finally(() => setLoading(false))
  }, [search, page])

  const deleteUser = async (id: string) => {
    if (!confirm('Delete this user and all their data?')) return
    try {
      const { data } = await api.delete(`/admin/users/${id}`)
      if (data.success) { toast.success('User deleted'); setUsers(users.filter((u) => u.id !== id)) }
    } catch { toast.error('Failed to delete user') }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Users</h1>
        <div className="relative">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input type="text" placeholder="Search users..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9 pr-4 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500 w-60" />
        </div>
      </div>

      {loading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-600">
              <tr>
                <th className="text-left p-4 font-medium">Name</th>
                <th className="text-left p-4 font-medium">Email</th>
                <th className="text-left p-4 font-medium">Phone</th>
                <th className="text-left p-4 font-medium">Joined</th>
                <th className="text-left p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-stone-100 hover:bg-stone-50">
                  <td className="p-4 font-medium">{user.name}</td>
                  <td className="p-4 text-stone-500">{user.email}</td>
                  <td className="p-4 text-stone-500">{user.phone || '-'}</td>
                  <td className="p-4 text-stone-500 text-xs">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : '-'}</td>
                  <td className="p-4">
                    <button onClick={() => deleteUser(user.id)} className="text-red-500 hover:text-red-600"><HiOutlineTrash className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-stone-400">No users</td></tr>}
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

export default AdminUsers

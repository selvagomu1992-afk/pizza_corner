import { useEffect, useMemo, useState } from 'react'
import api from '../../api/client'
import type { Address } from '../../types'
import Spinner from '../../components/ui/Spinner'
import { Search } from 'lucide-react'

interface AddressWithUser extends Address {
  user: { id: string; name: string; email: string; phone?: string }
}

const AdminAddresses = () => {
  const [addresses, setAddresses] = useState<AddressWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [filterLabel, setFilterLabel] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterState, setFilterState] = useState('')
  const [filterPincode, setFilterPincode] = useState('')
  const [filterDefault, setFilterDefault] = useState<'all' | 'yes' | 'no'>('all')

  useEffect(() => {
    api.get('/admin/addresses').then(({ data }) => {
      if (data.success) setAddresses(data.addresses)
    }).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return addresses.filter(a => {
      const s = search.toLowerCase()
      if (s && !a.address.toLowerCase().includes(s) && !a.city.toLowerCase().includes(s) && !a.label.toLowerCase().includes(s) && !a.user?.name.toLowerCase().includes(s)) return false
      if (filterUser && a.user?.name !== filterUser) return false
      if (filterLabel && a.label !== filterLabel) return false
      if (filterCity && a.city !== filterCity) return false
      if (filterState && a.state !== filterState) return false
      if (filterPincode && a.zip !== filterPincode) return false
      if (filterDefault === 'yes' && !a.isDefault) return false
      if (filterDefault === 'no' && a.isDefault) return false
      return true
    })
  }, [addresses, search, filterUser, filterLabel, filterCity, filterState, filterDefault])

  const userOptions = useMemo(() => [...new Set(addresses.map(a => a.user?.name).filter(Boolean))], [addresses])
  const labelOptions = useMemo(() => [...new Set(addresses.map(a => a.label).filter(Boolean))], [addresses])
  const cityOptions = useMemo(() => [...new Set(addresses.map(a => a.city).filter(Boolean))], [addresses])
  const stateOptions = useMemo(() => [...new Set(addresses.map(a => a.state).filter(Boolean))], [addresses])
  const pincodeOptions = useMemo(() => [...new Set(addresses.map(a => a.zip).filter(Boolean))], [addresses])

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">All Addresses</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input type="text" placeholder="Search address, city, label, user…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
        <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-amber-500">
          <option value="">All Users</option>
          {userOptions.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <select value={filterLabel} onChange={e => setFilterLabel(e.target.value)} className="border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-amber-500">
          <option value="">All Labels</option>
          {labelOptions.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className="border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-amber-500">
          <option value="">All Cities</option>
          {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterState} onChange={e => setFilterState(e.target.value)} className="border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-amber-500">
          <option value="">All States</option>
          {stateOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterPincode} onChange={e => setFilterPincode(e.target.value)} className="border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-amber-500">
          <option value="">All Pincodes</option>
          {pincodeOptions.map(z => <option key={z} value={z}>{z}</option>)}
        </select>
        <select value={filterDefault} onChange={e => setFilterDefault(e.target.value as 'all' | 'yes' | 'no')}
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-amber-500">
          <option value="all">All</option>
          <option value="yes">Default Only</option>
          <option value="no">Non-Default</option>
        </select>
        {(search || filterUser || filterLabel || filterCity || filterState || filterPincode || filterDefault !== 'all') && (
          <button onClick={() => { setSearch(''); setFilterUser(''); setFilterLabel(''); setFilterCity(''); setFilterState(''); setFilterPincode(''); setFilterDefault('all') }}
            className="text-xs text-amber-600 hover:text-amber-700 font-medium">Clear</button>
        )}
      </div>

      {loading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-600">
              <tr>
                <th className="text-left p-4 font-medium">User</th>
                <th className="text-left p-4 font-medium">Phone</th>
                <th className="text-left p-4 font-medium">Label</th>
                <th className="text-left p-4 font-medium">Address</th>
                <th className="text-left p-4 font-medium">City</th>
                <th className="text-left p-4 font-medium">State</th>
                <th className="text-left p-4 font-medium">Pincode</th>
                <th className="text-left p-4 font-medium">Default</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((addr) => (
                <tr key={addr.id} className="border-t border-stone-100 hover:bg-stone-50">
                  <td className="p-4">{addr.user?.name || 'N/A'}</td>
                  <td className="p-4 text-stone-500">{addr.phone || addr.user?.phone || '—'}</td>
                  <td className="p-4 font-medium">{addr.label}</td>
                  <td className="p-4 text-stone-500 max-w-[200px] truncate">{addr.address}</td>
                  <td className="p-4">{addr.city}</td>
                  <td className="p-4">{addr.state}</td>
                  <td className="p-4">{addr.zip}</td>
                  <td className="p-4">{addr.isDefault ? <span className="text-green-600 font-medium">Yes</span> : 'No'}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-stone-400">No addresses match filters</td></tr>}
            </tbody>
          </table>
          <div className="p-3 text-xs text-stone-400 border-t border-stone-100">{filtered.length} of {addresses.length} addresses</div>
        </div>
      )}
    </div>
  )
}

export default AdminAddresses

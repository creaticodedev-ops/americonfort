import React, { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import Title from '../../components/owner/Title'
import { StatusBadge } from '../../components/owner/OwnerDirectoryPage'
import { useAppContext } from '../../context/AppContext'
import { getErrorMessage } from '../../utils/apiError'

const SignatureRequests = () => {
  const { axios, hasPermission } = useAppContext()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (status !== 'all') params.set('status', status)
      if (search.trim()) params.set('search', search.trim())
      const { data } = await axios.get(`/api/owner/signature-requests?${params}`)
      if (data.success) setItems(data.items || [])
      else toast.error(data.message || 'Failed to load')
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [axios, status, search])

  useEffect(() => { load() }, [load])

  const copyLink = async (url) => {
    if (!url) return toast.error('No link available')
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied')
    } catch {
      toast.error('Could not copy')
    }
  }

  const act = async (path, bookingId, okMsg) => {
    try {
      const { data } = await axios.post(`/api/owner/signature-requests/${path}`, { bookingId })
      if (!data.success) throw new Error(data.message)
      toast.success(okMsg)
      if (data.completionUrl) await copyLink(data.completionUrl)
      load()
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  if (!hasPermission('signature_requests')) {
    return <div className="p-8 text-sm text-gray-500">No access</div>
  }

  return (
    <div className="px-4 pt-6 md:px-8 lg:px-10 xl:px-12 pb-16 flex-1 min-w-0">
      <Title title="Signature Requests" subTitle="Operational queue for customer contract signature links (reuses the existing completion workflow)." />

      <div className="mt-6 flex flex-col sm:flex-row gap-2 mb-4">
        <input className="h-10 px-3 rounded-lg border border-borderColor text-sm flex-1" placeholder="Search reservation / customer" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="h-10 px-3 rounded-lg border border-borderColor text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="signed">Signed</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="rounded-xl border border-borderColor bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-gray-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">No signature requests yet. Generate a link from a reservation.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Reservation</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Vehicle</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.bookingId} className="border-t border-borderColor">
                    <td className="px-4 py-3 font-medium">{row.reservationId || '—'}</td>
                    <td className="px-4 py-3">{row.customerName || '—'}</td>
                    <td className="px-4 py-3">{row.car ? `${row.car.brand} ${row.car.model}` : '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    <td className="px-4 py-3 space-x-2 whitespace-nowrap">
                      {(row.status === 'none' || row.status === 'expired' || row.status === 'cancelled') && (
                        <button type="button" className="text-primary text-xs" onClick={() => act('generate', row.bookingId, 'Link generated')}>Generate</button>
                      )}
                      {row.status === 'pending' && (
                        <>
                          <button type="button" className="text-primary text-xs" onClick={() => copyLink(row.shareableCompletionUrl)}>Copy</button>
                          <button type="button" className="text-primary text-xs" onClick={() => act('resend', row.bookingId, 'Link resent')}>Resend</button>
                          <button type="button" className="text-red-600 text-xs" onClick={() => {
                            if (window.confirm('Cancel this signature request?')) act('cancel', row.bookingId, 'Cancelled')
                          }}>Cancel</button>
                        </>
                      )}
                      {row.status === 'signed' && row.shareableCompletionUrl && (
                        <span className="text-xs text-emerald-700">Signed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default SignatureRequests

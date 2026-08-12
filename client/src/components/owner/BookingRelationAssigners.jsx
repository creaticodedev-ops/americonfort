import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAppContext } from '../../context/AppContext'
import { getErrorMessage } from '../../utils/apiError'

const selectClass = 'w-full border border-borderColor rounded-lg px-2 py-1.5 text-xs bg-white'

/**
 * Assign Samsar / Chauffeur / Partner Company on a reservation (inline in details).
 */
const BookingRelationAssigners = ({ booking, onUpdated }) => {
  const { axios, hasPermission } = useAppContext()
  const canPartners = hasPermission('partners')
  const canChauffeurs = hasPermission('chauffeurs')
  const canBookings = hasPermission('bookings')

  const [samsars, setSamsars] = useState([])
  const [chauffeurs, setChauffeurs] = useState([])
  const [partners, setPartners] = useState([])
  const [saving, setSaving] = useState('')

  useEffect(() => {
    if (!canBookings) return
    const load = async () => {
      try {
        if (canPartners) {
          const [s, p] = await Promise.all([
            axios.get('/api/owner/samsars?limit=100&status=active'),
            axios.get('/api/owner/partner-companies?limit=100&status=active'),
          ])
          if (s.data.success) setSamsars(s.data.items || [])
          if (p.data.success) setPartners(p.data.items || [])
        }
        if (canChauffeurs) {
          const { data } = await axios.get('/api/owner/chauffeurs?limit=100&status=active')
          if (data.success) setChauffeurs(data.items || [])
        }
      } catch {
        /* list endpoints may 403 if plan/feature missing — UI simply hides */
      }
    }
    load()
  }, [axios, canPartners, canChauffeurs, canBookings])

  const assign = async (payload, key) => {
    setSaving(key)
    try {
      const { data } = await axios.post('/api/bookings/assign-relations', {
        bookingId: booking._id,
        ...payload,
      })
      if (!data.success) throw new Error(data.message)
      toast.success('Assignment updated')
      onUpdated?.(data.booking)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving('')
    }
  }

  if (!canBookings) return null
  if (!canPartners && !canChauffeurs) return null

  const samsarId = booking.samsar?._id || booking.samsar || ''
  const chauffeurId = booking.chauffeur?._id || booking.chauffeur || ''
  const partnerId = booking.partnerCompany?._id || booking.partnerCompany || ''

  return (
    <div className="mt-4 rounded-lg border border-borderColor bg-gray-50 px-3 py-3 space-y-3">
      <p className="font-medium text-gray-800 text-xs">Assignments</p>

      {canPartners && (
        <div>
          <label className="text-[11px] text-gray-500">Assign Samsar</label>
          <div className="flex gap-2 mt-1">
            <select
              className={selectClass}
              disabled={saving === 'samsar'}
              value={samsarId || ''}
              onChange={(e) => assign({ samsarId: e.target.value || null }, 'samsar')}
            >
              <option value="">— Unassigned —</option>
              {samsars.map((s) => (
                <option key={s._id} value={s._id}>{s.fullName}</option>
              ))}
            </select>
          </div>
          {booking.samsar?.fullName && (
            <p className="text-[11px] text-gray-500 mt-1">Current: {booking.samsar.fullName}</p>
          )}
        </div>
      )}

      {canChauffeurs && (
        <div>
          <label className="text-[11px] text-gray-500">Assign Chauffeur</label>
          <div className="flex gap-2 mt-1">
            <select
              className={selectClass}
              disabled={saving === 'chauffeur'}
              value={chauffeurId || ''}
              onChange={(e) => assign({ chauffeurId: e.target.value || null }, 'chauffeur')}
            >
              <option value="">— Unassigned —</option>
              {chauffeurs.map((c) => (
                <option key={c._id} value={c._id}>{c.fullName}</option>
              ))}
            </select>
          </div>
          {booking.chauffeur?.fullName && (
            <p className="text-[11px] text-gray-500 mt-1">Current: {booking.chauffeur.fullName}</p>
          )}
        </div>
      )}

      {canPartners && (
        <div>
          <label className="text-[11px] text-gray-500">Assign Partner Company</label>
          <div className="flex gap-2 mt-1">
            <select
              className={selectClass}
              disabled={saving === 'partner'}
              value={partnerId || ''}
              onChange={(e) => assign({ partnerCompanyId: e.target.value || null }, 'partner')}
            >
              <option value="">— Unassigned —</option>
              {partners.map((p) => (
                <option key={p._id} value={p._id}>{p.companyName}</option>
              ))}
            </select>
          </div>
          {booking.partnerCompany?.companyName && (
            <p className="text-[11px] text-gray-500 mt-1">Current: {booking.partnerCompany.companyName}</p>
          )}
        </div>
      )}
    </div>
  )
}

export default BookingRelationAssigners

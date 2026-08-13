import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import { getErrorMessage } from '../../utils/apiError'

const selectClass =
  'w-full h-9 border border-[var(--admin-border)] rounded-[var(--admin-radius)] px-2 text-xs bg-[var(--admin-surface)] text-[var(--admin-fg)]'

/**
 * Assign Samsar / Chauffeur / Partner Company on a reservation (inline in details).
 */
const BookingRelationAssigners = ({ booking, onUpdated }) => {
  const { axios, hasPermission } = useAppContext()
  const { t } = useI18n()
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
      toast.success(t('admin.leftover.assignmentUpdated'))
      onUpdated?.(data.booking)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving('')
    }
  }

  if (!canBookings) return null
  if (!canPartners && !canChauffeurs) {
    return <p className="text-xs text-[var(--admin-fg-muted)]">{t('admin.leftover.noAssignPerm')}</p>
  }

  const samsarId = booking.samsar?._id || booking.samsar || ''
  const chauffeurId = booking.chauffeur?._id || booking.chauffeur || ''
  const partnerId = booking.partnerCompany?._id || booking.partnerCompany || ''

  return (
    <div className="space-y-3">
      {canPartners && (
        <div>
          <label className="text-[11px] text-[var(--admin-fg-muted)]">{t('admin.leftover.assignSamsar')}</label>
          <div className="mt-1">
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
        </div>
      )}

      {canChauffeurs && (
        <div>
          <label className="text-[11px] text-[var(--admin-fg-muted)]">{t('admin.leftover.assignChauffeur')}</label>
          <div className="mt-1">
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
        </div>
      )}

      {canPartners && (
        <div>
          <label className="text-[11px] text-[var(--admin-fg-muted)]">{t('admin.leftover.assignPartner')}</label>
          <div className="mt-1">
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
        </div>
      )}
    </div>
  )
}

export default BookingRelationAssigners

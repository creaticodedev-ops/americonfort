import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { useAppContext } from '../../../context/AppContext'
import { useI18n } from '../../../i18n/I18nContext'
import { getErrorMessage } from '../../../utils/apiError'
import StatusBadge from '../StatusBadge'
import { buildCustomerSignatureWaUrl } from '../../../utils/whatsapp'
import { getBookingAttention } from './bookingUtils'

/**
 * First-class signature request panel — uses existing /api/owner/signature-requests/* APIs.
 */
const BookingSignaturePanel = ({ booking, completionUrl, onUpdated, onCacheUrl }) => {
  const { axios, hasPermission, currency, user } = useAppContext()
  const { t } = useI18n()
  const [busy, setBusy] = useState('')
  const whatsappSettings = user?.whatsappSettings

  if (!hasPermission('signature_requests')) return null

  const { sigStatus } = getBookingAttention(booking)
  const status = booking?.completion?.signatureRequestStatus || sigStatus
  const url =
    completionUrl ||
    booking?.completion?.shareableCompletionUrl ||
    booking?.completion?.completionUrl ||
    ''

  const copyLink = async (link) => {
    if (!link) return toast.error(t('admin.signatures.noLink'))
    try {
      await navigator.clipboard.writeText(link)
      toast.success(t('admin.signatures.linkCopied'))
    } catch {
      toast.error(t('admin.signatures.copyFailed'))
    }
  }

  const act = async (path, okMsg) => {
    setBusy(path)
    try {
      const { data } = await axios.post(`/api/owner/signature-requests/${path}`, {
        bookingId: booking._id,
      })
      if (!data.success) throw new Error(data.message)
      toast.success(okMsg)
      if (data.completionUrl) {
        onCacheUrl?.(booking._id, data.completionUrl)
        await copyLink(data.completionUrl)
      }
      onUpdated?.()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setBusy('')
    }
  }

  const openWhatsApp = () => {
    if (!url) return toast.error(t('admin.signatures.noLink'))
    const result = buildCustomerSignatureWaUrl(booking, url, { currency })
    if (result.error === 'missing_phone') {
      toast.error(t('admin.bookings.missingCustomerPhone'))
      return
    }
    window.open(result.url, '_blank', 'noopener,noreferrer')
  }

  const canGenerate = ['none', 'expired', 'cancelled'].includes(String(status).toLowerCase())
  const isPending = status === 'pending'
  const isSigned = status === 'signed' || booking?.completion?.signatureComplete

  return (
    <div className="admin-booking-signature-panel">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <StatusBadge status={status} />
        {isSigned && (
          <span className="text-xs text-[var(--admin-success)] font-medium">{t('admin.signatures.signed')}</span>
        )}
      </div>

      <div className="admin-booking-signature-actions">
        {canGenerate && (
          <button
            type="button"
            disabled={Boolean(busy)}
            className="admin-btn admin-btn--primary admin-btn--sm"
            onClick={() => act('generate', t('admin.signatures.generated'))}
          >
            {busy === 'generate' ? '…' : t('admin.leftover.generateSig')}
          </button>
        )}
        {isPending && (
          <>
            <button
              type="button"
              disabled={Boolean(busy)}
              className="admin-btn admin-btn--secondary admin-btn--sm"
              onClick={() => copyLink(url)}
            >
              {t('admin.signatures.copyLink')}
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              className="admin-btn admin-btn--secondary admin-btn--sm"
              onClick={openWhatsApp}
            >
              {t('admin.bookings.whatsapp')}
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              className="admin-btn admin-btn--secondary admin-btn--sm"
              onClick={() => act('resend', t('admin.signatures.resent'))}
            >
              {busy === 'resend' ? '…' : t('admin.signatures.resend')}
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              className="admin-btn admin-btn--ghost admin-btn--sm admin-btn--danger-text"
              onClick={() => {
                if (window.confirm(t('admin.signatures.cancelConfirm'))) {
                  act('cancel', t('admin.signatures.cancelled'))
                }
              }}
            >
              {t('admin.signatures.cancel')}
            </button>
          </>
        )}
        {!canGenerate && !isPending && !isSigned && url && (
          <button type="button" className="admin-btn admin-btn--secondary admin-btn--sm" onClick={() => copyLink(url)}>
            {t('admin.signatures.copyLink')}
          </button>
        )}
      </div>
    </div>
  )
}

export default BookingSignaturePanel

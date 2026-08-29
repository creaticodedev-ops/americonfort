import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import { getErrorMessage } from '../../utils/apiError'
import { buildCustomerSignatureWaUrl } from '../../utils/whatsapp'
import { isSyntheticWalkInEmail } from '../../utils/contractFieldsClient'
import { resolveApiBaseUrl } from '../../utils/apiBase'
import { AdminModal } from './ui/OwnerDialog'

const formatWhen = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Post walk-in create — share the secure contract signature link.
 * Reuses signature-requests + WhatsApp helpers (no duplicate link system).
 */
export default function WalkInShareContract({
  created,
  onCreateAnother,
}) {
  const { axios, currency } = useAppContext()
  const { t } = useI18n()
  const [busy, setBusy] = useState('')
  const [copied, setCopied] = useState(false)
  const [emailState, setEmailState] = useState(
    created?.completion?.emailSent ? 'sent' : 'idle',
  )

  const booking = created?.booking || null
  const reservationId = created?.reservationId || booking?.reservationId || '—'
  const completionUrl =
    created?.completion?.completionUrl
    || booking?.completion?.shareableCompletionUrl
    || ''
  const signatureComplete =
    created?.completion?.signatureComplete === true
    || booking?.completion?.signatureComplete === true
    || booking?.completion?.signatureRequestStatus === 'signed'
  const [contractOpen, setContractOpen] = useState(signatureComplete)
  const completionToken = String(completionUrl).split('/complete-booking/')[1]?.split(/[/?#]/)[0] || ''
  const contractPreviewUrl = completionToken
    ? `${resolveApiBaseUrl()}/api/booking-completion/${completionToken}/contract-preview?format=pdf`
    : ''

  const vehicle = useMemo(() => {
    if (!booking?.car) return '—'
    const plate = booking.car.licensePlate ? ` · ${booking.car.licensePlate}` : ''
    return `${booking.car.brand || ''} ${booking.car.model || ''}`.trim() + plate
  }, [booking])

  const customerEmail = String(booking?.customerEmail || '').trim()
  const canEmail = Boolean(customerEmail) && !isSyntheticWalkInEmail(customerEmail)
  const contractReady = created?.completion?.contractReady !== false

  const copyLink = async () => {
    if (!completionUrl) {
      toast.error(t('admin.walkIn.share.noLink'))
      return
    }
    try {
      await navigator.clipboard.writeText(completionUrl)
      setCopied(true)
      toast.success(t('admin.walkIn.share.linkCopied'))
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error(t('admin.walkIn.share.copyFailed'))
    }
  }

  const shareWhatsApp = () => {
    if (!completionUrl) {
      toast.error(t('admin.walkIn.share.noLink'))
      return
    }
    const result = buildCustomerSignatureWaUrl(booking, completionUrl, { currency })
    if (result.error === 'missing_phone') {
      toast.error(t('admin.walkIn.missingCustomerPhone'))
      return
    }
    window.open(result.url, '_blank', 'noopener,noreferrer')
    toast.success(t('admin.walkIn.share.whatsappOpened'))
  }

  const shareEmail = async () => {
    if (!completionUrl) {
      toast.error(t('admin.walkIn.share.noLink'))
      return
    }
    if (!canEmail) {
      const subject = encodeURIComponent(
        t('admin.walkIn.share.emailSubject', { id: reservationId }),
      )
      const body = encodeURIComponent(
        t('admin.walkIn.share.emailBody', {
          name: booking?.customerName || '',
          id: reservationId,
          vehicle,
          url: completionUrl,
        }),
      )
      window.location.href = `mailto:?subject=${subject}&body=${body}`
      toast.success(t('admin.walkIn.share.mailtoOpened'))
      return
    }

    setBusy('email')
    try {
      const { data } = await axios.post('/api/owner/signature-requests/resend', {
        bookingId: booking._id,
      })
      if (!data.success) throw new Error(data.message)
      setEmailState('sent')
      toast.success(t('admin.walkIn.share.emailSent'))
    } catch (err) {
      toast.error(getErrorMessage(err))
      // Fallback to mail client so the owner can still share
      const subject = encodeURIComponent(
        t('admin.walkIn.share.emailSubject', { id: reservationId }),
      )
      const body = encodeURIComponent(
        t('admin.walkIn.share.emailBody', {
          name: booking?.customerName || '',
          id: reservationId,
          vehicle,
          url: completionUrl,
        }),
      )
      window.location.href = `mailto:${encodeURIComponent(customerEmail)}?subject=${subject}&body=${body}`
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="admin-walkin-share">
      <div className="admin-walkin-share__hero">
        <div className="admin-walkin-share__badge">
          <span className="admin-walkin-share__badge-dot" aria-hidden />
          {t('admin.walkIn.share.statusReady')}
        </div>
        <h2 className="admin-walkin-share__title">
          {signatureComplete ? t('admin.walkIn.share.signedTitle') : t('admin.walkIn.share.title')}
        </h2>
        <p className="admin-walkin-share__subtitle">
          {signatureComplete ? t('admin.walkIn.share.signedSubtitle') : t('admin.walkIn.share.subtitle')}
        </p>
      </div>

      <div className="admin-walkin-share__grid">
        <section className="admin-walkin-share__card admin-walkin-share__card--main">
          <dl className="admin-walkin-share__meta">
            <div>
              <dt>{t('admin.walkIn.share.customer')}</dt>
              <dd>{booking?.customerName || '—'}</dd>
            </div>
            <div>
              <dt>{t('admin.walkIn.share.reference')}</dt>
              <dd className="tabular-nums">{reservationId}</dd>
            </div>
            <div>
              <dt>{t('admin.walkIn.share.vehicle')}</dt>
              <dd>{vehicle}</dd>
            </div>
            <div>
              <dt>{t('admin.walkIn.share.period')}</dt>
              <dd>
                {formatWhen(booking?.pickupDate)}
                <span className="admin-walkin-share__sep">→</span>
                {formatWhen(booking?.returnDate)}
              </dd>
            </div>
          </dl>

          <div className="admin-walkin-share__status-row">
            <div className={`admin-walkin-share__pill ${signatureComplete ? 'admin-walkin-share__pill--ok' : 'admin-walkin-share__pill--pending'}`}>
              {signatureComplete ? t('admin.walkIn.share.signatureSigned') : t('admin.walkIn.share.signatureInProgress')}
            </div>
            <div
              className={`admin-walkin-share__pill ${
                signatureComplete && contractReady
                  ? 'admin-walkin-share__pill--ok'
                  : 'admin-walkin-share__pill--warn'
              }`}
            >
              {signatureComplete
                ? (contractReady
                  ? t('admin.walkIn.share.contractReady')
                  : t('admin.walkIn.share.contractPending'))
                : t('admin.walkIn.share.signatureInProgress')}
            </div>
          </div>

          <div className="admin-walkin-share__link-box">
            <p className="admin-walkin-share__link-label">{t('admin.walkIn.share.secureLink')}</p>
            <p className="admin-walkin-share__link-url">
              {completionUrl || t('admin.walkIn.share.noLink')}
            </p>
          </div>

          <div className="admin-walkin-share__actions">
            {signatureComplete ? (
              <button
                type="button"
                className="admin-btn admin-btn--primary admin-walkin-share__primary"
                onClick={() => setContractOpen(true)}
                disabled={!contractPreviewUrl}
              >
                {t('admin.walkIn.share.openContract')}
              </button>
            ) : (
              <button
                type="button"
                className="admin-btn admin-btn--primary admin-walkin-share__primary"
                onClick={shareWhatsApp}
                disabled={!completionUrl}
              >
                {t('admin.walkIn.share.sendSignatureLink')}
              </button>
            )}
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={shareEmail}
              disabled={!completionUrl || busy === 'email'}
            >
              {busy === 'email'
                ? t('admin.walkIn.share.emailSending')
                : emailState === 'sent'
                  ? t('admin.walkIn.share.emailSentShort')
                  : t('admin.walkIn.share.email')}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={copyLink}
              disabled={!completionUrl}
            >
              {copied ? t('admin.walkIn.share.copied') : t('admin.walkIn.share.copyLink')}
            </button>
          </div>

          <p className="admin-walkin-share__hint">{t('admin.walkIn.share.customerHint')}</p>
        </section>

        <aside className="admin-walkin-share__card admin-walkin-share__card--side">
          <h3 className="admin-walkin-share__side-title">{t('admin.walkIn.share.nextSteps')}</h3>
          <ol className="admin-walkin-share__steps">
            <li>{t('admin.walkIn.share.step1')}</li>
            <li>{t('admin.walkIn.share.step2')}</li>
            <li>{t('admin.walkIn.share.step3')}</li>
          </ol>

          <div className="admin-walkin-share__side-actions">
            <Link
              to={`/owner/manage-bookings?search=${encodeURIComponent(reservationId)}`}
              className="admin-btn admin-btn--secondary admin-btn--sm w-full"
            >
              {t('admin.walkIn.openBookings')}
            </Link>
            <Link
              to="/owner/signature-requests"
              className="admin-btn admin-btn--ghost admin-btn--sm w-full"
            >
              {t('admin.walkIn.share.viewSignatures')}
            </Link>
            <button
              type="button"
              className="admin-btn admin-btn--ghost admin-btn--sm w-full"
              onClick={onCreateAnother}
            >
              {t('admin.walkIn.createAnother')}
            </button>
          </div>
        </aside>
      </div>

      <AdminModal
        open={contractOpen}
        onClose={() => setContractOpen(false)}
        title={t('admin.walkIn.share.contractActions')}
        description={reservationId}
        size="xl"
        variant="center"
        footer={
          <>
            {contractPreviewUrl ? (
              <a
                href={contractPreviewUrl}
                target="_blank"
                rel="noreferrer"
                className="admin-btn admin-btn--secondary admin-modal-action"
              >
                {t('completion.downloadContract')}
              </a>
            ) : null}
            {booking?._id ? (
              <Link
                to={`/owner/contracts?bookingId=${booking._id}`}
                className="admin-btn admin-btn--primary admin-modal-action"
              >
                {t('admin.walkIn.share.modifyContract')}
              </Link>
            ) : null}
          </>
        }
      >
        {contractPreviewUrl ? (
          <iframe
            title={t('completion.contractPreview')}
            src={contractPreviewUrl}
            className="h-[min(70vh,720px)] w-full rounded-xl border border-[var(--admin-border)] bg-white"
          />
        ) : (
          <p className="text-sm text-[var(--admin-fg-muted)]">
            {t('admin.walkIn.share.contractUnavailable')}
          </p>
        )}
      </AdminModal>
    </div>
  )
}

import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ChannelBadge from '../ChannelBadge'
import StatusBadge from '../StatusBadge'
import BookingRelationAssigners from '../BookingRelationAssigners'
import { DetailSection, DetailRow } from '../ui/DetailSection'
import { useI18n } from '../../../i18n/I18nContext'
import { useAppContext } from '../../../context/AppContext'
import BookingSignaturePanel from './BookingSignaturePanel'
import BookingActionsMenu from './BookingActionsMenu'
import { formatDateTime, getBookingAttention, resId } from './bookingUtils'

const inputClass =
  'h-9 w-full min-w-0 rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 text-sm text-[var(--admin-fg)] outline-none focus:shadow-[var(--admin-focus)]'
const labelClass = 'mb-1 block text-[11px] font-medium text-[var(--admin-fg-muted)]'

const formatCompactDate = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/**
 * Reservation detail inspector — compact overview + collapsible secondary sections.
 */
const BookingInspector = ({
  booking,
  currency,
  compatibleVehicles = [],
  assigningVehicle,
  identityType,
  onIdentityTypeChange,
  uploadingDoc,
  openingWhatsApp,
  completionUrl,
  onCacheUrl,
  onRefresh,
  onClose,
  variant = 'desktop',
  onEdit,
  onExtend,
  onChangeStatus,
  onChangePayment,
  onAssignVehicle,
  onDownloadDoc,
  onUploadDoc,
  onResendLink,
  onConfirmWhatsApp,
  onGenerateInvoice,
  onWhatsApp,
  onPrint,
  onCancel,
  onDelete,
  buildMoreItems,
}) => {
  const { t } = useI18n()
  const { hasPermission } = useAppContext()
  const id = resId(booking)
  const moreItems = useMemo(() => buildMoreItems?.(booking) || [], [booking, buildMoreItems])
  const { contractMissing, sigStatus } = getBookingAttention(booking)
  const [sigOpen, setSigOpen] = useState(false)

  useEffect(() => {
    setSigOpen(false)
  }, [booking._id])

  const goToSignature = () => {
    setSigOpen(true)
    requestAnimationFrame(() => {
      document.getElementById(`sig-panel-${booking._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  const primaryMore = (
    <BookingActionsMenu
      t={t}
      showView={false}
      size="sm"
      items={moreItems}
      className="admin-booking-inspector-more"
    />
  )

  const canSign = hasPermission('signature_requests') && booking.status !== 'cancelled'
  const canExtend = hasPermission('contract_extensions') && !['cancelled', 'completed'].includes(booking.status)
  const canContracts = hasPermission('contracts') && booking.status !== 'cancelled'
  const canConfirmLink = booking.status === 'confirmed' || booking.status === 'pending'

  const primaryActions = (
    <div className="admin-booking-primary-actions">
      {canSign && (
        <button type="button" className="admin-btn admin-btn--primary admin-btn--sm" onClick={goToSignature}>
          {t('admin.leftover.generateSig')}
        </button>
      )}
      {canExtend && (
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--sm" onClick={onExtend}>
          {t('admin.extend.title')}
        </button>
      )}
      <button type="button" className="admin-btn admin-btn--secondary admin-btn--sm" onClick={onEdit}>
        {t('admin.bookings.edit')}
      </button>
      {primaryMore}
    </div>
  )

  return (
    <div className={`admin-booking-inspector admin-booking-inspector--${variant}`}>
      {variant === 'mobile' && onClose && (
        <header className="admin-booking-mobile-header">
          <button type="button" className="admin-booking-mobile-back admin-icon-btn" onClick={onClose} aria-label={t('admin.common.back')}>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--admin-fg)]">{t('admin.bookings.details')}</p>
            <p className="truncate text-xs text-[var(--admin-accent)]">{id}</p>
          </div>
          <ChannelBadge channel={booking.channel || 'online'} />
          {primaryMore}
        </header>
      )}

      <div className="admin-booking-overview">
        <div className="admin-booking-header-bar">
          {variant === 'desktop' && (
            <div className="admin-booking-header-bar-main min-w-0">
              <p className="admin-booking-kicker">{t('admin.bookings.reservation')}</p>
              <p className="admin-booking-ref">{id}</p>
            </div>
          )}
          <div className="admin-booking-header-bar-badges">
            <StatusBadge status={booking.status} />
            {variant === 'desktop' && <ChannelBadge channel={booking.channel || 'online'} />}
          </div>
        </div>

        <dl className="admin-booking-summary">
          <div className="admin-booking-summary-item">
            <dt>{t('admin.bookings.customer')}</dt>
            <dd>{booking.customerName || t('admin.common.guest')}</dd>
            {booking.customerPhone ? <dd className="admin-booking-summary-meta">{booking.customerPhone}</dd> : null}
            {booking.customerEmail ? <dd className="admin-booking-summary-meta">{booking.customerEmail}</dd> : null}
          </div>
          <div className="admin-booking-summary-item">
            <dt>{t('admin.bookings.vehicle')}</dt>
            <dd>
              {booking.car?.brand} {booking.car?.model}
            </dd>
            {booking.car?.licensePlate ? (
              <dd className="admin-booking-summary-meta">{booking.car.licensePlate}</dd>
            ) : null}
          </div>
          <div className="admin-booking-summary-item">
            <dt>{t('admin.bookings.dates')}</dt>
            <dd>{formatCompactDate(booking.pickupDate)}</dd>
            <dd className="admin-booking-summary-meta">→ {formatCompactDate(booking.returnDate)}</dd>
          </div>
          <div className="admin-booking-summary-item admin-booking-summary-item--total">
            <dt>{t('admin.bookings.total')}</dt>
            <dd className="admin-booking-summary-total">{currency}{booking.price}</dd>
          </div>
        </dl>

        <dl className="admin-booking-status-strip">
          <div className="admin-booking-status-cell">
            <dt>{t('admin.details.payment')}</dt>
            <dd>
              <select
                className={inputClass}
                value={booking.paymentStatus || 'pending'}
                aria-label={t('admin.bookings.paymentStatus')}
                onChange={(e) => onChangePayment(e.target.value)}
              >
                <option value="pending">{t('admin.status.pending')}</option>
                <option value="paid">{t('admin.status.paid')}</option>
                <option value="failed">{t('admin.status.failed')}</option>
                <option value="refunded">{t('admin.status.refunded')}</option>
              </select>
            </dd>
          </div>
          <div className="admin-booking-status-cell">
            <dt>{t('admin.details.contract')}</dt>
            <dd>
              <StatusBadge status={booking.completion?.documentsComplete ? 'completed' : 'pending'} />
              {contractMissing ? <span className="admin-booking-status-hint">!</span> : null}
            </dd>
          </div>
          <div className="admin-booking-status-cell">
            <dt>{t('admin.bookings.sign')}</dt>
            <dd><StatusBadge status={sigStatus} /></dd>
          </div>
        </dl>

        {variant === 'desktop' && primaryActions}
      </div>

      <div className="admin-booking-inspector-body">
        <DetailSection title={t('admin.details.period')} collapsible defaultOpen>
          <DetailRow label={t('admin.details.pickup')}>{formatDateTime(booking.pickupDate)}</DetailRow>
          <DetailRow label={t('admin.details.return')}>{formatDateTime(booking.returnDate)}</DetailRow>
          <DetailRow label={t('admin.bookings.pickupLocation')}>{booking.pickupLocation || '—'}</DetailRow>
          <DetailRow label={t('admin.details.dropoff')}>{booking.returnLocation || '—'}</DetailRow>
        </DetailSection>

        <DetailSection title={t('admin.details.vehicle')} collapsible defaultOpen={false}>
          <DetailRow label={t('admin.bookings.vehicle')}>
            {booking.car?.brand} {booking.car?.model}
          </DetailRow>
          {booking.car?.licensePlate && (
            <DetailRow label={t('admin.bookings.licensePlate')}>{booking.car.licensePlate}</DetailRow>
          )}
          {compatibleVehicles.length > 0 && (
            <div className="pt-1">
              <label className={labelClass}>{t('admin.bookings.assignVehicle')}</label>
              <select
                className={inputClass}
                disabled={assigningVehicle}
                value={booking.car?._id || ''}
                onChange={(e) => onAssignVehicle(e.target.value)}
              >
                {compatibleVehicles.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.licensePlate || c.fleetId || c._id.slice(-6)} — {c.brand} {c.model}
                  </option>
                ))}
              </select>
            </div>
          )}
        </DetailSection>

        <DetailSection title={t('admin.details.pricing')} collapsible defaultOpen={false}>
          {booking.priceBreakdown ? (
            <>
              <DetailRow label={t('admin.bookings.rentalPrice')}>{currency}{booking.priceBreakdown.rentalPrice ?? 0}</DetailRow>
              <DetailRow label={t('admin.bookings.pickupFee')}>
                {(booking.priceBreakdown.pickupDeliveryFee || 0) <= 0
                  ? t('admin.bookings.free')
                  : `${currency}${booking.priceBreakdown.pickupDeliveryFee}`}
              </DetailRow>
              <DetailRow label={t('admin.bookings.dropoffFee')}>
                {(booking.priceBreakdown.dropoffDeliveryFee || 0) <= 0
                  ? t('admin.bookings.free')
                  : `${currency}${booking.priceBreakdown.dropoffDeliveryFee}`}
              </DetailRow>
              {(booking.priceBreakdown.discounts || []).length > 0
                ? (booking.priceBreakdown.discounts || []).map((d, idx) => (
                    <DetailRow
                      key={`disc-${idx}`}
                      label={d.code === 'partner_discount' ? d.label || t('admin.bookings.partnerDiscount') : d.label || t('admin.bookings.discounts')}
                    >
                      −{currency}{d.amount}
                    </DetailRow>
                  ))
                : (booking.priceBreakdown.discountTotal || 0) > 0 && (
                    <DetailRow label={t('admin.bookings.discounts')}>−{currency}{booking.priceBreakdown.discountTotal}</DetailRow>
                  )}
              <DetailRow label={t('admin.bookings.total')}>
                <strong>{currency}{booking.price}</strong>
              </DetailRow>
            </>
          ) : (
            <DetailRow label={t('admin.bookings.total')}>
              <strong>{currency}{booking.price}</strong>
            </DetailRow>
          )}
        </DetailSection>

        <DetailSection title={t('admin.details.relations')} collapsible defaultOpen={false}>
          <BookingRelationAssigners
            booking={booking}
            onUpdated={(b) => {
              onRefresh?.(b)
            }}
          />
        </DetailSection>

        <DetailSection title={t('admin.details.documents')} collapsible defaultOpen={false}>
          <div className="admin-booking-signature-actions mb-1">
            <button type="button" className="admin-btn admin-btn--ghost admin-btn--sm" onClick={() => onDownloadDoc('driving_license')}>
              ↓ {t('admin.bookings.downloadLicense')}
            </button>
            <button type="button" className="admin-btn admin-btn--ghost admin-btn--sm" onClick={() => onDownloadDoc('identity')}>
              ↓ {t('admin.bookings.downloadId')}
            </button>
            <button type="button" className="admin-btn admin-btn--ghost admin-btn--sm" onClick={() => onDownloadDoc('passport')}>
              ↓ {t('admin.bookings.downloadPassport')}
            </button>
          </div>
          <label className={labelClass}>{t('admin.bookings.uploadLicense')}</label>
          <input
            type="file"
            accept="image/*"
            disabled={uploadingDoc === 'driving_license'}
            onChange={(e) => {
              onUploadDoc(e.target.files?.[0], 'driving_license')
              e.target.value = ''
            }}
            className="admin-booking-file-input"
          />
          <div className="mt-2">
            <select className={inputClass} value={identityType} onChange={(e) => onIdentityTypeChange(e.target.value)}>
              <option value="national_id">{t('admin.bookings.nationalId')}</option>
              <option value="passport">{t('admin.bookings.passport')}</option>
            </select>
          </div>
          <label className={`${labelClass} mt-2`}>{t('admin.bookings.uploadIdentity')}</label>
          <input
            type="file"
            accept="image/*"
            disabled={uploadingDoc === 'identity'}
            onChange={(e) => {
              onUploadDoc(e.target.files?.[0], 'identity')
              e.target.value = ''
            }}
            className="admin-booking-file-input"
          />
        </DetailSection>

        <DetailSection title={t('admin.details.notes')} collapsible defaultOpen={false}>
          <p className="admin-booking-notes">{booking.notes || '—'}</p>
        </DetailSection>

        <DetailSection
          title={t('admin.details.contract')}
          collapsible
          open={sigOpen}
          onOpenChange={setSigOpen}
        >
          <div id={`sig-panel-${booking._id}`}>
            {booking.completion && (
              <div className="admin-booking-completion-pills">
                <span>{t('admin.bookings.docs')}: {booking.completion.documentsComplete ? '✓' : '—'}</span>
                <span>{t('admin.bookings.pay')}: {booking.completion.paymentComplete ? '✓' : '—'}</span>
                <span>{t('admin.bookings.sign')}: {booking.completion.signatureComplete ? '✓' : '—'}</span>
              </div>
            )}
            <BookingSignaturePanel
              booking={booking}
              completionUrl={completionUrl}
              onCacheUrl={onCacheUrl}
              onUpdated={onRefresh}
            />
            <div className="admin-booking-signature-actions mt-2">
              {canContracts && (
                <>
                  <button type="button" className="admin-btn admin-btn--secondary admin-btn--sm" onClick={onGenerateInvoice}>
                    {t('admin.bookings.generateInvoice')}
                  </button>
                  <Link to={`/owner/contracts?bookingId=${booking._id}`} className="admin-btn admin-btn--secondary admin-btn--sm">
                    {t('admin.bookings.generateContract')}
                  </Link>
                </>
              )}
              {canConfirmLink && (
                <>
                  <button type="button" className="admin-btn admin-btn--secondary admin-btn--sm" onClick={onResendLink}>
                    {t('admin.bookings.resendLink')}
                  </button>
                  <button
                    type="button"
                    disabled={openingWhatsApp}
                    className="admin-btn admin-btn--secondary admin-btn--sm"
                    onClick={onConfirmWhatsApp}
                  >
                    {openingWhatsApp ? '…' : t('admin.bookings.confirmViaWhatsApp')}
                  </button>
                </>
              )}
            </div>
          </div>
        </DetailSection>

        <DetailSection title={t('admin.details.activity')} collapsible defaultOpen={false}>
          <DetailRow label={t('admin.details.created')}>{formatDateTime(booking.createdAt)}</DetailRow>
          <DetailRow label={t('admin.details.updated')}>{formatDateTime(booking.updatedAt)}</DetailRow>
          <DetailRow label={t('admin.leftover.printChannel')}>{booking.channel || 'online'}</DetailRow>
          <div className="pt-1">
            <label className={labelClass}>{t('admin.bookings.status')}</label>
            <select
              className={inputClass}
              value={booking.status}
              onChange={(e) => onChangeStatus(e.target.value)}
            >
              <option value="pending">{t('admin.status.pending')}</option>
              <option value="confirmed">{t('admin.status.confirmed')}</option>
              <option value="ready_for_pickup">{t('admin.status.ready_for_pickup')}</option>
              <option value="active">{t('admin.status.active')}</option>
              <option value="completed">{t('admin.status.completed')}</option>
              <option value="cancelled">{t('admin.status.cancelled')}</option>
            </select>
          </div>
        </DetailSection>

        <div className="admin-danger-zone admin-booking-signature-actions">
          <button type="button" className="admin-btn admin-btn--danger admin-btn--sm" onClick={onCancel}>
            {t('admin.bookings.cancel')}
          </button>
          <button type="button" className="admin-btn admin-btn--danger admin-btn--sm" onClick={onDelete}>
            {t('admin.bookings.delete')}
          </button>
        </div>
      </div>

      {variant === 'mobile' && (
        <footer className="admin-booking-mobile-footer">
          {canSign && (
            <button type="button" className="admin-btn admin-btn--primary" onClick={goToSignature}>
              {t('admin.leftover.generateSig')}
            </button>
          )}
          <button type="button" className="admin-btn admin-btn--secondary" onClick={onEdit}>
            {t('admin.bookings.edit')}
          </button>
          {canExtend && (
            <button type="button" className="admin-btn admin-btn--secondary" onClick={onExtend}>
              {t('admin.extend.title')}
            </button>
          )}
        </footer>
      )}
    </div>
  )
}

export default BookingInspector

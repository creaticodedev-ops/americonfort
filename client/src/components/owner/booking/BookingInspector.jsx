import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import ChannelBadge from '../ChannelBadge'
import StatusBadge from '../StatusBadge'
import BookingRelationAssigners from '../BookingRelationAssigners'
import { DetailSection, DetailRow } from '../ui/DetailSection'
import { useI18n } from '../../../i18n/I18nContext'
import { useAppContext } from '../../../context/AppContext'
import BookingSignaturePanel from './BookingSignaturePanel'
import BookingActionsMenu from './BookingActionsMenu'
import BookingAttentionIndicators from './BookingAttentionIndicators'
import { formatDateTime, resId } from './bookingUtils'

const inputClass =
  'h-9 w-full rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 text-sm text-[var(--admin-fg)] outline-none focus:shadow-[var(--admin-focus)]'
const labelClass = 'mb-1 block text-[11px] font-medium text-[var(--admin-fg-muted)]'

/**
 * Reservation detail inspector — hero summary + grouped sections + primary actions.
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
  // actions
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

  const primaryMore = (
    <BookingActionsMenu
      t={t}
      showView={false}
      size="sm"
      items={moreItems}
      className="admin-booking-inspector-more"
    />
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
        </header>
      )}

      {/* Hero — first viewport priority */}
      <div className="admin-booking-hero">
        {variant === 'desktop' && (
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-fg-muted)]">
                {t('admin.bookings.reservation')}
              </p>
              <p className="break-all text-lg font-semibold text-[var(--admin-accent)]">{id}</p>
              <ChannelBadge channel={booking.channel || 'online'} className="mt-1.5" />
            </div>
            <StatusBadge status={booking.status} />
          </div>
        )}

        {variant === 'mobile' && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <StatusBadge status={booking.status} />
            <StatusBadge status={booking.paymentStatus} />
            <BookingAttentionIndicators booking={booking} compact />
          </div>
        )}

        <dl className="admin-booking-hero-grid">
          <div className="admin-booking-hero-item">
            <dt>{t('admin.bookings.customer')}</dt>
            <dd>{booking.customerName || t('admin.common.guest')}</dd>
            {booking.customerPhone && <dd className="text-xs text-[var(--admin-fg-muted)]">{booking.customerPhone}</dd>}
          </div>
          <div className="admin-booking-hero-item">
            <dt>{t('admin.bookings.vehicle')}</dt>
            <dd>
              {booking.car?.brand} {booking.car?.model}
              {booking.car?.licensePlate ? ` · ${booking.car.licensePlate}` : ''}
            </dd>
          </div>
          <div className="admin-booking-hero-item">
            <dt>{t('admin.bookings.dates')}</dt>
            <dd className="text-sm">{formatDateTime(booking.pickupDate)}</dd>
            <dd className="text-xs text-[var(--admin-fg-muted)]">→ {formatDateTime(booking.returnDate)}</dd>
          </div>
          <div className="admin-booking-hero-item admin-booking-hero-item--total">
            <dt>{t('admin.bookings.total')}</dt>
            <dd className="text-lg font-semibold tabular-nums">{currency}{booking.price}</dd>
          </div>
        </dl>

        {variant === 'desktop' && (
          <div className="mt-2">
            <BookingAttentionIndicators booking={booking} showLabels />
          </div>
        )}
      </div>

      {/* Primary actions — visible without scrolling on desktop */}
      <div className="admin-booking-primary-actions">
        {hasPermission('signature_requests') && booking.status !== 'cancelled' && (
          <button
            type="button"
            className="admin-btn admin-btn--primary admin-btn--sm"
            onClick={() => document.getElementById(`sig-panel-${booking._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })}
          >
            {t('admin.leftover.generateSig')}
          </button>
        )}
        {hasPermission('contract_extensions') && !['cancelled', 'completed'].includes(booking.status) && (
          <button type="button" className="admin-btn admin-btn--secondary admin-btn--sm" onClick={onExtend}>
            {t('admin.extend.title')}
          </button>
        )}
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--sm" onClick={onEdit}>
          {t('admin.bookings.edit')}
        </button>
        {primaryMore}
      </div>

      <div className="admin-booking-inspector-body">
        <DetailSection title={t('admin.details.payment')}>
          <label className={labelClass}>{t('admin.bookings.paymentStatus')}</label>
          <select
            className={inputClass}
            value={booking.paymentStatus || 'pending'}
            onChange={(e) => onChangePayment(e.target.value)}
          >
            <option value="pending">{t('admin.status.pending')}</option>
            <option value="paid">{t('admin.status.paid')}</option>
            <option value="failed">{t('admin.status.failed')}</option>
            <option value="refunded">{t('admin.status.refunded')}</option>
          </select>
        </DetailSection>

        <DetailSection title={t('admin.details.contract')}>
          {booking.completion && (
            <div className="mb-2 flex flex-wrap gap-3 text-xs text-[var(--admin-fg-secondary)]">
              <span>{t('admin.bookings.docs')}: {booking.completion.documentsComplete ? '✓' : '—'}</span>
              <span>{t('admin.bookings.pay')}: {booking.completion.paymentComplete ? '✓' : '—'}</span>
              <span>{t('admin.bookings.sign')}: {booking.completion.signatureComplete ? '✓' : '—'}</span>
            </div>
          )}
          <div className="admin-booking-signature-actions">
            {hasPermission('contracts') && booking.status !== 'cancelled' && (
              <>
                <button type="button" className="admin-btn admin-btn--secondary admin-btn--sm" onClick={onGenerateInvoice}>
                  {t('admin.bookings.generateInvoice')}
                </button>
                <Link to={`/owner/contracts?bookingId=${booking._id}`} className="admin-btn admin-btn--secondary admin-btn--sm">
                  {t('admin.bookings.generateContract')}
                </Link>
              </>
            )}
            {(booking.status === 'confirmed' || booking.status === 'pending') && (
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
        </DetailSection>

        <DetailSection title={t('admin.bookings.sign')}>
          <div id={`sig-panel-${booking._id}`}>
            <BookingSignaturePanel
            booking={booking}
            completionUrl={completionUrl}
            onCacheUrl={onCacheUrl}
            onUpdated={onRefresh}
          />
          </div>
        </DetailSection>

        <DetailSection title={t('admin.details.customer')}>
          <DetailRow label={t('admin.bookings.customer')}>{booking.customerName || '—'}</DetailRow>
          <DetailRow label={t('admin.bookings.email')}>{booking.customerEmail || '—'}</DetailRow>
          <DetailRow label={t('admin.bookings.phone')}>{booking.customerPhone || '—'}</DetailRow>
        </DetailSection>

        <DetailSection title={t('admin.details.vehicle')}>
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

        <DetailSection title={t('admin.details.period')}>
          <DetailRow label={t('admin.details.pickup')}>{formatDateTime(booking.pickupDate)}</DetailRow>
          <DetailRow label={t('admin.details.return')}>{formatDateTime(booking.returnDate)}</DetailRow>
          <DetailRow label={t('admin.bookings.pickupLocation')}>{booking.pickupLocation || '—'}</DetailRow>
          <DetailRow label={t('admin.details.dropoff')}>{booking.returnLocation || '—'}</DetailRow>
        </DetailSection>

        <DetailSection title={t('admin.details.pricing')}>
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
          <DetailRow label={t('admin.details.notes')}>{booking.notes || '—'}</DetailRow>
        </DetailSection>

        <DetailSection title={t('admin.details.relations')}>
          <BookingRelationAssigners
            booking={booking}
            onUpdated={(b) => {
              onRefresh?.(b)
            }}
          />
        </DetailSection>

        <DetailSection title={t('admin.details.documents')}>
          <div className="admin-booking-signature-actions mb-2">
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
            className="text-xs w-full"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
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
            className="text-xs w-full"
          />
        </DetailSection>

        <DetailSection title={t('admin.details.activity')}>
          <DetailRow label={t('admin.details.created')}>{formatDateTime(booking.createdAt)}</DetailRow>
          <DetailRow label={t('admin.details.updated')}>{formatDateTime(booking.updatedAt)}</DetailRow>
          <DetailRow label={t('admin.leftover.printChannel')}>{booking.channel || 'online'}</DetailRow>
          <div className="admin-booking-signature-actions pt-1">
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
          {hasPermission('signature_requests') && booking.status !== 'cancelled' && (
            <button type="button" className="admin-btn admin-btn--primary" onClick={() => document.getElementById(`sig-panel-${booking._id}`)?.scrollIntoView({ behavior: 'smooth' })}>
              {t('admin.leftover.generateSig')}
            </button>
          )}
          <button type="button" className="admin-btn admin-btn--secondary" onClick={onEdit}>
            {t('admin.bookings.edit')}
          </button>
          {hasPermission('contract_extensions') && !['cancelled', 'completed'].includes(booking.status) && (
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

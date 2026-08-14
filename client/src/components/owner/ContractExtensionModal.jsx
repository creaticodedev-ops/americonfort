import React, { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import { getErrorMessage } from '../../utils/apiError'
import { AdminModal, AdminForm, AdminFormField, AdminFormInput, AdminFormTextarea } from './ui'

const fmt = (d) => {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString()
  } catch {
    return '—'
  }
}

const fmtShort = (d) => {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString()
  } catch {
    return '—'
  }
}

/**
 * Stepped Extend Contract wizard — uses booking-extensions preview/confirm APIs only.
 */
const ContractExtensionModal = ({ booking, onClose, onExtended }) => {
  const { axios, currency, hasPermission } = useAppContext()
  const { t } = useI18n()
  const cur = (currency || 'MAD ').trim()

  const [step, setStep] = useState(1)
  const [newReturnDate, setNewReturnDate] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [preview, setPreview] = useState(null)
  const [conflict, setConflict] = useState(null)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const currentDays = useMemo(() => {
    if (!booking?.pickupDate || !booking?.returnDate) return null
    const ms = new Date(booking.returnDate) - new Date(booking.pickupDate)
    return Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)))
  }, [booking])

  const minReturn = booking?.returnDate
    ? new Date(new Date(booking.returnDate).getTime() + 60_000).toISOString().slice(0, 16)
    : ''

  if (!hasPermission('contract_extensions')) {
    return (
      <AdminModal open onClose={onClose} title={t('admin.extend.title')} size="md">
        <p className="text-sm text-[var(--admin-fg-secondary)]">{t('admin.extend.noPermission')}</p>
        <div className="mt-4 flex justify-end">
          <button type="button" className="admin-btn admin-btn--secondary" onClick={onClose}>
            {t('admin.common.close')}
          </button>
        </div>
      </AdminModal>
    )
  }

  const runPreview = async () => {
    if (!newReturnDate) {
      toast.error(t('admin.extend.chooseReturn'))
      return
    }
    setLoading(true)
    setPreview(null)
    setConflict(null)
    try {
      const { data } = await axios.post('/api/owner/booking-extensions/preview', {
        bookingId: booking._id,
        newReturnDate,
      })
      if (!data.success) throw new Error(data.message)
      setPreview(data.preview)
      setStep(4)
    } catch (e) {
      const status = e?.response?.status
      const code = e?.response?.data?.code
      const message = getErrorMessage(e)
      if (status === 409 || code === 'AVAILABILITY_CONFLICT') {
        setConflict(message || t('admin.extend.unavailable'))
        setStep(4)
      } else {
        toast.error(message)
      }
    } finally {
      setLoading(false)
    }
  }

  const confirm = async () => {
    if (!preview) return
    setConfirming(true)
    try {
      const { data } = await axios.post('/api/owner/booking-extensions/confirm', {
        bookingId: booking._id,
        newReturnDate,
        reason,
        notes,
      })
      if (!data.success) throw new Error(data.message)
      toast.success(t('admin.extend.success'))
      onExtended?.(data)
      onClose()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setConfirming(false)
    }
  }

  const steps = [
    t('admin.extend.stepCurrent'),
    t('admin.extend.stepNewReturn'),
    t('admin.extend.stepPricing'),
    t('admin.extend.stepConfirm'),
  ]

  return (
    <AdminModal
      open
      onClose={onClose}
      title={t('admin.extend.title')}
      size="lg"
      variant="drawer"
      footer={
        <>
          <button type="button" className="admin-btn admin-btn--secondary admin-modal-action" onClick={onClose}>
            {t('admin.common.cancel')}
          </button>
          {step > 1 && step < 4 && (
            <button type="button" className="admin-btn admin-btn--secondary admin-modal-action" onClick={() => setStep((s) => s - 1)}>
              {t('admin.common.back')}
            </button>
          )}
          {step === 1 && (
            <button type="button" className="admin-btn admin-btn--primary admin-modal-action" onClick={() => setStep(2)}>
              {t('admin.common.continue')}
            </button>
          )}
          {step === 2 && (
            <button
              type="button"
              className="admin-btn admin-btn--primary admin-modal-action"
              disabled={!newReturnDate}
              onClick={() => setStep(3)}
            >
              {t('admin.common.continue')}
            </button>
          )}
          {step === 3 && (
            <button type="button" className="admin-btn admin-btn--primary admin-modal-action" disabled={loading} onClick={runPreview}>
              {loading ? t('admin.extend.calculating') : t('admin.extend.checkAvailability')}
            </button>
          )}
          {step === 4 && preview && !conflict && (
            <button
              type="button"
              className="admin-btn admin-btn--primary admin-modal-action"
              disabled={confirming}
              onClick={confirm}
            >
              {confirming ? t('admin.extend.confirming') : t('admin.extend.confirmExtension')}
            </button>
          )}
        </>
      }
    >
      <div className="flex flex-wrap gap-2 mb-4">
        {steps.map((label, idx) => {
          const n = idx + 1
          const active = step === n
          const done = step > n
          return (
            <span
              key={label}
              className={`text-[11px] px-2.5 py-1 rounded-md border ${
                active
                  ? 'border-[var(--admin-accent)] text-[var(--admin-accent)] bg-[var(--admin-accent-soft)]'
                  : done
                    ? 'border-[var(--admin-border)] text-[var(--admin-fg-secondary)]'
                    : 'border-transparent text-[var(--admin-fg-muted)]'
              }`}
            >
              {n}. {label}
            </span>
          )
        })}
      </div>

      <p className="text-xs text-[var(--admin-fg-muted)] mb-3">
        {booking.reservationId}
      </p>

      {step === 1 && (
        <div className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4 space-y-2 text-sm">
          <h3 className="font-semibold text-[var(--admin-fg)]">{t('admin.extend.currentRental')}</h3>
          <p>
            <span className="text-[var(--admin-fg-muted)]">{t('admin.extend.currentPickup')}: </span>
            {fmt(booking.pickupDate)}
          </p>
          <p>
            <span className="text-[var(--admin-fg-muted)]">{t('admin.extend.currentReturn')}: </span>
            {fmt(booking.returnDate)}
          </p>
          <p>
            <span className="text-[var(--admin-fg-muted)]">{t('admin.extend.currentDuration')}: </span>
            {currentDays != null ? t('admin.extend.daysCount', { count: currentDays }) : '—'}
          </p>
        </div>
      )}

      {step === 2 && (
        <AdminForm>
          <AdminFormField label={t('admin.extend.newReturn')} required>
            <AdminFormInput
              type="datetime-local"
              min={minReturn}
              value={newReturnDate}
              onChange={(e) => {
                setNewReturnDate(e.target.value)
                setPreview(null)
                setConflict(null)
              }}
            />
          </AdminFormField>
          <AdminFormField label={t('admin.extend.reason')}>
            <AdminFormInput
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </AdminFormField>
          <AdminFormField label={t('admin.extend.notes')}>
            <AdminFormTextarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </AdminFormField>
        </AdminForm>
      )}

      {step === 3 && (
        <div className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4 text-sm space-y-2">
          <p>{t('admin.extend.pricingHint')}</p>
          <p className="text-[var(--admin-fg-muted)]">
            {t('admin.extend.newReturn')}: <strong className="text-[var(--admin-fg)]">{fmt(newReturnDate)}</strong>
          </p>
        </div>
      )}

      {step === 4 && conflict && (
        <div className="rounded-[var(--admin-radius)] border border-[color-mix(in_srgb,var(--admin-danger)_35%,transparent)] bg-[var(--admin-danger-soft)] p-4 text-sm text-[var(--admin-danger)]">
          <p className="font-semibold">{t('admin.extend.unavailableTitle')}</p>
          <p className="mt-1">{conflict}</p>
          <button
            type="button"
            className="mt-3 admin-btn admin-btn--secondary"
            onClick={() => {
              setConflict(null)
              setStep(2)
            }}
          >
            {t('admin.extend.changeReturn')}
          </button>
        </div>
      )}

      {step === 4 && preview && !conflict && (
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] p-3">
              <p className="text-xs font-semibold text-[var(--admin-fg-muted)] mb-1">
                {t('admin.extend.currentContract')}
              </p>
              <p className="font-medium">
                {fmtShort(preview.originalPickupDate)} → {fmtShort(preview.previousReturnDate)}
              </p>
            </div>
            <div className="rounded-[var(--admin-radius)] border border-[var(--admin-accent)] bg-[var(--admin-accent-soft)] p-3">
              <p className="text-xs font-semibold text-[var(--admin-accent)] mb-1">
                {t('admin.extend.newContract')}
              </p>
              <p className="font-medium">
                {fmtShort(preview.originalPickupDate)} → {fmtShort(preview.newReturnDate)}
              </p>
            </div>
          </div>

          <div className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4 space-y-1.5">
            <p className="text-sm text-[var(--admin-success)] font-medium">✓ {t('admin.extend.checkAvailability')}</p>
            <p>
              {t('admin.extend.originalDuration')}:{' '}
              <strong>{t('admin.extend.daysCount', { count: preview.previousDays })}</strong>
            </p>
            <p>
              {t('admin.extend.additionalDuration')}:{' '}
              <strong>{t('admin.extend.daysCount', { count: preview.additionalDays })}</strong>
            </p>
            <p>
              {t('admin.extend.originalPrice')}:{' '}
              <strong>
                {cur}
                {preview.previousTotal}
              </strong>
            </p>
            <p>
              {t('admin.extend.additionalAmount')}:{' '}
              <strong>
                {cur}
                {preview.additionalAmount}
              </strong>
            </p>
            <p className="pt-1 border-t border-[var(--admin-border)]">
              {t('admin.extend.newTotal')}:{' '}
              <strong className="text-base">
                {cur}
                {preview.newTotal}
              </strong>
            </p>
            {(preview.priceBreakdown?.discounts || []).length > 0 && (
              <div className="pt-2 space-y-1 border-t border-[var(--admin-border)]">
                {(preview.priceBreakdown.discounts || []).map((d, idx) => (
                  <p key={idx} className="text-xs text-[var(--admin-fg-secondary)]">
                    {d.label || t('admin.bookings.discounts')}: −{cur}{d.amount}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminModal>
  )
}

export default ContractExtensionModal

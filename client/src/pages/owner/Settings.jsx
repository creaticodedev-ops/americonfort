import React, { useEffect, useState } from 'react'
import Title from '../../components/owner/Title'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import toast from 'react-hot-toast'
import { getErrorMessage } from '../../utils/apiError'

const DEFAULT_BOOKING = {
  minRentalDays: 1,
  maxRentalDays: 0,
  minAdvanceHours: 0,
  maxAdvanceDays: 0,
  allowSameDayBooking: true,
  cancellation: {
    enabled: false,
    freeCancellationHours: 24,
    lateCancellationFeePercent: 0,
    noShowFeePercent: 0,
    policyText: '',
  },
  deposit: {
    defaultSecurityDeposit: 0,
    depositPercent: 0,
    requireDepositBeforePickup: false,
  },
  secondDriver: {
    enabled: true,
    feePerRental: 0,
    feePerDay: 0,
    minAge: 21,
    minLicenseYears: 1,
    maxExtraDrivers: 1,
  },
  mileage: {
    unlimited: true,
    includedKmPerDay: 0,
    extraKmRate: 0,
  },
  pickupReturn: {
    enforceHours: false,
    openingTime: '06:00',
    closingTime: '22:00',
    allowAfterHours: true,
    afterHoursFee: 0,
    lateReturnGraceMinutes: 60,
    lateReturnFeePerHour: 0,
    allowDifferentReturnLocation: true,
    fuelPolicy: 'full_to_full',
  },
  pendingExpiry: {
    enabled: false,
    expiryHours: 24,
    action: 'cancel',
    notifyOwner: true,
  },
}

const mergeBookingSettings = (incoming = {}) => ({
  ...DEFAULT_BOOKING,
  ...incoming,
  cancellation: { ...DEFAULT_BOOKING.cancellation, ...(incoming.cancellation || {}) },
  deposit: { ...DEFAULT_BOOKING.deposit, ...(incoming.deposit || {}) },
  secondDriver: { ...DEFAULT_BOOKING.secondDriver, ...(incoming.secondDriver || {}) },
  mileage: { ...DEFAULT_BOOKING.mileage, ...(incoming.mileage || {}) },
  pickupReturn: { ...DEFAULT_BOOKING.pickupReturn, ...(incoming.pickupReturn || {}) },
  pendingExpiry: { ...DEFAULT_BOOKING.pendingExpiry, ...(incoming.pendingExpiry || {}) },
})

const cloneBooking = (value) => JSON.parse(JSON.stringify(value))

const Field = ({ label, hint, children }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-medium text-gray-600">{label}</label>
    {children}
    {hint ? <p className="text-xs text-muted">{hint}</p> : null}
  </div>
)

const Check = ({ checked, onChange, label }) => (
  <label className="flex items-start gap-2.5 text-sm text-ink cursor-pointer">
    <input
      type="checkbox"
      className="mt-0.5 h-4 w-4 rounded border-borderColor text-primary focus:ring-primary/30"
      checked={Boolean(checked)}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span>{label}</span>
  </label>
)

const Settings = () => {
  const { axios, fetchUser } = useAppContext()
  const { t } = useI18n()
  const label = (key, fallback) => {
    const value = t(key)
    return !value || value === key ? fallback : value
  }

  const [waForm, setWaForm] = useState({
    reservationNumber: '',
    confirmationNumber: '',
  })
  const [resolved, setResolved] = useState({ reservation: '', confirmation: '' })
  const [fallbackDial, setFallbackDial] = useState('')
  const [booking, setBooking] = useState(DEFAULT_BOOKING)
  const [loadingWa, setLoadingWa] = useState(true)
  const [loadingBooking, setLoadingBooking] = useState(true)
  const [savingWa, setSavingWa] = useState(false)
  const [savingBooking, setSavingBooking] = useState(false)

  const inputClass =
    'w-full rounded-xl border border-borderColor bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-primary/40'
  const numClass = `${inputClass} max-w-[12rem]`

  const setBookingPath = (path, value) => {
    setBooking((prev) => {
      const next = cloneBooking(prev)
      const keys = path.split('.')
      let cur = next
      for (let i = 0; i < keys.length - 1; i++) {
        if (!cur[keys[i]] || typeof cur[keys[i]] !== 'object') cur[keys[i]] = {}
        cur = cur[keys[i]]
      }
      cur[keys[keys.length - 1]] = value
      return next
    })
  }

  useEffect(() => {
    let cancelled = false

    const loadWhatsApp = async () => {
      setLoadingWa(true)
      try {
        const { data } = await axios.get('/api/owner/settings/whatsapp')
        if (cancelled) return
        if (data.success) {
          const settings = data.whatsappSettings || {}
          setWaForm({
            reservationNumber: settings.reservationNumber || '',
            confirmationNumber: settings.confirmationNumber || '',
          })
          setResolved(settings.resolved || { reservation: '', confirmation: '' })
          setFallbackDial(settings.fallbackDial || '')
        } else {
          toast.error(data.message || label('admin.settings.loadFailed', 'Could not load WhatsApp settings'))
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(getErrorMessage(error, label('admin.settings.loadFailed', 'Could not load WhatsApp settings')))
        }
      } finally {
        if (!cancelled) setLoadingWa(false)
      }
    }

    const loadBooking = async () => {
      setLoadingBooking(true)
      try {
        const { data } = await axios.get('/api/owner/settings/booking')
        if (cancelled) return
        if (data.success) {
          setBooking(mergeBookingSettings(data.bookingSettings))
        } else {
          toast.error(data.message || label('admin.settings.bookingLoadFailed', 'Could not load booking settings'))
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(getErrorMessage(error, label('admin.settings.bookingLoadFailed', 'Could not load booking settings')))
        }
      } finally {
        if (!cancelled) setLoadingBooking(false)
      }
    }

    loadWhatsApp()
    loadBooking()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [axios])

  const handleSaveWhatsApp = async (e) => {
    e.preventDefault()
    if (savingWa) return
    setSavingWa(true)
    try {
      const { data } = await axios.put('/api/owner/settings/whatsapp', {
        reservationNumber: waForm.reservationNumber,
        confirmationNumber: waForm.confirmationNumber,
      })
      if (!data.success) {
        toast.error(data.message || label('admin.settings.saveFailed', 'Could not save WhatsApp settings'))
        return
      }
      const settings = data.whatsappSettings || {}
      setWaForm({
        reservationNumber: settings.reservationNumber || '',
        confirmationNumber: settings.confirmationNumber || '',
      })
      setResolved(settings.resolved || { reservation: '', confirmation: '' })
      setFallbackDial(settings.fallbackDial || '')
      await fetchUser()
      toast.success(data.message || label('admin.settings.saved', 'WhatsApp settings saved'))
    } catch (error) {
      toast.error(getErrorMessage(error, label('admin.settings.saveFailed', 'Could not save WhatsApp settings')))
    } finally {
      setSavingWa(false)
    }
  }

  const handleSaveBooking = async (e) => {
    e.preventDefault()
    if (savingBooking) return
    setSavingBooking(true)
    try {
      const { data } = await axios.put('/api/owner/settings/booking', booking)
      if (!data.success) {
        toast.error(data.message || label('admin.settings.bookingSaveFailed', 'Could not save booking settings'))
        return
      }
      setBooking(mergeBookingSettings(data.bookingSettings))
      toast.success(data.message || label('admin.settings.bookingSaved', 'Booking settings saved'))
    } catch (error) {
      toast.error(getErrorMessage(error, label('admin.settings.bookingSaveFailed', 'Could not save booking settings')))
    } finally {
      setSavingBooking(false)
    }
  }

  const SectionTitle = ({ title, hint }) => (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  )

  return (
    <div className="px-4 pt-8 md:px-8 lg:px-10 xl:px-12 md:pt-10 flex-1 pb-12 min-w-0 space-y-6">
      <Title
        title={label('admin.settings.title', 'Settings')}
        subTitle={label('admin.settings.subtitle', 'Manage agency preferences used across reservations and confirmations.')}
      />

      {/* Booking Settings first — primary owner configuration surface */}
      <section
        id="booking-settings"
        className="max-w-3xl rounded-2xl border border-borderColor bg-white p-5 sm:p-6 space-y-6"
      >
        <div>
          <h2 className="text-base font-semibold text-ink">
            {label('admin.settings.bookingTitle', 'Booking Settings')}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {label(
              'admin.settings.bookingHint',
              'These rules are stored per agency and applied live to new reservations — no redeploy required. Defaults keep current behaviour until you tighten them.',
            )}
          </p>
        </div>

        {loadingBooking ? (
          <p className="text-sm text-muted">{label('admin.common.loading', 'Loading...')}</p>
        ) : (
          <form onSubmit={handleSaveBooking} className="space-y-8">
            <div>
              <SectionTitle
                title={label('admin.settings.durationTitle', 'Rental duration & advance booking')}
                hint={label('admin.settings.durationHint', 'Use 0 for maximum fields to mean no limit.')}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={label('admin.settings.minRentalDays', 'Minimum rental days')}>
                  <input type="number" min={0} className={numClass} value={booking.minRentalDays}
                    onChange={(e) => setBookingPath('minRentalDays', Number(e.target.value))} />
                </Field>
                <Field
                  label={label('admin.settings.maxRentalDays', 'Maximum rental days')}
                  hint={label('admin.settings.zeroUnlimited', '0 = no limit')}
                >
                  <input type="number" min={0} className={numClass} value={booking.maxRentalDays}
                    onChange={(e) => setBookingPath('maxRentalDays', Number(e.target.value))} />
                </Field>
                <Field label={label('admin.settings.minAdvanceHours', 'Minimum advance notice (hours)')}>
                  <input type="number" min={0} className={numClass} value={booking.minAdvanceHours}
                    onChange={(e) => setBookingPath('minAdvanceHours', Number(e.target.value))} />
                </Field>
                <Field
                  label={label('admin.settings.maxAdvanceDays', 'Advance booking limit (days)')}
                  hint={label('admin.settings.zeroUnlimited', '0 = no limit')}
                >
                  <input type="number" min={0} className={numClass} value={booking.maxAdvanceDays}
                    onChange={(e) => setBookingPath('maxAdvanceDays', Number(e.target.value))} />
                </Field>
              </div>
              <div className="mt-3">
                <Check
                  checked={booking.allowSameDayBooking}
                  onChange={(v) => setBookingPath('allowSameDayBooking', v)}
                  label={label('admin.settings.allowSameDay', 'Allow same-day bookings')}
                />
              </div>
            </div>

            <div>
              <SectionTitle title={label('admin.settings.cancellationTitle', 'Cancellation policy')} />
              <div className="space-y-3">
                <Check
                  checked={booking.cancellation.enabled}
                  onChange={(v) => setBookingPath('cancellation.enabled', v)}
                  label={label('admin.settings.cancellationEnabled', 'Enforce cancellation fees')}
                />
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label={label('admin.settings.freeCancelHours', 'Free cancellation window (hours before pickup)')}>
                    <input type="number" min={0} className={numClass} value={booking.cancellation.freeCancellationHours}
                      onChange={(e) => setBookingPath('cancellation.freeCancellationHours', Number(e.target.value))}
                      disabled={!booking.cancellation.enabled} />
                  </Field>
                  <Field label={label('admin.settings.lateCancelFee', 'Late cancellation fee (%)')}>
                    <input type="number" min={0} max={100} className={numClass} value={booking.cancellation.lateCancellationFeePercent}
                      onChange={(e) => setBookingPath('cancellation.lateCancellationFeePercent', Number(e.target.value))}
                      disabled={!booking.cancellation.enabled} />
                  </Field>
                  <Field label={label('admin.settings.noShowFee', 'No-show fee (%)')}>
                    <input type="number" min={0} max={100} className={numClass} value={booking.cancellation.noShowFeePercent}
                      onChange={(e) => setBookingPath('cancellation.noShowFeePercent', Number(e.target.value))}
                      disabled={!booking.cancellation.enabled} />
                  </Field>
                </div>
                <Field label={label('admin.settings.policyText', 'Policy text (shown to staff / guests)')}>
                  <textarea
                    rows={3}
                    className={inputClass}
                    value={booking.cancellation.policyText}
                    onChange={(e) => setBookingPath('cancellation.policyText', e.target.value)}
                    placeholder={label('admin.settings.policyTextPlaceholder', 'Describe your cancellation terms…')}
                  />
                </Field>
              </div>
            </div>

            <div>
              <SectionTitle
                title={label('admin.settings.depositTitle', 'Security deposit')}
                hint={label('admin.settings.depositHint', 'Car-level deposit still wins when set. Deposit % of 0 keeps the environment default.')}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={label('admin.settings.defaultSecurityDeposit', 'Default security deposit amount')}>
                  <input type="number" min={0} className={numClass} value={booking.deposit.defaultSecurityDeposit}
                    onChange={(e) => setBookingPath('deposit.defaultSecurityDeposit', Number(e.target.value))} />
                </Field>
                <Field
                  label={label('admin.settings.depositPercent', 'Online deposit percent')}
                  hint={label('admin.settings.depositPercentHint', '0 = use server env default (usually 30%)')}
                >
                  <input type="number" min={0} max={100} className={numClass} value={booking.deposit.depositPercent}
                    onChange={(e) => setBookingPath('deposit.depositPercent', Number(e.target.value))} />
                </Field>
              </div>
              <div className="mt-3">
                <Check
                  checked={booking.deposit.requireDepositBeforePickup}
                  onChange={(v) => setBookingPath('deposit.requireDepositBeforePickup', v)}
                  label={label('admin.settings.requireDepositBeforePickup', 'Require deposit before pickup')}
                />
              </div>
            </div>

            <div>
              <SectionTitle title={label('admin.settings.extraDriverTitle', 'Extra driver')} />
              <div className="space-y-3">
                <Check
                  checked={booking.secondDriver.enabled}
                  onChange={(v) => setBookingPath('secondDriver.enabled', v)}
                  label={label('admin.settings.extraDriverEnabled', 'Allow extra / second drivers')}
                />
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label={label('admin.settings.feePerRental', 'Fee per rental')}>
                    <input type="number" min={0} className={numClass} value={booking.secondDriver.feePerRental}
                      onChange={(e) => setBookingPath('secondDriver.feePerRental', Number(e.target.value))}
                      disabled={!booking.secondDriver.enabled} />
                  </Field>
                  <Field label={label('admin.settings.feePerDay', 'Fee per day')}>
                    <input type="number" min={0} className={numClass} value={booking.secondDriver.feePerDay}
                      onChange={(e) => setBookingPath('secondDriver.feePerDay', Number(e.target.value))}
                      disabled={!booking.secondDriver.enabled} />
                  </Field>
                  <Field label={label('admin.settings.maxExtraDrivers', 'Max extra drivers')}>
                    <input type="number" min={0} max={5} className={numClass} value={booking.secondDriver.maxExtraDrivers}
                      onChange={(e) => setBookingPath('secondDriver.maxExtraDrivers', Number(e.target.value))}
                      disabled={!booking.secondDriver.enabled} />
                  </Field>
                  <Field label={label('admin.settings.minAge', 'Minimum age')}>
                    <input type="number" min={16} max={99} className={numClass} value={booking.secondDriver.minAge}
                      onChange={(e) => setBookingPath('secondDriver.minAge', Number(e.target.value))}
                      disabled={!booking.secondDriver.enabled} />
                  </Field>
                  <Field label={label('admin.settings.minLicenseYears', 'Minimum license years')}>
                    <input type="number" min={0} max={50} className={numClass} value={booking.secondDriver.minLicenseYears}
                      onChange={(e) => setBookingPath('secondDriver.minLicenseYears', Number(e.target.value))}
                      disabled={!booking.secondDriver.enabled} />
                  </Field>
                </div>
              </div>
            </div>

            <div>
              <SectionTitle title={label('admin.settings.mileageTitle', 'Mileage policy')} />
              <div className="space-y-3">
                <Check
                  checked={booking.mileage.unlimited}
                  onChange={(v) => setBookingPath('mileage.unlimited', v)}
                  label={label('admin.settings.mileageUnlimited', 'Unlimited mileage')}
                />
                {!booking.mileage.unlimited && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={label('admin.settings.includedKmPerDay', 'Included km per day')}>
                      <input type="number" min={1} className={numClass} value={booking.mileage.includedKmPerDay}
                        onChange={(e) => setBookingPath('mileage.includedKmPerDay', Number(e.target.value))} />
                    </Field>
                    <Field label={label('admin.settings.extraKmRate', 'Extra km rate')}>
                      <input type="number" min={0} step="0.01" className={numClass} value={booking.mileage.extraKmRate}
                        onChange={(e) => setBookingPath('mileage.extraKmRate', Number(e.target.value))} />
                    </Field>
                  </div>
                )}
              </div>
            </div>

            <div>
              <SectionTitle title={label('admin.settings.pickupReturnTitle', 'Pickup & return rules')} />
              <div className="space-y-3">
                <Check
                  checked={booking.pickupReturn.enforceHours}
                  onChange={(v) => setBookingPath('pickupReturn.enforceHours', v)}
                  label={label('admin.settings.enforceHours', 'Enforce opening hours on online bookings')}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={label('admin.settings.openingTime', 'Opening time')}>
                    <input type="time" className={numClass} value={booking.pickupReturn.openingTime}
                      onChange={(e) => setBookingPath('pickupReturn.openingTime', e.target.value)} />
                  </Field>
                  <Field label={label('admin.settings.closingTime', 'Closing time')}>
                    <input type="time" className={numClass} value={booking.pickupReturn.closingTime}
                      onChange={(e) => setBookingPath('pickupReturn.closingTime', e.target.value)} />
                  </Field>
                  <Field label={label('admin.settings.afterHoursFee', 'After-hours fee')}>
                    <input type="number" min={0} className={numClass} value={booking.pickupReturn.afterHoursFee}
                      onChange={(e) => setBookingPath('pickupReturn.afterHoursFee', Number(e.target.value))} />
                  </Field>
                  <Field label={label('admin.settings.lateReturnGrace', 'Late return grace (minutes)')}>
                    <input type="number" min={0} className={numClass} value={booking.pickupReturn.lateReturnGraceMinutes}
                      onChange={(e) => setBookingPath('pickupReturn.lateReturnGraceMinutes', Number(e.target.value))} />
                  </Field>
                  <Field label={label('admin.settings.lateReturnFee', 'Late return fee per hour')}>
                    <input type="number" min={0} className={numClass} value={booking.pickupReturn.lateReturnFeePerHour}
                      onChange={(e) => setBookingPath('pickupReturn.lateReturnFeePerHour', Number(e.target.value))} />
                  </Field>
                  <Field label={label('admin.settings.fuelPolicy', 'Fuel policy')}>
                    <select
                      className={inputClass}
                      value={booking.pickupReturn.fuelPolicy}
                      onChange={(e) => setBookingPath('pickupReturn.fuelPolicy', e.target.value)}
                    >
                      <option value="full_to_full">{label('admin.settings.fuelFullToFull', 'Full to full')}</option>
                      <option value="same_to_same">{label('admin.settings.fuelSameToSame', 'Same to same')}</option>
                      <option value="prepaid">{label('admin.settings.fuelPrepaid', 'Prepaid')}</option>
                    </select>
                  </Field>
                </div>
                <Check
                  checked={booking.pickupReturn.allowAfterHours}
                  onChange={(v) => setBookingPath('pickupReturn.allowAfterHours', v)}
                  label={label('admin.settings.allowAfterHours', 'Allow after-hours pickup/return (with fee if set)')}
                />
                <Check
                  checked={booking.pickupReturn.allowDifferentReturnLocation}
                  onChange={(v) => setBookingPath('pickupReturn.allowDifferentReturnLocation', v)}
                  label={label('admin.settings.allowDifferentReturn', 'Allow different return location')}
                />
              </div>
            </div>

            <div>
              <SectionTitle
                title={label('admin.settings.pendingExpiryTitle', 'Pending reservation expiry')}
                hint={label('admin.settings.pendingExpiryHint', 'When enabled, a background job auto-handles pending reservations older than the configured hours.')}
              />
              <div className="space-y-3">
                <Check
                  checked={booking.pendingExpiry.enabled}
                  onChange={(v) => setBookingPath('pendingExpiry.enabled', v)}
                  label={label('admin.settings.pendingExpiryEnabled', 'Auto-expire pending reservations')}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={label('admin.settings.expiryHours', 'Expire after (hours)')}>
                    <input type="number" min={1} className={numClass} value={booking.pendingExpiry.expiryHours}
                      onChange={(e) => setBookingPath('pendingExpiry.expiryHours', Number(e.target.value))}
                      disabled={!booking.pendingExpiry.enabled} />
                  </Field>
                  <Field label={label('admin.settings.expiryAction', 'Action')}>
                    <select
                      className={inputClass}
                      value={booking.pendingExpiry.action}
                      onChange={(e) => setBookingPath('pendingExpiry.action', e.target.value)}
                      disabled={!booking.pendingExpiry.enabled}
                    >
                      <option value="cancel">{label('admin.settings.expiryCancel', 'Cancel reservation')}</option>
                      <option value="notify_only">{label('admin.settings.expiryNotifyOnly', 'Notify owner only')}</option>
                    </select>
                  </Field>
                </div>
                <Check
                  checked={booking.pendingExpiry.notifyOwner}
                  onChange={(v) => setBookingPath('pendingExpiry.notifyOwner', v)}
                  label={label('admin.settings.notifyOwnerOnExpiry', 'Notify owner when rule triggers')}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingBooking}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {savingBooking
                ? label('admin.common.loading', 'Loading...')
                : label('admin.settings.bookingSave', 'Save booking settings')}
            </button>
          </form>
        )}
      </section>

      <section className="max-w-3xl rounded-2xl border border-borderColor bg-white p-5 sm:p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-ink">
            {label('admin.settings.whatsappTitle', 'WhatsApp numbers')}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {label(
              'admin.settings.whatsappHint',
              'These numbers are saved in the database and used for wa.me reservation and confirmation messages. No redeploy needed when you change them.',
            )}
          </p>
        </div>

        {loadingWa ? (
          <p className="text-sm text-muted">{label('admin.common.loading', 'Loading...')}</p>
        ) : (
          <form onSubmit={handleSaveWhatsApp} className="space-y-4">
            <Field
              label={label('admin.settings.reservationNumber', 'Reservation WhatsApp number')}
              hint={`${label('admin.settings.usedForReservations', 'Used when guests send reservation messages.')}${resolved.reservation ? ` · ${label('admin.settings.activeDial', 'Active')}: +${resolved.reservation}` : ''}`}
            >
              <input
                className={inputClass}
                value={waForm.reservationNumber}
                onChange={(e) => setWaForm((f) => ({ ...f, reservationNumber: e.target.value }))}
                placeholder={label('admin.settings.numberPlaceholder', 'e.g. 212665330116 or +212 665 330 116')}
                inputMode="tel"
                autoComplete="tel"
              />
            </Field>
            <Field
              label={label('admin.settings.confirmationNumber', 'Booking confirmation WhatsApp number')}
              hint={`${label('admin.settings.usedForConfirmations', 'Used when you send booking confirmation / completion links.')}${resolved.confirmation ? ` · ${label('admin.settings.activeDial', 'Active')}: +${resolved.confirmation}` : ''}`}
            >
              <input
                className={inputClass}
                value={waForm.confirmationNumber}
                onChange={(e) => setWaForm((f) => ({ ...f, confirmationNumber: e.target.value }))}
                placeholder={label('admin.settings.numberPlaceholder', 'e.g. 212665330116 or +212 665 330 116')}
                inputMode="tel"
                autoComplete="tel"
              />
            </Field>
            {fallbackDial ? (
              <p className="rounded-xl border border-borderColor bg-sand/40 px-3 py-2 text-xs text-muted">
                {label('admin.settings.fallbackNote', 'If a field is empty, the app falls back to {{number}} (environment default).').replace('{{number}}', `+${fallbackDial}`)}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={savingWa}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {savingWa
                ? label('admin.common.loading', 'Loading...')
                : label('admin.settings.save', 'Save WhatsApp settings')}
            </button>
          </form>
        )}
      </section>
    </div>
  )
}

export default Settings

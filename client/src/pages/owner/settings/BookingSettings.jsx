import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAppContext } from '../../../context/AppContext'
import { getErrorMessage } from '../../../utils/apiError'
import { TimeField } from '../../../components/date/TimeField'
import {
  AccordionSection,
  Check,
  Field,
  SettingsPanel,
  settingsInputClass,
  settingsNumClass,
  useSettingsLabel,
} from './settingsShared'

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

const SECTION_IDS = [
  'duration',
  'cancellation',
  'deposit',
  'extraDriver',
  'mileage',
  'pickupReturn',
  'pendingExpiry',
]

const BookingSettings = () => {
  const { axios } = useAppContext()
  const label = useSettingsLabel()
  const [booking, setBooking] = useState(DEFAULT_BOOKING)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [openSections, setOpenSections] = useState(() => new Set(['duration']))

  const toggleSection = (id) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await axios.get('/api/owner/settings/booking')
        if (cancelled) return
        if (data.success) setBooking(mergeBookingSettings(data.bookingSettings))
        else toast.error(data.message || label('admin.settings.bookingLoadFailed', 'Could not load booking settings'))
      } catch (error) {
        if (!cancelled) {
          toast.error(getErrorMessage(error, label('admin.settings.bookingLoadFailed', 'Could not load booking settings')))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [axios])

  const handleSave = async (e) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
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
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <SettingsPanel>
        <p className="text-sm text-muted">{label('admin.common.loading', 'Loading...')}</p>
      </SettingsPanel>
    )
  }

  return (
    <SettingsPanel className="max-w-3xl">
      <form onSubmit={handleSave} className="space-y-3">
        <p className="text-sm text-muted pb-1">
          {label(
            'admin.settings.bookingHint',
            'These rules are stored per agency and applied live to new reservations — no redeploy required. Defaults keep current behaviour until you tighten them.',
          )}
        </p>

        <AccordionSection
          id="duration"
          title={label('admin.settings.durationTitle', 'Rental duration & advance booking')}
          hint={label('admin.settings.durationHint', 'Use 0 for maximum fields to mean no limit.')}
          open={openSections.has('duration')}
          onToggle={() => toggleSection('duration')}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={label('admin.settings.minRentalDays', 'Minimum rental days')}>
              <input type="number" min={0} className={settingsNumClass} value={booking.minRentalDays}
                onChange={(e) => setBookingPath('minRentalDays', Number(e.target.value))} />
            </Field>
            <Field
              label={label('admin.settings.maxRentalDays', 'Maximum rental days')}
              hint={label('admin.settings.zeroUnlimited', '0 = no limit')}
            >
              <input type="number" min={0} className={settingsNumClass} value={booking.maxRentalDays}
                onChange={(e) => setBookingPath('maxRentalDays', Number(e.target.value))} />
            </Field>
            <Field label={label('admin.settings.minAdvanceHours', 'Minimum advance notice (hours)')}>
              <input type="number" min={0} className={settingsNumClass} value={booking.minAdvanceHours}
                onChange={(e) => setBookingPath('minAdvanceHours', Number(e.target.value))} />
            </Field>
            <Field
              label={label('admin.settings.maxAdvanceDays', 'Advance booking limit (days)')}
              hint={label('admin.settings.zeroUnlimited', '0 = no limit')}
            >
              <input type="number" min={0} className={settingsNumClass} value={booking.maxAdvanceDays}
                onChange={(e) => setBookingPath('maxAdvanceDays', Number(e.target.value))} />
            </Field>
          </div>
          <Check
            checked={booking.allowSameDayBooking}
            onChange={(v) => setBookingPath('allowSameDayBooking', v)}
            label={label('admin.settings.allowSameDay', 'Allow same-day bookings')}
          />
        </AccordionSection>

        <AccordionSection
          id="cancellation"
          title={label('admin.settings.cancellationTitle', 'Cancellation policy')}
          open={openSections.has('cancellation')}
          onToggle={() => toggleSection('cancellation')}
        >
          <Check
            checked={booking.cancellation.enabled}
            onChange={(v) => setBookingPath('cancellation.enabled', v)}
            label={label('admin.settings.cancellationEnabled', 'Enforce cancellation fees')}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={label('admin.settings.freeCancelHours', 'Free cancellation window (hours before pickup)')}>
              <input type="number" min={0} className={settingsNumClass} value={booking.cancellation.freeCancellationHours}
                onChange={(e) => setBookingPath('cancellation.freeCancellationHours', Number(e.target.value))}
                disabled={!booking.cancellation.enabled} />
            </Field>
            <Field label={label('admin.settings.lateCancelFee', 'Late cancellation fee (%)')}>
              <input type="number" min={0} max={100} className={settingsNumClass} value={booking.cancellation.lateCancellationFeePercent}
                onChange={(e) => setBookingPath('cancellation.lateCancellationFeePercent', Number(e.target.value))}
                disabled={!booking.cancellation.enabled} />
            </Field>
            <Field label={label('admin.settings.noShowFee', 'No-show fee (%)')}>
              <input type="number" min={0} max={100} className={settingsNumClass} value={booking.cancellation.noShowFeePercent}
                onChange={(e) => setBookingPath('cancellation.noShowFeePercent', Number(e.target.value))}
                disabled={!booking.cancellation.enabled} />
            </Field>
          </div>
          <Field label={label('admin.settings.policyText', 'Policy text (shown to staff / guests)')}>
            <textarea
              rows={3}
              className={settingsInputClass}
              value={booking.cancellation.policyText}
              onChange={(e) => setBookingPath('cancellation.policyText', e.target.value)}
              placeholder={label('admin.settings.policyTextPlaceholder', 'Describe your cancellation terms…')}
            />
          </Field>
        </AccordionSection>

        <AccordionSection
          id="deposit"
          title={label('admin.settings.depositTitle', 'Security deposit')}
          hint={label('admin.settings.depositHint', 'Car-level deposit still wins when set. Deposit % of 0 keeps the environment default.')}
          open={openSections.has('deposit')}
          onToggle={() => toggleSection('deposit')}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={label('admin.settings.defaultSecurityDeposit', 'Default security deposit amount')}>
              <input type="number" min={0} className={settingsNumClass} value={booking.deposit.defaultSecurityDeposit}
                onChange={(e) => setBookingPath('deposit.defaultSecurityDeposit', Number(e.target.value))} />
            </Field>
            <Field
              label={label('admin.settings.depositPercent', 'Online deposit percent')}
              hint={label('admin.settings.depositPercentHint', '0 = use server env default (usually 30%)')}
            >
              <input type="number" min={0} max={100} className={settingsNumClass} value={booking.deposit.depositPercent}
                onChange={(e) => setBookingPath('deposit.depositPercent', Number(e.target.value))} />
            </Field>
          </div>
          <Check
            checked={booking.deposit.requireDepositBeforePickup}
            onChange={(v) => setBookingPath('deposit.requireDepositBeforePickup', v)}
            label={label('admin.settings.requireDepositBeforePickup', 'Require deposit before pickup')}
          />
        </AccordionSection>

        <AccordionSection
          id="extraDriver"
          title={label('admin.settings.extraDriverTitle', 'Extra driver')}
          open={openSections.has('extraDriver')}
          onToggle={() => toggleSection('extraDriver')}
        >
          <Check
            checked={booking.secondDriver.enabled}
            onChange={(v) => setBookingPath('secondDriver.enabled', v)}
            label={label('admin.settings.extraDriverEnabled', 'Allow extra / second drivers')}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={label('admin.settings.feePerRental', 'Fee per rental')}>
              <input type="number" min={0} className={settingsNumClass} value={booking.secondDriver.feePerRental}
                onChange={(e) => setBookingPath('secondDriver.feePerRental', Number(e.target.value))}
                disabled={!booking.secondDriver.enabled} />
            </Field>
            <Field label={label('admin.settings.feePerDay', 'Fee per day')}>
              <input type="number" min={0} className={settingsNumClass} value={booking.secondDriver.feePerDay}
                onChange={(e) => setBookingPath('secondDriver.feePerDay', Number(e.target.value))}
                disabled={!booking.secondDriver.enabled} />
            </Field>
            <Field label={label('admin.settings.maxExtraDrivers', 'Max extra drivers')}>
              <input type="number" min={0} max={5} className={settingsNumClass} value={booking.secondDriver.maxExtraDrivers}
                onChange={(e) => setBookingPath('secondDriver.maxExtraDrivers', Number(e.target.value))}
                disabled={!booking.secondDriver.enabled} />
            </Field>
            <Field label={label('admin.settings.minAge', 'Minimum age')}>
              <input type="number" min={16} max={99} className={settingsNumClass} value={booking.secondDriver.minAge}
                onChange={(e) => setBookingPath('secondDriver.minAge', Number(e.target.value))}
                disabled={!booking.secondDriver.enabled} />
            </Field>
            <Field label={label('admin.settings.minLicenseYears', 'Minimum license years')}>
              <input type="number" min={0} max={50} className={settingsNumClass} value={booking.secondDriver.minLicenseYears}
                onChange={(e) => setBookingPath('secondDriver.minLicenseYears', Number(e.target.value))}
                disabled={!booking.secondDriver.enabled} />
            </Field>
          </div>
        </AccordionSection>

        <AccordionSection
          id="mileage"
          title={label('admin.settings.mileageTitle', 'Mileage policy')}
          open={openSections.has('mileage')}
          onToggle={() => toggleSection('mileage')}
        >
          <Check
            checked={booking.mileage.unlimited}
            onChange={(v) => setBookingPath('mileage.unlimited', v)}
            label={label('admin.settings.mileageUnlimited', 'Unlimited mileage')}
          />
          {!booking.mileage.unlimited && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={label('admin.settings.includedKmPerDay', 'Included km per day')}>
                <input type="number" min={1} className={settingsNumClass} value={booking.mileage.includedKmPerDay}
                  onChange={(e) => setBookingPath('mileage.includedKmPerDay', Number(e.target.value))} />
              </Field>
              <Field label={label('admin.settings.extraKmRate', 'Extra km rate')}>
                <input type="number" min={0} step="0.01" className={settingsNumClass} value={booking.mileage.extraKmRate}
                  onChange={(e) => setBookingPath('mileage.extraKmRate', Number(e.target.value))} />
              </Field>
            </div>
          )}
        </AccordionSection>

        <AccordionSection
          id="pickupReturn"
          title={label('admin.settings.pickupReturnTitle', 'Pickup & return rules')}
          open={openSections.has('pickupReturn')}
          onToggle={() => toggleSection('pickupReturn')}
        >
          <Check
            checked={booking.pickupReturn.enforceHours}
            onChange={(v) => setBookingPath('pickupReturn.enforceHours', v)}
            label={label('admin.settings.enforceHours', 'Enforce opening hours on online bookings')}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={label('admin.settings.openingTime', 'Opening time')}>
              <TimeField
                value={booking.pickupReturn.openingTime}
                showLabel={false}
                onChange={(e) => setBookingPath('pickupReturn.openingTime', e.target.value)}
              />
            </Field>
            <Field label={label('admin.settings.closingTime', 'Closing time')}>
              <TimeField
                value={booking.pickupReturn.closingTime}
                showLabel={false}
                onChange={(e) => setBookingPath('pickupReturn.closingTime', e.target.value)}
              />
            </Field>
            <Field label={label('admin.settings.afterHoursFee', 'After-hours fee')}>
              <input type="number" min={0} className={settingsNumClass} value={booking.pickupReturn.afterHoursFee}
                onChange={(e) => setBookingPath('pickupReturn.afterHoursFee', Number(e.target.value))} />
            </Field>
            <Field label={label('admin.settings.lateReturnGrace', 'Late return grace (minutes)')}>
              <input type="number" min={0} className={settingsNumClass} value={booking.pickupReturn.lateReturnGraceMinutes}
                onChange={(e) => setBookingPath('pickupReturn.lateReturnGraceMinutes', Number(e.target.value))} />
            </Field>
            <Field label={label('admin.settings.lateReturnFee', 'Late return fee per hour')}>
              <input type="number" min={0} className={settingsNumClass} value={booking.pickupReturn.lateReturnFeePerHour}
                onChange={(e) => setBookingPath('pickupReturn.lateReturnFeePerHour', Number(e.target.value))} />
            </Field>
            <Field label={label('admin.settings.fuelPolicy', 'Fuel policy')}>
              <select
                className={settingsInputClass}
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
        </AccordionSection>

        <AccordionSection
          id="pendingExpiry"
          title={label('admin.settings.pendingExpiryTitle', 'Pending reservation expiry')}
          hint={label('admin.settings.pendingExpiryHint', 'When enabled, a background job auto-handles pending reservations older than the configured hours.')}
          open={openSections.has('pendingExpiry')}
          onToggle={() => toggleSection('pendingExpiry')}
        >
          <Check
            checked={booking.pendingExpiry.enabled}
            onChange={(v) => setBookingPath('pendingExpiry.enabled', v)}
            label={label('admin.settings.pendingExpiryEnabled', 'Auto-expire pending reservations')}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={label('admin.settings.expiryHours', 'Expire after (hours)')}>
              <input type="number" min={1} className={settingsNumClass} value={booking.pendingExpiry.expiryHours}
                onChange={(e) => setBookingPath('pendingExpiry.expiryHours', Number(e.target.value))}
                disabled={!booking.pendingExpiry.enabled} />
            </Field>
            <Field label={label('admin.settings.expiryAction', 'Action')}>
              <select
                className={settingsInputClass}
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
        </AccordionSection>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            className="text-xs text-[var(--admin-fg-muted)] hover:text-[var(--admin-fg)] transition"
            onClick={() => setOpenSections(new Set(SECTION_IDS))}
          >
            {label('admin.settings.expandAll', 'Expand all')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="admin-btn admin-btn--primary disabled:opacity-60"
          >
            {saving
              ? label('admin.common.saving', 'Saving...')
              : label('admin.settings.bookingSave', 'Save booking settings')}
          </button>
        </div>
      </form>
    </SettingsPanel>
  )
}

export default BookingSettings

import React, { useMemo } from 'react'
import { motion as Motion } from 'motion/react'
import PhoneInput from '../PhoneInput'
import LocationSelect from './LocationSelect'
import ReservationDateTimes from './ReservationDateTimes'
import { WhatsAppButton } from '../forms/PremiumFormUI'

const inputShell =
  'flex h-11 w-full items-center gap-2.5 rounded-[var(--ac-radius)] border border-borderColor bg-sand/30 px-3 text-sm text-ink transition focus-within:border-primary/40 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/10'

const fieldInput =
  'min-w-0 flex-1 border-0 bg-transparent py-2 text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:ring-0'

const Label = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-gray-600">
    {children}
  </label>
)

const IconWrap = ({ children }) => (
  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-gray-400 shadow-sm ring-1 ring-gray-100">
    {children}
  </span>
)

const Icons = {
  user: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 0115 0" />
    </svg>
  ),
  mail: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0v-.243a2.25 2.25 0 00-1.07-1.916l-7.5-4.615a2.25 2.25 0 00-2.36 0L3.32 4.91a2.25 2.25 0 00-1.07 1.916V6.75" />
    </svg>
  ),
  phone: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.907 1.21a12.042 12.042 0 01-5.516-5.517l1.21-.907a.75.75 0 00.417-1.173l-1.106-4.423A.75.75 0 006.58 3.42H5.208A2.25 2.25 0 003 5.625v1.372z" />
    </svg>
  ),
  note: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
    </svg>
  ),
}

const fade = {
  hidden: { opacity: 0, y: 10 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] },
  }),
}

function BookingSummary({ breakdown, currency, t, car, pickupLabel, returnLabel, daysLabel }) {
  const ready = breakdown?.ready

  return (
    <div className="ac-reserve__summary">
      <div className="ac-reserve__summary-top">
        <div className="min-w-0">
          <p className="ac-eyebrow" style={{ marginBottom: 0 }}>
            {t('carDetails.summaryTitle')}
          </p>
          <p className="mt-1 font-display text-lg font-medium text-ink truncate">
            {car.brand} {car.model}
          </p>
          {ready && daysLabel ? <p className="mt-0.5 text-xs text-muted">{daysLabel}</p> : null}
        </div>
        <div className="text-right shrink-0">
          <p className="text-[11px] text-muted">{t('carDetails.rateLabel')}</p>
          <p className="text-sm font-semibold text-ink">
            {currency}
            {car.pricePerDay}
            <span className="text-xs font-normal text-muted">{t('carDetails.perDay')}</span>
          </p>
        </div>
      </div>

      {!ready ? (
        <p className="py-4 text-sm text-gray-500 leading-relaxed">{t('carDetails.priceHint')}</p>
      ) : (
        <ul className="space-y-2.5 py-4 text-sm">
          <li className="flex justify-between gap-2 text-gray-600">
            <span>{t('carDetails.rentalPrice')}</span>
            <span className="font-medium text-gray-900">{currency}{breakdown.rentalPrice}</span>
          </li>
          <li className="flex justify-between gap-2 text-gray-600">
            <span>{t('carDetails.pickupDeliveryFee')}</span>
            <span className="font-medium text-gray-900">
              {breakdown.pickupDeliveryFee <= 0 ? t('carDetails.free') : `${currency}${breakdown.pickupDeliveryFee}`}
            </span>
          </li>
          <li className="flex justify-between gap-2 text-gray-600">
            <span>{t('carDetails.dropoffDeliveryFee')}</span>
            <span className="font-medium text-gray-900">
              {breakdown.dropoffDeliveryFee <= 0 ? t('carDetails.free') : `${currency}${breakdown.dropoffDeliveryFee}`}
            </span>
          </li>
          {breakdown.discountTotal > 0 && (
            <li className="flex justify-between gap-2 text-emerald-700">
              <span>{t('carDetails.discounts')}</span>
              <span className="font-medium">−{currency}{breakdown.discountTotal}</span>
            </li>
          )}
        </ul>
      )}

      {pickupLabel && returnLabel && (
        <div className="mb-4 space-y-1.5 border-t border-gray-100 pt-3 text-xs text-gray-500">
          <p className="line-clamp-2">
            <span className="font-medium text-gray-700">{t('carDetails.pickupLocation')}:</span> {pickupLabel}
          </p>
          <p className="line-clamp-2">
            <span className="font-medium text-gray-700">{t('carDetails.dropoffLocation')}:</span> {returnLabel}
          </p>
        </div>
      )}

      <div className="flex items-end justify-between gap-3 rounded-xl bg-ink px-4 py-3.5 text-white">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-white/50">{t('carDetails.finalTotal')}</p>
          <p className="text-xs text-white/60">{t('carDetails.noHiddenFees')}</p>
        </div>
        <p className="font-display text-2xl font-semibold tracking-tight">{ready ? `${currency}${breakdown.total}` : '—'}</p>
      </div>
    </div>
  )
}

export default function ReservationPanel({
  car,
  form,
  setForm,
  pickupDate,
  setPickupDate,
  returnDate,
  setReturnDate,
  bookableLocations,
  pickupLoc,
  returnLoc,
  priceBreakdown,
  currency,
  submitting,
  onWhatsAppSubmit,
  t,
  formatFeeLabel,
  minDate,
  maxDate,
  openingTime = '06:00',
  closingTime = '22:00',
}) {
  const ready = priceBreakdown?.ready
  const disabled = submitting || !ready

  const locationOptions = useMemo(
    () =>
      bookableLocations.map((loc) => ({
        value: loc._id,
        label: formatFeeLabel(loc),
        keywords: `${loc.name} ${loc.address} ${loc.city || ''}`,
      })),
    [bookableLocations, formatFeeLabel],
  )

  const daysLabel =
    ready && priceBreakdown.days > 0
      ? t('carDetails.rentalDays', {
          days: priceBreakdown.days,
          rate: `${currency}${priceBreakdown.pricePerDay}`,
        })
      : ''

  const pickupShort = pickupLoc ? formatFeeLabel(pickupLoc) : ''
  const returnShort = returnLoc ? formatFeeLabel(returnLoc) : ''

  return (
    <Motion.div
      initial="hidden"
      animate="show"
      className="lg:sticky lg:top-24 lg:max-h-[calc(100svh-6rem)] lg:overflow-y-auto lg:overscroll-contain"
    >
      <div className="ac-surface ac-reserve overflow-hidden">
        <div className="ac-reserve__head">
          <Motion.div variants={fade} custom={0}>
            <p className="ac-eyebrow">{t('carDetails.bookingTitle')}</p>
            <h2 className="ac-reserve__title">{t('carDetails.bookingHeadline')}</h2>
            <p className="ac-lede" style={{ marginTop: '0.65rem' }}>
              {t('carDetails.bookingSubtitle')}
            </p>
          </Motion.div>
          <Motion.ul variants={fade} custom={1} className="ac-reserve__trust">
            {[t('carDetails.trustNoCard'), t('carDetails.trustInstant'), t('carDetails.trustSupport')].map(
              (item) => (
                <li key={item}>
                  <svg className="h-3 w-3 text-emerald-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {item}
                </li>
              ),
            )}
          </Motion.ul>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onWhatsAppSubmit(e)
          }}
          className="ac-reserve__form"
        >
          <Motion.section variants={fade} custom={2}>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">{t('carDetails.tripDetails')}</h3>
            <div className="space-y-4">
              <ReservationDateTimes
                pickupDate={pickupDate}
                returnDate={returnDate}
                setPickupDate={setPickupDate}
                setReturnDate={setReturnDate}
                minDate={minDate}
                maxDate={maxDate}
                openingTime={openingTime}
                closingTime={closingTime}
              />
              <div>
                <Label>{t('carDetails.pickupLocation')}</Label>
                <LocationSelect
                  id="pickupLocation"
                  required
                  value={form.pickupLocationId}
                  onChange={(id) => setForm({ ...form, pickupLocationId: id })}
                  options={locationOptions}
                  placeholder={t('carDetails.selectPickup')}
                />
              </div>
              <div>
                <Label>{t('carDetails.dropoffLocation')}</Label>
                <LocationSelect
                  id="returnLocation"
                  required
                  value={form.returnLocationId}
                  onChange={(id) => setForm({ ...form, returnLocationId: id })}
                  options={locationOptions}
                  placeholder={t('carDetails.selectDropoff')}
                />
              </div>
            </div>
          </Motion.section>

          <Motion.section variants={fade} custom={3}>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">{t('carDetails.yourDetails')}</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="fullName">{t('carDetails.fullName')}</Label>
                <div className={inputShell}>
                  <IconWrap>{Icons.user}</IconWrap>
                  <input
                    id="fullName"
                    type="text"
                    className={fieldInput}
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    required
                    autoComplete="name"
                    placeholder={t('carDetails.fullNamePlaceholder')}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="phone">{t('carDetails.phone')}</Label>
                <div className={`${inputShell} !h-auto min-h-11 !py-1.5 [&_.PhoneInputInput]:!border-0 [&_.PhoneInputInput]:!bg-transparent [&_.PhoneInputInput]:!shadow-none [&_.PhoneInputCountry]:!pl-0`}>
                  <IconWrap>{Icons.phone}</IconWrap>
                  <div className="min-w-0 flex-1">
                    <PhoneInput id="phone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} required />
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="email">{t('carDetails.email')}</Label>
                <div className={inputShell}>
                  <IconWrap>{Icons.mail}</IconWrap>
                  <input
                    id="email"
                    type="email"
                    className={fieldInput}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    autoComplete="email"
                    placeholder={t('carDetails.emailPlaceholder')}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">{t('carDetails.notes')}</Label>
                <div className={`${inputShell} !h-auto items-start !py-2.5`}>
                  <IconWrap>{Icons.note}</IconWrap>
                  <textarea
                    id="notes"
                    rows={2}
                    className={`${fieldInput} min-h-[2.75rem] resize-none`}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder={t('carDetails.notesPlaceholder')}
                  />
                </div>
              </div>
            </div>
          </Motion.section>

          <Motion.div variants={fade} custom={4}>
            <BookingSummary
              breakdown={priceBreakdown}
              currency={currency}
              t={t}
              car={car}
              pickupLabel={pickupShort}
              returnLabel={returnShort}
              daysLabel={daysLabel}
            />
          </Motion.div>

          <Motion.div variants={fade} custom={5} className="space-y-2.5 pt-1 pb-1">
            <WhatsAppButton disabled={disabled} className="!rounded-xl !py-3.5 !text-base">
              {submitting ? t('carDetails.submitting') : t('carDetails.whatsappReserve')}
            </WhatsAppButton>
            <p className="text-center text-xs leading-relaxed text-gray-400">{t('carDetails.whatsappHint')}</p>
            <p className="text-center text-[11px] text-gray-400">{t('carDetails.noCard')}</p>
          </Motion.div>
        </form>
      </div>
    </Motion.div>
  )
}

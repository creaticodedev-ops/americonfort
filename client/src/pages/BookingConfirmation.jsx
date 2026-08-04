import React, { useMemo } from 'react'
import { Link, useLocation, Navigate } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import { useI18n } from '../i18n/I18nContext'
import { useAppContext } from '../context/AppContext'

const formatDisplay = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const BreakdownRows = ({ breakdown, currency, t }) => {
  if (!breakdown) return null

  return (
    <div className="rounded-xl bg-white border border-borderColor px-4 py-3 space-y-2 mt-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('confirmation.priceBreakdown')}</p>
      <div className="flex justify-between text-sm gap-3">
        <span>{t('confirmation.rentalPrice')}</span>
        <span className="font-medium">{currency}{breakdown.rentalPrice ?? 0}</span>
      </div>
      <div className="flex justify-between text-sm gap-3">
        <span>{t('confirmation.pickupDeliveryFee')}</span>
        <span className="font-medium">
          {(breakdown.pickupDeliveryFee || 0) <= 0
            ? t('confirmation.free')
            : `${currency}${breakdown.pickupDeliveryFee}`}
        </span>
      </div>
      <div className="flex justify-between text-sm gap-3">
        <span>{t('confirmation.dropoffDeliveryFee')}</span>
        <span className="font-medium">
          {(breakdown.dropoffDeliveryFee || 0) <= 0
            ? t('confirmation.free')
            : `${currency}${breakdown.dropoffDeliveryFee}`}
        </span>
      </div>
      {(breakdown.discountTotal || 0) > 0 && (
        <div className="flex justify-between text-sm gap-3 text-green-700">
          <span>{t('confirmation.discounts')}</span>
          <span className="font-medium">−{currency}{breakdown.discountTotal}</span>
        </div>
      )}
      <div className="flex justify-between text-sm gap-3 border-t border-borderColor pt-2 font-semibold text-gray-900">
        <span>{t('confirmation.total')}</span>
        <span className="text-primary">{currency}{breakdown.total ?? 0}</span>
      </div>
    </div>
  )
}

const BookingConfirmation = () => {
  const { state: routeState } = useLocation()
  const { t } = useI18n()
  const { currency } = useAppContext()

  const state = useMemo(() => {
    if (routeState?.reservationId) return routeState
    try {
      const stored = sessionStorage.getItem('lastReservation')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }, [routeState])

  if (!state?.reservationId) {
    return <Navigate to="/cars" replace />
  }

  return (
    <Motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="page-pad mt-10 sm:mt-16 mb-16 sm:mb-24"
    >
      <div className="max-w-3xl mx-auto">
      <div className="rounded-2xl border border-borderColor bg-white p-6 sm:p-8 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 text-2xl font-bold">
          ✓
        </div>
        <h1 className="text-3xl font-semibold text-gray-800">{t('confirmation.title')}</h1>
        <p className="mt-2 text-gray-500">{t('confirmation.subtitle')}</p>

        <div className="mt-8 rounded-xl bg-light px-6 py-5">
          <p className="text-sm uppercase tracking-wide text-gray-500">{t('confirmation.reference')}</p>
          <p className="mt-1 text-2xl font-bold text-primary tracking-wider">{state.reservationId}</p>
        </div>

        <p className="mt-4 text-sm text-gray-500">{t('confirmation.saveNote')}</p>

        <div className="mt-8 text-left text-sm text-gray-600 border-t border-borderColor pt-6">
          <div className="grid gap-y-3 gap-x-4 sm:grid-cols-[8rem_1fr]">
            <div className="text-gray-500">{t('confirmation.vehicle')}:</div>
            <div className="font-medium text-gray-800">{state.carName || '-'}</div>

            <div className="text-gray-500">{t('confirmation.name')}:</div>
            <div className="font-medium text-gray-800">{state.customerName || '-'}</div>

            <div className="text-gray-500">{t('confirmation.emailLabel')}:</div>
            <div className="font-medium text-gray-800">{state.email || '-'}</div>

            <div className="text-gray-500">{t('confirmation.phoneLabel')}:</div>
            <div className="font-medium text-gray-800">{state.phone || '-'}</div>

            <div className="text-gray-500">{t('confirmation.pickup')}:</div>
            <div className="font-medium text-gray-800">{state.pickupLocation || '-'}</div>

            <div className="text-gray-500">{t('confirmation.dropoff')}:</div>
            <div className="font-medium text-gray-800">{state.returnLocation || '-'}</div>

            <div className="text-gray-500">{t('confirmation.from')}:</div>
            <div className="font-medium text-gray-800">{state.pickupDate ? formatDisplay(state.pickupDate) : '-'}</div>

            <div className="text-gray-500">{t('confirmation.until')}:</div>
            <div className="font-medium text-gray-800">{state.returnDate ? formatDisplay(state.returnDate) : '-'}</div>
          </div>

          {state.priceBreakdown ? (
            <div className="mt-6"><BreakdownRows breakdown={state.priceBreakdown} currency={currency} t={t} /></div>
          ) : state.price != null ? (
            <p className="mt-6"><span className="font-medium text-gray-800">{t('confirmation.total')}:</span> {currency}{state.price}</p>
          ) : null}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/cars" className="px-6 py-2.5 rounded-lg bg-primary text-white hover:bg-primary-dull transition-all">
            {t('confirmation.browseMore')}
          </Link>
          <Link to="/" className="px-6 py-2.5 rounded-lg border border-borderColor text-gray-700 hover:bg-gray-50 transition-all">
            {t('confirmation.backHome')}
          </Link>
        </div>
      </div>
      </div>
    </Motion.div>
  )
}

export default BookingConfirmation

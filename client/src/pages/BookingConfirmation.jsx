import React, { useMemo } from 'react'
import { Link, useLocation, Navigate } from 'react-router-dom'
import { motion as Motion } from 'motion/react'
import { useI18n } from '../i18n/I18nContext'
import { useAppContext } from '../context/AppContext'
import Seo from '../components/Seo'

const formatDisplay = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const BreakdownRows = ({ breakdown, currency, t }) => {
  if (!breakdown) return null

  return (
    <div className="ac-confirm__breakdown">
      <p className="ac-eyebrow">{t('confirmation.priceBreakdown')}</p>
      <div className="ac-confirm__row">
        <span>{t('confirmation.rentalPrice')}</span>
        <span>{currency}{breakdown.rentalPrice ?? 0}</span>
      </div>
      <div className="ac-confirm__row">
        <span>{t('confirmation.pickupDeliveryFee')}</span>
        <span>
          {(breakdown.pickupDeliveryFee || 0) <= 0
            ? t('confirmation.free')
            : `${currency}${breakdown.pickupDeliveryFee}`}
        </span>
      </div>
      <div className="ac-confirm__row">
        <span>{t('confirmation.dropoffDeliveryFee')}</span>
        <span>
          {(breakdown.dropoffDeliveryFee || 0) <= 0
            ? t('confirmation.free')
            : `${currency}${breakdown.dropoffDeliveryFee}`}
        </span>
      </div>
      {(breakdown.discountTotal || 0) > 0 && (
        <div className="ac-confirm__row ac-confirm__row--credit">
          <span>{t('confirmation.discounts')}</span>
          <span>−{currency}{breakdown.discountTotal}</span>
        </div>
      )}
      <div className="ac-confirm__row ac-confirm__row--total">
        <span>{t('confirmation.total')}</span>
        <span>{currency}{breakdown.total ?? 0}</span>
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

  const rows = [
    [t('confirmation.vehicle'), state.carName],
    [t('confirmation.name'), state.customerName],
    [t('confirmation.emailLabel'), state.email],
    [t('confirmation.phoneLabel'), state.phone],
    [t('confirmation.pickup'), state.pickupLocation],
    [t('confirmation.dropoff'), state.returnLocation],
    [t('confirmation.from'), state.pickupDate ? formatDisplay(state.pickupDate) : null],
    [t('confirmation.until'), state.returnDate ? formatDisplay(state.returnDate) : null],
  ]

  return (
    <div className="ac-home">
      <Motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="page-pad page-shell ac-section"
      >
        <Seo title={t('confirmation.title')} path="/booking-confirmation" noindex />
        <div className="ac-confirm ac-surface">
          <div className="ac-confirm__mark" aria-hidden>
            ✓
          </div>
          <header className="ac-head ac-head--center">
            <h1 className="ac-title" style={{ fontSize: 'clamp(1.85rem, 3.5vw, 2.5rem)' }}>
              {t('confirmation.title')}
            </h1>
            <p className="ac-lede">{t('confirmation.subtitle')}</p>
          </header>

          <div className="ac-confirm__ref">
            <p className="ac-eyebrow">{t('confirmation.reference')}</p>
            <p className="ac-confirm__ref-id">{state.reservationId}</p>
          </div>

          <p className="ac-confirm__note">{t('confirmation.saveNote')}</p>

          <dl className="ac-confirm__grid">
            {rows.map(([label, value]) => (
              <React.Fragment key={label}>
                <dt>{label}</dt>
                <dd>{value || '-'}</dd>
              </React.Fragment>
            ))}
          </dl>

          {state.priceBreakdown ? (
            <BreakdownRows breakdown={state.priceBreakdown} currency={currency} t={t} />
          ) : state.price != null ? (
            <p className="ac-confirm__total-line">
              <span>{t('confirmation.total')}:</span> {currency}
              {state.price}
            </p>
          ) : null}

          <div className="ac-confirm__actions">
            <Link to="/cars" className="ac-btn">
              {t('confirmation.browseMore')}
            </Link>
            <Link to="/" className="ac-btn ac-btn--ghost">
              {t('confirmation.backHome')}
            </Link>
          </div>
        </div>
      </Motion.div>
    </div>
  )
}

export default BookingConfirmation

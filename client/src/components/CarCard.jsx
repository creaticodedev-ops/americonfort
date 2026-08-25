import React, { useMemo } from 'react'
import { assets } from '../assets/assets'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext'
import { formatLocationsDisplay } from '../utils/carLocations'
import ResponsiveImage from './ResponsiveImage'

const TONES = ['warm', 'cool', 'ember']

const toneFromId = (id) => {
  const s = String(id || '')
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return TONES[h % TONES.length]
}

/** Clean brand/model so we never show "OPEL -" / duplicated names. */
const displayNames = (car) => {
  let brand = String(car.brand || '').replace(/\s*[-–—|/]+\s*$/g, '').trim()
  let model = String(car.model || '').replace(/^\s*[-–—|/]+\s*/g, '').trim()
  if (brand && model) {
    const brandRe = new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[-–—]?\\s*`, 'i')
    model = model.replace(brandRe, '').trim() || model
  }
  return { brand, model: model || String(car.model || '').trim() }
}

/**
 * Premium public fleet card — used on home featured + /cars.
 * Visual treatment only; pricing, availability, and links stay data-driven.
 */
const CarCard = ({ car }) => {
  const currency = import.meta.env.VITE_CURRENCY || 'MAD '
  const { t } = useI18n()
  const fallbackImage = assets.car_image1
  const available = Boolean(car.isAvaliable)
  const locationLabel = formatLocationsDisplay(car)
  const tone = useMemo(() => toneFromId(car._id), [car._id])
  const { brand, model } = useMemo(() => displayNames(car), [car.brand, car.model])

  const specItems = [
    car.seating_capacity
      ? { label: t('carCard.specSeats'), value: String(car.seating_capacity) }
      : null,
    car.fuel_type ? { label: t('carCard.specFuel'), value: car.fuel_type } : null,
    car.transmission ? { label: t('carCard.specGear'), value: car.transmission } : null,
  ].filter(Boolean)

  return (
    <article
      className={`fleet-card fleet-card--${tone}${available ? '' : ' is-unavailable'}`}
      data-tone={tone}
    >
      <Link
        to={`/car-details/${car._id}`}
        onClick={() => window.scrollTo(0, 0)}
        className="fleet-card-link"
      >
        <div className="fleet-card-media">
          <div className="fleet-card-media-wash" aria-hidden />
          <div className="fleet-card-media-spot" aria-hidden />
          <div className="fleet-card-media-floor" aria-hidden />
          {car.year ? (
            <span className="fleet-card-watermark" aria-hidden>
              {car.year}
            </span>
          ) : null}

          <span className={`fleet-card-badge${available ? ' is-on' : ' is-off'}`}>
            <span className="fleet-card-badge-dot" aria-hidden />
            <span className="fleet-card-badge-text">
              {available ? t('carCard.available') : t('carCard.unavailable')}
            </span>
          </span>

          <div className="fleet-card-stage">
            <ResponsiveImage
              src={car.image || car.images?.[0] || fallbackImage}
              fallbackSrc={fallbackImage}
              alt={`${brand} ${model}`.trim()}
              widths={[400, 640, 960]}
              sizes="(max-width: 767px) 92vw, (max-width: 1023px) 46vw, 360px"
              width={640}
              height={400}
              loading="lazy"
              decoding="async"
              className="fleet-card-img"
            />
          </div>

          <div className="fleet-card-price">
            <span className="fleet-card-price-amount">
              <span className="fleet-card-price-currency">{currency.trim()}</span>
              <span className="fleet-card-price-value">{car.pricePerDay}</span>
            </span>
            <span className="fleet-card-price-unit">{t('carCard.perDay')}</span>
          </div>
        </div>

        <div className="fleet-card-body">
          <header className="fleet-card-identity">
            {brand ? <p className="fleet-card-brand">{brand}</p> : null}
            <h3 className="fleet-card-model">{model}</h3>
            {(car.category || car.year) && (
              <p className="fleet-card-meta">
                {car.category ? <span>{car.category}</span> : null}
                {car.category && car.year ? (
                  <span className="fleet-card-meta-sep" aria-hidden>
                    ·
                  </span>
                ) : null}
                {car.year ? <span className="fleet-card-year">{car.year}</span> : null}
              </p>
            )}
          </header>

          {specItems.length > 0 && (
            <dl className="fleet-card-specs">
              {specItems.map((item) => (
                <div key={item.label} className="fleet-card-spec">
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="fleet-card-foot">
            {locationLabel ? (
              <p className="fleet-card-location">
                <svg
                  viewBox="0 0 24 24"
                  className="fleet-card-location-icon"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  aria-hidden="true"
                >
                  <path d="M12 21s6.5-5.4 6.5-10.2A6.5 6.5 0 0 0 5.5 10.8C5.5 15.6 12 21 12 21z" />
                  <circle cx="12" cy="10.6" r="2.1" />
                </svg>
                <span>{locationLabel}</span>
              </p>
            ) : (
              <span />
            )}
            <span className="fleet-card-cta">
              <span>{t('carCard.viewDetails')}</span>
              <span className="fleet-card-cta-arrow" aria-hidden="true">
                →
              </span>
            </span>
          </div>
        </div>
      </Link>
    </article>
  )
}

export default CarCard

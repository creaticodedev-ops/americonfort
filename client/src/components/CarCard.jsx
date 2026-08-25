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

  const specs = [
    car.seating_capacity ? t('carDetails.seats', { count: car.seating_capacity }) : null,
    car.fuel_type || null,
    car.transmission || null,
  ].filter(Boolean)

  return (
    <article
      className={`fleet-card fleet-card--${tone}${available ? '' : ' is-unavailable'}`}
      data-tone={tone}
    >
      <Link
        to={`/car-details/${car._id}`}
        onClick={() => window.scrollTo(0, 0)}
        className="fleet-card-link group"
      >
        <div className="fleet-card-media">
          <div className="fleet-card-media-atmosphere" aria-hidden />
          <div className="fleet-card-media-vignette" aria-hidden />
          <div className="fleet-card-media-floor" aria-hidden />

          <span className={`fleet-card-badge${available ? ' is-on' : ' is-off'}`}>
            <span className="fleet-card-badge-dot" aria-hidden />
            {available ? t('carCard.available') : t('carCard.unavailable')}
          </span>

          <ResponsiveImage
            src={car.image || car.images?.[0] || fallbackImage}
            fallbackSrc={fallbackImage}
            alt={`${car.brand} ${car.model}`}
            widths={[400, 640, 960]}
            sizes="(max-width: 767px) 92vw, (max-width: 1023px) 46vw, 360px"
            width={640}
            height={400}
            loading="lazy"
            decoding="async"
            className="fleet-card-img"
          />

          <div className="fleet-card-price">
            <span className="fleet-card-price-value">
              {currency}
              {car.pricePerDay}
            </span>
            <span className="fleet-card-price-unit">{t('carCard.perDay')}</span>
          </div>
        </div>

        <div className="fleet-card-body">
          <div className="fleet-card-identity">
            <h3 className="fleet-card-name">
              <span className="fleet-card-brand">{car.brand}</span>
              <span className="fleet-card-model">{car.model}</span>
            </h3>
            {(car.category || car.year) && (
              <p className="fleet-card-meta">
                {car.category ? <span>{car.category}</span> : null}
                {car.category && car.year ? <span className="fleet-card-meta-sep" aria-hidden>·</span> : null}
                {car.year ? <span className="fleet-card-year">{car.year}</span> : null}
              </p>
            )}
          </div>

          {specs.length > 0 && (
            <p className="fleet-card-specs" aria-label={specs.join(', ')}>
              {specs.map((spec, i) => (
                <React.Fragment key={`${spec}-${i}`}>
                  {i > 0 ? <span className="fleet-card-specs-sep" aria-hidden>·</span> : null}
                  <span>{spec}</span>
                </React.Fragment>
              ))}
            </p>
          )}

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
          ) : null}

          <span className="fleet-card-cta">
            <span className="fleet-card-cta-label">{t('carCard.viewDetails')}</span>
            <span className="fleet-card-cta-arrow" aria-hidden="true">→</span>
          </span>
        </div>
      </Link>
    </article>
  )
}

export default CarCard

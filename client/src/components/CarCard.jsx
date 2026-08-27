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
 * Premium public fleet plate — atelier showroom treatment.
 * Visual only; pricing, availability, and links stay data-driven.
 */
const CarCard = ({ car, featured = false }) => {
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
      className={`fleet-plate fleet-plate--${tone}${available ? '' : ' is-unavailable'}${featured ? ' is-featured' : ''}`}
      data-tone={tone}
    >
      <Link
        to={`/car-details/${car._id}`}
        onClick={() => window.scrollTo(0, 0)}
        className="fleet-plate__link"
      >
        <div className="fleet-plate__stage">
          <div className="fleet-plate__wash" aria-hidden />
          <div className="fleet-plate__glow" aria-hidden />
          <div className="fleet-plate__floor" aria-hidden />
          {car.year ? (
            <span className="fleet-plate__year-mark" aria-hidden>
              {car.year}
            </span>
          ) : null}

          <div className="fleet-plate__vehicle">
            <ResponsiveImage
              src={car.image || car.images?.[0] || fallbackImage}
              fallbackSrc={fallbackImage}
              alt={`${brand} ${model}`.trim()}
              widths={[400, 640, 960]}
              sizes="(max-width: 767px) 88vw, (max-width: 1023px) 44vw, 380px"
              width={640}
              height={400}
              loading="lazy"
              decoding="async"
              className="fleet-plate__img"
            />
          </div>
        </div>

        <div className="fleet-plate__body">
          <div className="fleet-plate__top">
            <span className={`fleet-plate__status${available ? ' is-on' : ' is-off'}`}>
              <span className="fleet-plate__status-dot" aria-hidden />
              {available ? t('carCard.available') : t('carCard.unavailable')}
            </span>
            <p className="fleet-plate__rate">
              <span className="fleet-plate__currency">{currency.trim()}</span>
              <span className="fleet-plate__amount tabular-nums">{car.pricePerDay}</span>
              <span className="fleet-plate__unit">{t('carCard.perDay')}</span>
            </p>
          </div>

          <header className="fleet-plate__identity">
            {brand ? <p className="fleet-plate__brand">{brand}</p> : null}
            <h3 className="fleet-plate__model">{model}</h3>
            {(car.category || car.year) && (
              <p className="fleet-plate__meta">
                {car.category ? <span>{car.category}</span> : null}
                {car.category && car.year ? <span className="fleet-plate__dot" aria-hidden>·</span> : null}
                {car.year ? <span className="tabular-nums">{car.year}</span> : null}
              </p>
            )}
          </header>

          {specItems.length > 0 && (
            <dl className="fleet-plate__specs">
              {specItems.map((item) => (
                <div key={item.label} className="fleet-plate__spec">
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="fleet-plate__foot">
            {locationLabel ? (
              <p className="fleet-plate__location">
                <svg
                  viewBox="0 0 24 24"
                  className="fleet-plate__pin"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
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
            <span className="fleet-plate__cta">
              {t('carCard.viewDetails')}
              <span className="fleet-plate__cta-arrow" aria-hidden="true">
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

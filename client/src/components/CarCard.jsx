import React, { useMemo } from 'react'
import { assets } from '../assets/assets'
import { Link } from 'react-router-dom'
import { motion as Motion } from 'motion/react'
import { useI18n } from '../i18n/I18nContext'
import { formatLocationsDisplay } from '../utils/carLocations'
import ResponsiveImage from './ResponsiveImage'

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
 * Showroom plate — vehicle dominates; info is a tight caption bar.
 */
const CarCard = ({ car }) => {
  const currency = import.meta.env.VITE_CURRENCY || 'MAD '
  const { t } = useI18n()
  const fallbackImage = assets.car_image1
  const available = Boolean(car.isAvaliable)
  const locationLabel = formatLocationsDisplay(car)
  const { brand, model } = useMemo(() => displayNames(car), [car.brand, car.model])

  const specs = [
    car.seating_capacity ? `${car.seating_capacity} ${t('carCard.specSeats').toLowerCase()}` : null,
    car.fuel_type || null,
    car.transmission || null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Motion.article
      className={`show-card${available ? '' : ' is-off'}`}
      whileHover={{ y: -5 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
    >
      <Link
        to={`/car-details/${car._id}`}
        onClick={() => window.scrollTo(0, 0)}
        className="show-card__link"
      >
        <div className="show-card__media">
          <div className="show-card__studio" aria-hidden />
          <div className="show-card__shade" aria-hidden />
          <ResponsiveImage
            src={car.image || car.images?.[0] || fallbackImage}
            fallbackSrc={fallbackImage}
            alt={`${brand} ${model}`.trim()}
            widths={[400, 640, 960]}
            sizes="(max-width: 767px) 78vw, (max-width: 1100px) 40vw, 320px"
            width={640}
            height={400}
            loading="lazy"
            decoding="async"
            className="show-card__img"
          />
          <span className={`show-card__live${available ? ' is-on' : ''}`}>
            {available ? t('carCard.available') : t('carCard.unavailable')}
          </span>
        </div>

        <div className="show-card__cap">
          <div className="show-card__row">
            {brand ? <p className="show-card__brand">{brand}</p> : <span />}
            <p className="show-card__price">
              <span className="show-card__cur">{currency.trim()}</span>
              <span className="show-card__amt">{car.pricePerDay}</span>
              <span className="show-card__per">{t('carCard.perDay')}</span>
            </p>
          </div>

          <h3 className="show-card__model">{model}</h3>

          {specs ? <p className="show-card__specs">{specs}</p> : null}

          <div className="show-card__footer">
            {locationLabel ? (
              <p className="show-card__loc" title={locationLabel}>
                {locationLabel}
              </p>
            ) : (
              <span />
            )}
            <span className="show-card__go">
              {t('carCard.viewDetails')}
              <span aria-hidden>→</span>
            </span>
          </div>
        </div>
      </Link>
    </Motion.article>
  )
}

export default CarCard

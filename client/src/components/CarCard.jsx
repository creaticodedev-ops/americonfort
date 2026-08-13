import React from 'react'
import { assets } from '../assets/assets'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext'
import { formatLocationsDisplay } from '../utils/carLocations'
import ResponsiveImage from './ResponsiveImage'

const SpecIcon = ({ name }) => {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.6',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: 'h-3.5 w-3.5 shrink-0',
    'aria-hidden': true,
  }
  if (name === 'seats') {
    return (
      <svg {...common}>
        <circle cx="9" cy="7" r="2.4" />
        <path d="M4.5 18.5v-1.2A3.8 3.8 0 0 1 8.3 13.5h1.4A3.8 3.8 0 0 1 13.5 17.3v1.2" />
        <circle cx="16.2" cy="8.2" r="2" />
        <path d="M15 18.5v-1a3.2 3.2 0 0 1 2.4-3.1h.4A3.2 3.2 0 0 1 21 17.4v1.1" />
      </svg>
    )
  }
  if (name === 'fuel') {
    return (
      <svg {...common}>
        <path d="M4.8 20V6.8A1.8 1.8 0 0 1 6.6 5h6.2A1.8 1.8 0 0 1 14.6 6.8V20" />
        <path d="M4.8 20h9.8M7 8.2h5.4M16.2 8.5l2.6 2.6v6.2a1.7 1.7 0 1 0 3.4 0V12.2L20 10.4" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="7.2" />
      <circle cx="12" cy="12" r="1.6" />
      <path d="M12 4.8v2.2M12 17v2.2M4.8 12h2.2M17 12h2.2" />
    </svg>
  )
}

const CarCard = ({ car }) => {
  const currency = import.meta.env.VITE_CURRENCY || 'MAD '
  const { t } = useI18n()
  const fallbackImage = assets.car_image1
  const available = Boolean(car.isAvaliable)
  const locationLabel = formatLocationsDisplay(car)

  return (
    <article className={`fleet-card${available ? '' : ' is-unavailable'}`}>
      <Link
        to={`/car-details/${car._id}`}
        onClick={() => window.scrollTo(0, 0)}
        className="fleet-card-link group"
      >
        <div className="fleet-card-media">
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
          <span className={`fleet-card-badge${available ? '' : ' is-off'}`}>
            {available ? t('carCard.available') : t('carCard.unavailable')}
          </span>
          <div className="fleet-card-price">
            <span className="fleet-card-price-value">
              {currency}{car.pricePerDay}
            </span>
            <span className="fleet-card-price-unit">{t('carCard.perDay')}</span>
          </div>
        </div>

        <div className="fleet-card-body">
          <h3 className="fleet-card-name">
            {car.brand} {car.model}
          </h3>
          <p className="fleet-card-meta">
            {car.category} · {car.year}
          </p>

          <ul className="fleet-card-specs">
            <li>
              <SpecIcon name="seats" />
              <span>{t('carDetails.seats', { count: car.seating_capacity })}</span>
            </li>
            <li>
              <SpecIcon name="fuel" />
              <span>{car.fuel_type}</span>
            </li>
            <li>
              <SpecIcon name="gear" />
              <span>{car.transmission}</span>
            </li>
          </ul>

          {locationLabel ? (
            <p className="fleet-card-location">
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5 shrink-0 text-primary"
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
            {t('carCard.viewDetails')}
            <span className="fleet-card-cta-arrow" aria-hidden="true">→</span>
          </span>
        </div>
      </Link>
    </article>
  )
}

export default CarCard

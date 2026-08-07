import React from 'react'
import { assets } from '../assets/assets'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext'
import { formatLocationsDisplay } from '../utils/carLocations'
import ResponsiveImage from './ResponsiveImage'

const CarCard = ({ car }) => {
  const currency = import.meta.env.VITE_CURRENCY || 'MAD '
  const navigate = useNavigate()
  const { t } = useI18n()
  const fallbackImage = assets.car_image1

  return (
    <article
      onClick={() => { navigate(`/car-details/${car._id}`); window.scrollTo(0, 0) }}
      className="group cursor-pointer"
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-sand">
        <ResponsiveImage
          src={car.image || car.images?.[0] || fallbackImage}
          fallbackSrc={fallbackImage}
          alt={`${car.brand} ${car.model}`}
          widths={[400, 640, 960]}
          sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 360px"
          width={640}
          height={400}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent opacity-80" />

        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
          <div>
            {car.isAvaliable && (
              <p className="text-[10px] uppercase tracking-[0.16em] text-white mb-1">
                {t('carCard.available')}
              </p>
            )}
            <h3 className="text-white font-display text-xl font-medium leading-tight">
              {car.brand} {car.model}
            </h3>
            <p className="text-white/90 text-xs mt-0.5">{car.category} · {car.year}</p>
          </div>
          <div className="text-right shrink-0 rounded-lg bg-white/95 px-2.5 py-1.5 backdrop-blur-sm">
            <p className="text-ink font-semibold text-sm leading-none">{currency}{car.pricePerDay}</p>
            <p className="text-[10px] text-muted mt-0.5">{t('carCard.perDay')}</p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <img src={assets.users_icon} alt="" width={14} height={14} className="h-3.5 w-3.5 opacity-70" loading="lazy" />
          {t('carDetails.seats', { count: car.seating_capacity })}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <img src={assets.fuel_icon} alt="" width={14} height={14} className="h-3.5 w-3.5 opacity-70" loading="lazy" />
          {car.fuel_type}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <img src={assets.car_icon} alt="" width={14} height={14} className="h-3.5 w-3.5 opacity-70" loading="lazy" />
          {car.transmission}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <img src={assets.location_icon} alt="" width={14} height={14} className="h-3.5 w-3.5 opacity-70" loading="lazy" />
          {formatLocationsDisplay(car)}
        </span>
      </div>
    </article>
  )
}

export default CarCard

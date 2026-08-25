import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion as Motion, AnimatePresence } from 'motion/react'
import { useAppContext } from '../context/AppContext'
import { useI18n } from '../i18n/I18nContext'
import { groupCarsByCategory } from '../utils/vehicleCategories'
import { formatLocationsDisplay } from '../utils/carLocations'
import { assets } from '../assets/assets'
import ResponsiveImage from './ResponsiveImage'
import { AIRPORT_LANDING_PATH } from '../constants/site'

const currency = import.meta.env.VITE_CURRENCY || 'MAD '

const pickPreferred = (list = []) => {
  const available = list.find((c) => c.isAvaliable)
  return available || list[0] || null
}

/**
 * Home fleet showcase — editorial spotlight + category rail.
 * Uses live fleet data; /cars catalog cards stay unchanged.
 */
const FeaturedSection = () => {
  const { cars } = useAppContext()
  const { t } = useI18n()

  const grouped = useMemo(() => groupCarsByCategory(cars), [cars])
  const categories = useMemo(
    () => grouped.filter((g) => g.cars.length > 0).map((g) => g.category),
    [grouped],
  )

  const [activeCategory, setActiveCategory] = useState('')
  const [activeId, setActiveId] = useState('')

  useEffect(() => {
    if (!categories.length) {
      setActiveCategory('')
      setActiveId('')
      return
    }
    setActiveCategory((prev) => (categories.includes(prev) ? prev : categories[0]))
  }, [categories])

  const categoryCars = useMemo(() => {
    const group = grouped.find((g) => g.category === activeCategory)
    return group?.cars || []
  }, [grouped, activeCategory])

  useEffect(() => {
    if (!categoryCars.length) {
      setActiveId('')
      return
    }
    setActiveId((prev) => {
      if (prev && categoryCars.some((c) => c._id === prev)) return prev
      return pickPreferred(categoryCars)?._id || ''
    })
  }, [categoryCars])

  const featured = useMemo(
    () => categoryCars.find((c) => c._id === activeId) || pickPreferred(categoryCars),
    [categoryCars, activeId],
  )

  const locationLabel = featured ? formatLocationsDisplay(featured) : ''
  const available = Boolean(featured?.isAvaliable)
  const imageSrc = featured?.image || featured?.images?.[0] || assets.car_image1

  if (!cars?.length) return null

  return (
    <section className="fleet-stage" aria-labelledby="fleet-stage-heading">
      <div className="fleet-stage__inner page-pad page-shell">
        <header className="fleet-stage__intro">
          <p className="fleet-stage__eyebrow">{t('featured.eyebrow')}</p>
          <h2 id="fleet-stage-heading" className="fleet-stage__title">
            {t('featured.title')}
          </h2>
          <p className="fleet-stage__lead">{t('featured.subtitle')}</p>
        </header>

        {categories.length > 1 && (
          <div className="fleet-stage__tabs" role="tablist" aria-label={t('cars.categoryLabel')}>
            {categories.map((cat) => {
              const active = cat === activeCategory
              const count = grouped.find((g) => g.category === cat)?.cars.length || 0
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`fleet-stage__tab${active ? ' is-active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  <span>{cat}</span>
                  <span className="fleet-stage__tab-count">{count}</span>
                </button>
              )
            })}
          </div>
        )}

        {featured && (
          <div className="fleet-stage__stage">
            <AnimatePresence mode="wait">
              <Motion.div
                key={featured._id}
                className="fleet-stage__spotlight"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="fleet-stage__media" aria-hidden={!featured}>
                  <div className="fleet-stage__media-glow" />
                  <ResponsiveImage
                    src={imageSrc}
                    fallbackSrc={assets.car_image1}
                    alt={`${featured.brand} ${featured.model}`}
                    widths={[640, 960, 1280]}
                    sizes="(max-width: 899px) 92vw, 58vw"
                    width={960}
                    height={600}
                    loading="lazy"
                    decoding="async"
                    className="fleet-stage__img"
                  />
                </div>

                <div className="fleet-stage__copy">
                  <div className="fleet-stage__copy-top">
                    <p className="fleet-stage__availability">
                      <span
                        className={`fleet-stage__availability-dot${available ? ' is-on' : ''}`}
                        aria-hidden
                      />
                      {available ? t('carCard.available') : t('carCard.unavailable')}
                    </p>
                    <h3 className="fleet-stage__name">
                      {featured.brand} {featured.model}
                    </h3>
                    <p className="fleet-stage__meta">
                      {[featured.category, featured.year].filter(Boolean).join(' · ')}
                    </p>
                  </div>

                  <dl className="fleet-stage__specs">
                    <div>
                      <dt>{t('featured.specSeats')}</dt>
                      <dd>{featured.seating_capacity || '—'}</dd>
                    </div>
                    <div>
                      <dt>{t('featured.specFuel')}</dt>
                      <dd>{featured.fuel_type || '—'}</dd>
                    </div>
                    <div>
                      <dt>{t('featured.specGear')}</dt>
                      <dd>{featured.transmission || '—'}</dd>
                    </div>
                  </dl>

                  {locationLabel ? (
                    <p className="fleet-stage__location">{locationLabel}</p>
                  ) : null}

                  <div className="fleet-stage__footer">
                    <p className="fleet-stage__price">
                      <span className="fleet-stage__price-value">
                        {currency}
                        {featured.pricePerDay}
                      </span>
                      <span className="fleet-stage__price-unit">{t('carCard.perDay')}</span>
                    </p>
                    <Link
                      to={`/car-details/${featured._id}`}
                      onClick={() => window.scrollTo(0, 0)}
                      className="fleet-stage__cta"
                    >
                      {t('carCard.viewDetails')}
                      <span aria-hidden>→</span>
                    </Link>
                  </div>
                </div>
              </Motion.div>
            </AnimatePresence>

            {categoryCars.length > 1 && (
              <div className="fleet-stage__rail" role="list" aria-label={t('featured.railAria')}>
                {categoryCars.map((car) => {
                  const selected = car._id === featured._id
                  const thumb = car.image || car.images?.[0] || assets.car_image1
                  return (
                    <button
                      key={car._id}
                      type="button"
                      role="listitem"
                      className={`fleet-stage__rail-item${selected ? ' is-active' : ''}`}
                      aria-pressed={selected}
                      onClick={() => setActiveId(car._id)}
                    >
                      <span className="fleet-stage__rail-thumb">
                        <img src={thumb} alt="" loading="lazy" />
                      </span>
                      <span className="fleet-stage__rail-text">
                        <span className="fleet-stage__rail-name">
                          {car.brand} {car.model}
                        </span>
                        <span className="fleet-stage__rail-price">
                          {currency}
                          {car.pricePerDay}
                          <span>{t('carCard.perDay')}</span>
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <div className="fleet-stage__actions">
          <Link
            to={activeCategory ? `/cars?category=${encodeURIComponent(activeCategory)}` : '/cars'}
            onClick={() => window.scrollTo(0, 0)}
            className="fleet-stage__explore"
          >
            {t('featured.exploreAll')}
            <span aria-hidden>→</span>
          </Link>
          <Link
            to={AIRPORT_LANDING_PATH}
            onClick={() => window.scrollTo(0, 0)}
            className="fleet-stage__airport"
          >
            {t('featured.airportLink')}
          </Link>
        </div>
      </div>
    </section>
  )
}

export default FeaturedSection

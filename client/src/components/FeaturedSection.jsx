import React, { useMemo, useRef, useState } from 'react'
import { assets } from '../assets/assets'
import CategorySection from './CategorySection'
import { Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { motion as Motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { useI18n } from '../i18n/I18nContext'
import { groupCarsByCategory } from '../utils/vehicleCategories'
import { AIRPORT_LANDING_PATH } from '../constants/site'
import ResponsiveImage from './ResponsiveImage'
import { formatLocationsDisplay } from '../utils/carLocations'

const displayNames = (car) => {
  let brand = String(car.brand || '').replace(/\s*[-–—|/]+\s*$/g, '').trim()
  let model = String(car.model || '').replace(/^\s*[-–—|/]+\s*/g, '').trim()
  if (brand && model) {
    const brandRe = new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[-–—]?\\s*`, 'i')
    model = model.replace(brandRe, '').trim() || model
  }
  return { brand, model: model || String(car.model || '').trim() }
}

/** Hero vehicle panel — car fills the frame; copy is secondary. */
const SpotlightStage = ({ car, currency, t }) => {
  const stageRef = useRef(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 70, damping: 20 })
  const sy = useSpring(my, { stiffness: 70, damping: 20 })
  const carX = useTransform(sx, [-0.5, 0.5], [-10, 10])
  const carY = useTransform(sy, [-0.5, 0.5], [-6, 6])
  const { brand, model } = useMemo(() => displayNames(car), [car.brand, car.model])
  const available = Boolean(car.isAvaliable)
  const locationLabel = formatLocationsDisplay(car)

  const onMove = (e) => {
    const el = stageRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width - 0.5)
    my.set((e.clientY - r.top) / r.height - 0.5)
  }

  return (
    <Motion.div
      ref={stageRef}
      className="fleet-hero"
      onMouseMove={onMove}
      onMouseLeave={() => {
        mx.set(0)
        my.set(0)
      }}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to={`/car-details/${car._id}`}
        onClick={() => window.scrollTo(0, 0)}
        className="fleet-hero__visual"
        aria-label={`${brand} ${model}`.trim()}
      >
        <div className="fleet-hero__studio" aria-hidden />
        <div className="fleet-hero__bloom" aria-hidden />
        <div className="fleet-hero__ground" aria-hidden />
        <Motion.div className="fleet-hero__car" style={{ x: carX, y: carY }}>
          <ResponsiveImage
            src={car.image || car.images?.[0] || assets.car_image1}
            fallbackSrc={assets.car_image1}
            alt={`${brand} ${model}`.trim()}
            widths={[640, 960, 1280, 1600]}
            sizes="(max-width: 767px) 100vw, (max-width: 1100px) 100vw, 72vw"
            width={1280}
            height={720}
            loading="eager"
            decoding="async"
            className="fleet-hero__img"
          />
        </Motion.div>
      </Link>

      <div className="fleet-hero__panel">
        <p className="fleet-hero__status">
          <span className={`fleet-hero__dot${available ? ' is-on' : ''}`} aria-hidden />
          {available ? t('carCard.available') : t('carCard.unavailable')}
        </p>
        {brand ? <p className="fleet-hero__brand">{brand}</p> : null}
        <h3 className="fleet-hero__model">{model}</h3>
        <p className="fleet-hero__meta">
          {[car.category, car.year, car.transmission].filter(Boolean).join(' · ')}
        </p>

        <div className="fleet-hero__price">
          <span className="fleet-hero__currency">{currency.trim()}</span>
          <span className="fleet-hero__amount tabular-nums">{car.pricePerDay}</span>
          <span className="fleet-hero__unit">{t('carCard.perDay')}</span>
        </div>

        {locationLabel ? <p className="fleet-hero__loc">{locationLabel}</p> : null}

        <Link
          to={`/car-details/${car._id}`}
          onClick={() => window.scrollTo(0, 0)}
          className="fleet-hero__cta"
        >
          {t('carCard.viewDetails')}
          <span aria-hidden>→</span>
        </Link>
      </div>
    </Motion.div>
  )
}

const FeaturedSection = () => {
  const { cars } = useAppContext()
  const { t } = useI18n()
  const currency = import.meta.env.VITE_CURRENCY || 'MAD '
  const [activeCat, setActiveCat] = useState(null)

  const sections = useMemo(() => {
    const grouped = groupCarsByCategory(cars)
    return grouped.slice(0, 3).map((s) => ({
      category: s.category,
      total: s.cars.length,
      cars: s.cars.slice(0, 3),
    }))
  }, [cars])

  const spotlight = useMemo(() => {
    const available = cars.find((c) => c.isAvaliable)
    return available || cars[0] || null
  }, [cars])

  const visibleSections = activeCat
    ? sections.filter((s) => s.category === activeCat)
    : sections

  return (
    <section className="fleet-live relative overflow-hidden">
      <div className="fleet-live__mesh" aria-hidden />
      <div className="fleet-live__grain" aria-hidden />

      <div className="relative page-pad page-shell py-16 md:py-22 lg:py-28">
        <Motion.header
          className="fleet-live__intro fleet-live__intro--solo"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="fleet-live__eyebrow">{t('featured.eyebrow')}</p>
          <h2 className="fleet-live__headline">{t('featured.title')}</h2>
          <p className="fleet-live__lede">{t('featured.subtitle')}</p>
        </Motion.header>

        {spotlight ? (
          <div className="mt-10 md:mt-12">
            <SpotlightStage car={spotlight} currency={currency} t={t} />
          </div>
        ) : null}

        {sections.length > 1 ? (
          <nav className="fleet-live__filters" aria-label={t('cars.categoryLabel')}>
            <button
              type="button"
              className={`fleet-live__chip${!activeCat ? ' is-active' : ''}`}
              onClick={() => setActiveCat(null)}
            >
              {t('cars.allCategories')}
            </button>
            {sections.map((s) => (
              <button
                key={s.category}
                type="button"
                className={`fleet-live__chip${activeCat === s.category ? ' is-active' : ''}`}
                onClick={() => setActiveCat(s.category)}
              >
                {s.category}
              </button>
            ))}
          </nav>
        ) : null}

        <div className="relative mt-10 md:mt-14 space-y-12 md:space-y-16">
          {visibleSections.map((section, idx) => (
            <CategorySection
              key={section.category}
              category={section.category}
              count={section.total}
              cars={section.cars}
              index={idx + 1}
              kinetic
              actionTo={`/cars?category=${encodeURIComponent(section.category)}`}
              actionLabel={t('featured.viewCategory')}
            />
          ))}
        </div>

        <Motion.div
          className="fleet-live__footer"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link to="/cars" onClick={() => window.scrollTo(0, 0)} className="fleet-live__cta">
            <span>{t('featured.exploreAll')}</span>
            <img
              src={assets.arrow_icon}
              alt=""
              width={14}
              height={14}
              loading="lazy"
              className="fleet-live__cta-icon"
            />
          </Link>
          <Link
            to={AIRPORT_LANDING_PATH}
            onClick={() => window.scrollTo(0, 0)}
            className="fleet-live__airport"
          >
            {t('featured.airportLink')}
          </Link>
        </Motion.div>
      </div>
    </section>
  )
}

export default FeaturedSection

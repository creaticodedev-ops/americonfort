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

const SpotlightStage = ({ car, currency, t }) => {
  const stageRef = useRef(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 90, damping: 18 })
  const sy = useSpring(my, { stiffness: 90, damping: 18 })
  const carX = useTransform(sx, [-0.5, 0.5], [-18, 18])
  const carY = useTransform(sy, [-0.5, 0.5], [-10, 10])
  const glowX = useTransform(sx, [-0.5, 0.5], ['32%', '68%'])
  const glowY = useTransform(sy, [-0.5, 0.5], ['28%', '55%'])
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

  const onLeave = () => {
    mx.set(0)
    my.set(0)
  }

  return (
    <Motion.div
      ref={stageRef}
      className="fleet-spotlight"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="fleet-spotlight__backdrop" aria-hidden>
        <Motion.div className="fleet-spotlight__orb fleet-spotlight__orb--a" style={{ left: glowX, top: glowY }} />
        <div className="fleet-spotlight__orb fleet-spotlight__orb--b" />
        <div className="fleet-spotlight__orb fleet-spotlight__orb--c" />
        <div className="fleet-spotlight__rings" />
      </div>

      <div className="fleet-spotlight__copy">
        <Motion.p
          className="fleet-spotlight__tag"
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          <span className={`fleet-spotlight__live${available ? ' is-on' : ''}`} />
          {available ? t('carCard.available') : t('carCard.unavailable')}
          <span className="fleet-spotlight__tag-sep">·</span>
          {t('featured.spotlightLabel')}
        </Motion.p>

        {brand ? <p className="fleet-spotlight__brand">{brand}</p> : null}
        <h3 className="fleet-spotlight__model">{model}</h3>
        <p className="fleet-spotlight__meta">
          {[car.category, car.year, car.transmission].filter(Boolean).join(' · ')}
        </p>

        <div className="fleet-spotlight__price-row">
          <p className="fleet-spotlight__price">
            <span className="fleet-spotlight__currency">{currency.trim()}</span>
            <span className="fleet-spotlight__amount tabular-nums">{car.pricePerDay}</span>
            <span className="fleet-spotlight__unit">{t('carCard.perDay')}</span>
          </p>
          {locationLabel ? <p className="fleet-spotlight__loc">{locationLabel}</p> : null}
        </div>

        <Link
          to={`/car-details/${car._id}`}
          onClick={() => window.scrollTo(0, 0)}
          className="fleet-spotlight__cta"
        >
          <span>{t('carCard.viewDetails')}</span>
          <span aria-hidden>→</span>
        </Link>
      </div>

      <Link
        to={`/car-details/${car._id}`}
        onClick={() => window.scrollTo(0, 0)}
        className="fleet-spotlight__stage"
        aria-label={`${brand} ${model}`.trim()}
      >
        <Motion.div className="fleet-spotlight__car" style={{ x: carX, y: carY }}>
          <ResponsiveImage
            src={car.image || car.images?.[0] || assets.car_image1}
            fallbackSrc={assets.car_image1}
            alt={`${brand} ${model}`.trim()}
            widths={[640, 960, 1280]}
            sizes="(max-width: 900px) 92vw, 55vw"
            width={960}
            height={540}
            loading="eager"
            decoding="async"
            className="fleet-spotlight__img"
          />
        </Motion.div>
        <div className="fleet-spotlight__floor" aria-hidden />
        {car.year ? (
          <span className="fleet-spotlight__year" aria-hidden>
            {car.year}
          </span>
        ) : null}
      </Link>
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

  const fleetCount = cars.length
  const visibleSections = activeCat
    ? sections.filter((s) => s.category === activeCat)
    : sections

  return (
    <section className="fleet-live relative overflow-hidden">
      <div className="fleet-live__mesh" aria-hidden />
      <div className="fleet-live__beam" aria-hidden />
      <div className="fleet-live__grain" aria-hidden />

      <div className="relative page-pad page-shell py-16 md:py-24">
        <Motion.header
          className="fleet-live__intro"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div>
            <p className="fleet-live__eyebrow">
              <span className="fleet-live__pulse" aria-hidden />
              {t('featured.eyebrow')}
            </p>
            <h2 className="fleet-live__title">
              <span className="fleet-live__brand">Americonfort</span>
              <span className="fleet-live__headline">{t('featured.title')}</span>
            </h2>
            <p className="fleet-live__lede">{t('featured.subtitle')}</p>
          </div>

          <Motion.div
            className="fleet-live__stat"
            initial={{ scale: 0.92, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 160, damping: 16 }}
          >
            <span className="fleet-live__stat-value tabular-nums">{fleetCount}</span>
            <span className="fleet-live__stat-label">{t('featured.fleetCountLabel')}</span>
          </Motion.div>
        </Motion.header>

        {spotlight ? (
          <div className="mt-10 md:mt-14">
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
                <span className="fleet-live__chip-count">{s.total}</span>
              </button>
            ))}
          </nav>
        ) : null}

        <div className="relative mt-12 md:mt-16 space-y-14 md:space-y-20">
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
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link to="/cars" onClick={() => window.scrollTo(0, 0)} className="fleet-live__cta">
            <span className="fleet-live__cta-shine" aria-hidden />
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

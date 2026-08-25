import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { useI18n } from '../i18n/I18nContext'
import { assets } from '../assets/assets'
import ResponsiveImage from './ResponsiveImage'

const AUTO_MS = 5600
const MAX_SLIDES = 6

const cleanNames = (car) => {
  let brand = String(car.brand || '').replace(/\s*[-–—|/]+\s*$/g, '').trim()
  let model = String(car.model || '').replace(/^\s*[-–—|/]+\s*/g, '').trim()
  if (brand && model) {
    const brandRe = new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[-–—]?\\s*`, 'i')
    model = model.replace(brandRe, '').trim() || model
  }
  return { brand, model: model || String(car.model || '').trim() }
}

/** Prefer available cars, diversify by category, cap for the reel. */
const pickShowroomCars = (cars) => {
  if (!Array.isArray(cars) || cars.length === 0) return []
  const withImage = cars.filter((c) => c?.image || c?.images?.[0])
  const pool = withImage.length ? withImage : cars
  const available = pool.filter((c) => c.isAvaliable)
  const source = available.length >= 3 ? available : pool

  const byCategory = new Map()
  source.forEach((car) => {
    const key = car.category || 'Fleet'
    if (!byCategory.has(key)) byCategory.set(key, [])
    byCategory.get(key).push(car)
  })

  const picked = []
  const categories = [...byCategory.keys()]
  let guard = 0
  while (picked.length < Math.min(MAX_SLIDES, source.length) && guard < 40) {
    const cat = categories[guard % categories.length]
    const list = byCategory.get(cat)
    if (list?.length) {
      const car = list.shift()
      if (car && !picked.some((p) => p._id === car._id)) picked.push(car)
    }
    guard += 1
  }

  if (picked.length < Math.min(3, source.length)) {
    for (const car of source) {
      if (picked.length >= MAX_SLIDES) break
      if (!picked.some((p) => p._id === car._id)) picked.push(car)
    }
  }
  return picked
}

/**
 * Cinematic autoplay fleet showroom — replaces the old testimonials block.
 * Real fleet data only; booking/navigation unchanged.
 */
const FleetShowcase = () => {
  const { cars, carsLoading } = useAppContext()
  const { t } = useI18n()
  const currency = import.meta.env.VITE_CURRENCY || 'MAD '
  const fallbackImage = assets.car_image1

  const slides = useMemo(() => pickShowroomCars(cars), [cars])
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [progressKey, setProgressKey] = useState(0)
  const touchX = useRef(null)
  const sectionRef = useRef(null)

  const count = slides.length
  const active = slides[index] || null
  const names = active ? cleanNames(active) : { brand: '', model: '' }
  const available = active ? Boolean(active.isAvaliable) : false

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduceMotion(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    setIndex(0)
    setProgressKey((k) => k + 1)
  }, [slides.length])

  const goTo = useCallback(
    (next) => {
      if (count <= 0) return
      setIndex(((next % count) + count) % count)
      setProgressKey((k) => k + 1)
    },
    [count],
  )

  const next = useCallback(() => goTo(index + 1), [goTo, index])
  const prev = useCallback(() => goTo(index - 1), [goTo, index])

  useEffect(() => {
    if (reduceMotion || paused || count <= 1) return undefined
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % count)
      setProgressKey((k) => k + 1)
    }, AUTO_MS)
    return () => window.clearInterval(id)
  }, [reduceMotion, paused, count, progressKey])

  const onPointerDown = (e) => {
    touchX.current = e.clientX
  }
  const onPointerUp = (e) => {
    if (touchX.current == null) return
    const dx = e.clientX - touchX.current
    touchX.current = null
    if (Math.abs(dx) < 48) return
    if (dx < 0) next()
    else prev()
  }

  if (carsLoading && count === 0) {
    return (
      <section className="fleet-reel fleet-reel--loading" aria-busy="true">
        <div className="fleet-reel__shell page-pad page-shell">
          <div className="fleet-reel__skeleton" />
        </div>
      </section>
    )
  }

  if (count === 0) return null

  return (
    <section
      ref={sectionRef}
      className={`fleet-reel${reduceMotion ? ' is-reduced' : ''}${paused ? ' is-paused' : ''}`}
      aria-roledescription="carousel"
      aria-label={t('showcase.aria')}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false)
      }}
    >
      <div className="fleet-reel__atmosphere" aria-hidden="true" />

      <div className="fleet-reel__shell page-pad page-shell">
        <header className="fleet-reel__header">
          <p className="fleet-reel__eyebrow">{t('showcase.eyebrow')}</p>
          <h2 className="fleet-reel__title">{t('showcase.title')}</h2>
          <p className="fleet-reel__lead">{t('showcase.subtitle')}</p>
        </header>

        <div
          className="fleet-reel__stage"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            touchX.current = null
          }}
        >
          <div className="fleet-reel__viewport">
            {slides.map((car, i) => {
              const isActive = i === index
              const { brand, model } = cleanNames(car)
              const src = car.image || car.images?.[0] || fallbackImage
              return (
                <div
                  key={car._id}
                  className={`fleet-reel__slide${isActive ? ' is-active' : ''}`}
                  aria-hidden={!isActive}
                >
                  <div className="fleet-reel__media">
                    <div className="fleet-reel__media-glow" />
                    <div className="fleet-reel__media-floor" />
                    {(isActive || Math.abs(i - index) <= 1) && (
                      <ResponsiveImage
                        src={src}
                        fallbackSrc={fallbackImage}
                        alt={`${brand} ${model}`.trim()}
                        widths={[640, 960, 1280]}
                        sizes="(max-width: 767px) 92vw, 58vw"
                        width={1280}
                        height={720}
                        loading={i === 0 ? 'eager' : 'lazy'}
                        decoding="async"
                        className="fleet-reel__img"
                      />
                    )}
                    <div className="fleet-reel__sheen" aria-hidden="true" />
                  </div>
                </div>
              )
            })}
          </div>

          <aside className="fleet-reel__copy">
            <div className="fleet-reel__copy-inner" key={active._id}>
              <div className="fleet-reel__badges">
                {active.category ? (
                  <span className="fleet-reel__badge">{active.category}</span>
                ) : null}
                <span className={`fleet-reel__badge fleet-reel__badge--status${available ? ' is-on' : ' is-off'}`}>
                  <span className="fleet-reel__badge-dot" aria-hidden />
                  {available ? t('carCard.available') : t('carCard.unavailable')}
                </span>
              </div>

              <p className="fleet-reel__brand">{names.brand}</p>
              <h3 className="fleet-reel__model">{names.model}</h3>

              {(active.category || active.year) && (
                <p className="fleet-reel__meta">
                  {[active.category, active.year].filter(Boolean).join(' · ')}
                </p>
              )}

              <p className="fleet-reel__price">
                <span className="fleet-reel__price-value">
                  {currency}
                  {active.pricePerDay}
                </span>
                <span className="fleet-reel__price-unit">{t('carCard.perDay')}</span>
              </p>

              <dl className="fleet-reel__specs">
                {active.seating_capacity ? (
                  <div>
                    <dt>{t('showcase.specSeats')}</dt>
                    <dd>{active.seating_capacity}</dd>
                  </div>
                ) : null}
                {active.fuel_type ? (
                  <div>
                    <dt>{t('showcase.specFuel')}</dt>
                    <dd>{active.fuel_type}</dd>
                  </div>
                ) : null}
                {active.transmission ? (
                  <div>
                    <dt>{t('showcase.specGear')}</dt>
                    <dd>{active.transmission}</dd>
                  </div>
                ) : null}
              </dl>

              <div className="fleet-reel__actions">
                <Link
                  to={`/car-details/${active._id}`}
                  onClick={() => window.scrollTo(0, 0)}
                  className="fleet-reel__cta"
                >
                  {t('showcase.viewVehicle')}
                  <span aria-hidden>→</span>
                </Link>
                <Link to="/cars" onClick={() => window.scrollTo(0, 0)} className="fleet-reel__secondary">
                  {t('showcase.browseFleet')}
                </Link>
              </div>
            </div>
          </aside>
        </div>

        <div className="fleet-reel__controls">
          <button type="button" className="fleet-reel__nav" onClick={prev} aria-label={t('showcase.prev')}>
            ←
          </button>

          <div className="fleet-reel__progress" aria-hidden={!count}>
            <div className="fleet-reel__progress-track">
              {!reduceMotion && (
                <span
                  key={progressKey}
                  className={`fleet-reel__progress-fill${paused ? ' is-paused' : ''}`}
                  style={{ animationDuration: `${AUTO_MS}ms` }}
                />
              )}
            </div>
            <div className="fleet-reel__dots" role="tablist" aria-label={t('showcase.aria')}>
              {slides.map((car, i) => (
                <button
                  key={car._id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`${cleanNames(car).brand} ${cleanNames(car).model}`.trim()}
                  className={`fleet-reel__dot${i === index ? ' is-active' : ''}`}
                  onClick={() => goTo(i)}
                />
              ))}
            </div>
            <p className="fleet-reel__counter">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <span aria-hidden>/</span>
              <span>{String(count).padStart(2, '0')}</span>
            </p>
          </div>

          <button type="button" className="fleet-reel__nav" onClick={next} aria-label={t('showcase.next')}>
            →
          </button>
        </div>
      </div>
    </section>
  )
}

export default FleetShowcase

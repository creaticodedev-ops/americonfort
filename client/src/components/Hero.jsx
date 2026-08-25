import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { assets } from '../assets/assets'
import { useAppContext } from '../context/AppContext'
import { useI18n } from '../i18n/I18nContext'
import DateRangePicker from './DateRangePicker'
import CitySelect from './CitySelect'
import { BRAND_NAME } from '../constants/brand'
import { AIRPORT_LANDING_PATH } from '../constants/site'
import toast from 'react-hot-toast'

/**
 * Flagship homepage hero — cinematic automotive showroom.
 * Booking logic unchanged; parallax via CSS vars + rAF (no per-frame React state).
 */
const Hero = () => {
  const [pickupLocation, setPickupLocation] = useState('')
  const [hudTime, setHudTime] = useState('')
  const [ready, setReady] = useState(false)
  const stageRef = useRef(null)
  const { t, language } = useI18n()
  const { pickupDate, setPickupDate, returnDate, setReturnDate, navigate, pickupLocations } =
    useAppContext()

  const cities = useMemo(() => {
    return [...new Set(pickupLocations.map((location) => location.city))].sort()
  }, [pickupLocations])

  const startISO = typeof pickupDate === 'string' ? pickupDate.slice(0, 10) : ''
  const endISO = typeof returnDate === 'string' ? returnDate.slice(0, 10) : ''

  const handleSearch = (e) => {
    e.preventDefault()
    if (!pickupLocation) {
      toast.error(t('hero.selectLocation'))
      return
    }
    if (!startISO || !endISO) {
      toast.error(t('hero.selectDates'))
      return
    }
    if (endISO < startISO) {
      toast.error(t('hero.invalidRange'))
      return
    }
    navigate(
      `/cars?${new URLSearchParams({
        pickupLocation,
        pickupDate: startISO,
        returnDate: endISO,
      }).toString()}`,
    )
  }

  /* Entrance gate — lets atmosphere paint first, then unlocks vehicle choreography */
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setReady(true)
      return undefined
    }
    const id = window.setTimeout(() => setReady(true), 90)
    return () => window.clearTimeout(id)
  }, [])

  /* Casablanca instrument clock */
  useEffect(() => {
    const fmt = () => {
      try {
        setHudTime(
          new Intl.DateTimeFormat(language === 'ar' ? 'ar-MA' : language || 'en', {
            timeZone: 'Africa/Casablanca',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }).format(new Date()),
        )
      } catch {
        setHudTime('')
      }
    }
    fmt()
    const id = window.setInterval(fmt, 30_000)
    return () => window.clearInterval(id)
  }, [language])

  /* Mouse + scroll parallax via CSS variables (GPU transforms only) */
  useEffect(() => {
    const el = stageRef.current
    if (!el) return undefined

    const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const fineMq = window.matchMedia('(pointer: fine)')
    const narrowMq = window.matchMedia('(max-width: 767px)')

    let mx = 0
    let my = 0
    let tx = 0
    let ty = 0
    let scroll = 0
    let raf = 0
    let active = true

    const canParallax = () => !reduceMq.matches && fineMq.matches && !narrowMq.matches

    const onPointer = (e) => {
      if (!canParallax()) return
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) return
      mx = ((e.clientX - r.left) / r.width - 0.5) * 2
      my = ((e.clientY - r.top) / r.height - 0.5) * 2
    }

    const onScroll = () => {
      const r = el.getBoundingClientRect()
      const span = Math.max(r.height * 0.7, 1)
      scroll = Math.min(1, Math.max(0, -r.top / span))
    }

    const tick = () => {
      if (!active) return
      if (canParallax()) {
        tx += (mx - tx) * 0.055
        ty += (my - ty) * 0.055
      } else {
        tx += (0 - tx) * 0.08
        ty += (0 - ty) * 0.08
      }
      el.style.setProperty('--px', tx.toFixed(4))
      el.style.setProperty('--py', ty.toFixed(4))
      el.style.setProperty('--scroll', scroll.toFixed(4))
      raf = requestAnimationFrame(tick)
    }

    onScroll()
    raf = requestAnimationFrame(tick)
    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    return () => {
      active = false
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <section
      ref={stageRef}
      className={`hero-stage${ready ? ' is-ready' : ''}`}
      aria-label={BRAND_NAME}
      style={{ '--px': 0, '--py': 0, '--scroll': 0 }}
    >
      <div className="hero-stage__camera">
        {/* L1–L3 atmosphere */}
        <div className="hero-stage__atmosphere" aria-hidden="true">
          <div className="hero-stage__glow hero-stage__glow--primary" />
          <div className="hero-stage__glow hero-stage__glow--warm" />
          <div className="hero-stage__glow hero-stage__glow--rim" />
          <div className="hero-stage__horizon" />
          <div className="hero-stage__grain" />
        </div>

        <div className="hero-stage__inner page-pad page-shell">
          {/* L9 typography */}
          <header className="hero-stage__intro">
            <p className="hero-stage__brand">
              <span className="hero-stage__reveal">{BRAND_NAME}</span>
            </p>
            <h1 className="hero-stage__title">
              <span className="hero-stage__reveal hero-stage__reveal--d1">{t('hero.title')}</span>
            </h1>
            <p className="hero-stage__lead">
              <span className="hero-stage__reveal hero-stage__reveal--d2">{t('hero.subtitle')}</span>
            </p>
          </header>

          {/* L10 booking — stable after entrance */}
          <form onSubmit={handleSearch} className="hero-stage__booking">
            <p className="hero-stage__booking-label">
              <span className="hero-stage__reveal hero-stage__reveal--d3">{t('hero.bookingLabel')}</span>
            </p>

            <div className="hero-stage__console">
              <div className="hero-stage__field hero-stage__field--city">
                <CitySelect
                  value={pickupLocation}
                  onChange={setPickupLocation}
                  options={cities}
                  label={t('hero.pickupLocation')}
                  placeholder={t('hero.selectLocation')}
                />
              </div>

              <div className="hero-stage__field hero-stage__field--dates">
                <DateRangePicker
                  startDate={startISO}
                  endDate={endISO}
                  onChange={({ startDate, endDate }) => {
                    setPickupDate(startDate)
                    setReturnDate(endDate)
                  }}
                />
              </div>

              <div className="hero-stage__field hero-stage__field--submit">
                <button type="submit" className="hero-stage__submit">
                  <span className="hero-stage__submit-shine" aria-hidden="true" />
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20l-3.5-3.5" />
                  </svg>
                  <span>{t('hero.search')}</span>
                </button>
              </div>
            </div>

            <p className="hero-stage__trust">
              <span className="hero-stage__reveal hero-stage__reveal--d4">{t('hero.trustLine')}</span>
            </p>
          </form>

          {/* L4–L7 vehicle showroom */}
          <div className="hero-stage__vehicle">
            <div className="hero-stage__floor" aria-hidden="true" />
            <div className="hero-stage__spill" aria-hidden="true" />
            <div className="hero-stage__shadow" aria-hidden="true" />

            <div className="hero-stage__rig">
              <div className="hero-stage__float">
                <div className="hero-stage__car">
                  <picture>
                    <source
                      type="image/avif"
                      srcSet={`${assets.main_car_avif_640} 640w, ${assets.main_car_avif_960} 960w, ${assets.main_car_avif_1280} 1280w`}
                      sizes="(max-width: 640px) 96vw, (max-width: 1024px) 92vw, 1120px"
                    />
                    <source
                      type="image/webp"
                      srcSet={`${assets.main_car_640} 640w, ${assets.main_car} 960w, ${assets.main_car_1280} 1280w`}
                      sizes="(max-width: 640px) 96vw, (max-width: 1024px) 92vw, 1120px"
                    />
                    <img
                      src={assets.main_car}
                      alt={`${BRAND_NAME} premium rental`}
                      width={1280}
                      height={511}
                      fetchPriority="high"
                      decoding="async"
                      className="hero-stage__img"
                    />
                  </picture>

                  <span className="hero-stage__sheen" aria-hidden="true" />
                  <span className="hero-stage__lamp hero-stage__lamp--a" aria-hidden="true" />
                  <span className="hero-stage__lamp hero-stage__lamp--b" aria-hidden="true" />
                </div>

                <div className="hero-stage__reflection" aria-hidden="true">
                  <img
                    src={assets.main_car}
                    alt=""
                    width={1280}
                    height={511}
                    loading="lazy"
                    decoding="async"
                    className="hero-stage__img hero-stage__img--mirror"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* L8 instrument HUD */}
          <div className="hero-stage__hud">
            <div className="hero-stage__hud-row">
              <span className="hero-stage__hud-dot" aria-hidden="true" />
              <span className="hero-stage__hud-label">{t('hero.localEyebrow')}</span>
              {hudTime ? (
                <span className="hero-stage__hud-time" aria-hidden="true">
                  {hudTime}
                </span>
              ) : null}
            </div>
            <p className="hero-stage__local-copy">
              {t('hero.localLead')}{' '}
              <Link to={AIRPORT_LANDING_PATH} className="hero-stage__local-link">
                {t('hero.localLink')}
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="hero-stage__bridge" aria-hidden="true" />
    </section>
  )
}

export default Hero

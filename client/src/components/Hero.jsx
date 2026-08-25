import React, { useEffect, useMemo, useRef, useState } from 'react'
import { assets } from '../assets/assets'
import { useAppContext } from '../context/AppContext'
import { useI18n } from '../i18n/I18nContext'
import DateRangePicker from './DateRangePicker'
import CitySelect from './CitySelect'
import { BRAND_NAME } from '../constants/brand'
import toast from 'react-hot-toast'

/**
 * Flagship hero — living automotive studio.
 * Signature: the Aperture (elliptical showroom light ring + kinetic bead).
 * Booking logic unchanged. Motion via CSS vars + rAF.
 */
const Hero = () => {
  const [pickupLocation, setPickupLocation] = useState('')
  const [hudTime, setHudTime] = useState('')
  const [ready, setReady] = useState(false)
  const [carHot, setCarHot] = useState(false)
  const stageRef = useRef(null)
  const cursorRef = useRef(null)
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

  /* Choreography gate — atmosphere first, then the reveal sequence */
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setReady(true)
      return undefined
    }
    const id = window.setTimeout(() => setReady(true), 120)
    return () => window.clearTimeout(id)
  }, [])

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

  /* Parallax + custom cursor — DOM writes only, no React re-renders */
  useEffect(() => {
    const el = stageRef.current
    const cursor = cursorRef.current
    if (!el) return undefined

    const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const fineMq = window.matchMedia('(pointer: fine)')
    const narrowMq = window.matchMedia('(max-width: 767px)')

    let mx = 0
    let my = 0
    let tx = 0
    let ty = 0
    let cx = 0
    let cy = 0
    let tcx = 0
    let tcy = 0
    let scroll = 0
    let raf = 0
    let active = true
    let cursorOn = false

    const canParallax = () => !reduceMq.matches && fineMq.matches && !narrowMq.matches
    const canCursor = () => fineMq.matches && !narrowMq.matches && !reduceMq.matches

    const onPointer = (e) => {
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) return
      const inside =
        e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom

      if (canParallax() && inside) {
        mx = ((e.clientX - r.left) / r.width - 0.5) * 2
        my = ((e.clientY - r.top) / r.height - 0.5) * 2
      } else if (!inside) {
        mx = 0
        my = 0
      }

      if (canCursor()) {
        cursorOn = inside
        cx = e.clientX
        cy = e.clientY
        if (cursor) {
          cursor.dataset.on = inside ? '1' : '0'
          const target = e.target
          const mode =
            target?.closest?.('.hero-stage__submit')
              ? 'cta'
              : target?.closest?.('.hero-stage__console')
                ? 'field'
                : target?.closest?.('.hero-stage__car')
                  ? 'car'
                  : 'default'
          cursor.dataset.mode = mode
        }
      }
    }

    const onScroll = () => {
      const r = el.getBoundingClientRect()
      const span = Math.max(r.height * 0.7, 1)
      scroll = Math.min(1, Math.max(0, -r.top / span))
    }

    const tick = () => {
      if (!active) return
      if (canParallax()) {
        tx += (mx - tx) * 0.05
        ty += (my - ty) * 0.05
      } else {
        tx += (0 - tx) * 0.08
        ty += (0 - ty) * 0.08
      }
      el.style.setProperty('--px', tx.toFixed(4))
      el.style.setProperty('--py', ty.toFixed(4))
      el.style.setProperty('--scroll', scroll.toFixed(4))

      if (cursor && canCursor()) {
        tcx += (cx - tcx) * 0.22
        tcy += (cy - tcy) * 0.22
        cursor.style.transform = `translate3d(${tcx}px, ${tcy}px, 0)`
        cursor.style.opacity = cursorOn ? '1' : '0'
      }

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
      className={`hero-stage${ready ? ' is-ready' : ''}${carHot ? ' is-car-hot' : ''}`}
      aria-label={BRAND_NAME}
      style={{ '--px': 0, '--py': 0, '--scroll': 0 }}
    >
      <div className="hero-stage__cursor" ref={cursorRef} aria-hidden="true" data-on="0" data-mode="default">
        <span className="hero-stage__cursor-dot" />
        <span className="hero-stage__cursor-ring" />
      </div>

      <div className="hero-stage__camera">
        <div className="hero-stage__atmosphere" aria-hidden="true">
          <div className="hero-stage__void" />
          <div className="hero-stage__vol" />
          <div className="hero-stage__leak" />
          <div className="hero-stage__glow hero-stage__glow--primary" />
          <div className="hero-stage__glow hero-stage__glow--warm" />
          <div className="hero-stage__horizon" />
          <div className="hero-stage__grain" />
        </div>

        {/* Signature: Studio Aperture */}
        <div className="hero-stage__aperture" aria-hidden="true">
          <div className="hero-stage__aperture-bloom" />
          <svg className="hero-stage__aperture-ring" viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="heroApertureStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(143,31,31,0)" />
                <stop offset="35%" stopColor="rgba(143,31,31,0.35)" />
                <stop offset="55%" stopColor="rgba(255,255,255,0.55)" />
                <stop offset="75%" stopColor="rgba(143,31,31,0.28)" />
                <stop offset="100%" stopColor="rgba(143,31,31,0)" />
              </linearGradient>
            </defs>
            <ellipse
              className="hero-stage__aperture-path"
              cx="500"
              cy="300"
              rx="390"
              ry="168"
              fill="none"
              stroke="url(#heroApertureStroke)"
              strokeWidth="1.1"
            />
            <ellipse
              className="hero-stage__aperture-path hero-stage__aperture-path--soft"
              cx="500"
              cy="300"
              rx="420"
              ry="188"
              fill="none"
              stroke="rgba(143,31,31,0.08)"
              strokeWidth="18"
            />
          </svg>
          <div className="hero-stage__aperture-orbit">
            <div className="hero-stage__aperture-bead" />
          </div>
          <div className="hero-stage__arch hero-stage__arch--a" />
          <div className="hero-stage__arch hero-stage__arch--b" />
        </div>

        <div className="hero-stage__inner page-pad page-shell">
          <div className="hero-stage__meta" aria-hidden="true">
            <span className="hero-stage__meta-idx">01</span>
            <span className="hero-stage__meta-line" />
            <span className="hero-stage__meta-tag">{t('hero.metaTag')}</span>
          </div>

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

          <div className="hero-stage__vehicle">
            <div className="hero-stage__floor" aria-hidden="true" />
            <div className="hero-stage__spill" aria-hidden="true" />
            <div className="hero-stage__shadow" aria-hidden="true" />

            <div className="hero-stage__rig">
              <div className="hero-stage__float">
                <div
                  className="hero-stage__car"
                  onPointerEnter={() => setCarHot(true)}
                  onPointerLeave={() => setCarHot(false)}
                >
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
                  <span className="hero-stage__glass" aria-hidden="true" />
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

          <div className="hero-stage__hud">
            <div className="hero-stage__hud-row">
              <span className="hero-stage__hud-live">
                <span className="hero-stage__hud-dot" aria-hidden="true" />
                {t('hero.live')}
              </span>
              <span className="hero-stage__hud-label">{t('hero.localEyebrow')}</span>
              {hudTime ? <span className="hero-stage__hud-time">{hudTime}</span> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="hero-stage__scroll" aria-hidden="true">
        <span className="hero-stage__scroll-track">
          <span className="hero-stage__scroll-thumb" />
        </span>
      </div>

      <div className="hero-stage__bridge" aria-hidden="true" />
    </section>
  )
}

export default Hero

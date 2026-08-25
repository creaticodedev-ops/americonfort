import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion as Motion, useReducedMotion } from 'motion/react'
import { assets } from '../assets/assets'
import { useAppContext } from '../context/AppContext'
import { useI18n } from '../i18n/I18nContext'
import DateRangePicker from './DateRangePicker'
import CitySelect from './CitySelect'
import { BRAND_NAME } from '../constants/brand'
import { AIRPORT_LANDING_PATH } from '../constants/site'
import toast from 'react-hot-toast'

/**
 * Homepage hero — cinematic automotive showroom.
 * Booking search logic unchanged; presentation only.
 */
const Hero = () => {
  const [pickupLocation, setPickupLocation] = useState('')
  const { t } = useI18n()
  const reduceMotion = useReducedMotion()
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

  const fade = (delay = 0) =>
    reduceMotion
      ? { initial: false, animate: { opacity: 1, y: 0 } }
      : {
          initial: { opacity: 0, y: 22 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] },
        }

  return (
    <section className="hero-stage" aria-label={BRAND_NAME}>
      <div className="hero-stage__atmosphere" aria-hidden="true">
        <div className="hero-stage__glow hero-stage__glow--primary" />
        <div className="hero-stage__glow hero-stage__glow--warm" />
        <div className="hero-stage__horizon" />
        <div className="hero-stage__grain" />
      </div>

      <div className="hero-stage__inner page-pad page-shell">
        <Motion.header className="hero-stage__intro" {...fade(0.02)}>
          <p className="hero-stage__brand">{BRAND_NAME}</p>
          <h1 className="hero-stage__title">{t('hero.title')}</h1>
          <p className="hero-stage__lead">{t('hero.subtitle')}</p>
        </Motion.header>

        <Motion.form
          onSubmit={handleSearch}
          className="hero-stage__booking"
          {...fade(0.12)}
        >
          <p className="hero-stage__booking-label">{t('hero.bookingLabel')}</p>

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

          <p className="hero-stage__trust">{t('hero.trustLine')}</p>
        </Motion.form>

        <Motion.div
          className="hero-stage__vehicle"
          initial={reduceMotion ? false : { opacity: 1, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 1.05, delay: 0.2, ease: [0.22, 1, 0.36, 1] }
          }
        >
          <div className="hero-stage__floor" aria-hidden="true" />
          <div className="hero-stage__spotlight" aria-hidden="true" />

          <div className="hero-stage__car">
            <picture>
              <source
                type="image/avif"
                srcSet={`${assets.main_car_avif_640} 640w, ${assets.main_car_avif_960} 960w, ${assets.main_car_avif_1280} 1280w`}
                sizes="(max-width: 640px) 96vw, (max-width: 1024px) 90vw, 1100px"
              />
              <source
                type="image/webp"
                srcSet={`${assets.main_car_640} 640w, ${assets.main_car} 960w, ${assets.main_car_1280} 1280w`}
                sizes="(max-width: 640px) 96vw, (max-width: 1024px) 90vw, 1100px"
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
        </Motion.div>

        <Motion.div className="hero-stage__local" {...fade(0.28)}>
          <p className="hero-stage__local-eyebrow">{t('hero.localEyebrow')}</p>
          <p className="hero-stage__local-copy">
            {t('hero.localLead')}{' '}
            <Link to={AIRPORT_LANDING_PATH} className="hero-stage__local-link">
              {t('hero.localLink')}
            </Link>
          </p>
        </Motion.div>
      </div>
    </section>
  )
}

export default Hero

import React, { useMemo, useState } from 'react'
import { assets } from '../assets/assets'
import { Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { motion as Motion, AnimatePresence } from 'motion/react'
import { useI18n } from '../i18n/I18nContext'
import { groupCarsByCategory } from '../utils/vehicleCategories'
import { AIRPORT_LANDING_PATH } from '../constants/site'
import CarCard from './CarCard'

/**
 * Homepage fleet — one canvas, one card language.
 * Category filters change the set; they never change the visual system.
 */
const FeaturedSection = () => {
  const { cars } = useAppContext()
  const { t } = useI18n()
  const [activeCat, setActiveCat] = useState('')

  const sections = useMemo(() => groupCarsByCategory(cars), [cars])

  const filterCats = useMemo(
    () => sections.slice(0, 5).map((s) => s.category),
    [sections],
  )

  const showcase = useMemo(() => {
    if (activeCat) {
      const match = sections.find(
        (s) => String(s.category).toLowerCase() === activeCat.toLowerCase(),
      )
      return (match?.cars || []).slice(0, 9)
    }
    /* Balanced cross-category sample so “All” never looks like one chapter */
    const picked = []
    const seen = new Set()
    const max = 9
    let round = 0
    while (picked.length < max && round < 6) {
      for (const section of sections) {
        const car = section.cars[round]
        if (car && !seen.has(car._id)) {
          seen.add(car._id)
          picked.push(car)
          if (picked.length >= max) break
        }
      }
      round += 1
    }
    return picked
  }, [sections, activeCat])

  return (
    <section className="ac-section fleet-disc" aria-labelledby="fleet-heading">
      <div className="page-pad page-shell">
        <header className="ac-head">
          <p className="ac-eyebrow">{t('featured.eyebrow')}</p>
          <h2 id="fleet-heading" className="ac-title">
            {t('featured.title')}
          </h2>
          <p className="ac-lede">{t('featured.subtitle')}</p>
        </header>

        {filterCats.length > 0 ? (
          <div className="ac-tabs" role="tablist" aria-label={t('cars.categoryLabel')}>
            <button
              type="button"
              role="tab"
              aria-selected={!activeCat}
              className={`ac-tab${!activeCat ? ' is-on' : ''}`}
              onClick={() => setActiveCat('')}
            >
              {t('featured.allVehicles')}
            </button>
            {filterCats.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={activeCat === cat}
                className={`ac-tab${activeCat === cat ? ' is-on' : ''}`}
                onClick={() => setActiveCat(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        ) : null}

        <AnimatePresence mode="wait">
          <Motion.div
            key={activeCat || 'all'}
            className="ac-fleet-grid"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {showcase.length === 0 ? (
              <p className="ac-empty">{t('cars.noCars')}</p>
            ) : (
              showcase.map((car, i) => (
                <Motion.div
                  key={car._id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.28), duration: 0.45 }}
                >
                  <CarCard car={car} showCategory={!activeCat} />
                </Motion.div>
              ))
            )}
          </Motion.div>
        </AnimatePresence>

        <footer className="ac-section-foot">
          <Link to="/cars" onClick={() => window.scrollTo(0, 0)} className="ac-btn">
            {t('featured.exploreAll')}
            <img
              src={assets.arrow_icon}
              alt=""
              width={14}
              height={14}
              loading="lazy"
              className="ac-btn__icon"
            />
          </Link>
          <Link
            to={AIRPORT_LANDING_PATH}
            onClick={() => window.scrollTo(0, 0)}
            className="ac-text-link"
          >
            {t('featured.airportLink')}
          </Link>
        </footer>
      </div>
    </section>
  )
}

export default FeaturedSection

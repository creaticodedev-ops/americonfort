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
 * Homepage fleet discovery — one job: browse & choose a car.
 * No second hero. Filters drive a single canvas; categories become rails.
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

  const filtered = useMemo(() => {
    if (!activeCat) return null
    const match = sections.find(
      (s) => String(s.category).toLowerCase() === activeCat.toLowerCase(),
    )
    return match ? match.cars.slice(0, 6) : []
  }, [sections, activeCat])

  const rails = useMemo(
    () =>
      sections.slice(0, 3).map((s) => ({
        category: s.category,
        total: s.cars.length,
        cars: s.cars.slice(0, 4),
      })),
    [sections],
  )

  return (
    <section className="fleet-disc">
      <div className="fleet-disc__bg" aria-hidden />

      <div className="relative page-pad page-shell py-14 md:py-20 lg:py-24">
        <Motion.div
          className="fleet-disc__head"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="fleet-disc__head-copy">
            <p className="fleet-disc__eyebrow">{t('featured.eyebrow')}</p>
            <h2 className="fleet-disc__title">{t('featured.title')}</h2>
          </div>
          <p className="fleet-disc__lede">{t('featured.subtitle')}</p>
        </Motion.div>

        {filterCats.length > 0 ? (
          <div className="fleet-disc__toolbar" role="tablist" aria-label={t('cars.categoryLabel')}>
            <button
              type="button"
              role="tab"
              aria-selected={!activeCat}
              className={`fleet-disc__tab${!activeCat ? ' is-on' : ''}`}
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
                className={`fleet-disc__tab${activeCat === cat ? ' is-on' : ''}`}
                onClick={() => setActiveCat(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        ) : null}

        <AnimatePresence mode="wait">
          {activeCat && filtered ? (
            <Motion.div
              key={`grid-${activeCat}`}
              className="fleet-disc__grid"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {filtered.length === 0 ? (
                <p className="fleet-disc__empty">{t('cars.noCars')}</p>
              ) : (
                filtered.map((car, i) => (
                  <Motion.div
                    key={car._id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.25), duration: 0.45 }}
                  >
                    <CarCard car={car} />
                  </Motion.div>
                ))
              )}
            </Motion.div>
          ) : (
            <Motion.div
              key="rails"
              className="fleet-disc__rails"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              {rails.map((rail, rIdx) => (
                <Motion.div
                  key={rail.category}
                  className="fleet-disc__rail"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ delay: Math.min(rIdx * 0.06, 0.18), duration: 0.5 }}
                >
                  <div className="fleet-disc__rail-head">
                    <h3 className="fleet-disc__rail-title">{rail.category}</h3>
                    <Link
                      to={`/cars?category=${encodeURIComponent(rail.category)}`}
                      onClick={() => window.scrollTo(0, 0)}
                      className="fleet-disc__rail-link"
                    >
                      {t('featured.viewCategory')}
                      <span aria-hidden>→</span>
                    </Link>
                  </div>

                  <div className="fleet-disc__scroller">
                    {rail.cars.map((car) => (
                      <div key={car._id} className="fleet-disc__slide">
                        <CarCard car={car} />
                      </div>
                    ))}
                  </div>
                </Motion.div>
              ))}
            </Motion.div>
          )}
        </AnimatePresence>

        <div className="fleet-disc__foot">
          <Link to="/cars" onClick={() => window.scrollTo(0, 0)} className="fleet-disc__cta">
            {t('featured.exploreAll')}
            <img
              src={assets.arrow_icon}
              alt=""
              width={14}
              height={14}
              loading="lazy"
              className="fleet-disc__cta-icon"
            />
          </Link>
          <Link
            to={AIRPORT_LANDING_PATH}
            onClick={() => window.scrollTo(0, 0)}
            className="fleet-disc__airport"
          >
            {t('featured.airportLink')}
          </Link>
        </div>
      </div>
    </section>
  )
}

export default FeaturedSection

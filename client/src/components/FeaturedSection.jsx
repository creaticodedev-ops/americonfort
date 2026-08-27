import React, { useMemo } from 'react'
import { assets } from '../assets/assets'
import CategorySection from './CategorySection'
import { Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { motion as Motion } from 'motion/react'
import { useI18n } from '../i18n/I18nContext'
import { groupCarsByCategory } from '../utils/vehicleCategories'
import { AIRPORT_LANDING_PATH } from '../constants/site'

const FeaturedSection = () => {
  const { cars } = useAppContext()
  const { t } = useI18n()

  const sections = useMemo(() => {
    const grouped = groupCarsByCategory(cars)
    return grouped.slice(0, 3).map((s) => ({
      category: s.category,
      total: s.cars.length,
      cars: s.cars.slice(0, 3),
    }))
  }, [cars])

  const fleetCount = useMemo(() => cars.length, [cars])

  return (
    <section className="fleet-atelier relative overflow-hidden">
      <div className="fleet-atelier__atmosphere" aria-hidden="true" />
      <div className="fleet-atelier__grain" aria-hidden="true" />

      <div className="relative page-pad page-shell py-20 md:py-28">
        <Motion.header
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="fleet-atelier__intro"
        >
          <div className="fleet-atelier__intro-copy">
            <p className="fleet-atelier__eyebrow">{t('featured.eyebrow')}</p>
            <h2 className="fleet-atelier__title">
              <span className="fleet-atelier__brand">Americonfort</span>
              <span className="fleet-atelier__headline">{t('featured.title')}</span>
            </h2>
            <p className="fleet-atelier__lede">{t('featured.subtitle')}</p>
          </div>

          <div className="fleet-atelier__intro-aside">
            {fleetCount > 0 ? (
              <p className="fleet-atelier__stat">
                <span className="fleet-atelier__stat-value tabular-nums">{fleetCount}</span>
                <span className="fleet-atelier__stat-label">{t('featured.fleetCountLabel')}</span>
              </p>
            ) : null}
            <div className="fleet-atelier__rule" aria-hidden="true" />
          </div>
        </Motion.header>

        <div className="relative mt-14 md:mt-20 space-y-16 md:space-y-24">
          {sections.map((section, idx) => (
            <CategorySection
              key={section.category}
              category={section.category}
              count={section.total}
              cars={section.cars}
              index={idx + 1}
              actionTo={`/cars?category=${encodeURIComponent(section.category)}`}
              actionLabel={t('featured.viewCategory')}
            />
          ))}
        </div>

        <Motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="fleet-atelier__footer"
        >
          <Link
            to="/cars"
            onClick={() => window.scrollTo(0, 0)}
            className="fleet-atelier__cta"
          >
            <span>{t('featured.exploreAll')}</span>
            <img
              src={assets.arrow_icon}
              alt=""
              width={14}
              height={14}
              loading="lazy"
              className="fleet-atelier__cta-icon"
            />
          </Link>
          <Link
            to={AIRPORT_LANDING_PATH}
            onClick={() => window.scrollTo(0, 0)}
            className="fleet-atelier__airport"
          >
            {t('featured.airportLink')}
          </Link>
        </Motion.div>
      </div>
    </section>
  )
}

export default FeaturedSection

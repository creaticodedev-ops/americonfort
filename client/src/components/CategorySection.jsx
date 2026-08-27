import React from 'react'
import { Link } from 'react-router-dom'
import { motion as Motion } from 'motion/react'
import CarCard from './CarCard'
import { useI18n } from '../i18n/I18nContext'

/**
 * Kinetic category rail for public fleet (home featured + /cars).
 */
const CategorySection = ({
  category,
  count,
  cars,
  actionTo,
  actionLabel,
  id,
  animate = true,
  index,
  kinetic = false,
}) => {
  const { t } = useI18n()
  const total = typeof count === 'number' ? count : cars.length
  const ordinal = typeof index === 'number' ? String(index).padStart(2, '0') : null

  return (
    <Motion.section
      id={id}
      className={`fleet-rail min-w-0${kinetic ? ' fleet-rail--kinetic' : ''}`}
      initial={kinetic ? { opacity: 0, y: 28 } : false}
      whileInView={kinetic ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
    >
      <header className="fleet-rail__header">
        <div className="fleet-rail__heading">
          {ordinal ? (
            <span className="fleet-rail__index" aria-hidden="true">
              {ordinal}
            </span>
          ) : null}
          <div className="min-w-0">
            <p className="fleet-rail__kicker">{t('cars.categoryLabel')}</p>
            <div className="fleet-rail__title-row">
              <h3 className="fleet-rail__title">{category}</h3>
              <span
                className="fleet-rail__count"
                aria-label={t('cars.categoryCount', { count: total })}
              >
                {total}
              </span>
            </div>
          </div>
        </div>

        {actionTo && actionLabel ? (
          <Link to={actionTo} onClick={() => window.scrollTo(0, 0)} className="fleet-rail__action">
            <span>{actionLabel}</span>
            <span className="fleet-rail__action-arrow" aria-hidden="true">
              →
            </span>
          </Link>
        ) : null}
      </header>

      <div className="fleet-rail__track" data-count={Math.min(cars.length, 3)}>
        {cars.map((car, i) => {
          const card = <CarCard car={car} />
          if (!animate) {
            return (
              <div key={car._id} className="fleet-rail__item">
                {card}
              </div>
            )
          }
          return (
            <Motion.div
              key={car._id}
              className="fleet-rail__item"
              initial={{ opacity: 0, y: 28, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.12 }}
              transition={{
                duration: 0.6,
                delay: Math.min(i * 0.09, 0.32),
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {card}
            </Motion.div>
          )
        })}
      </div>
    </Motion.section>
  )
}

export default CategorySection

import React from 'react'
import { Link } from 'react-router-dom'
import { motion as Motion } from 'motion/react'
import CarCard from './CarCard'
import { useI18n } from '../i18n/I18nContext'

/**
 * Editorial category rail for public fleet (home featured + /cars).
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
}) => {
  const { t } = useI18n()
  const total = typeof count === 'number' ? count : cars.length
  const ordinal = typeof index === 'number' ? String(index).padStart(2, '0') : null

  return (
    <section id={id} className="fleet-rail min-w-0">
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
          const card = <CarCard car={car} featured={i === 0 && cars.length > 1} />
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
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{
                duration: 0.55,
                delay: Math.min(i * 0.07, 0.28),
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {card}
            </Motion.div>
          )
        })}
      </div>
    </section>
  )
}

export default CategorySection

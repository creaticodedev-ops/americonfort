import React from 'react'
import { Link } from 'react-router-dom'
import { motion as Motion } from 'motion/react'
import CarCard from './CarCard'
import { useI18n } from '../i18n/I18nContext'

/**
 * Category rail for /cars — clean header + responsive showroom grid/scroll.
 */
const CategorySection = ({
  category,
  count,
  cars,
  actionTo,
  actionLabel,
  id,
  animate = true,
}) => {
  const { t } = useI18n()
  const total = typeof count === 'number' ? count : cars.length

  return (
    <section id={id} className="fleet-rail">
      <header className="fleet-rail__header">
        <div className="fleet-rail__heading">
          <div className="min-w-0">
            <p className="fleet-rail__kicker">{t('cars.categoryLabel')}</p>
            <div className="fleet-rail__title-row">
              <h2 className="fleet-rail__title">{category}</h2>
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
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.12 }}
              transition={{
                duration: 0.5,
                delay: Math.min(i * 0.06, 0.24),
                ease: [0.16, 1, 0.3, 1],
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

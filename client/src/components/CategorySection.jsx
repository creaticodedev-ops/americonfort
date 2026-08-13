import React from 'react'
import { Link } from 'react-router-dom'
import { motion as Motion } from 'motion/react'
import CarCard from './CarCard'
import { useI18n } from '../i18n/I18nContext'

const gridClass = (count) => {
  if (count <= 1) {
    return 'grid grid-cols-1 max-w-[min(100%,22.75rem)] mx-auto md:mx-0'
  }
  if (count === 2) {
    return 'grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6 max-w-[46.5rem]'
  }
  return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6'
}

/**
 * Shared public catalog category block (home featured + /cars).
 * Presentation only — callers pass already-filtered vehicle data.
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
    <section id={id} className="fleet-category min-w-0">
      <header className="fleet-category-header">
        <div className="min-w-0">
          <p className="fleet-category-kicker">{t('cars.categoryLabel')}</p>
          <div className="mt-1 flex items-center gap-2.5 min-w-0">
            <h3 className="fleet-category-title">{category}</h3>
            <span className="fleet-category-count" aria-label={t('cars.categoryCount', { count: total })}>
              {total}
            </span>
          </div>
        </div>
        {actionTo && actionLabel ? (
          <Link to={actionTo} onClick={() => window.scrollTo(0, 0)} className="fleet-category-action">
            <span>{actionLabel}</span>
            <span className="fleet-category-action-arrow" aria-hidden="true">
              →
            </span>
          </Link>
        ) : null}
      </header>

      <div className={gridClass(cars.length)}>
        {cars.map((car, index) => {
          const card = <CarCard car={car} />
          if (!animate) return <div key={car._id}>{card}</div>
          return (
            <Motion.div
              key={car._id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.18 }}
              transition={{ duration: 0.45, delay: Math.min(index * 0.06, 0.24), ease: 'easeOut' }}
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

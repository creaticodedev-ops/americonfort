import React, { useMemo } from 'react'
import Title from './Title'
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

  return (
    <section className="relative py-16 md:py-20 page-pad page-shell bg-light">
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-sand/50 to-transparent pointer-events-none" />

      <Motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="relative"
      >
        <Title
          eyebrow={t('featured.eyebrow')}
          title={t('featured.title')}
          subTitle={t('featured.subtitle')}
        />
        <div className="fleet-title-mark" aria-hidden="true" />
      </Motion.div>

      <div className="relative mt-10 md:mt-12 space-y-11 md:space-y-14">
        {sections.map((section) => (
          <CategorySection
            key={section.category}
            category={section.category}
            count={section.total}
            cars={section.cars}
            actionTo={`/cars?category=${encodeURIComponent(section.category)}`}
            actionLabel={t('featured.viewCategory')}
          />
        ))}
      </div>

      <Motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45, delay: 0.12 }}
        className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-12 md:mt-14"
      >
        <Link
          to="/cars"
          onClick={() => window.scrollTo(0, 0)}
          className="group inline-flex items-center gap-2 px-7 py-3 border border-ink/15 hover:border-primary hover:text-primary rounded-xl text-sm tracking-wide transition-all duration-300"
        >
          {t('featured.exploreAll')}
          <img
            src={assets.arrow_icon}
            alt=""
            width={14}
            height={14}
            loading="lazy"
            className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
          />
        </Link>
        <Link
          to={AIRPORT_LANDING_PATH}
          onClick={() => window.scrollTo(0, 0)}
          className="text-xs sm:text-sm text-muted hover:text-primary underline-offset-4 hover:underline"
        >
          {t('featured.airportLink')}
        </Link>
      </Motion.div>
    </section>
  )
}

export default FeaturedSection

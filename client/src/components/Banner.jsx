import React from 'react'
import banner_car_image from '../assets/banner_car_image.webp'
import banner_car_avif from '../assets/banner_car_image.avif'
import { motion as Motion } from 'motion/react'
import { useI18n } from '../i18n/I18nContext'
import { Link } from 'react-router-dom'
import { AIRPORT_LANDING_PATH } from '../constants/site'

const Banner = () => {
  const { t } = useI18n()

  return (
    <section className="page-pad page-shell py-8 md:py-12">
      <Motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-2xl bg-ink min-h-[280px] md:min-h-[320px] flex flex-col md:flex-row items-stretch"
      >
        <div className="absolute inset-0">
          <picture>
            <source type="image/avif" srcSet={banner_car_avif} />
            <img
              src={banner_car_image}
              alt=""
              width={1200}
              height={576}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover object-center opacity-40 md:opacity-50"
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/90 to-ink/40" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(143,31,31,0.35),transparent_55%)]" />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-6 py-12 sm:px-8 md:px-14 md:py-16 max-w-xl">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/80 mb-3 font-medium">
            {t('banner.eyebrow')}
          </p>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl text-white font-medium leading-tight">
            {t('banner.title')}
          </h2>
          <p className="mt-4 text-white/90 text-sm md:text-base leading-relaxed font-light max-w-md">
            {t('banner.line1')}
          </p>
          <div className="mt-7 flex flex-col sm:flex-row sm:items-center gap-3">
            <Motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/cars"
                className="inline-flex px-6 py-2.5 bg-primary hover:bg-primary-dull transition-colors text-white rounded-xl text-sm tracking-wide"
              >
                {t('banner.cta')}
              </Link>
            </Motion.div>
            <Link
              to={AIRPORT_LANDING_PATH}
              className="text-sm text-white/85 hover:text-white underline underline-offset-4"
            >
              {t('banner.airportCta')}
            </Link>
          </div>
        </div>
      </Motion.div>
    </section>
  )
}

export default Banner

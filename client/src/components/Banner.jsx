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
    <section className="page-pad page-shell py-6 md:py-10">
      <Motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="home-cta"
      >
        <div className="home-cta__media" aria-hidden>
          <picture>
            <source type="image/avif" srcSet={banner_car_avif} />
            <img
              src={banner_car_image}
              alt=""
              width={1200}
              height={576}
              loading="lazy"
              decoding="async"
              className="home-cta__img"
            />
          </picture>
          <div className="home-cta__veil" />
        </div>

        <div className="home-cta__copy">
          <p className="home-cta__eyebrow">{t('banner.eyebrow')}</p>
          <h2 className="home-cta__title">{t('banner.title')}</h2>
          <p className="home-cta__lede">{t('banner.line1')}</p>
          <div className="home-cta__actions">
            <Link to="/cars" className="home-cta__btn">
              {t('banner.cta')}
            </Link>
            <Link to={AIRPORT_LANDING_PATH} className="home-cta__link">
              {t('banner.airportCta')}
            </Link>
          </div>
        </div>
      </Motion.div>
    </section>
  )
}

export default Banner

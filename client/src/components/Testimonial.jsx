import React from 'react'
import Title from './Title'
import { assets } from '../assets/assets'
import { motion as Motion } from 'framer-motion'
import { useI18n } from '../i18n/I18nContext'

const Testimonial = () => {
  const { t, getArray } = useI18n()
  const testimonials = getArray('testimonials.items')

  return (
    <section className="py-20 md:py-28 page-pad page-shell bg-white">
      <Title
        eyebrow={t('testimonials.eyebrow')}
        title={t('testimonials.title')}
        subTitle={t('testimonials.subtitle')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12 mt-14 md:mt-16 max-w-6xl mx-auto">
        {testimonials.map((item, index) => (
          <Motion.blockquote
            key={index}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55, delay: index * 0.1, ease: 'easeOut' }}
            className="relative"
          >
            <div className="flex gap-0.5 mb-5">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <img key={i} src={assets.star_icon} alt="" className="h-3.5 opacity-90" />
                ))}
            </div>
            <p className="font-display text-xl md:text-2xl text-ink leading-snug font-medium">
              “{item.text}”
            </p>
            <footer className="mt-6 pt-5 border-t border-borderColor">
              <p className="text-sm font-medium text-ink">{item.name}</p>
              <p className="text-xs text-muted mt-0.5 tracking-wide">{item.location}</p>
            </footer>
          </Motion.blockquote>
        ))}
      </div>
    </section>
  )
}

export default Testimonial

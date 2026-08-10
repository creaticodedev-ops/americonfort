import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion as Motion } from 'motion/react'
import { useI18n } from '../i18n/I18nContext'
import { BRAND_NAME } from '../constants/brand'
import { buildWaMeUrl, getEnvAgencyWhatsAppDial } from '../utils/whatsapp'

const WhatsAppIcon = ({ className = 'h-5 w-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.59 2 2.15 6.44 2.15 11.89c0 1.76.46 3.48 1.34 5L2 22l5.26-1.38a9.87 9.87 0 0 0 4.78 1.22h.01c5.45 0 9.89-4.44 9.89-9.89 0-2.64-1.03-5.12-2.89-6.99zM12.05 20.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.8-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.76-1.84-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74 1.49.64 2.07.7 2.81.58.45-.08 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.17-.47-.29z" />
  </svg>
)

const WhatsAppHelp = () => {
  const { t } = useI18n()

  const whatsappUrl = useMemo(() => {
    const dial = getEnvAgencyWhatsAppDial()
    const message = t('whatsappHelp.message', { brand: BRAND_NAME })
    return buildWaMeUrl(message, dial)
  }, [t])

  const trustItems = [
    t('whatsappHelp.trust1'),
    t('whatsappHelp.trust2'),
    t('whatsappHelp.trust3'),
  ].filter(Boolean)

  return (
    <section className="page-pad page-shell pb-20 sm:pb-28 md:pb-36">
      <Motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6 }}
        className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-borderColor bg-white"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,rgba(143,31,31,0.07),transparent_55%),radial-gradient(ellipse_at_100%_100%,rgba(22,18,16,0.04),transparent_50%)]"
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" aria-hidden="true" />

        <div className="relative px-6 py-10 sm:px-10 sm:py-12 md:px-14 md:py-14 text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-primary font-medium mb-3">
            {t('whatsappHelp.eyebrow')}
          </p>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-medium text-ink leading-tight">
            {t('whatsappHelp.title')}
          </h2>
          <p className="mt-4 mx-auto max-w-xl text-muted text-sm md:text-base font-light leading-relaxed">
            {t('whatsappHelp.subtitle')}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <Motion.a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center justify-center gap-2.5 h-12 px-6 rounded-xl bg-primary hover:bg-primary-dull text-white text-sm font-medium tracking-wide transition-colors"
            >
              <WhatsAppIcon className="h-[1.15rem] w-[1.15rem] opacity-95" />
              {t('whatsappHelp.cta')}
            </Motion.a>
            <Link
              to="/cars"
              className="inline-flex items-center justify-center gap-1.5 h-12 px-5 rounded-xl border border-borderColor bg-light/60 hover:bg-white hover:border-primary/30 text-ink text-sm transition"
            >
              {t('whatsappHelp.secondary')}
              <span aria-hidden="true" className="text-primary">→</span>
            </Link>
          </div>

          {trustItems.length > 0 ? (
            <p className="mt-7 text-[11px] sm:text-xs uppercase tracking-[0.16em] text-muted">
              {trustItems.join(' · ')}
            </p>
          ) : null}
        </div>
      </Motion.div>
    </section>
  )
}

export default WhatsAppHelp

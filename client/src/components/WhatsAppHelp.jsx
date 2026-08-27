import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion as Motion } from 'motion/react'
import { useI18n } from '../i18n/I18nContext'
import { BRAND_NAME } from '../constants/brand'
import { buildWaMeUrl, getEnvAgencyWhatsAppDial } from '../utils/whatsapp'
import { trackWhatsAppClick } from '../utils/ga'

const WhatsAppIcon = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
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
    <section className="ac-section ac-help" aria-labelledby="help-heading">
      <div className="page-pad page-shell">
        <Motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="ac-help__panel ac-surface"
        >
          <header className="ac-head ac-head--center">
            <p className="ac-eyebrow">{t('whatsappHelp.eyebrow')}</p>
            <h2 id="help-heading" className="ac-title">
              {t('whatsappHelp.title')}
            </h2>
            <p className="ac-lede">{t('whatsappHelp.subtitle')}</p>
          </header>

          <div className="ac-help__actions">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackWhatsAppClick({ ctaLocation: 'homepage' })}
              className="ac-btn"
            >
              <WhatsAppIcon className="h-[1.05rem] w-[1.05rem]" />
              {t('whatsappHelp.cta')}
            </a>
            <Link to="/cars" className="ac-btn ac-btn--ghost">
              {t('whatsappHelp.secondary')}
              <span aria-hidden>→</span>
            </Link>
          </div>

          {trustItems.length > 0 ? (
            <p className="ac-help__trust">{trustItems.join(' · ')}</p>
          ) : null}
        </Motion.div>
      </div>
    </section>
  )
}

export default WhatsAppHelp

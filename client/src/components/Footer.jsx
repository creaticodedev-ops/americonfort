import React from 'react'
import { assets } from '../assets/assets'
import brandLogo from '../assets/logo.webp'
import { useI18n } from '../i18n/I18nContext'
import { Link } from 'react-router-dom'
import { BRAND_NAME } from '../constants/brand'
import { FACEBOOK_URL, INSTAGRAM_URL, TWITTER_URL } from '../constants/social'
import { AIRPORT_LANDING_PATH, BUSINESS } from '../constants/site'
import { trackContactSubmit, trackPhoneClick } from '../utils/ga'

const Footer = () => {
  const { t } = useI18n()

  const socialLinks = [
    FACEBOOK_URL ? { src: assets.facebook_logo, label: 'Facebook', href: FACEBOOK_URL } : null,
    INSTAGRAM_URL ? { src: assets.instagram_logo, label: 'Instagram', href: INSTAGRAM_URL } : null,
    TWITTER_URL ? { src: assets.twitter_logo, label: 'X (Twitter)', href: TWITTER_URL } : null,
    { src: assets.gmail_logo, label: 'Email', href: `mailto:${BUSINESS.email}` },
  ].filter(Boolean)

  return (
    <footer className="ac-footer">
      <div className="page-pad page-shell">
        <div className="ac-footer__top">
          <div className="ac-footer__brand">
            <img
              src={brandLogo}
              alt={BRAND_NAME}
              width={200}
              height={96}
              loading="lazy"
              decoding="async"
              className="ac-footer__logo"
            />
            <p className="ac-footer__desc">{t('footer.description')}</p>
            <div className="ac-footer__social">
              {socialLinks.map(({ src, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="ac-footer__social-link"
                  {...(href.startsWith('http')
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                >
                  <img src={src} width={20} height={20} loading="lazy" className="w-5 h-5" alt="" />
                </a>
              ))}
            </div>
          </div>

          <div className="ac-footer__cols">
            <div>
              <h3 className="ac-footer__col-title">{t('footer.quickLinks')}</h3>
              <ul className="ac-footer__list">
                <li><Link to="/">{t('footer.home')}</Link></li>
                <li><Link to="/cars">{t('footer.browseCars')}</Link></li>
                <li><Link to={AIRPORT_LANDING_PATH}>{t('footer.airportRental')}</Link></li>
                <li><Link to="/about">{t('footer.aboutUs')}</Link></li>
                <li><Link to="/contact">{t('footer.contact')}</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="ac-footer__col-title">{t('footer.resources')}</h3>
              <ul className="ac-footer__list">
                <li><Link to="/faq">{t('footer.helpCenter')}</Link></li>
                <li><Link to="/terms">{t('footer.termsOfService')}</Link></li>
                <li><Link to="/privacy">{t('footer.privacyPolicy')}</Link></li>
                <li><Link to="/insurance">{t('footer.insurance')}</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="ac-footer__col-title">{t('footer.contact')}</h3>
              <ul className="ac-footer__list">
                <li>{BUSINESS.streetAddress}</li>
                <li>{BUSINESS.addressLocality}, Maroc</li>
                <li>
                  <a
                    href={`tel:${BUSINESS.telephone}`}
                    onClick={() => trackPhoneClick({ ctaLocation: 'footer' })}
                  >
                    {BUSINESS.telephoneDisplay}
                  </a>
                </li>
                <li>
                  <a
                    href={`mailto:${BUSINESS.email}`}
                    onClick={() => trackContactSubmit({ ctaLocation: 'footer', method: 'email' })}
                  >
                    {BUSINESS.email}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="ac-footer__bottom">
          <p>© {new Date().getFullYear()} ZAKARIA DOUAMI. {t('footer.rights')}</p>
          <div className="ac-footer__legal">
            <Link to="/privacy">{t('footer.privacy')}</Link>
            <Link to="/terms">{t('footer.terms')}</Link>
            <Link to="/cookies">{t('footer.cookies')}</Link>
            <Link to="/owner" className="ac-footer__staff">
              {t('footer.staffPortal')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer

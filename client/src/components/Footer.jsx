import React from 'react'
import { assets } from '../assets/assets'
import brandLogo from '../assets/logo.webp'
import { useI18n } from '../i18n/I18nContext'
import { Link } from "react-router-dom";
import { BRAND_NAME } from '../constants/brand'
import { INSTAGRAM_URL } from '../constants/social'

const Footer = () => {
  const { t } = useI18n();

  return (
    <footer className="page-pad page-shell mt-8 md:mt-16 text-sm text-muted bg-light">
      <div className="flex flex-col md:flex-row flex-wrap justify-between items-start gap-10 pb-10 border-b border-borderColor">
        <div className="max-w-sm w-full">
          <img
            src={brandLogo}
            alt={BRAND_NAME}
            width={200}
            height={96}
            loading="lazy"
            decoding="async"
            className="block h-9 sm:h-10 lg:h-11 mb-3 w-auto max-h-10 lg:max-h-11 object-contain"
          />

          <p className="leading-relaxed">
            {t('footer.description')}
          </p>

          <div className="flex items-center gap-4 mt-6">
            {[
              { src: assets.facebook_logo, label: 'Facebook', href: '#' },
              { src: assets.instagram_logo, label: 'Instagram', href: INSTAGRAM_URL },
              { src: assets.twitter_logo, label: 'X (Twitter)', href: '#' },
              { src: assets.gmail_logo, label: 'Email', href: 'mailto:americonfort@gmail.com' },
            ].map(({ src, label, href }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                {...(href.startsWith('http')
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
              >
                <img src={src} width={20} height={20} loading="lazy" className="w-5 h-5 hover:opacity-70 transition" alt="" />
              </a>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-10 w-full md:w-auto md:flex-1 md:max-w-2xl">
          <div>
            <h3 className="text-base font-medium text-gray-900 uppercase tracking-wide">
              {t('footer.quickLinks')}
            </h3>
            <ul className="mt-4 flex flex-col gap-2">
              <li><Link className="hover:text-gray-700 transition" to="/">{t('footer.home')}</Link></li>
              <li><Link className="hover:text-gray-700 transition" to="/cars">{t('footer.browseCars')}</Link></li>
              <li><a className="hover:text-gray-700 transition" href="#">{t('footer.aboutUs')}</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-base font-medium text-gray-900 uppercase tracking-wide">
              {t('footer.resources')}
            </h3>
            <ul className="mt-4 flex flex-col gap-2">
              {[t('footer.helpCenter'), t('footer.termsOfService'), t('footer.privacyPolicy'), t('footer.insurance')].map(
                (item) => (
                  <li key={item}>
                    <a className="hover:text-gray-700 transition" href="#">
                      {item}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <h3 className="text-base font-medium text-gray-900 uppercase tracking-wide">
              {t('footer.contact')}
            </h3>
            <ul className="mt-4 flex flex-col gap-2 break-words">
              <li>Aéroport international Mohamed V</li>
              <li>Casablanca, Maroc</li>
              <li>+212 6 70 55 10 55</li>
              <li>americonfort@gmail.com</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-center justify-between py-6 text-gray-600 text-center md:text-left">
        <p className="text-xs sm:text-sm">© {new Date().getFullYear()} ZAKARIA DOUAMI. {t('footer.rights')}</p>

        <div className="flex flex-col items-center gap-2 md:items-end">
          <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs sm:text-sm">
          {[t('footer.privacy'), t('footer.terms'), t('footer.cookies')].map((item, i) => (
            <React.Fragment key={item}>
              <li>
                <a className="hover:text-gray-800 transition" href="#">
                  {item}
                </a>
              </li>
              {i < 2 && <span className="text-borderColor" aria-hidden>|</span>}
            </React.Fragment>
          ))}
          </ul>
          <Link
            to="/owner"
            className="text-[10px] text-muted hover:text-ink transition tracking-wide"
          >
            {t('footer.staffPortal')}
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

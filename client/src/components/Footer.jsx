import React from 'react'
import { assets } from '../assets/assets'
import { motion as Motion } from 'framer-motion'
import { useI18n } from '../i18n/I18nContext'
import { Link } from "react-router-dom";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay },
});

const Footer = () => {
  const { t } = useI18n();

  return (
    <footer className="page-pad page-shell mt-8 md:mt-16 text-sm text-muted bg-light">
      <Motion.div
        {...fadeUp(0)}
        className="flex flex-col md:flex-row flex-wrap justify-between items-start gap-10 pb-10 border-b border-borderColor"
      >
        <div className="max-w-sm w-full">
          <Motion.img
            {...fadeUp(0.2)}
            src={assets.logo}
            alt="logo"
            className="block h-9 sm:h-10 lg:h-11 mb-3 w-auto max-h-10 lg:max-h-11 object-contain"
          />

          <Motion.p {...fadeUp(0.3)} className="leading-relaxed">
            {t('footer.description')}
          </Motion.p>

          <Motion.div
            {...fadeUp(0.4)}
            className="flex items-center gap-4 mt-6"
          >
            {[assets.facebook_logo, assets.instagram_logo, assets.twitter_logo, assets.gmail_logo].map(
              (logo, i) => (
                <a key={i} href="#" aria-label="Social link">
                  <img src={logo} className="w-5 h-5 hover:opacity-70 transition" alt="" />
                </a>
              )
            )}
          </Motion.div>
        </div>

        <Motion.div
          {...fadeUp(0.3)}
          className="grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-10 w-full md:w-auto md:flex-1 md:max-w-2xl"
        >
          <div>
            <h2 className="text-base font-medium text-gray-900 uppercase tracking-wide">
              {t('footer.quickLinks')}
            </h2>
            <ul className="mt-4 flex flex-col gap-2">
              <li><Link className="hover:text-gray-700 transition" to="/">{t('footer.home')}</Link></li>
              <li><Link className="hover:text-gray-700 transition" to="/cars">{t('footer.browseCars')}</Link></li>
              <li><a className="hover:text-gray-700 transition" href="#">{t('footer.aboutUs')}</a></li>
            </ul>
          </div>

          <div>
            <h2 className="text-base font-medium text-gray-900 uppercase tracking-wide">
              {t('footer.resources')}
            </h2>
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
            <h2 className="text-base font-medium text-gray-900 uppercase tracking-wide">
              {t('footer.contact')}
            </h2>
            <ul className="mt-4 flex flex-col gap-2 break-words">
              <li>Aéroport international Mohamed V</li>
              <li>Casablanca, Maroc</li>
              <li>+212 6 70 55 10 55</li>
              <li>americonfort@gmail.com</li>
            </ul>
          </div>
        </Motion.div>
      </Motion.div>

      <Motion.div
        {...fadeUp(0.5)}
        className="flex flex-col md:flex-row gap-3 items-center justify-between py-6 text-gray-600 text-center md:text-left"
      >
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
            className="text-[10px] text-gray-400/70 hover:text-gray-500 transition tracking-wide"
          >
            {t('footer.staffPortal')}
          </Link>
        </div>
      </Motion.div>
    </footer>
  );
};

export default Footer;

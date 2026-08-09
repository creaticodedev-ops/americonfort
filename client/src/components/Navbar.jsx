import React, { useEffect, useState } from 'react'
import { assets, menuLinks } from '../assets/assets'
import brandLogo from '../assets/logo.webp'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import LanguageSwitcher from './LanguageSwitcher'
import { useI18n } from '../i18n/I18nContext'
import { BRAND_NAME } from '../constants/brand'
import { INSTAGRAM_URL } from '../constants/social'

/** Thin monochrome Instagram glyph — matches HDN Car icon weight. */
const InstagramIcon = ({ className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect
      x="3.25"
      y="3.25"
      width="17.5"
      height="17.5"
      rx="5"
      stroke="currentColor"
      strokeWidth="1.4"
    />
    <circle cx="12" cy="12" r="4.15" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="17.35" cy="6.65" r="1.05" fill="currentColor" />
  </svg>
)

const Navbar = () => {
  const { logout, isOwner } = useAppContext()
  const { t } = useI18n()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()
  const isHome = location.pathname === '/'

  const navLabels = {
    Home: t('nav.home'),
    Cars: t('nav.cars'),
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 640) setOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!open) return
    document.body.classList.add('nav-open')
    return () => document.body.classList.remove('nav-open')
  }, [open])

  const solid = !isHome || scrolled || open

  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 border-b transition-all duration-300 motion-safe:animate-nav-in ${
        solid
          ? 'bg-white/95 backdrop-blur-md border-borderColor text-ink'
          : 'bg-transparent border-transparent text-ink'
      }`}
    >
      {/* Mobile: [Menu][IG] — logo centered — [Search][FR] */}
      <div className="sm:hidden page-pad relative flex items-center justify-between py-2.5 min-h-[56px]">
        <div className="relative z-10 flex items-center -ml-1">
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center text-ink cursor-pointer"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <img
              src={open ? assets.close_icon : assets.menu_icon}
              alt=""
              width={20}
              height={20}
              className="block h-5 w-5 object-contain"
            />
          </button>

          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="inline-flex h-11 w-11 items-center justify-center text-ink/80 transition-opacity duration-200 hover:opacity-100 hover:text-ink active:opacity-70"
          >
            <InstagramIcon className="h-[21px] w-[21px]" />
          </a>
        </div>

        <Link
          to="/"
          className="absolute left-1/2 top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2 flex items-center"
        >
          <img
            src={brandLogo}
            alt={BRAND_NAME}
            width={200}
            height={96}
            decoding="async"
            fetchPriority="high"
            className="block h-8 w-auto max-h-8 object-contain"
          />
        </Link>

        <div className="relative z-10 flex items-center gap-0.5 -mr-1">
          <Link
            to="/cars"
            aria-label={t('nav.cars')}
            className="inline-flex h-11 w-11 items-center justify-center text-ink/80 transition-opacity duration-200 hover:opacity-100 active:opacity-70"
          >
            <img
              src={assets.search_icon}
              alt=""
              width={18}
              height={18}
              className="block h-[18px] w-[18px] object-contain"
            />
          </Link>
          <LanguageSwitcher className="shrink-0" />
        </div>
      </div>

      {/* Desktop: logo left, controls right — unchanged */}
      <div className="hidden sm:flex page-pad page-shell items-center justify-between gap-4 py-3.5 sm:py-4">
        <Link to="/" className="relative z-10 shrink-0 flex items-center">
          <img
            src={brandLogo}
            alt={BRAND_NAME}
            width={200}
            height={96}
            decoding="async"
            fetchPriority="high"
            className="block h-8 sm:h-9 lg:h-10 w-auto max-h-9 lg:max-h-10 object-contain transition-transform duration-200 hover:scale-[1.03]"
          />
        </Link>

        <nav className="flex items-center gap-5 lg:gap-7 shrink-0" aria-label="Primary">
          {menuLinks.map((link, index) => (
            <Link
              key={index}
              to={link.path}
              className="text-sm tracking-wide text-muted hover:text-ink transition-colors whitespace-nowrap"
            >
              {navLabels[link.name] || link.name}
            </Link>
          ))}
          <LanguageSwitcher />
          {isOwner ? (
            <>
              <button
                type="button"
                onClick={() => navigate('/owner')}
                className="cursor-pointer text-sm text-muted hover:text-ink whitespace-nowrap"
              >
                {t('nav.dashboard')}
              </button>
              <button
                type="button"
                onClick={logout}
                className="cursor-pointer px-5 py-2.5 bg-primary hover:bg-primary-dull transition-all text-white rounded-xl text-sm whitespace-nowrap"
              >
                {t('nav.logout')}
              </button>
            </>
          ) : null}
        </nav>
      </div>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu overlay"
            className="sm:hidden fixed inset-0 z-40 bg-ink/40"
            onClick={() => setOpen(false)}
          />
          <nav
            className="sm:hidden fixed inset-x-0 top-[56px] z-50 h-[calc(100svh-56px)] overflow-y-auto border-t border-borderColor bg-white p-5 pb-10 flex flex-col gap-1"
            aria-label="Mobile"
          >
            {menuLinks.map((link, index) => (
              <Link
                key={index}
                to={link.path}
                onClick={() => setOpen(false)}
                className="text-sm tracking-wide text-muted hover:text-ink transition-colors py-3 border-b border-borderColor/60"
              >
                {navLabels[link.name] || link.name}
              </Link>
            ))}
            <div className="flex flex-col gap-3 pt-2">
              {isOwner ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/owner')
                      setOpen(false)
                    }}
                    className="cursor-pointer text-sm text-muted hover:text-ink text-left py-2"
                  >
                    {t('nav.dashboard')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      logout()
                      setOpen(false)
                    }}
                    className="cursor-pointer px-5 py-2.5 bg-primary hover:bg-primary-dull transition-all text-white rounded-xl text-sm"
                  >
                    {t('nav.logout')}
                  </button>
                </>
              ) : null}
            </div>
          </nav>
        </>
      )}
    </header>
  )
}

export default Navbar

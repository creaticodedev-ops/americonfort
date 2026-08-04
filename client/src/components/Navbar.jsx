import React, { useEffect, useState } from 'react'
import { assets, menuLinks } from '../assets/assets'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { motion as Motion } from 'framer-motion'
import LanguageSwitcher from './LanguageSwitcher'
import { useI18n } from '../i18n/I18nContext'
import { BRAND_NAME } from '../constants/brand'

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
    <Motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 inset-x-0 z-40 border-b transition-all duration-300 ${
        solid
          ? 'bg-white/95 backdrop-blur-md border-borderColor text-ink'
          : 'bg-transparent border-transparent text-ink'
      }`}
    >
      <div className="page-pad page-shell flex items-center justify-between gap-4 py-3.5 sm:py-4">
        <Link to="/" className="relative z-10 shrink-0 flex items-center">
          <Motion.img
            whileHover={{ scale: 1.03 }}
            src={assets.logo}
            alt={BRAND_NAME}
            className="block h-8 sm:h-9 lg:h-10 w-auto max-h-9 lg:max-h-10 object-contain"
          />
        </Link>

        {/* Desktop: logo left, controls right — independent of mobile drawer */}
        <nav className="hidden sm:flex items-center gap-5 lg:gap-7 shrink-0">
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

        <button
          type="button"
          className="sm:hidden cursor-pointer relative z-10 p-2 -mr-2 shrink-0"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <img src={open ? assets.close_icon : assets.menu_icon} alt="" className="block w-5 h-5 object-contain" />
        </button>
      </div>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu overlay"
            className="sm:hidden fixed inset-0 z-40 bg-ink/40"
            onClick={() => setOpen(false)}
          />
          <nav className="sm:hidden fixed inset-x-0 top-[57px] z-50 h-[calc(100svh-57px)] overflow-y-auto border-t border-borderColor bg-white p-5 pb-10 flex flex-col gap-1">
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
            <div className="py-3">
              <LanguageSwitcher />
            </div>
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
    </Motion.header>
  )
}

export default Navbar

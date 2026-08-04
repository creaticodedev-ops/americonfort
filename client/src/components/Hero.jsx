import React, { useMemo, useState } from 'react'
import { assets } from '../assets/assets'
import { useAppContext } from '../context/AppContext'
import { motion as Motion } from 'framer-motion'
import { useI18n } from '../i18n/I18nContext'
import DateRangePicker from './DateRangePicker'
import CitySelect from './CitySelect'
import { BRAND_NAME } from '../constants/brand'

const Hero = () => {
  const [pickupLocation, setPickupLocation] = useState('')
  const { t } = useI18n()
  const { pickupDate, setPickupDate, returnDate, setReturnDate, navigate, pickupLocations } = useAppContext()

  const cities = useMemo(() => {
    return [...new Set(pickupLocations.map((location) => location.city))].sort()
  }, [pickupLocations])

  const startISO = typeof pickupDate === 'string' ? pickupDate.slice(0, 10) : ''
  const endISO = typeof returnDate === 'string' ? returnDate.slice(0, 10) : ''

  const handleSearch = (e) => {
    e.preventDefault()
    if (!pickupLocation) {
      toast.error(t('hero.selectLocation'))
      return
    }
    if (!startISO || !endISO) {
      toast.error(t('hero.selectDates'))
      return
    }
    if (endISO < startISO) {
      toast.error(t('hero.invalidRange'))
      return
    }
    navigate(`/cars?${new URLSearchParams({
      pickupLocation,
      pickupDate: startISO,
      returnDate: endISO,
    }).toString()}`)
  }

  return (
    <section className="relative min-h-[100svh] bg-light overflow-x-clip">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(143,31,31,0.12),transparent_55%)]" />
        <div className="absolute bottom-0 inset-x-0 h-[45%] bg-gradient-to-t from-sand/80 to-transparent" />
      </div>

      <div className="relative z-10 page-pad page-shell flex flex-col items-center pt-24 sm:pt-28 md:pt-32 pb-12 sm:pb-16 md:pb-20">
        <Motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
          className="text-center w-full max-w-3xl"
        >
          <p className="font-display text-primary text-5xl sm:text-6xl md:text-7xl font-medium leading-none tracking-tight">
            
          </p>
          <h1 className="font-display text-ink text-3xl sm:text-4xl md:text-5xl font-medium mt-3 sm:mt-4 leading-tight">
            {t('hero.title')}
          </h1>
          <p className="mt-3 sm:mt-4 text-muted text-sm sm:text-base md:text-lg font-light leading-relaxed max-w-xl mx-auto">
            {t('hero.subtitle')}
          </p>
        </Motion.div>

        <Motion.form
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.12, ease: 'easeOut' }}
          onSubmit={handleSearch}
          className="mt-8 sm:mt-10 md:mt-12 w-full max-w-4xl"
        >
          <div className="rounded-2xl md:rounded-[1.75rem] bg-white border border-borderColor shadow-[0_18px_50px_-28px_rgba(22,18,16,0.35)] overflow-visible">
            <div className="flex flex-col md:flex-row md:items-stretch">
              <div className="md:flex-[1.05] min-w-0 border-b md:border-b-0 md:border-r border-borderColor">
                <CitySelect
                  value={pickupLocation}
                  onChange={setPickupLocation}
                  options={cities}
                  label={t('hero.pickupLocation')}
                  placeholder={t('hero.selectLocation')}
                />
              </div>

              <div className="md:flex-[1.55] min-w-0 border-b md:border-b-0 md:border-r border-borderColor">
                <DateRangePicker
                  startDate={startISO}
                  endDate={endISO}
                  onChange={({ startDate, endDate }) => {
                    setPickupDate(startDate)
                    setReturnDate(endDate)
                  }}
                />
              </div>

              <div className="p-3 md:p-2.5 md:pl-2 flex items-stretch">
                <Motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.985 }}
                  type="submit"
                  className="w-full md:w-[9.5rem] min-h-[3.25rem] rounded-xl bg-primary hover:bg-primary-dull text-white text-sm font-medium tracking-wide transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20l-3.5-3.5" />
                  </svg>
                  {t('hero.search')}
                </Motion.button>
              </div>
            </div>
          </div>

          <p className="mt-3.5 text-center text-xs sm:text-sm text-muted tracking-wide px-2 leading-relaxed">
            {t('hero.trustLine')}
          </p>
        </Motion.form>

        <Motion.div
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.22, ease: 'easeOut' }}
          className="mt-8 sm:mt-10 md:mt-14 w-full max-w-3xl flex justify-center px-2"
        >
          <img
            src={assets.main_car}
            alt={`${BRAND_NAME} premium rental`}
            className="w-full max-h-[200px] sm:max-h-[280px] md:max-h-[340px] object-contain select-none drop-shadow-[0_30px_60px_rgba(22,18,16,0.18)]"
          />
        </Motion.div>
      </div>
    </section>
  )
}

export default Hero

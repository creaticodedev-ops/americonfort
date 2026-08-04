import React, { useEffect, useMemo, useState } from 'react'
import Title from '../components/Title'
import { assets } from '../assets/assets'
import CarCard from '../components/CarCard'
import { useSearchParams } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'
import { motion as Motion } from 'framer-motion'
import { useI18n } from '../i18n/I18nContext'
import { getErrorMessage } from '../utils/apiError'
import { VEHICLE_CATEGORIES, groupCarsByCategory } from '../utils/vehicleCategories'
import { getCarLocations } from '../utils/carLocations'

const Cars = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const pickupLocation = searchParams.get('pickupLocation')
  const urlPickupDate = searchParams.get('pickupDate')
  const urlReturnDate = searchParams.get('returnDate')
  const categoryParam = searchParams.get('category') || ''
  const { t } = useI18n()

  const { cars, carsLoading, axios, setPickupDate, setReturnDate } = useAppContext()

  const [input, setInput] = useState('')
  const isSearchData = pickupLocation && urlPickupDate && urlReturnDate
  const [filteredCars, setFilteredCars] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState(categoryParam)

  useEffect(() => {
    if (urlPickupDate) setPickupDate(urlPickupDate.includes('T') ? urlPickupDate : `${urlPickupDate}T10:00`)
    if (urlReturnDate) setReturnDate(urlReturnDate.includes('T') ? urlReturnDate : `${urlReturnDate}T10:00`)
  }, [urlPickupDate, urlReturnDate, setPickupDate, setReturnDate])

  useEffect(() => {
    setActiveCategory(categoryParam)
  }, [categoryParam])

  const applyFilter = () => {
    let list = cars
    if (input.trim()) {
      const q = input.toLowerCase()
      list = list.filter((car) =>
        car.brand.toLowerCase().includes(q) ||
        car.model.toLowerCase().includes(q) ||
        car.category.toLowerCase().includes(q) ||
        car.transmission.toLowerCase().includes(q) ||
        getCarLocations(car).some((loc) => loc.toLowerCase().includes(q))
      )
    }
    setFilteredCars(list)
  }

  const searchCarAvailability = async () => {
    setSearchLoading(true)
    try {
      const { data } = await axios.post('/api/bookings/check-availability', {
        location: pickupLocation,
        pickupDate: urlPickupDate,
        returnDate: urlReturnDate,
      })
      if (data.success) {
        setFilteredCars(data.availableCars)
        if (data.availableCars.length === 0) {
          toast.error(t('cars.noCars'))
        }
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSearchLoading(false)
    }
  }

  useEffect(() => {
    if (isSearchData) searchCarAvailability()
    else if (cars.length) applyFilter()
    else setFilteredCars([])
  }, [isSearchData, pickupLocation, urlPickupDate, urlReturnDate, cars])

  useEffect(() => {
    if (!isSearchData) applyFilter()
  }, [input, cars, isSearchData])

  const sections = useMemo(() => {
    let list = filteredCars
    if (activeCategory) {
      list = list.filter(
        (c) => String(c.category || '').toLowerCase() === activeCategory.toLowerCase()
      )
    }
    return groupCarsByCategory(list)
  }, [filteredCars, activeCategory])

  const availableCategories = useMemo(() => {
    const present = new Set(filteredCars.map((c) => c.category).filter(Boolean))
    return VEHICLE_CATEGORIES.filter((c) => present.has(c)).concat(
      [...present].filter((c) => !VEHICLE_CATEGORIES.includes(c))
    )
  }, [filteredCars])

  const selectCategory = (cat) => {
    setActiveCategory(cat)
    const next = new URLSearchParams(searchParams)
    if (cat) next.set('category', cat)
    else next.delete('category')
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="pb-20 sm:pb-28">
      <Motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative flex flex-col items-center py-16 sm:py-20 page-pad page-shell overflow-hidden"
        style={{
          background:
            'linear-gradient(180deg, #EDE8E4 0%, #F8F6F5 55%, #F8F6F5 100%)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(143,31,31,0.12), transparent 60%)',
          }}
        />
        <Title title={t('cars.title')} subTitle={t('cars.subtitle')} />

        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="relative z-10 flex items-center bg-white px-4 mt-6 max-w-xl w-full h-12 rounded-xl border border-borderColor shadow-sm"
        >
          <img src={assets.search_icon} alt="" className="w-[1.125rem] h-[1.125rem] mr-2 shrink-0" />
          <input
            onChange={(e) => setInput(e.target.value)}
            value={input}
            type="text"
            placeholder={t('cars.searchPlaceholder')}
            className="w-full min-w-0 h-full outline-none text-gray-500 text-sm sm:text-base"
          />
        </Motion.div>

        {availableCategories.length > 0 && (
          <div className="relative z-10 mt-8 w-full max-w-4xl flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => selectCategory('')}
              className={`px-3.5 py-1.5 text-xs sm:text-sm rounded-full border transition-colors ${
                !activeCategory
                  ? 'bg-ink text-white border-ink'
                  : 'bg-white/80 text-muted border-borderColor hover:border-ink/30'
              }`}
            >
              {t('cars.allCategories')}
            </button>
            {availableCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => selectCategory(cat)}
                className={`px-3.5 py-1.5 text-xs sm:text-sm rounded-full border transition-colors ${
                  activeCategory.toLowerCase() === cat.toLowerCase()
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white/80 text-muted border-borderColor hover:border-primary/40 hover:text-primary'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </Motion.div>

      <div className="page-pad page-shell mt-4 sm:mt-6">
        <p className="text-gray-500 text-sm sm:text-base mb-8">
          {carsLoading || searchLoading
            ? t('common.loading')
            : t('cars.showing', { count: sections.reduce((n, s) => n + s.cars.length, 0) })}
        </p>

        {(carsLoading || searchLoading) && !filteredCars.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 rounded-xl bg-sand/60 animate-pulse" />
            ))}
          </div>
        ) : sections.length === 0 ? (
          <p className="text-center text-muted py-16">{t('cars.noCars')}</p>
        ) : (
          <div className="space-y-16 sm:space-y-20">
            {sections.map((section, sIdx) => (
              <Motion.section
                key={section.category}
                id={`category-${section.category.toLowerCase()}`}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.5, delay: Math.min(sIdx * 0.05, 0.2) }}
              >
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-6 sm:mb-8 border-b border-borderColor pb-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-primary/80 mb-1">
                      {t('cars.categoryLabel')}
                    </p>
                    <h2 className="font-display text-3xl sm:text-4xl text-ink leading-none">
                      {section.category}
                    </h2>
                  </div>
                  <p className="text-sm text-muted">
                    {t('cars.categoryCount', { count: section.cars.length })}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                  {section.cars.map((car, index) => (
                    <Motion.div
                      key={car._id}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.24) }}
                    >
                      <CarCard car={car} />
                    </Motion.div>
                  ))}
                </div>
              </Motion.section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Cars

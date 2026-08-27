import React, { useEffect, useMemo, useRef, useState } from 'react'
import Seo from '../components/Seo'
import { assets } from '../assets/assets'
import CategorySection from '../components/CategorySection'
import { Link, useSearchParams } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'
import { motion as Motion } from 'motion/react'
import { useI18n } from '../i18n/I18nContext'
import { getErrorMessage } from '../utils/apiError'
import { VEHICLE_CATEGORIES, groupCarsByCategory } from '../utils/vehicleCategories'
import { getCarLocations } from '../utils/carLocations'
import { AIRPORT_LANDING_PATH } from '../constants/site'
import { buildBreadcrumbList, buildOrganization } from '../seo/structuredData'
import { trackSearchCars, trackViewItemList } from '../utils/ga'

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
        trackSearchCars({
          pickupCity: pickupLocation || undefined,
          resultsCount: data.availableCars?.length ?? 0,
          pickupDate: urlPickupDate || undefined,
          returnDate: urlReturnDate || undefined,
          source: 'availability_search',
        })
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

  const lastListKey = useRef('')
  useEffect(() => {
    if (!filteredCars.length) return
    // Avoid spamming GA while the user types in the search box
    if (input.trim()) return
    const listId = isSearchData ? 'search_results' : 'fleet'
    const key = `${listId}:${filteredCars.map((c) => c._id).join(',')}`
    if (key === lastListKey.current) return
    lastListKey.current = key
    trackViewItemList({
      itemListId: listId,
      itemListName: isSearchData ? 'Search results' : 'Fleet',
      items: filteredCars.slice(0, 20).map((car, index) => ({
        item_id: car._id,
        item_name: `${car.brand || ''} ${car.model || ''}`.trim(),
        item_category: car.category,
        price: car.pricePerDay,
        index,
      })),
    })
    if (!isSearchData) {
      trackSearchCars({
        resultsCount: filteredCars.length,
        source: 'fleet',
      })
    }
  }, [filteredCars, isSearchData, input])

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

  const jsonLd = useMemo(
    () => [
      buildOrganization(),
      buildBreadcrumbList([
        { name: 'Home', path: '/' },
        { name: 'Cars', path: '/cars' },
      ]),
    ],
    [],
  )

  return (
    <div className="pb-20 sm:pb-28">
      <Seo
        title={t('cars.seoTitle')}
        description={t('cars.seoDescription')}
        path="/cars"
        jsonLd={jsonLd}
      />
      <Motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="fleet-atelier relative flex flex-col items-center py-16 sm:py-22 page-pad page-shell overflow-hidden"
      >
        <div className="fleet-atelier__atmosphere" aria-hidden="true" />
        <div className="fleet-atelier__grain" aria-hidden="true" />
        <div className="relative z-10 w-full max-w-3xl text-center">
          <p className="fleet-atelier__eyebrow">{t('featured.eyebrow')}</p>
          <h1 className="fleet-atelier__headline" style={{ fontSize: 'clamp(2.4rem, 5.5vw, 3.75rem)' }}>
            {t('cars.title')}
          </h1>
          <p className="fleet-atelier__lede mx-auto mt-4">{t('cars.subtitle')}</p>
        </div>

        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="relative z-10 flex items-center bg-white px-4 mt-8 max-w-xl w-full h-12 rounded-[0.15rem] border border-borderColor"
        >
          <img src={assets.search_icon} alt="" width={18} height={18} className="w-[1.125rem] h-[1.125rem] me-2 shrink-0" />
          <input
            onChange={(e) => setInput(e.target.value)}
            value={input}
            type="search"
            placeholder={t('cars.searchPlaceholder')}
            aria-label={t('cars.searchPlaceholder')}
            className="w-full min-w-0 h-full outline-none text-muted text-sm sm:text-base"
          />
        </Motion.div>

        {availableCategories.length > 0 && (
          <nav
            className="fleet-cat-nav relative z-10 mt-8 w-full max-w-4xl"
            aria-label={t('cars.categoryLabel')}
          >
            <Link
              to="/cars"
              onClick={() => selectCategory('')}
              className={`fleet-cat-chip ${!activeCategory ? 'is-active' : ''}`}
            >
              {t('cars.allCategories')}
            </Link>
            {availableCategories.map((cat) => (
              <Link
                key={cat}
                to={`/cars?category=${encodeURIComponent(cat)}`}
                onClick={() => selectCategory(cat)}
                className={`fleet-cat-chip ${
                  activeCategory.toLowerCase() === cat.toLowerCase() ? 'is-active' : ''
                }`}
              >
                {cat}
              </Link>
            ))}
          </nav>
        )}
        <p className="relative z-10 mt-6 text-center text-sm text-muted">
          <Link to={AIRPORT_LANDING_PATH} className="fleet-atelier__airport">
            {t('cars.airportLink')}
          </Link>
        </p>
      </Motion.div>

      <div className="page-pad page-shell mt-4 sm:mt-6">
        <p className="text-muted text-sm sm:text-base mb-6">
          {carsLoading || searchLoading
            ? t('common.loading')
            : t('cars.showing', { count: sections.reduce((n, s) => n + s.cars.length, 0) })}
        </p>

        {(carsLoading || searchLoading) && !filteredCars.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72 rounded-2xl bg-sand/70 animate-pulse" />
            ))}
          </div>
        ) : sections.length === 0 ? (
          <p className="text-center text-muted py-16">{t('cars.noCars')}</p>
        ) : (
          <div className="space-y-12 md:space-y-16">
            {sections.map((section, sIdx) => (
              <Motion.div
                key={section.category}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.12 }}
                transition={{ duration: 0.45, delay: Math.min(sIdx * 0.04, 0.16) }}
              >
                <CategorySection
                  id={`category-${section.category.toLowerCase()}`}
                  category={section.category}
                  count={section.cars.length}
                  cars={section.cars}
                  index={sIdx + 1}
                  animate={false}
                  actionTo={
                    activeCategory
                      ? '/cars'
                      : `/cars?category=${encodeURIComponent(section.category)}`
                  }
                  actionLabel={
                    activeCategory ? t('cars.allCategories') : t('featured.viewCategory')
                  }
                />
              </Motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Cars

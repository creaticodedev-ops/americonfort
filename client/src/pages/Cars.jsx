import React, { useEffect, useMemo, useRef, useState } from 'react'
import Seo from '../components/Seo'
import { assets } from '../assets/assets'
import CarCard from '../components/CarCard'
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

/**
 * Fleet catalog — same Atelier language as the homepage.
 * Fixed card geometry always; categories never change card size.
 */
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
      list = list.filter(
        (car) =>
          car.brand.toLowerCase().includes(q) ||
          car.model.toLowerCase().includes(q) ||
          car.category.toLowerCase().includes(q) ||
          car.transmission.toLowerCase().includes(q) ||
          getCarLocations(car).some((loc) => loc.toLowerCase().includes(q)),
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
        (c) => String(c.category || '').toLowerCase() === activeCategory.toLowerCase(),
      )
    }
    return groupCarsByCategory(list)
  }, [filteredCars, activeCategory])

  const flatList = useMemo(() => sections.flatMap((s) => s.cars), [sections])

  const availableCategories = useMemo(() => {
    const present = new Set(filteredCars.map((c) => c.category).filter(Boolean))
    return VEHICLE_CATEGORIES.filter((c) => present.has(c)).concat(
      [...present].filter((c) => !VEHICLE_CATEGORIES.includes(c)),
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

  const showGrouped = !activeCategory && !input.trim() && sections.length > 1
  const loading = (carsLoading || searchLoading) && !filteredCars.length

  return (
    <div className="ac-home pb-16 sm:pb-24">
      <Seo
        title={t('cars.seoTitle')}
        description={t('cars.seoDescription')}
        path="/cars"
        jsonLd={jsonLd}
      />

      <section className="ac-section">
        <div className="page-pad page-shell">
          <Motion.header
            className="ac-head ac-head--center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="ac-eyebrow">{t('featured.eyebrow')}</p>
            <h1 className="ac-title">{t('cars.title')}</h1>
            <p className="ac-lede">{t('cars.subtitle')}</p>
          </Motion.header>

          <Motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.45 }}
            className="ac-search"
          >
            <img
              src={assets.search_icon}
              alt=""
              width={18}
              height={18}
              className="ac-search__icon"
            />
            <input
              onChange={(e) => setInput(e.target.value)}
              value={input}
              type="search"
              placeholder={t('cars.searchPlaceholder')}
              aria-label={t('cars.searchPlaceholder')}
              className="ac-search__input"
            />
          </Motion.div>

          {availableCategories.length > 0 ? (
            <nav className="ac-tabs ac-tabs--center mt-7" aria-label={t('cars.categoryLabel')}>
              <Link
                to="/cars"
                onClick={() => selectCategory('')}
                className={`ac-tab${!activeCategory ? ' is-on' : ''}`}
              >
                {t('cars.allCategories')}
              </Link>
              {availableCategories.map((cat) => (
                <Link
                  key={cat}
                  to={`/cars?category=${encodeURIComponent(cat)}`}
                  onClick={() => selectCategory(cat)}
                  className={`ac-tab${
                    activeCategory.toLowerCase() === cat.toLowerCase() ? ' is-on' : ''
                  }`}
                >
                  {cat}
                </Link>
              ))}
            </nav>
          ) : null}

          <p className="mt-5 text-center">
            <Link to={AIRPORT_LANDING_PATH} className="ac-text-link">
              {t('cars.airportLink')}
            </Link>
          </p>
        </div>
      </section>

      <section className="ac-section ac-section--tight">
        <div className="page-pad page-shell">
          <p className="ac-fleet-meta">
            {loading
              ? t('common.loading')
              : t('cars.showing', { count: flatList.length })}
          </p>

          {loading ? (
            <div className="ac-fleet-grid">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="ac-skeleton-card" aria-hidden />
              ))}
            </div>
          ) : flatList.length === 0 ? (
            <p className="ac-empty">{t('cars.noCars')}</p>
          ) : showGrouped ? (
            <div className="ac-fleet-groups">
              {sections.map((section, sIdx) => (
                <Motion.div
                  key={section.category}
                  id={`category-${String(section.category).toLowerCase()}`}
                  className="ac-fleet-group"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.08 }}
                  transition={{ duration: 0.45, delay: Math.min(sIdx * 0.04, 0.16) }}
                >
                  <div className="ac-fleet-group__head">
                    <div className="ac-fleet-group__title-row">
                      <h2 className="ac-fleet-group__title">{section.category}</h2>
                      <span className="ac-fleet-group__count">{section.cars.length}</span>
                    </div>
                    <Link
                      to={`/cars?category=${encodeURIComponent(section.category)}`}
                      onClick={() => selectCategory(section.category)}
                      className="ac-text-link"
                    >
                      {t('featured.viewCategory')} →
                    </Link>
                  </div>
                  <div className="ac-fleet-grid">
                    {section.cars.map((car) => (
                      <CarCard key={car._id} car={car} />
                    ))}
                  </div>
                </Motion.div>
              ))}
            </div>
          ) : (
            <div className="ac-fleet-grid">
              {flatList.map((car, i) => (
                <Motion.div
                  key={car._id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.24), duration: 0.4 }}
                >
                  <CarCard car={car} showCategory={!activeCategory} />
                </Motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default Cars

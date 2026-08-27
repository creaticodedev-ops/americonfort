import React, { Suspense, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { assets } from '../assets/assets'
import ResponsiveImage from '../components/ResponsiveImage'
import Loader from '../components/Loader'
import Seo from '../components/Seo'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'
import { motion as Motion } from 'motion/react'
import { useI18n } from '../i18n/I18nContext'
import { getErrorMessage } from '../utils/apiError'
import { formatLocationsDisplay, getCarLocations } from '../utils/carLocations'
import { calculateBookingPricePreview } from '../utils/pricing'
import { isPhoneValid } from '../utils/phoneValidation'
import { buildGuestReservationWaUrl } from '../utils/whatsapp'
import {
  trackBeginCheckout,
  trackBookingSuccess,
  trackViewCar,
  trackWhatsAppClick,
} from '../utils/ga'
import {
  buildBreadcrumbList,
  buildOrganization,
  buildVehicleProductOffer,
} from '../seo/structuredData'
import { lazyWithRetry } from '../utils/lazyWithRetry'

const ReservationPanel = lazyWithRetry(() => import('../components/reservation/ReservationPanel'))

const toDateTimeLocal = (value) => {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T10:00`
  return value.slice(0, 16)
}

const formatFeeLabel = (location, currency, freeLabel) => {
  const fee = Number(location.deliveryFee) || 0
  const base = `${location.name} — ${location.address}`
  if (fee <= 0) return `${base} (${freeLabel})`
  return `${base} (+${currency}${fee})`
}

const CarDetails = () => {
  const { id } = useParams()
  const { t } = useI18n()
  const { cars, axios, pickupDate, setPickupDate, returnDate, setReturnDate, pickupLocations, carsLoading } = useAppContext()

  const navigate = useNavigate()
  const [car, setCar] = useState(null)
  const [bookingSettings, setBookingSettings] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    pickupLocationId: '',
    returnLocationId: '',
    notes: '',
  })

  const currency = import.meta.env.VITE_CURRENCY || 'MAD '
  const fallbackImage = assets.car_image1

  useEffect(() => {
    const applySettings = (settings) => {
      if (settings) setBookingSettings(settings)
    }

    const fromList = cars.find((c) => c._id === id)
    if (fromList) {
      setCar(fromList)
    }

    const fetchCar = async () => {
      try {
        const { data } = await axios.get(`/api/user/cars/${id}`)
        if (data.success) {
          if (!fromList) setCar(data.car)
          applySettings(data.bookingSettings)
        } else if (!fromList) {
          setNotFound(true)
        }
      } catch (error) {
        if (!fromList) {
          if (error.response?.status === 404) setNotFound(true)
          else toast.error(getErrorMessage(error))
        }
      }
    }

    if (!carsLoading) fetchCar()
  }, [cars, id, carsLoading, axios])

  useEffect(() => {
    if (!car?._id) return
    const cities = getCarLocations(car)
    trackViewCar({
      carId: car._id,
      carCategory: car.category,
      value: car.pricePerDay,
      currency: String(currency || 'MAD').replace(/\s/g, '') || 'MAD',
      pickupCity: cities[0] || undefined,
    })
  }, [car?._id, currency])

  // Entering the reservation panel = start of checkout (once per car; not a conversion).
  useEffect(() => {
    if (!car?._id) return
    const cities = getCarLocations(car)
    trackBeginCheckout({
      carId: car._id,
      carCategory: car.category,
      value: car.pricePerDay,
      currency: String(currency || 'MAD').replace(/\s/g, '') || 'MAD',
      pickupCity: cities[0] || undefined,
      bookingSource: 'website',
    })
  }, [car?._id, currency])

  useEffect(() => {
    if (pickupDate && /^\d{4}-\d{2}-\d{2}$/.test(pickupDate)) {
      setPickupDate(`${pickupDate}T10:00`)
    }
    if (returnDate && /^\d{4}-\d{2}-\d{2}$/.test(returnDate)) {
      setReturnDate(`${returnDate}T10:00`)
    }
  }, [pickupDate, returnDate, setPickupDate, setReturnDate])

  const pickupLoc = useMemo(
    () => pickupLocations.find((l) => l._id === form.pickupLocationId),
    [pickupLocations, form.pickupLocationId],
  )
  const returnLoc = useMemo(
    () => pickupLocations.find((l) => l._id === form.returnLocationId),
    [pickupLocations, form.returnLocationId],
  )

  const bookableLocations = useMemo(() => {
    if (!car) return pickupLocations
    const cities = getCarLocations(car)
    if (!cities.length) return pickupLocations
    const citySet = new Set(cities.map((c) => c.toLowerCase()))
    return pickupLocations.filter((l) => citySet.has(String(l.city || '').toLowerCase()))
  }, [car, pickupLocations])

  useEffect(() => {
    if (bookingSettings?.pickupReturn?.allowDifferentReturnLocation === false && form.pickupLocationId) {
      if (form.returnLocationId !== form.pickupLocationId) {
        setForm((f) => ({ ...f, returnLocationId: f.pickupLocationId }))
      }
    }
  }, [bookingSettings, form.pickupLocationId, form.returnLocationId])

  const priceBreakdown = useMemo(() => {
    if (!car) return null
    const pickup = toDateTimeLocal(pickupDate)
    const ret = toDateTimeLocal(returnDate)
    return calculateBookingPricePreview({
      pricePerDay: car.pricePerDay,
      pickupDate: pickup,
      returnDate: ret,
      pickupDeliveryFee: pickupLoc?.deliveryFee ?? 0,
      dropoffDeliveryFee: returnLoc?.deliveryFee ?? 0,
    })
  }, [car, pickupDate, returnDate, pickupLoc, returnLoc])

  const submitReservation = async ({ channel = 'whatsapp' } = {}) => {
    const pickup = toDateTimeLocal(pickupDate)
    const ret = toDateTimeLocal(returnDate)
    if (new Date(ret) <= new Date(pickup)) {
      toast.error(t('carDetails.invalidDates'))
      return
    }
    if (!form.pickupLocationId || !form.returnLocationId) {
      toast.error(t('carDetails.selectLocations'))
      return
    }
    if (!isPhoneValid(form.phone)) {
      toast.error(t('carDetails.invalidPhone'))
      return
    }

    const currencyCode = String(currency || 'MAD').replace(/\s/g, '') || 'MAD'
    const pickupCity = pickupLoc?.city || getCarLocations(car)[0] || undefined

    // Car-details WhatsApp CTA click (intent) — not a booking conversion.
    if (channel === 'whatsapp') {
      trackWhatsAppClick({
        ctaLocation: 'car_detail',
        carId: id,
        carCategory: car?.category,
        bookingSource: 'website',
      })
    }

    setSubmitting(true)
    try {
      const { data } = await axios.post('/api/bookings/create', {
        car: id,
        pickupDate: pickup,
        returnDate: ret,
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        pickupLocationId: form.pickupLocationId,
        returnLocationId: form.returnLocationId,
        notes: form.notes,
        channel,
      })

      if (data.success) {
        toast.success(data.message)
        const confirmation = {
          reservationId: data.reservationId,
          price: data.price,
          priceBreakdown: data.priceBreakdown,
          carName: `${car.brand} ${car.model}`,
          customerName: form.fullName,
          email: form.email,
          phone: form.phone,
          pickupDate: pickup,
          returnDate: ret,
          pickupLocation: pickupLoc ? `${pickupLoc.name} - ${pickupLoc.address}` : '',
          returnLocation: returnLoc ? `${returnLoc.name} - ${returnLoc.address}` : '',
          channel: data.channel || channel,
          notes: form.notes,
        }
        // Primary conversion path — only after backend success (no PII params).
        trackBookingSuccess({
          bookingId: data.reservationId,
          value: data.price,
          currency: currencyCode,
          carId: id,
          carCategory: car?.category,
          pickupCity,
          bookingSource: data.channel || channel || 'website',
          channel: data.channel || channel,
        })
        if (channel === 'whatsapp') {
          trackWhatsAppClick({
            ctaLocation: 'booking',
            carId: id,
            carCategory: car?.category,
            bookingSource: data.channel || channel || 'website',
          })
          const url = data.whatsappUrl || buildGuestReservationWaUrl(confirmation, {
            currency: currency.trim(),
            dial: data.whatsappDial,
          })
          window.open(url, '_blank', 'noopener,noreferrer')
        }
        sessionStorage.setItem('lastReservation', JSON.stringify(confirmation))
        navigate('/booking-confirmation', { state: confirmation })
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const minDate = useMemo(() => {
    const d = new Date()
    const minHours = Number(bookingSettings?.minAdvanceHours) || 0
    if (minHours > 0) d.setHours(d.getHours() + minHours)
    if (bookingSettings?.allowSameDayBooking === false) {
      d.setDate(d.getDate() + 1)
      d.setHours(0, 0, 0, 0)
    }
    return d
  }, [bookingSettings])

  const maxDate = useMemo(() => {
    const maxDays = Number(bookingSettings?.maxAdvanceDays) || 0
    if (maxDays <= 0) return null
    const d = new Date()
    d.setDate(d.getDate() + maxDays)
    return d
  }, [bookingSettings])

  const openingTime = bookingSettings?.pickupReturn?.openingTime || '06:00'
  const closingTime = bookingSettings?.pickupReturn?.closingTime || '22:00'

  const currencyCode = String(currency || 'MAD').replace(/\s/g, '') || 'MAD'

  const carJsonLd = useMemo(() => {
    if (!car) return null
    return [
      buildOrganization(),
      buildBreadcrumbList([
        { name: 'Home', path: '/' },
        { name: 'Cars', path: '/cars' },
        { name: `${car.brand} ${car.model}`, path: `/car-details/${car._id}` },
      ]),
      buildVehicleProductOffer(car, { currency: currencyCode }),
    ].filter(Boolean)
  }, [car, currencyCode])

  if (notFound) {
    return (
      <div className="ac-home">
        <div className="page-pad page-shell ac-section text-center">
          <Seo
            title="Vehicle not found"
            description="This vehicle is unavailable or not listed on the Americonfort website."
            path={`/car-details/${id}`}
            noindex
          />
          <h1 className="ac-title" style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)' }}>
            Vehicle not found
          </h1>
          <Link to="/cars" className="ac-btn mt-6 inline-flex">
            {t('carDetails.back')}
          </Link>
        </div>
      </div>
    )
  }

  if (!car) return <Loader />

  const specs = [
    { icon: assets.users_icon, text: t('carDetails.seats', { count: car.seating_capacity }) },
    { icon: assets.fuel_icon, text: car.fuel_type },
    { icon: assets.car_icon, text: car.transmission },
    { icon: assets.location_icon, text: formatLocationsDisplay(car) },
  ]

  const seoTitle = `${car.brand} ${car.model} — Car Rental Morocco`
  const seoDescription =
    car.description ||
    `Rent the ${car.brand} ${car.model}${car.category ? ` (${car.category})` : ''} with Americonfort in Morocco. Daily rate from ${currency}${car.pricePerDay}. Reserve online.`

  return (
    <div className="ac-home">
      <div className="page-pad page-shell ac-section">
        <Seo
          title={seoTitle}
          description={seoDescription}
          path={`/car-details/${car._id}`}
          type="product"
          image={car.image || car.images?.[0]}
          jsonLd={carJsonLd}
        />
        <Link to="/cars" className="ac-text-link ac-back">
          <span aria-hidden>←</span>
          {t('carDetails.back')}
        </Link>

        <div className="ac-detail">
          <div className="ac-detail__main">
            <Motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
              <div className="ac-detail__media">
                <div className="ac-detail__studio" aria-hidden />
                <ResponsiveImage
                  src={car.image || car.images?.[0] || fallbackImage}
                  fallbackSrc={fallbackImage}
                  alt={`${car.brand} ${car.model}`}
                  widths={[640, 960, 1280, 1600]}
                  sizes="(max-width: 1024px) 100vw, 720px"
                  width={1280}
                  height={720}
                  fetchPriority="high"
                  decoding="async"
                  className="ac-detail__img"
                />
              </div>

              <div className="ac-detail__identity">
                {car.category ? <p className="ac-eyebrow">{car.category}</p> : null}
                <h1 className="ac-detail__title">
                  {car.brand} {car.model}
                </h1>
                {car.year ? <p className="ac-detail__year">{car.year}</p> : null}
                <p className="ac-detail__rate">
                  <span className="ac-detail__cur">{currency.trim()}</span>
                  <span className="ac-detail__amt">{car.pricePerDay}</span>
                  <span className="ac-detail__per">{t('carDetails.perDay')}</span>
                </p>
              </div>

              <div className="ac-detail__specs">
                {specs.map(({ icon, text }) => (
                  <span key={text} className="ac-detail__spec">
                    <img src={icon} alt="" width={16} height={16} className="h-4 w-4 opacity-70" loading="lazy" />
                    {text}
                  </span>
                ))}
              </div>

              <div className="ac-detail__copy">
                <section>
                  <h2 className="ac-detail__h">{t('carDetails.description')}</h2>
                  <p className="ac-detail__p">{car.description}</p>
                </section>
                <section>
                  <h2 className="ac-detail__h">{t('carDetails.features')}</h2>
                  <ul className="ac-detail__features">
                    {(car.features?.length
                      ? car.features
                      : ['360 Camera', 'Bluetooth', 'GPS', 'Heated Seats']
                    ).map((item) => (
                      <li key={item}>
                        <img
                          src={assets.check_icon}
                          className="h-4 w-4 shrink-0"
                          alt=""
                          width={16}
                          height={16}
                          loading="lazy"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </Motion.div>
          </div>

          <div className="ac-detail__aside">
            <Suspense fallback={<Loader />}>
              <ReservationPanel
                car={car}
                form={form}
                setForm={setForm}
                pickupDate={pickupDate}
                setPickupDate={setPickupDate}
                returnDate={returnDate}
                setReturnDate={setReturnDate}
                bookableLocations={bookableLocations}
                pickupLoc={pickupLoc}
                returnLoc={returnLoc}
                priceBreakdown={priceBreakdown}
                currency={currency}
                submitting={submitting}
                onWhatsAppSubmit={() => submitReservation({ channel: 'whatsapp' })}
                t={t}
                formatFeeLabel={(loc) => formatFeeLabel(loc, currency, t('carDetails.free'))}
                minDate={minDate}
                maxDate={maxDate}
                openingTime={openingTime}
                closingTime={closingTime}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CarDetails

import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { assets } from '../assets/assets'
import Loader from '../components/Loader'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'
import { motion as Motion } from 'framer-motion'
import { useI18n } from '../i18n/I18nContext'
import { getErrorMessage } from '../utils/apiError'
import { formatLocationsDisplay, getCarLocations } from '../utils/carLocations'
import { calculateBookingPricePreview } from '../utils/pricing'
import { isPhoneValid } from '../components/PhoneInput'
import { buildGuestReservationWaUrl } from '../utils/whatsapp'
import ReservationPanel from '../components/reservation/ReservationPanel'

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
    const fromList = cars.find((c) => c._id === id)
    if (fromList) {
      setCar(fromList)
      return
    }

    const fetchCar = async () => {
      try {
        const { data } = await axios.get(`/api/user/cars/${id}`)
        if (data.success) setCar(data.car)
        else setNotFound(true)
      } catch (error) {
        if (error.response?.status === 404) setNotFound(true)
        else toast.error(getErrorMessage(error))
      }
    }

    if (!carsLoading) fetchCar()
  }, [cars, id, carsLoading, axios])

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
        if (channel === 'whatsapp') {
          const url = data.whatsappUrl || buildGuestReservationWaUrl(confirmation, { currency: currency.trim() })
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

  const minDate = new Date()

  if (notFound) {
    return (
      <div className="page-pad page-shell mt-10 sm:mt-16 text-center pb-16">
        <h1 className="text-2xl font-semibold text-gray-800">Vehicle not found</h1>
        <button type="button" onClick={() => navigate('/cars')} className="mt-4 text-primary cursor-pointer">{t('carDetails.back')}</button>
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

  return (
    <div className="page-pad page-shell mt-6 sm:mt-10 md:mt-12 pb-16 sm:pb-20 bg-gradient-to-b from-white to-sand/30 min-h-screen">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-sm text-gray-500 transition hover:text-gray-800 cursor-pointer"
      >
        <img src={assets.arrow_icon} alt="" className="w-4 rotate-180 opacity-60" />
        {t('carDetails.back')}
      </button>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10 xl:gap-14">
        <div className="order-2 lg:order-1 lg:col-span-7 xl:col-span-8 min-w-0">
          <Motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <div className="overflow-hidden rounded-2xl bg-gray-100 shadow-sm ring-1 ring-gray-200/60">
              <img
                src={car.image || car.images?.[0] || fallbackImage}
                onError={(e) => { e.currentTarget.src = fallbackImage }}
                alt=""
                className="aspect-[16/10] w-full object-cover sm:aspect-[16/9]"
              />
            </div>

            <div className="mt-6 sm:mt-8">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{car.category}</p>
              <h1 className="font-display mt-1 text-2xl font-medium text-gray-900 sm:text-3xl lg:text-4xl">
                {car.brand} {car.model}
              </h1>
              <p className="mt-1 text-sm text-gray-500">{car.year}</p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {specs.map(({ icon, text }) => (
                <span
                  key={text}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200/80 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 shadow-sm"
                >
                  <img src={icon} alt="" className="h-4 w-4 opacity-70" />
                  {text}
                </span>
              ))}
            </div>

            <div className="mt-10 grid gap-10 sm:grid-cols-2">
              <section>
                <h2 className="text-sm font-semibold text-gray-900">{t('carDetails.description')}</h2>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">{car.description}</p>
              </section>
              <section>
                <h2 className="text-sm font-semibold text-gray-900">{t('carDetails.features')}</h2>
                <ul className="mt-3 space-y-2">
                  {(car.features?.length ? car.features : ['360 Camera', 'Bluetooth', 'GPS', 'Heated Seats']).map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                      <img src={assets.check_icon} className="h-4 w-4 shrink-0" alt="" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </Motion.div>
        </div>

        <div className="order-1 lg:order-2 lg:col-span-5 xl:col-span-4 min-w-0">
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
          />
        </div>
      </div>
    </div>
  )
}

export default CarDetails

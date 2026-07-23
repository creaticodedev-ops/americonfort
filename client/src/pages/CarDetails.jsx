import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { assets } from '../assets/assets'
import Loader from '../components/Loader'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'
import { motion } from 'motion/react'
import { useI18n } from '../i18n/I18nContext'
import { getErrorMessage } from '../utils/apiError'
import { formatLocationsDisplay, getCarLocations } from '../utils/carLocations'
import { calculateBookingPricePreview } from '../utils/pricing'
import PhoneInput, { isPhoneValid } from '../components/PhoneInput'

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

const PriceBreakdown = ({ breakdown, currency, t }) => {
  if (!breakdown?.ready) {
    return (
      <div className="rounded-xl border border-dashed border-borderColor bg-light/60 px-4 py-3 text-sm text-gray-500">
        {t('carDetails.priceHint')}
      </div>
    )
  }

  const rows = [
    {
      key: 'rental',
      label: t('carDetails.rentalPrice'),
      hint: breakdown.days > 0
        ? t('carDetails.rentalDays', { days: breakdown.days, rate: `${currency}${breakdown.pricePerDay}` })
        : '',
      amount: breakdown.rentalPrice,
    },
    {
      key: 'pickup',
      label: t('carDetails.pickupDeliveryFee'),
      amount: breakdown.pickupDeliveryFee,
      free: breakdown.pickupDeliveryFee <= 0,
    },
    {
      key: 'dropoff',
      label: t('carDetails.dropoffDeliveryFee'),
      amount: breakdown.dropoffDeliveryFee,
      free: breakdown.dropoffDeliveryFee <= 0,
    },
  ]

  return (
    <div className="rounded-xl border border-borderColor bg-light/40 px-4 py-4 space-y-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {t('carDetails.priceBreakdown')}
      </p>
      {rows.map((row) => (
        <div key={row.key} className="flex items-start justify-between gap-3 text-sm">
          <div className="min-w-0">
            <p className="text-gray-700">{row.label}</p>
            {row.hint && <p className="text-xs text-gray-400 mt-0.5">{row.hint}</p>}
          </div>
          <p className="font-medium text-gray-800 whitespace-nowrap">
            {row.free ? t('carDetails.free') : `${currency}${row.amount}`}
          </p>
        </div>
      ))}

      {breakdown.discountTotal > 0 && (
        <div className="flex items-center justify-between gap-3 text-sm text-green-700">
          <p>{t('carDetails.discounts')}</p>
          <p className="font-medium whitespace-nowrap">−{currency}{breakdown.discountTotal}</p>
        </div>
      )}

      <div className="border-t border-borderColor pt-3 mt-1 flex items-center justify-between gap-3">
        <p className="font-semibold text-gray-900">{t('carDetails.finalTotal')}</p>
        <p className="text-xl font-semibold text-primary whitespace-nowrap">
          {currency}{breakdown.total}
        </p>
      </div>
      <p className="text-[11px] text-gray-400 leading-relaxed">{t('carDetails.noHiddenFees')}</p>
    </div>
  )
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
  }, [])

  const pickupLoc = useMemo(
    () => pickupLocations.find((l) => l._id === form.pickupLocationId),
    [pickupLocations, form.pickupLocationId]
  )
  const returnLoc = useMemo(
    () => pickupLocations.find((l) => l._id === form.returnLocationId),
    [pickupLocations, form.returnLocationId]
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return

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

  const minDateTime = new Date().toISOString().slice(0, 16)

  if (notFound) {
    return (
      <div className="page-pad page-shell mt-10 sm:mt-16 text-center pb-16">
        <h1 className="text-2xl font-semibold text-gray-800">Vehicle not found</h1>
        <button onClick={() => navigate('/cars')} className="mt-4 text-primary cursor-pointer">{t('carDetails.back')}</button>
      </div>
    )
  }

  if (!car) return <Loader />

  return (
    <div className="page-pad page-shell mt-8 sm:mt-12 md:mt-16 pb-16 sm:pb-24">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-5 sm:mb-6 text-gray-500 cursor-pointer text-sm sm:text-base">
        <img src={assets.arrow_icon} alt="" className="rotate-180 opacity-65 w-4" />
        {t('carDetails.back')}
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-2 min-w-0 order-2 md:order-1"
        >
          <motion.img
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            src={car.image || car.images?.[0] || fallbackImage}
            onError={(e) => { e.currentTarget.src = fallbackImage }}
            alt=""
            className="w-full h-auto max-h-[280px] sm:max-h-[380px] md:max-h-[440px] lg:max-h-[520px] object-cover rounded-xl mb-6 shadow-md"
          />
          <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-medium break-words">{car.brand} {car.model}</h1>
              <p className="text-gray-500 text-base sm:text-lg">{car.category} • {car.year}</p>
            </div>
            <hr className="border-borderColor my-6" />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {[
                { icon: assets.users_icon, text: t('carDetails.seats', { count: car.seating_capacity }) },
                { icon: assets.fuel_icon, text: car.fuel_type },
                { icon: assets.car_icon, text: car.transmission },
                { icon: assets.location_icon, text: formatLocationsDisplay(car) },
              ].map(({ icon, text }) => (
                <motion.div key={text} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col items-center bg-light p-3 sm:p-4 rounded-lg text-center text-xs sm:text-sm break-words">
                  <img src={icon} alt="" className="h-5 mb-2" />
                  {text}
                </motion.div>
              ))}
            </div>

            <div>
              <h1 className='text-xl font-medium mb-3'>{t('carDetails.description')}</h1>
              <p className='text-gray-500'>{car.description}</p>
            </div>

            <div>
              <h1 className='text-xl font-medium mb-3'>{t('carDetails.features')}</h1>
              <ul className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                {(car.features?.length ? car.features : ['360 Camera', 'Bluetooth', 'GPS', 'Heated Seats', 'Rear View Mirror']).map((item) => (
                  <li key={item} className='flex items-center text-gray-500'>
                    <img src={assets.check_icon} className='h-4 mr-2' alt="" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          onSubmit={handleSubmit}
          className="shadow-lg h-max lg:sticky lg:top-24 rounded-xl p-5 sm:p-6 space-y-4 text-gray-500 max-h-none lg:max-h-[calc(100svh-7rem)] overflow-y-auto border border-gray-100 bg-white min-w-0 order-1 md:order-2"
        >
          <div className="flex flex-col min-[400px]:flex-row min-[400px]:items-start min-[400px]:justify-between gap-2">
            <div className="min-w-0">
              <p className="text-lg sm:text-xl font-semibold text-gray-800">{t('carDetails.bookingTitle')}</p>
              <p className="text-sm text-gray-500">{t('carDetails.bookingSubtitle')}</p>
            </div>
            <p className="text-xl sm:text-2xl text-gray-800 font-semibold whitespace-nowrap shrink-0">
              {currency}{car.pricePerDay}
              <span className="text-sm sm:text-base text-gray-400 font-normal">{t('carDetails.perDay')}</span>
            </p>
          </div>

          <hr className="border-borderColor" />

          <div className="grid grid-cols-1 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="fullName">{t('carDetails.fullName')}</label>
              <input id="fullName" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} type="text" className="border border-borderColor px-3 py-2 rounded-lg w-full" required />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="phone">{t('carDetails.phone')}</label>
              <PhoneInput
                id="phone"
                value={form.phone}
                onChange={(phone) => setForm({ ...form, phone })}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="email">{t('carDetails.email')}</label>
              <input id="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" className="border border-borderColor px-3 py-2 rounded-lg w-full" required />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <label htmlFor="pickupLocation">{t('carDetails.pickupLocation')}</label>
              <select
                id="pickupLocation"
                value={form.pickupLocationId}
                onChange={(e) => setForm({ ...form, pickupLocationId: e.target.value })}
                className="border border-borderColor px-3 py-2 rounded-lg w-full max-w-full"
                required
              >
                <option value="">{t('carDetails.selectPickup')}</option>
                {bookableLocations.map((location) => (
                  <option key={location._id} value={location._id}>
                    {formatFeeLabel(location, currency, t('carDetails.free'))}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <label htmlFor="returnLocation">{t('carDetails.dropoffLocation')}</label>
              <select
                id="returnLocation"
                value={form.returnLocationId}
                onChange={(e) => setForm({ ...form, returnLocationId: e.target.value })}
                className="border border-borderColor px-3 py-2 rounded-lg w-full max-w-full"
                required
              >
                <option value="">{t('carDetails.selectDropoff')}</option>
                {bookableLocations.map((location) => (
                  <option key={location._id} value={location._id}>
                    {formatFeeLabel(location, currency, t('carDetails.free'))}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <label htmlFor="pickup-date">{t('carDetails.pickupDateTime')}</label>
              <input id="pickup-date" value={toDateTimeLocal(pickupDate)} onChange={(e) => setPickupDate(e.target.value)} type="datetime-local" className="border border-borderColor px-3 py-2 rounded-lg w-full min-w-0" required min={minDateTime} />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <label htmlFor="return-date">{t('carDetails.returnDateTime')}</label>
              <input id="return-date" value={toDateTimeLocal(returnDate)} onChange={(e) => setReturnDate(e.target.value)} type="datetime-local" className="border border-borderColor px-3 py-2 rounded-lg w-full min-w-0" required min={toDateTimeLocal(pickupDate) || minDateTime} />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="notes">{t('carDetails.notes')}</label>
              <textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows="3" className="border border-borderColor px-3 py-2 rounded-lg w-full" />
            </div>
          </div>

          <PriceBreakdown breakdown={priceBreakdown} currency={currency} t={t} />

          <button disabled={submitting || !priceBreakdown?.ready} className='w-full bg-primary hover:bg-primary-dull transition-all py-3 font-medium text-white rounded-xl cursor-pointer disabled:opacity-60'>
            {t('carDetails.submit')}
          </button>

          <p className='text-center text-sm'>{t('carDetails.noCard')}</p>
        </motion.form>
      </div>
    </div>
  )
}

export default CarDetails

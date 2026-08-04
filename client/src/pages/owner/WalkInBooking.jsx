import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Title from '../../components/owner/Title'
import ChannelBadge from '../../components/owner/ChannelBadge'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import toast from 'react-hot-toast'
import { getErrorMessage } from '../../utils/apiError'
import { getCarLocations } from '../../utils/carLocations'
import PhoneInput, { isPhoneValid } from '../../components/PhoneInput'

const emptyForm = {
  car: '',
  fullName: '',
  email: '',
  phone: '',
  pickupDate: '',
  returnDate: '',
  pickupLocationId: '',
  returnLocationId: '',
  notes: '',
  status: 'confirmed',
  markPaid: false,
  sendCompletionLink: false,
  nationality: '',
  dateOfBirth: '',
  driverLicenseNumber: '',
  driverLicenseExpiry: '',
  passportNumber: '',
}

const WalkInBooking = () => {
  const { axios, currency, pickupLocations } = useAppContext()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [cars, setCars] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [quote, setQuote] = useState(null)
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState(null)
  const [docFiles, setDocFiles] = useState({
    driving_license: null,
    national_id: null,
    passport: null,
  })
  const [uploadingDoc, setUploadingDoc] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await axios.get('/api/owner/cars')
        if (data.success) {
          setCars((data.cars || []).filter((c) => c.status !== 'maintenance' && c.isAvaliable !== false))
        }
      } catch (error) {
        toast.error(getErrorMessage(error))
      }
    })()
  }, [axios])

  const selectedCar = useMemo(() => cars.find((c) => c._id === form.car), [cars, form.car])

  const bookableLocations = useMemo(() => {
    if (!selectedCar) return pickupLocations
    const cities = getCarLocations(selectedCar)
    if (!cities.length) return pickupLocations
    const citySet = new Set(cities.map((c) => c.toLowerCase()))
    return pickupLocations.filter((l) => citySet.has(String(l.city || '').toLowerCase()))
  }, [selectedCar, pickupLocations])

  useEffect(() => {
    const ids = new Set(bookableLocations.map((l) => String(l._id)))
    setForm((f) => {
      const pickupOk = !f.pickupLocationId || ids.has(String(f.pickupLocationId))
      const returnOk = !f.returnLocationId || ids.has(String(f.returnLocationId))
      if (pickupOk && returnOk) return f
      return {
        ...f,
        pickupLocationId: pickupOk ? f.pickupLocationId : '',
        returnLocationId: returnOk ? f.returnLocationId : '',
      }
    })
  }, [bookableLocations])

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  // Live price estimate (client-side approximation matching server days logic)
  useEffect(() => {
    if (!selectedCar || !form.pickupDate || !form.returnDate) {
      setQuote(null)
      return
    }
    const start = new Date(form.pickupDate)
    const end = new Date(form.returnDate)
    if (!(end > start)) {
      setQuote(null)
      return
    }
    const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)))
    const pickup = pickupLocations.find((l) => l._id === form.pickupLocationId)
    const dropoff = pickupLocations.find((l) => l._id === form.returnLocationId)
    const pickupFee = Number(pickup?.deliveryFee) || 0
    const dropoffFee = Number(dropoff?.deliveryFee) || 0
    const rental = days * Number(selectedCar.pricePerDay || 0)
    setQuote({
      days,
      rental,
      pickupFee,
      dropoffFee,
      total: rental + pickupFee + dropoffFee,
    })
  }, [selectedCar, form.pickupDate, form.returnDate, form.pickupLocationId, form.returnLocationId, pickupLocations])

  const uploadDocument = async (bookingId, file, docType, identityType) => {
    if (!file || !bookingId) return
    setUploadingDoc(docType)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('docType', docType)
      if (docType === 'identity') formData.append('identityType', identityType || 'national_id')
      const { data } = await axios.post(`/api/bookings/owner/${bookingId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (data.success) toast.success(data.message)
      else toast.error(data.message)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setUploadingDoc('')
    }
  }

  const uploadPendingDocuments = async (bookingId) => {
    if (docFiles.driving_license) {
      await uploadDocument(bookingId, docFiles.driving_license, 'driving_license')
    }
    if (docFiles.national_id) {
      await uploadDocument(bookingId, docFiles.national_id, 'identity', 'national_id')
    }
    if (docFiles.passport) {
      await uploadDocument(bookingId, docFiles.passport, 'passport')
    }
    setDocFiles({ driving_license: null, national_id: null, passport: null })
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!form.car || !form.fullName || !form.phone || !form.pickupDate || !form.returnDate) {
      toast.error(t('admin.walkIn.required'))
      return
    }
    if (!form.pickupLocationId || !form.returnLocationId) {
      toast.error(t('admin.walkIn.selectLocations'))
      return
    }
    if (!isPhoneValid(form.phone)) {
      toast.error(t('admin.walkIn.invalidPhone'))
      return
    }
    setSaving(true)
    try {
      const { data } = await axios.post('/api/bookings/owner/walk-in', {
        ...form,
        paymentStatus: form.markPaid ? 'paid' : 'pending',
      })
      if (data.success) {
        toast.success(data.message)
        if (data.booking?._id) {
          await uploadPendingDocuments(data.booking._id)
        }
        setCreated(data)
        setForm(emptyForm)
        setQuote(null)
      } else toast.error(data.message)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const input = 'border border-borderColor rounded-md px-3 py-2 text-sm w-full outline-none focus:border-primary bg-white'

  return (
    <div className="px-4 pt-8 md:px-8 lg:px-10 xl:px-12 md:pt-10 flex-1 pb-12 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <Title title={t('admin.walkIn.title')} subTitle={t('admin.walkIn.subtitle')} />
        <div className="flex items-center gap-2">
          <ChannelBadge channel="walk_in" />
          <Link to="/owner/manage-bookings" className="text-sm text-primary hover:underline">
            {t('admin.walkIn.viewAll')}
          </Link>
        </div>
      </div>

      {created && (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">
            {t('admin.walkIn.created', { id: created.reservationId })}
          </p>
          {created.completion?.completionUrl && (
            <p className="mt-2 break-all text-xs">
              Completion link: {created.completion.completionUrl}
            </p>
          )}
          {created.booking?._id && (
            <div className="mt-4 rounded-lg border border-emerald-300 bg-white p-3 space-y-2">
              <p className="font-medium text-sm">{t('admin.walkIn.uploadDocuments')}</p>
              <p className="text-xs text-gray-500">{t('admin.walkIn.uploadDocumentsHint')}</p>
              <div>
                <label className="text-xs text-gray-500">{t('admin.walkIn.uploadLicense')}</label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingDoc === 'driving_license'}
                  className="block text-xs mt-1"
                  onChange={(e) => {
                    uploadDocument(created.booking._id, e.target.files?.[0], 'driving_license')
                    e.target.value = ''
                  }}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">{t('admin.walkIn.uploadNationalId')}</label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingDoc === 'identity'}
                  className="block text-xs mt-1"
                  onChange={(e) => {
                    uploadDocument(created.booking._id, e.target.files?.[0], 'identity', 'national_id')
                    e.target.value = ''
                  }}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">{t('admin.walkIn.uploadPassport')}</label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingDoc === 'passport'}
                  className="block text-xs mt-1"
                  onChange={(e) => {
                    uploadDocument(created.booking._id, e.target.files?.[0], 'passport')
                    e.target.value = ''
                  }}
                />
              </div>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/owner/manage-bookings')}
              className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs"
            >
              {t('admin.walkIn.openBookings')}
            </button>
            <button
              type="button"
              onClick={() => setCreated(null)}
              className="px-3 py-1.5 border rounded-lg text-xs"
            >
              {t('admin.walkIn.createAnother')}
            </button>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5 rounded-xl border border-borderColor bg-white p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">{t('admin.walkIn.customer')}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500">{t('admin.walkIn.fullName')} *</label>
              <input className={input} required value={form.fullName} onChange={(e) => setField('fullName', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500">{t('admin.walkIn.phone')} *</label>
              <PhoneInput value={form.phone} onChange={(phone) => setField('phone', phone)} required />
            </div>
            <div>
              <label className="text-xs text-gray-500">{t('admin.walkIn.email')}</label>
              <input type="email" className={input} value={form.email} onChange={(e) => setField('email', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500">{t('admin.walkIn.nationality')}</label>
              <input className={input} value={form.nationality} onChange={(e) => setField('nationality', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500">{t('admin.walkIn.dateOfBirth')}</label>
              <input type="date" className={input} value={form.dateOfBirth} onChange={(e) => setField('dateOfBirth', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500">{t('admin.walkIn.license')}</label>
              <input className={input} value={form.driverLicenseNumber} onChange={(e) => setField('driverLicenseNumber', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500">{t('admin.walkIn.licenseExpiry')}</label>
              <input type="date" className={input} value={form.driverLicenseExpiry} onChange={(e) => setField('driverLicenseExpiry', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500">{t('admin.walkIn.passport')}</label>
              <input className={input} value={form.passportNumber} onChange={(e) => setField('passportNumber', e.target.value)} />
            </div>
          </div>

          <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide pt-2">{t('admin.walkIn.rental')}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500">{t('admin.walkIn.vehicle')} *</label>
              <select className={input} required value={form.car} onChange={(e) => setField('car', e.target.value)}>
                <option value="">{t('admin.walkIn.selectVehicle')}</option>
                {cars.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.fleetId ? `[${c.fleetId}] ` : ''}{c.brand} {c.model} — {currency}{c.pricePerDay}/day
                    {c.licensePlate ? ` · ${c.licensePlate}` : ''}
                    {c.branch ? ` · ${c.branch}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">{t('admin.walkIn.pickup')} *</label>
              <input type="datetime-local" className={input} required value={form.pickupDate} onChange={(e) => setField('pickupDate', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500">{t('admin.walkIn.return')} *</label>
              <input type="datetime-local" className={input} required value={form.returnDate} onChange={(e) => setField('returnDate', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500">{t('admin.walkIn.pickupLoc')} *</label>
              <select className={input} required value={form.pickupLocationId} onChange={(e) => setField('pickupLocationId', e.target.value)}>
                <option value="">{t('admin.walkIn.selectLoc')}</option>
                {bookableLocations.map((l) => (
                  <option key={l._id} value={l._id}>{l.city} — {l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">{t('admin.walkIn.returnLoc')} *</label>
              <select className={input} required value={form.returnLocationId} onChange={(e) => setField('returnLocationId', e.target.value)}>
                <option value="">{t('admin.walkIn.selectLoc')}</option>
                {bookableLocations.map((l) => (
                  <option key={l._id} value={l._id}>{l.city} — {l.name}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500">{t('admin.walkIn.notes')}</label>
              <textarea rows={2} className={input} value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
            </div>
          </div>

          <div className="rounded-xl border border-borderColor bg-gray-50 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">{t('admin.walkIn.uploadDocuments')}</h2>
            <p className="text-xs text-gray-500">{t('admin.walkIn.uploadDocumentsHint')}</p>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-500">{t('admin.walkIn.uploadLicense')} *</label>
                <input
                  type="file"
                  accept="image/*"
                  className="block text-xs mt-1 w-full"
                  onChange={(e) => setDocFiles((d) => ({ ...d, driving_license: e.target.files?.[0] || null }))}
                />
                {docFiles.driving_license && <p className="text-[11px] text-emerald-700 mt-1 truncate">{docFiles.driving_license.name}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500">{t('admin.walkIn.uploadNationalId')} *</label>
                <input
                  type="file"
                  accept="image/*"
                  className="block text-xs mt-1 w-full"
                  onChange={(e) => setDocFiles((d) => ({ ...d, national_id: e.target.files?.[0] || null }))}
                />
                {docFiles.national_id && <p className="text-[11px] text-emerald-700 mt-1 truncate">{docFiles.national_id.name}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500">{t('admin.walkIn.uploadPassport')}</label>
                <input
                  type="file"
                  accept="image/*"
                  className="block text-xs mt-1 w-full"
                  onChange={(e) => setDocFiles((d) => ({ ...d, passport: e.target.files?.[0] || null }))}
                />
                {docFiles.passport && <p className="text-[11px] text-emerald-700 mt-1 truncate">{docFiles.passport.name}</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-borderColor bg-white p-4 sm:p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-800">{t('admin.walkIn.options')}</h2>
            <div>
              <label className="text-xs text-gray-500">{t('admin.walkIn.initialStatus')}</label>
              <select className={input} value={form.status} onChange={(e) => setField('status', e.target.value)}>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="ready_for_pickup">Ready for pickup</option>
                <option value="active">Active (out)</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.markPaid} onChange={(e) => setField('markPaid', e.target.checked)} />
              {t('admin.walkIn.markPaid')}
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.sendCompletionLink}
                onChange={(e) => setField('sendCompletionLink', e.target.checked)}
                disabled={!form.email}
              />
              {t('admin.walkIn.sendLink')}
            </label>
            <p className="text-xs text-gray-400">{t('admin.walkIn.sendLinkHint')}</p>
          </div>

          <div className="rounded-xl border border-borderColor bg-white p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">{t('admin.walkIn.estimate')}</h2>
            {quote ? (
              <ul className="text-sm space-y-1.5 text-gray-600">
                <li className="flex justify-between"><span>{t('admin.walkIn.days', { count: quote.days })}</span><span>{currency}{quote.rental}</span></li>
                {quote.pickupFee > 0 && <li className="flex justify-between"><span>Pickup fee</span><span>{currency}{quote.pickupFee}</span></li>}
                {quote.dropoffFee > 0 && <li className="flex justify-between"><span>Return fee</span><span>{currency}{quote.dropoffFee}</span></li>}
                <li className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-borderColor">
                  <span>{t('admin.walkIn.total')}</span>
                  <span>{currency}{quote.total}</span>
                </li>
              </ul>
            ) : (
              <p className="text-sm text-gray-400">{t('admin.walkIn.estimateHint')}</p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="mt-5 w-full bg-primary hover:bg-primary-dull text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-60"
            >
              {saving ? t('admin.walkIn.saving') : t('admin.walkIn.submit')}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default WalkInBooking

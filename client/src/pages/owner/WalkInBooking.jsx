import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AdminPage, PageHeader, DirectorySearchSelect } from '../../components/owner/ui'
import ChannelBadge from '../../components/owner/ChannelBadge'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import toast from 'react-hot-toast'
import { getErrorMessage } from '../../utils/apiError'
import { getCarLocations } from '../../utils/carLocations'
import PhoneInput from '../../components/PhoneInput'
import { isPhoneValid } from '../../utils/phoneValidation'

const emptySecondDriver = {
  enabled: false,
  fullName: '',
  dateOfBirth: '',
  nationality: '',
  driverLicenseNumber: '',
  driverLicenseExpiry: '',
  passportNumber: '',
  phone: '',
}

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
  placeOfBirth: '',
  customerAddress: '',
  identityDocumentNumber: '',
  identityIssuedOn: '',
  driverLicenseNumber: '',
  driverLicenseExpiry: '',
  driverLicenseIssuedOn: '',
  passportNumber: '',
  deliveredBy: '',
  receivedBy: '',
  brokerReferrerType: '',
  brokerReferrerId: '',
  vehicleDeliveryDriverId: '',
  fuelLevelStart: '',
  kmDepart: '',
  kmRetour: '',
  franchiseAmount: '',
  secondDriver: { ...emptySecondDriver },
}

const Field = ({ label, required, hint, children, className = '' }) => (
  <div className={className}>
    <label className="mb-1.5 block text-[11px] font-medium text-[var(--admin-fg-muted)]">
      {label}{required ? <span className="text-[var(--admin-accent)]"> *</span> : null}
    </label>
    {children}
    {hint ? <p className="mt-1 text-[11px] text-[var(--admin-fg-muted)]">{hint}</p> : null}
  </div>
)

const Section = ({ title, subtitle, children }) => (
  <section className="admin-panel">
    <div className="admin-panel-header flex-col items-start gap-1">
      <h2 className="admin-panel-title">{title}</h2>
      {subtitle ? <p className="text-xs text-[var(--admin-fg-muted)]">{subtitle}</p> : null}
    </div>
    <div className="admin-panel-body space-y-4">{children}</div>
  </section>
)

const WalkInBooking = () => {
  const { axios, currency, pickupLocations, user } = useAppContext()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [cars, setCars] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [quote, setQuote] = useState(null)
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState(null)
  const [docFiles, setDocFiles] = useState({ combined: null })
  const [uploadingDoc, setUploadingDoc] = useState('')
  const [existingClientDoc, setExistingClientDoc] = useState(null)
  const [useExistingDoc, setUseExistingDoc] = useState(false)
  const [lookupBusy, setLookupBusy] = useState(false)
  const [samsars, setSamsars] = useState([])
  const [partners, setPartners] = useState([])
  const [chauffeurs, setChauffeurs] = useState([])
  const [directoriesLoading, setDirectoriesLoading] = useState(true)

  const input =
    'w-full rounded-xl border border-borderColor bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10'

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

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setDirectoriesLoading(true)
      try {
        const [samsarRes, partnerRes, chauffeurRes] = await Promise.allSettled([
          axios.get('/api/owner/samsars?limit=200&status=active'),
          axios.get('/api/owner/partner-companies?limit=200&status=active'),
          axios.get('/api/owner/chauffeurs?limit=200&status=active'),
        ])
        if (cancelled) return
        if (samsarRes.status === 'fulfilled' && samsarRes.value.data.success) {
          setSamsars(samsarRes.value.data.items || [])
        }
        if (partnerRes.status === 'fulfilled' && partnerRes.value.data.success) {
          setPartners(partnerRes.value.data.items || [])
        }
        if (chauffeurRes.status === 'fulfilled' && chauffeurRes.value.data.success) {
          setChauffeurs(chauffeurRes.value.data.items || [])
        }
      } finally {
        if (!cancelled) setDirectoriesLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [axios])

  const brokerOptions = useMemo(() => [
    ...samsars.map((s) => ({
      id: s._id,
      type: 'samsar',
      label: s.fullName,
      group: t('admin.menu.samsars'),
      sublabel: s.phone || '',
    })),
    ...partners.map((p) => ({
      id: p._id,
      type: 'partner',
      label: p.companyName,
      group: t('admin.menu.partnerCompanies'),
      sublabel: p.contactPerson || p.phone || '',
    })),
  ], [samsars, partners, t])

  const driverOptions = useMemo(() => chauffeurs.map((c) => ({
    id: c._id,
    type: 'chauffeur',
    label: c.fullName,
    group: t('admin.menu.chauffeurs'),
    sublabel: c.phone || c.licenseNumber || '',
  })), [chauffeurs, t])

  const selectedCar = useMemo(() => cars.find((c) => c._id === form.car), [cars, form.car])

  useEffect(() => {
    if (!selectedCar) return
    setForm((f) => {
      const next = { ...f }
      let changed = false
      if (!f.franchiseAmount && selectedCar.securityDeposit != null) {
        next.franchiseAmount = String(selectedCar.securityDeposit)
        changed = true
      }
      if (!f.kmDepart && selectedCar.mileage != null) {
        next.kmDepart = String(selectedCar.mileage)
        changed = true
      }
      if (!f.deliveredBy && user?.name) {
        next.deliveredBy = user.name
        changed = true
      }
      return changed ? next : f
    })
  }, [selectedCar, user?.name])

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
  const setSecondDriver = (key, value) =>
    setForm((f) => ({
      ...f,
      secondDriver: { ...f.secondDriver, [key]: value },
    }))

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
      franchise: Number(form.franchiseAmount) || Number(selectedCar.securityDeposit) || 0,
    })
  }, [
    selectedCar,
    form.pickupDate,
    form.returnDate,
    form.pickupLocationId,
    form.returnLocationId,
    form.franchiseAmount,
    pickupLocations,
  ])

  const lookupExistingClient = React.useCallback(async () => {
    if (!form.phone && !form.identityDocumentNumber && !form.passportNumber) {
      setExistingClientDoc(null)
      setUseExistingDoc(false)
      return
    }
    setLookupBusy(true)
    try {
      const params = new URLSearchParams()
      if (form.phone) params.set('phone', form.phone)
      if (form.identityDocumentNumber) params.set('identityDocumentNumber', form.identityDocumentNumber)
      if (form.passportNumber) params.set('passportNumber', form.passportNumber)
      const { data } = await axios.get(`/api/bookings/owner/client-documents/lookup?${params}`)
      if (data.success && data.found) {
        setExistingClientDoc(data.document)
      } else {
        setExistingClientDoc(null)
        setUseExistingDoc(false)
      }
    } catch {
      setExistingClientDoc(null)
      setUseExistingDoc(false)
    } finally {
      setLookupBusy(false)
    }
  }, [axios, form.phone, form.identityDocumentNumber, form.passportNumber])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      lookupExistingClient()
    }, 400)
    return () => window.clearTimeout(timer)
  }, [lookupExistingClient])

  const uploadDocument = async (bookingId, file) => {
    if (!file || !bookingId) return
    setUploadingDoc('combined')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('docType', 'combined')
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

  const linkExistingDocument = async (bookingId) => {
    if (!existingClientDoc?._id) return
    setUploadingDoc('link')
    try {
      const { data } = await axios.post('/api/bookings/owner/client-documents/link', {
        bookingId,
        clientDocumentId: existingClientDoc._id,
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
    if (useExistingDoc && existingClientDoc?._id) {
      await linkExistingDocument(bookingId)
      return
    }
    if (docFiles.combined) {
      await uploadDocument(bookingId, docFiles.combined)
    }
    setDocFiles({ combined: null })
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
    if (form.secondDriver.enabled && !form.secondDriver.fullName.trim()) {
      toast.error(t('admin.walkIn.secondDriverNameRequired'))
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        clientDocumentId: useExistingDoc && existingClientDoc?._id ? existingClientDoc._id : undefined,
        franchiseAmount: form.franchiseAmount === '' ? undefined : Number(form.franchiseAmount),
        secondDriver: form.secondDriver.enabled
          ? form.secondDriver
          : { ...emptySecondDriver, enabled: false },
        paymentStatus: form.markPaid ? 'paid' : 'pending',
      }
      const { data } = await axios.post('/api/bookings/owner/walk-in', payload)
      if (data.success) {
        toast.success(data.message)
        if (data.booking?._id) {
          await uploadPendingDocuments(data.booking._id)
        }
        setCreated(data)
        setForm({ ...emptyForm, secondDriver: { ...emptySecondDriver } })
        setQuote(null)
      } else toast.error(data.message)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminPage>
      <PageHeader
        title={t('admin.walkIn.title')}
        description={t('admin.walkIn.subtitle')}
        actions={
          <>
            <ChannelBadge channel="walk_in" />
            <Link to="/owner/manage-bookings" className="admin-btn admin-btn--secondary">
              {t('admin.walkIn.viewAll')}
            </Link>
          </>
        }
      />

      {created && (
        <div className="mb-4 rounded-[var(--admin-radius-lg)] border border-[color-mix(in_srgb,var(--admin-success)_30%,var(--admin-border))] bg-[var(--admin-success-soft)] p-4 text-sm text-[var(--admin-success)]">
          <p className="font-semibold">{t('admin.walkIn.created', { id: created.reservationId })}</p>
          <p className="mt-1 text-xs opacity-80">{t('admin.walkIn.createdContractHint')}</p>
          {created.completion?.completionUrl && (
            <p className="mt-2 break-all text-xs">Completion link: {created.completion.completionUrl}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/owner/contracts')}
              className="admin-btn admin-btn--primary"
            >
              {t('admin.walkIn.openContracts')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/owner/manage-bookings')}
              className="admin-btn admin-btn--secondary"
            >
              {t('admin.walkIn.openBookings')}
            </button>
            <button
              type="button"
              onClick={() => setCreated(null)}
              className="admin-btn admin-btn--ghost"
            >
              {t('admin.walkIn.createAnother')}
            </button>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-5">
          <Section title={t('admin.walkIn.customer')} subtitle={t('admin.walkIn.customerHint')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('admin.walkIn.fullName')} required>
                <input className={input} required value={form.fullName} onChange={(e) => setField('fullName', e.target.value)} />
              </Field>
              <Field label={t('admin.walkIn.phone')} required>
                <PhoneInput value={form.phone} onChange={(phone) => setField('phone', phone)} required />
              </Field>
              <Field label={t('admin.walkIn.email')} hint={t('admin.walkIn.emailHint')}>
                <input type="email" className={input} value={form.email} onChange={(e) => setField('email', e.target.value)} />
              </Field>
              <Field label={t('admin.walkIn.nationality')}>
                <input className={input} value={form.nationality} onChange={(e) => setField('nationality', e.target.value)} />
              </Field>
              <Field label={t('admin.walkIn.dateOfBirth')}>
                <input type="date" className={input} value={form.dateOfBirth} onChange={(e) => setField('dateOfBirth', e.target.value)} />
              </Field>
              <Field label={t('admin.walkIn.placeOfBirth')}>
                <input className={input} value={form.placeOfBirth} onChange={(e) => setField('placeOfBirth', e.target.value)} />
              </Field>
              <Field label={t('admin.walkIn.address')} className="sm:col-span-2">
                <input className={input} value={form.customerAddress} onChange={(e) => setField('customerAddress', e.target.value)} />
              </Field>
            </div>
          </Section>

          <Section title={t('admin.walkIn.identitySection')} subtitle={t('admin.walkIn.identityHint')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('admin.walkIn.identityDocument')} hint={t('admin.walkIn.identityDocumentHint')}>
                <input className={input} value={form.identityDocumentNumber} onChange={(e) => setField('identityDocumentNumber', e.target.value)} />
              </Field>
              <Field label={t('admin.walkIn.identityIssuedOn')}>
                <input type="date" className={input} value={form.identityIssuedOn} onChange={(e) => setField('identityIssuedOn', e.target.value)} />
              </Field>
              <Field label={t('admin.walkIn.passport')}>
                <input className={input} value={form.passportNumber} onChange={(e) => setField('passportNumber', e.target.value)} />
              </Field>
              <Field label={t('admin.walkIn.license')}>
                <input className={input} value={form.driverLicenseNumber} onChange={(e) => setField('driverLicenseNumber', e.target.value)} />
              </Field>
              <Field label={t('admin.walkIn.licenseIssuedOn')}>
                <input type="date" className={input} value={form.driverLicenseIssuedOn} onChange={(e) => setField('driverLicenseIssuedOn', e.target.value)} />
              </Field>
              <Field label={t('admin.walkIn.licenseExpiry')}>
                <input type="date" className={input} value={form.driverLicenseExpiry} onChange={(e) => setField('driverLicenseExpiry', e.target.value)} />
              </Field>
            </div>
          </Section>

          <Section title={t('admin.walkIn.secondDriverSection')} subtitle={t('admin.walkIn.secondDriverHint')}>
            <label className="flex items-center gap-2.5 text-sm text-ink cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-borderColor text-primary"
                checked={form.secondDriver.enabled}
                onChange={(e) => setSecondDriver('enabled', e.target.checked)}
              />
              {t('admin.walkIn.secondDriverEnable')}
            </label>
            {form.secondDriver.enabled && (
              <div className="grid gap-4 sm:grid-cols-2 pt-1">
                <Field label={t('admin.walkIn.secondDriverName')} required>
                  <input className={input} value={form.secondDriver.fullName} onChange={(e) => setSecondDriver('fullName', e.target.value)} />
                </Field>
                <Field label={t('admin.walkIn.secondDriverPhone')}>
                  <input className={input} value={form.secondDriver.phone} onChange={(e) => setSecondDriver('phone', e.target.value)} />
                </Field>
                <Field label={t('admin.walkIn.secondDriverDob')}>
                  <input type="date" className={input} value={form.secondDriver.dateOfBirth} onChange={(e) => setSecondDriver('dateOfBirth', e.target.value)} />
                </Field>
                <Field label={t('admin.walkIn.secondDriverNationality')}>
                  <input className={input} value={form.secondDriver.nationality} onChange={(e) => setSecondDriver('nationality', e.target.value)} />
                </Field>
                <Field label={t('admin.walkIn.secondDriverLicense')}>
                  <input className={input} value={form.secondDriver.driverLicenseNumber} onChange={(e) => setSecondDriver('driverLicenseNumber', e.target.value)} />
                </Field>
                <Field label={t('admin.walkIn.secondDriverLicenseExpiry')}>
                  <input type="date" className={input} value={form.secondDriver.driverLicenseExpiry} onChange={(e) => setSecondDriver('driverLicenseExpiry', e.target.value)} />
                </Field>
                <Field label={t('admin.walkIn.secondDriverPassport')}>
                  <input className={input} value={form.secondDriver.passportNumber} onChange={(e) => setSecondDriver('passportNumber', e.target.value)} />
                </Field>
              </div>
            )}
          </Section>

          <Section title={t('admin.walkIn.rental')} subtitle={t('admin.walkIn.rentalHint')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('admin.walkIn.vehicle')} required className="sm:col-span-2">
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
              </Field>
              <Field label={t('admin.walkIn.pickup')} required>
                <input type="datetime-local" className={input} required value={form.pickupDate} onChange={(e) => setField('pickupDate', e.target.value)} />
              </Field>
              <Field label={t('admin.walkIn.return')} required>
                <input type="datetime-local" className={input} required value={form.returnDate} onChange={(e) => setField('returnDate', e.target.value)} />
              </Field>
              <Field label={t('admin.walkIn.pickupLoc')} required>
                <select className={input} required value={form.pickupLocationId} onChange={(e) => setField('pickupLocationId', e.target.value)}>
                  <option value="">{t('admin.walkIn.selectLoc')}</option>
                  {bookableLocations.map((l) => (
                    <option key={l._id} value={l._id}>{l.city} — {l.name}</option>
                  ))}
                </select>
              </Field>
              <Field label={t('admin.walkIn.returnLoc')} required>
                <select className={input} required value={form.returnLocationId} onChange={(e) => setField('returnLocationId', e.target.value)}>
                  <option value="">{t('admin.walkIn.selectLoc')}</option>
                  {bookableLocations.map((l) => (
                    <option key={l._id} value={l._id}>{l.city} — {l.name}</option>
                  ))}
                </select>
              </Field>
              <Field label={t('admin.walkIn.notes')} className="sm:col-span-2">
                <textarea rows={2} className={input} value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
              </Field>
            </div>
          </Section>

          <Section title={t('admin.walkIn.handoverSection')} subtitle={t('admin.walkIn.handoverHint')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('admin.walkIn.brokerReferrer')}>
                <DirectorySearchSelect
                  value={form.brokerReferrerId}
                  valueType={form.brokerReferrerType}
                  options={brokerOptions}
                  disabled={directoriesLoading}
                  placeholder={t('admin.walkIn.brokerReferrerPlaceholder')}
                  emptyLabel={t('admin.walkIn.brokerReferrerEmpty')}
                  emptyHint={t('admin.walkIn.brokerReferrerEmptyHint')}
                  manageLinks={[
                    { to: '/owner/samsars', label: t('admin.menu.samsars') },
                    { to: '/owner/partner-companies', label: t('admin.menu.partnerCompanies') },
                  ]}
                  onChange={({ id, type }) => {
                    setForm((f) => ({ ...f, brokerReferrerId: id, brokerReferrerType: type }))
                  }}
                />
              </Field>
              <Field label={t('admin.walkIn.vehicleDeliveryDriver')}>
                <DirectorySearchSelect
                  value={form.vehicleDeliveryDriverId}
                  options={driverOptions}
                  disabled={directoriesLoading}
                  placeholder={t('admin.walkIn.vehicleDeliveryDriverPlaceholder')}
                  emptyLabel={t('admin.walkIn.vehicleDeliveryDriverEmpty')}
                  emptyHint={t('admin.walkIn.vehicleDeliveryDriverEmptyHint')}
                  manageLinks={[
                    { to: '/owner/chauffeurs', label: t('admin.menu.chauffeurs') },
                  ]}
                  onChange={({ id }) => {
                    setForm((f) => ({ ...f, vehicleDeliveryDriverId: id }))
                  }}
                />
              </Field>
              <Field label={t('admin.walkIn.deliveredBy')}>
                <input className={input} value={form.deliveredBy} onChange={(e) => setField('deliveredBy', e.target.value)} />
              </Field>
              <Field label={t('admin.walkIn.receivedBy')}>
                <input className={input} value={form.receivedBy} onChange={(e) => setField('receivedBy', e.target.value)} />
              </Field>
              <Field label={t('admin.walkIn.fuelLevel')}>
                <select className={input} value={form.fuelLevelStart} onChange={(e) => setField('fuelLevelStart', e.target.value)}>
                  <option value="">{t('admin.walkIn.fuelSelect')}</option>
                  <option value="1/8">1/8</option>
                  <option value="1/4">1/4</option>
                  <option value="3/8">3/8</option>
                  <option value="1/2">1/2</option>
                  <option value="5/8">5/8</option>
                  <option value="3/4">3/4</option>
                  <option value="7/8">7/8</option>
                  <option value="Full">{t('admin.walkUi.fuelFull')}</option>
                </select>
              </Field>
              <Field label={t('admin.walkIn.franchiseAmount')}>
                <input type="number" min={0} className={input} value={form.franchiseAmount} onChange={(e) => setField('franchiseAmount', e.target.value)} />
              </Field>
              <Field label={t('admin.walkIn.kmDepart')}>
                <input className={input} value={form.kmDepart} onChange={(e) => setField('kmDepart', e.target.value)} />
              </Field>
              <Field label={t('admin.walkIn.kmRetour')}>
                <input className={input} value={form.kmRetour} onChange={(e) => setField('kmRetour', e.target.value)} />
              </Field>
            </div>
          </Section>

          <Section title={t('admin.walkIn.uploadDocuments')} subtitle={t('admin.walkIn.uploadDocumentsHintCombined')}>
            {lookupBusy && (
              <p className="text-xs text-[var(--admin-fg-muted)]">{t('admin.walkIn.lookupClient')}</p>
            )}
            {existingClientDoc && (
              <div className="rounded-xl border border-[color-mix(in_srgb,var(--admin-success)_35%,var(--admin-border))] bg-[var(--admin-success-soft)] p-3 text-sm">
                <p className="font-medium text-[var(--admin-success)]">{t('admin.walkIn.existingDocsTitle')}</p>
                <p className="mt-1 text-xs text-[var(--admin-fg-muted)]">
                  {existingClientDoc.customerName} · {existingClientDoc.customerPhone}
                  {' · '}
                  {t('admin.walkIn.existingDocsCount', { count: existingClientDoc.reservationCount || 0 })}
                </p>
                <label className="mt-2 flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useExistingDoc}
                    onChange={(e) => {
                      setUseExistingDoc(e.target.checked)
                      if (e.target.checked) setDocFiles({ combined: null })
                    }}
                    className="mt-0.5"
                  />
                  <span className="text-xs">{t('admin.walkIn.useExistingDocs')}</span>
                </label>
              </div>
            )}
            {!useExistingDoc && (
              <div className="rounded-xl border border-dashed border-borderColor bg-sand/20 p-4">
                <label className="text-sm font-medium text-gray-700">{t('admin.walkIn.uploadCombined')}</label>
                <p className="mt-1 text-xs text-muted">{t('admin.walkIn.uploadCombinedHint')}</p>
                <input
                  type="file"
                  accept="image/*"
                  disabled={Boolean(uploadingDoc)}
                  className="mt-3 block w-full text-sm"
                  onChange={(e) => setDocFiles({ combined: e.target.files?.[0] || null })}
                />
                {docFiles.combined && (
                  <p className="mt-2 truncate text-xs text-emerald-700">{docFiles.combined.name}</p>
                )}
              </div>
            )}
          </Section>
        </div>

        <aside className="lg:col-span-4 space-y-4 lg:sticky lg:top-24 self-start">
          <Section title={t('admin.walkIn.options')}>
            <Field label={t('admin.walkIn.initialStatus')}>
              <select className={input} value={form.status} onChange={(e) => setField('status', e.target.value)}>
                <option value="pending">{t('admin.status.pending')}</option>
                <option value="confirmed">{t('admin.status.confirmed')}</option>
                <option value="ready_for_pickup">{t('admin.status.ready_for_pickup')}</option>
                <option value="active">{t('admin.walkUi.activeOut')}</option>
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={form.markPaid} onChange={(e) => setField('markPaid', e.target.checked)} />
              {t('admin.walkIn.markPaid')}
            </label>
            <label className="flex items-start gap-2 text-sm text-ink">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={form.sendCompletionLink}
                onChange={(e) => setField('sendCompletionLink', e.target.checked)}
                disabled={!form.email}
              />
              <span>
                {t('admin.walkIn.sendLink')}
                <span className="mt-0.5 block text-xs text-muted">{t('admin.walkIn.sendLinkHint')}</span>
              </span>
            </label>
          </Section>

          <div className="rounded-2xl border border-borderColor bg-gradient-to-b from-white to-sand/30 p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-ink mb-3">{t('admin.walkIn.estimate')}</h2>
            {quote ? (
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex justify-between gap-3">
                  <span>{t('admin.walkIn.days', { count: quote.days })}</span>
                  <span>{currency}{quote.rental}</span>
                </li>
                {quote.pickupFee > 0 && (
                  <li className="flex justify-between gap-3">
                    <span>{t('admin.walkIn.pickupFee')}</span>
                    <span>{currency}{quote.pickupFee}</span>
                  </li>
                )}
                {quote.dropoffFee > 0 && (
                  <li className="flex justify-between gap-3">
                    <span>{t('admin.walkIn.returnFee')}</span>
                    <span>{currency}{quote.dropoffFee}</span>
                  </li>
                )}
                {quote.franchise > 0 && (
                  <li className="flex justify-between gap-3 text-xs text-muted">
                    <span>{t('admin.walkIn.franchiseAmount')}</span>
                    <span>{currency}{quote.franchise}</span>
                  </li>
                )}
                <li className="flex justify-between gap-3 border-t border-borderColor pt-2 font-semibold text-ink">
                  <span>{t('admin.walkIn.total')}</span>
                  <span>{currency}{quote.total}</span>
                </li>
              </ul>
            ) : (
              <p className="text-sm text-muted">{t('admin.walkIn.estimateHint')}</p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="admin-btn admin-btn--primary mt-5 w-full h-11"
            >
              {saving ? t('admin.walkIn.saving') : t('admin.walkIn.submit')}
            </button>
          </div>
        </aside>
      </form>
    </AdminPage>
  )
}

export default WalkInBooking

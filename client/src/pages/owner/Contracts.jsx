import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminPage, PageHeader } from '../../components/owner/ui'
import DocumentEditor from '../../components/owner/DocumentEditor'
import DocumentPdfProgress, { buildPdfJobStages } from '../../components/DocumentPdfProgress'
import { useDocumentPdfJob } from '../../hooks/useDocumentPdfJob'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import toast from 'react-hot-toast'
import { getErrorMessage } from '../../utils/apiError'
import { downloadPdfFromApi } from '../../utils/downloadPdf'
import { downloadXlsxFromApi } from '../../utils/downloadXlsx'
import { buildContractPatch, initContractForm, toDateInput } from '../../utils/documentFormUtils'

const formatDateTime = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

const Contracts = () => {
  const { axios, currency } = useAppContext()
  const { t } = useI18n()
  const [searchParams] = useSearchParams()
  const prefilledBookingId = searchParams.get('bookingId') || ''
  const [contracts, setContracts] = useState([])
  const [bookings, setBookings] = useState([])
  const [templates, setTemplates] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 })
  const [search, setSearch] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [cin, setCin] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const generateJob = useDocumentPdfJob()
  const generating = generateJob.isRunning
  const [showGenerate, setShowGenerate] = useState(false)
  const [generateForm, setGenerateForm] = useState({
    bookingId: '',
    templateId: '',
    includeCompanyStamp: true,
    dateOfBirth: '',
    nationality: '',
    driverLicenseNumber: '',
    driverLicenseExpiry: '',
    passportNumber: '',
    secondDriverEnabled: false,
    secondDriverFullName: '',
    secondDriverDob: '',
    secondDriverNationality: '',
    secondDriverLicense: '',
    secondDriverLicenseExpiry: '',
    secondDriverPassport: '',
    secondDriverPhone: '',
  })
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewTitle, setPreviewTitle] = useState('')
  const [editingId, setEditingId] = useState(null)
  /** Owner Settings → Agency Stamp default; used when opening Generate */
  const [stampDefault, setStampDefault] = useState(true)
  const [exporting, setExporting] = useState(false)

  const inputClass = 'h-9 border border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-fg)] px-3 rounded-[var(--admin-radius)] w-full text-sm outline-none focus:shadow-[var(--admin-focus)]'

  const renderContractFields = (form, setForm, fieldClass, labelClass) => {
    const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
    const field = (key, label, type = 'text') => (
      <div key={key}>
        <label className={labelClass}>{label}</label>
        <input
          type={type}
          className={fieldClass}
          value={form[key] ?? ''}
          onChange={(e) => set(key, e.target.value)}
        />
      </div>
    )
    const section = (title, children) => (
      <div key={title} className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-800 border-b border-borderColor pb-1">{title}</h4>
        <div className="grid gap-3 md:grid-cols-2">{children}</div>
      </div>
    )
    return (
      <div className="space-y-6">
        {section('Customer', [
          field('customerName', t('admin.invoices.customerName')),
          field('customerEmail', t('admin.invoices.customerEmail'), 'email'),
          field('customerPhone', t('admin.invoices.customerPhone')),
          field('customerAddress', t('admin.invoices.customerAddress')),
          field('nationality', t('admin.contracts.nationality')),
          field('dateOfBirth', t('admin.contracts.dateOfBirth'), 'date'),
          field('placeOfBirth', 'Place of birth'),
          field('identityDocumentNumber', t('admin.invoices.cinPlaceholder')),
          field('identityIssuedOn', 'ID issued on', 'date'),
          field('passportNumber', t('admin.contracts.passport')),
          field('driverLicenseNumber', t('admin.contracts.driverLicense')),
          field('driverLicenseIssuedOn', 'License issued on', 'date'),
          field('driverLicenseExpiry', t('admin.contracts.licenseExpiry'), 'date'),
        ])}
        {section('Vehicle', [
          field('vehicleBrand', t('admin.invoices.vehicleBrand')),
          field('vehicleModel', t('admin.invoices.vehicleModel')),
          field('vehicleYear', t('admin.invoices.vehicleYear')),
          field('vehiclePlate', t('admin.invoices.vehiclePlate')),
          field('vehicleCategory', t('admin.invoices.vehicleType')),
          field('fuelLevelStart', 'Fuel level (start)'),
          field('kmDepart', 'Km departure'),
          field('kmRetour', 'Km return'),
          field('deliveredBy', 'Delivered by'),
          field('receivedBy', 'Received by'),
        ])}
        {section('Rental', [
          field('reservationId', 'Reservation ID'),
          field('pickupDate', 'Pickup date & time', 'datetime-local'),
          field('returnDate', 'Return date & time', 'datetime-local'),
          field('pickupLocation', 'Pickup location'),
          field('returnLocation', 'Return location'),
          field('rentalDays', 'Rental days', 'number'),
          field('bookingStatus', 'Booking status'),
          field('bookingMethod', 'Booking method'),
        ])}
        {section('Pricing & payment', [
          field('pricePerDay', 'Price per day', 'number'),
          field('rentalPrice', 'Rental price', 'number'),
          field('pickupFee', 'Pickup fee', 'number'),
          field('dropoffFee', 'Drop-off fee', 'number'),
          field('discountTotal', 'Discount', 'number'),
          field('price', t('admin.contracts.total'), 'number'),
          field('franchiseAmount', 'Franchise / deposit', 'number'),
          field('currency', t('admin.invoices.currency')),
          field('paymentStatus', t('admin.invoices.paymentStatus')),
        ])}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-800 border-b border-borderColor pb-1">
            {t('admin.contracts.secondDriverYes')}
          </h4>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={Boolean(form.secondDriverEnabled)}
              onChange={(e) => set('secondDriverEnabled', e.target.checked)}
            />
            {t('admin.leftover.secondDriverOn')}
          </label>
          {form.secondDriverEnabled && (
            <div className="grid gap-3 md:grid-cols-2">
              {field('secondDriverFullName', t('admin.contracts.secondDriverName'))}
              {field('secondDriverDob', t('admin.contracts.secondDriverDob'), 'date')}
              {field('secondDriverNationality', t('admin.contracts.secondDriverNationality'))}
              {field('secondDriverPhone', t('admin.contracts.secondDriverPhone'))}
              {field('secondDriverLicense', t('admin.contracts.driverLicense'))}
              {field('secondDriverLicenseExpiry', t('admin.contracts.licenseExpiry'), 'date')}
              {field('secondDriverPassport', t('admin.contracts.passport'))}
            </div>
          )}
        </div>
        {section('Company', [
          field('agencyName', 'Agency name'),
          field('agencyPhone', 'Agency phone'),
          field('agencyEmail', 'Agency email', 'email'),
          field('agencyAddress', 'Agency address'),
          field('agencyTaxId', 'Agency tax ID'),
          field('logoUrl', 'Logo URL'),
          field('companySignatureUrl', 'Company signature URL'),
          field('customerSignatureUrl', 'Customer signature URL'),
          field('secondDriverSignatureUrl', 'Second driver signature URL'),
        ])}
        <div>
          <label className={labelClass}>{t('admin.invoices.notes')}</label>
          <textarea
            className={`${fieldClass} min-h-[80px]`}
            value={form.notes || ''}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-borderColor bg-gray-50 px-4 py-3">
          <p className="text-xs text-gray-500 max-w-md">{t('admin.contracts.includeStampHint')}</p>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-borderColor text-primary focus:ring-primary/30"
              checked={form.includeCompanyStamp !== false}
              onChange={(e) => set('includeCompanyStamp', e.target.checked)}
            />
            {t('admin.contracts.includeStamp')}
          </label>
        </div>
      </div>
    )
  }

  const fetchContracts = async (override = {}) => {
    setLoading(true)
    try {
      const page = override.page ?? pagination.page
      const limit = override.limit ?? pagination.limit
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      })
      if (search.trim()) params.set('search', search.trim())
      if (customerName.trim()) params.set('customerName', customerName.trim())
      if (cin.trim()) params.set('cin', cin.trim())
      if (phone.trim()) params.set('phone', phone.trim())
      const { data } = await axios.get(`/api/contracts?${params}`)
      if (data.success) {
        setContracts(data.contracts || [])
        setPagination((prev) => ({ ...prev, ...data.pagination }))
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (prefilledBookingId) {
      setGenerateForm((f) => ({ ...f, bookingId: prefilledBookingId }))
      setShowGenerate(true)
    }
  }, [prefilledBookingId])

  useEffect(() => {
    let cancelled = false
    const loadStampDefault = async () => {
      try {
        const { data } = await axios.get('/api/owner/settings/documents')
        if (cancelled || !data.success) return
        const show = data.documentSettings?.contracts?.showAgencyStamp !== false
        setStampDefault(show)
        setGenerateForm((f) => ({ ...f, includeCompanyStamp: show }))
      } catch {
        // Keep default true if settings cannot be loaded
      }
    }
    loadStampDefault()
    return () => {
      cancelled = true
    }
  }, [axios])

  useEffect(() => {
    if (generateForm.bookingId && bookings.length) {
      loadBookingDetails(generateForm.bookingId)
    }
  }, [generateForm.bookingId, bookings])

  useEffect(() => {
    fetchContracts()
  }, [pagination.page, pagination.limit])

  useEffect(() => {
    axios.get('/api/contracts/bookings')
      .then(({ data }) => { if (data.success) setBookings(data.bookings || []) })
      .catch(() => {})
    axios.get('/api/export-templates?type=contract')
      .then(({ data }) => { if (data.success) setTemplates(data.templates || []) })
      .catch(() => {})
  }, [axios])

  const openGenerate = () => {
    setGenerateForm({
      bookingId: '',
      templateId: '',
      includeCompanyStamp: stampDefault,
      dateOfBirth: '',
      nationality: '',
      driverLicenseNumber: '',
      driverLicenseExpiry: '',
      passportNumber: '',
      secondDriverEnabled: false,
      secondDriverFullName: '',
      secondDriverDob: '',
      secondDriverNationality: '',
      secondDriverLicense: '',
      secondDriverLicenseExpiry: '',
      secondDriverPassport: '',
      secondDriverPhone: '',
    })
    setShowGenerate(true)
    setPreviewHtml('')
  }

  const loadBookingDetails = (bookingId) => {
    const booking = bookings.find((b) => b._id === bookingId)
    if (!booking) return
    const sd = booking.secondDriver || {}
    setGenerateForm((f) => ({
      ...f,
      bookingId,
      // Normalize ISO timestamps to yyyy-MM-dd so controlled <input type="date"> stays editable.
      dateOfBirth: toDateInput(booking.dateOfBirth),
      nationality: booking.nationality || '',
      driverLicenseNumber: booking.driverLicenseNumber || '',
      driverLicenseExpiry: toDateInput(booking.driverLicenseExpiry),
      passportNumber: booking.passportNumber || '',
      secondDriverEnabled: Boolean(sd.enabled),
      secondDriverFullName: sd.fullName || '',
      secondDriverDob: toDateInput(sd.dateOfBirth),
      secondDriverNationality: sd.nationality || '',
      secondDriverLicense: sd.driverLicenseNumber || '',
      secondDriverLicenseExpiry: toDateInput(sd.driverLicenseExpiry),
      secondDriverPassport: sd.passportNumber || '',
      secondDriverPhone: sd.phone || '',
    }))
  }

  const saveContractDetails = async () => {
    if (!generateForm.bookingId) return false
    const { data } = await axios.post('/api/bookings/update', {
      bookingId: generateForm.bookingId,
      dateOfBirth: generateForm.dateOfBirth,
      nationality: generateForm.nationality,
      driverLicenseNumber: generateForm.driverLicenseNumber,
      driverLicenseExpiry: generateForm.driverLicenseExpiry,
      passportNumber: generateForm.passportNumber,
      secondDriver: {
        enabled: generateForm.secondDriverEnabled,
        fullName: generateForm.secondDriverFullName,
        dateOfBirth: generateForm.secondDriverDob,
        nationality: generateForm.secondDriverNationality,
        driverLicenseNumber: generateForm.secondDriverLicense,
        driverLicenseExpiry: generateForm.secondDriverLicenseExpiry,
        passportNumber: generateForm.secondDriverPassport,
        phone: generateForm.secondDriverPhone,
      },
    })
    if (!data.success) {
      toast.error(data.message)
      return false
    }
    return true
  }

  const runSearch = (e) => {
    e?.preventDefault()
    setPagination((prev) => ({ ...prev, page: 1 }))
    fetchContracts({ page: 1 })
  }

  const previewFromBooking = async () => {
    if (!generateForm.bookingId) {
      toast.error(t('admin.contracts.bookingRequired'))
      return
    }
    try {
      const saved = await saveContractDetails()
      if (!saved) return
      const { data } = await axios.post('/api/contracts/preview', {
        bookingId: generateForm.bookingId,
        templateId: generateForm.templateId || undefined,
        includeCompanyStamp: Boolean(generateForm.includeCompanyStamp),
      })
      if (data.success) {
        setPreviewHtml(data.html)
        setPreviewTitle(t('admin.contracts.previewDraft'))
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const generateContract = async ({ forceFromBooking = false } = {}) => {
    if (!generateForm.bookingId) {
      toast.error(t('admin.contracts.bookingRequired'))
      return
    }
    if (generateJob.isRunning) return

    const outcome = await generateJob.run(async () => {
      const saved = await saveContractDetails()
      if (!saved) {
        const err = new Error('SAVE_DETAILS_FAILED')
        err.silent = true
        throw err
      }
      try {
        const { data } = await axios.post('/api/contracts/generate', {
          bookingId: generateForm.bookingId,
          templateId: generateForm.templateId || undefined,
          includeCompanyStamp: Boolean(generateForm.includeCompanyStamp),
          forceFromBooking,
        })
        if (data.success) return data
        if (data.code === 'SOURCE_LOCKED') {
          const err = new Error(data.message || 'SOURCE_LOCKED')
          err.code = 'SOURCE_LOCKED'
          throw err
        }
        throw new Error(data.message || 'Failed to generate contract')
      } catch (error) {
        const code = error?.code || error?.response?.data?.code
        if (code === 'SOURCE_LOCKED') {
          const ok = window.confirm(
            t('admin.documents.replaceEditsConfirm')
            || 'This document has manual edits. Regenerate from booking and replace them?',
          )
          if (!ok) {
            const cancelErr = new Error('cancelled')
            cancelErr.cancelled = true
            throw cancelErr
          }
          const { data: forced } = await axios.post('/api/contracts/generate', {
            bookingId: generateForm.bookingId,
            templateId: generateForm.templateId || undefined,
            includeCompanyStamp: Boolean(generateForm.includeCompanyStamp),
            forceFromBooking: true,
          })
          if (!forced.success) throw new Error(forced.message || 'Failed to generate contract')
          return forced
        }
        throw error
      }
    })

    if (outcome.duplicate) return
    if (!outcome.ok) {
      if (outcome.error?.cancelled || outcome.error?.silent) {
        generateJob.reset()
        return
      }
      toast.error(getErrorMessage(outcome.error) || t('admin.contracts.generateFailed'))
      return
    }

    toast.success(outcome.data.message)
    const contract = outcome.data.contract
    if (contract?.renderedHtml) {
      setPreviewHtml(contract.renderedHtml)
      setPreviewTitle(contract.contractNumber || t('admin.contracts.preview'))
    } else if (contract?._id) {
      try {
        const { data: prev } = await axios.get(`/api/contracts/${contract._id}/preview`)
        if (prev.success) {
          setPreviewHtml(prev.html || '')
          setPreviewTitle(contract.contractNumber || t('admin.contracts.preview'))
        }
      } catch {
        /* list refresh is enough */
      }
    }
    fetchContracts()
    window.setTimeout(() => {
      setShowGenerate(false)
      generateJob.reset()
    }, 650)
  }

  const previewContract = async (contract) => {
    try {
      const { data } = await axios.get(`/api/contracts/${contract._id}/preview`)
      if (data.success) {
        setPreviewHtml(data.html)
        setPreviewTitle(contract.contractNumber)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const downloadPdf = async (contract) => {
    try {
      await downloadPdfFromApi(
        axios,
        `/api/contracts/${contract._id}/pdf`,
        `${contract.contractNumber || 'contract'}.pdf`,
      )
    } catch (error) {
      toast.error(getErrorMessage(error, t('admin.contracts.noPdf')))
    }
  }

  return (
    <AdminPage className="space-y-6">
      <PageHeader
        title={t('admin.contracts.title')}
        description={t('admin.contracts.subtitle')}
        actions={
          <>
            <button
              type="button"
              disabled={exporting}
              onClick={async () => {
                setExporting(true)
                try {
                  await downloadXlsxFromApi(axios, '/api/contracts/export', {
                    params: {
                      search: search || undefined,
                      customerName: customerName || undefined,
                      phone: phone || undefined,
                      cin: cin || undefined,
                    },
                    fallbackName: 'contracts.xlsx',
                  })
                  toast.success(t('admin.exportUi.success'))
                } catch (error) {
                  toast.error(getErrorMessage(error) || t('admin.exportUi.failed'))
                } finally {
                  setExporting(false)
                }
              }}
              className="admin-btn admin-btn--secondary"
            >
              {exporting ? t('admin.exportUi.exporting') : t('admin.exportUi.excel')}
            </button>
            <button type="button" onClick={openGenerate} className="admin-btn admin-btn--primary">
              {t('admin.contracts.generate')}
            </button>
          </>
        }
      />

      <form onSubmit={runSearch} className="rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 space-y-4">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
          <input
            className={inputClass}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.contracts.searchPlaceholder')}
          />
          <input
            className={inputClass}
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder={t('admin.contracts.customerName')}
          />
          <input
            className={inputClass}
            value={cin}
            onChange={(e) => setCin(e.target.value)}
            placeholder={t('admin.contracts.cin')}
          />
          <input
            className={inputClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t('admin.contracts.phone')}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="px-4 py-2 rounded-xl bg-primary text-white text-sm whitespace-nowrap">
            {t('admin.bookings.applyFilters')}
          </button>
          <button
            type="button"
            onClick={() => {
              setSearch('')
              setCustomerName('')
              setCin('')
              setPhone('')
              setPagination((prev) => ({ ...prev, page: 1 }))
              fetchContracts({ page: 1 })
            }}
            className="px-4 py-2 rounded-xl border border-borderColor text-sm whitespace-nowrap"
          >
            {t('admin.bookings.clear')}
          </button>
        </div>
      </form>

      {showGenerate && (
        <div className="relative rounded-2xl border border-borderColor bg-white p-5 space-y-4">
          {generateJob.isActive ? (
            <DocumentPdfProgress
              status={generateJob.status}
              title={
                generateJob.status === 'success'
                  ? t('admin.contracts.stageReady')
                  : t('admin.contracts.generatingTitle')
              }
              subtitle={
                generateJob.status === 'error' ? undefined : t('admin.contracts.generatingHint')
              }
              stages={buildPdfJobStages(generateJob.status, {
                generating: t('admin.contracts.stageGenerating'),
                ready: t('admin.contracts.stageReady'),
              })}
              errorMessage={
                getErrorMessage(generateJob.error) || t('admin.contracts.generateFailed')
              }
              onRetry={generateJob.status === 'error' ? () => generateContract() : undefined}
              retryLabel={t('admin.contracts.retryGenerate')}
              variant="overlay"
            />
          ) : null}
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">{t('admin.contracts.generate')}</h2>
            <button
              type="button"
              disabled={generating}
              onClick={() => setShowGenerate(false)}
              className="text-sm text-gray-500 disabled:opacity-50"
            >
              ×
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">{t('admin.contracts.booking')}</label>
              <select
                className={inputClass}
                value={generateForm.bookingId}
                onChange={(e) => loadBookingDetails(e.target.value)}
                required
              >
                <option value="">{t('admin.contracts.selectBooking')}</option>
                {bookings.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.reservationId} — {b.customerName} ({formatDateTime(b.pickupDate)})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">{t('admin.contracts.template')}</label>
              <select
                className={inputClass}
                value={generateForm.templateId}
                onChange={(e) => setGenerateForm((f) => ({ ...f, templateId: e.target.value }))}
              >
                <option value="">{t('admin.contracts.defaultTemplate')}</option>
                {templates.map((tpl) => (
                  <option key={tpl._id} value={tpl._id}>{tpl.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-borderColor pt-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-800">{t('admin.contracts.tenantDetails')}</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">{t('admin.contracts.dateOfBirth')}</label>
                <input type="date" className={inputClass} value={generateForm.dateOfBirth} onChange={(e) => setGenerateForm((f) => ({ ...f, dateOfBirth: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">{t('admin.contracts.nationality')}</label>
                <input className={inputClass} value={generateForm.nationality} onChange={(e) => setGenerateForm((f) => ({ ...f, nationality: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">{t('admin.contracts.driverLicense')}</label>
                <input className={inputClass} value={generateForm.driverLicenseNumber} onChange={(e) => setGenerateForm((f) => ({ ...f, driverLicenseNumber: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">{t('admin.contracts.licenseExpiry')}</label>
                <input type="date" className={inputClass} value={generateForm.driverLicenseExpiry} onChange={(e) => setGenerateForm((f) => ({ ...f, driverLicenseExpiry: e.target.value }))} />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-gray-600">{t('admin.contracts.passport')}</label>
                <input className={inputClass} value={generateForm.passportNumber} onChange={(e) => setGenerateForm((f) => ({ ...f, passportNumber: e.target.value }))} />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={generateForm.secondDriverEnabled}
                onChange={(e) => setGenerateForm((f) => ({ ...f, secondDriverEnabled: e.target.checked }))}
              />
              {t('admin.contracts.secondDriverYes')}
            </label>

            {generateForm.secondDriverEnabled && (
              <div className="grid md:grid-cols-2 gap-4 pl-1">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">{t('admin.contracts.secondDriverName')}</label>
                  <input className={inputClass} value={generateForm.secondDriverFullName} onChange={(e) => setGenerateForm((f) => ({ ...f, secondDriverFullName: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">{t('admin.contracts.secondDriverDob')}</label>
                  <input type="date" className={inputClass} value={generateForm.secondDriverDob} onChange={(e) => setGenerateForm((f) => ({ ...f, secondDriverDob: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">{t('admin.contracts.secondDriverNationality')}</label>
                  <input className={inputClass} value={generateForm.secondDriverNationality} onChange={(e) => setGenerateForm((f) => ({ ...f, secondDriverNationality: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">{t('admin.contracts.secondDriverPhone')}</label>
                  <input className={inputClass} value={generateForm.secondDriverPhone} onChange={(e) => setGenerateForm((f) => ({ ...f, secondDriverPhone: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">{t('admin.contracts.driverLicense')}</label>
                  <input className={inputClass} value={generateForm.secondDriverLicense} onChange={(e) => setGenerateForm((f) => ({ ...f, secondDriverLicense: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">{t('admin.contracts.licenseExpiry')}</label>
                  <input type="date" className={inputClass} value={generateForm.secondDriverLicenseExpiry} onChange={(e) => setGenerateForm((f) => ({ ...f, secondDriverLicenseExpiry: e.target.value }))} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-gray-600">{t('admin.contracts.passport')}</label>
                  <input className={inputClass} value={generateForm.secondDriverPassport} onChange={(e) => setGenerateForm((f) => ({ ...f, secondDriverPassport: e.target.value }))} />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-borderColor bg-white p-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-borderColor text-primary focus:ring-primary/30"
                checked={Boolean(generateForm.includeCompanyStamp)}
                onChange={(e) => setGenerateForm((f) => ({ ...f, includeCompanyStamp: e.target.checked }))}
              />
              <span>
                <span className="font-medium">{t('admin.contracts.includeStamp')}</span>
                <span className="block text-xs text-gray-500 mt-0.5">{t('admin.contracts.includeStampHint')}</span>
              </span>
            </label>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                disabled={generating}
                onClick={previewFromBooking}
                className="px-4 py-2 rounded-xl border border-borderColor text-sm disabled:opacity-60"
              >
                {t('admin.contracts.previewDraft')}
              </button>
              <button
                type="button"
                disabled={generating}
                onClick={() => generateContract()}
                className="px-4 py-2 rounded-xl bg-primary text-white text-sm disabled:opacity-60"
              >
                {generating ? t('admin.contracts.generatingTitle') : t('admin.contracts.generateFinal')}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewHtml && (
        <div className="rounded-2xl border border-borderColor bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-borderColor flex items-center justify-between">
            <p className="font-medium text-sm">{previewTitle}</p>
            <button type="button" onClick={() => setPreviewHtml('')} className="text-xs text-gray-500">{t('admin.common.close')}</button>
          </div>
          <iframe title={t('admin.commonUi.preview')} srcDoc={previewHtml} className="w-full min-h-[520px] bg-white" />
        </div>
      )}

      <div className="rounded-2xl border border-borderColor bg-white overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">{t('admin.contracts.loading')}</p>
        ) : contracts.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">{t('admin.contracts.none')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-light text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3">{t('admin.contracts.number')}</th>
                  <th className="px-4 py-3">{t('admin.contracts.reservation')}</th>
                  <th className="px-4 py-3">{t('admin.contracts.customer')}</th>
                  <th className="px-4 py-3">{t('admin.contracts.vehicle')}</th>
                  <th className="px-4 py-3">{t('admin.contracts.total')}</th>
                  <th className="px-4 py-3">{t('admin.contracts.created')}</th>
                  <th className="px-4 py-3">{t('admin.contracts.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => {
                  const booking = contract.booking || {}
                  const car = booking.car || {}
                  const vehicleLabel = contract.vehicleSummary
                    || (car.brand ? `${car.brand} ${car.model || ''}`.trim() : '—')
                  const totalLabel = contract.totalAmount != null
                    ? `${currency}${Number(contract.totalAmount).toFixed(2)}`
                    : (booking.price != null ? `${currency}${booking.price}` : '—')
                  return (
                    <tr key={contract._id} className="border-t border-borderColor">
                      <td className="px-4 py-3 font-medium">
                        {contract.contractNumber}
                        {contract.sourceLocked ? (
                          <span className="ml-2 text-[10px] font-normal text-gray-500">{t('admin.documents.edited')}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">{contract.reservationId || booking.reservationId || '—'}</td>
                      <td className="px-4 py-3">
                        <p>{contract.customerName || booking.customerName || '—'}</p>
                        <p className="text-xs text-gray-500">{contract.customerPhone || booking.customerPhone || ''}</p>
                      </td>
                      <td className="px-4 py-3">{vehicleLabel}</td>
                      <td className="px-4 py-3">{totalLabel}</td>
                      <td className="px-4 py-3">{formatDateTime(contract.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => setEditingId(contract._id)} className="text-primary text-xs font-medium">
                            {t('admin.contracts.edit')}
                          </button>
                          <button type="button" onClick={() => previewContract(contract)} className="text-primary text-xs font-medium">
                            {t('admin.contracts.preview')}
                          </button>
                          <button type="button" onClick={() => downloadPdf(contract)} className="text-gray-700 text-xs font-medium">
                            PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
            className="px-3 py-1.5 rounded-lg border border-borderColor disabled:opacity-50"
          >
            ←
          </button>
          <span className="text-gray-600">
            {pagination.page} / {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            className="px-3 py-1.5 rounded-lg border border-borderColor disabled:opacity-50"
          >
            →
          </button>
        </div>
      )}

      {editingId && (
        <DocumentEditor
          type="contract"
          documentId={editingId}
          axios={axios}
          onClose={() => setEditingId(null)}
          onSaved={(saved) => {
            if (saved?._id) {
              setContracts((prev) => prev.map((c) => (c._id === saved._id
                ? {
                    ...c,
                    ...saved,
                    booking: c.booking,
                    versions: undefined,
                    renderedHtml: undefined,
                    sourceData: undefined,
                    templateSnapshot: undefined,
                  }
                : c)))
            }
            fetchContracts()
          }}
          initForm={initContractForm}
          buildPatch={buildContractPatch}
          renderFields={renderContractFields}
        />
      )}
    </AdminPage>
  )
}

export default Contracts

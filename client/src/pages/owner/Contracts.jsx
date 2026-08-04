import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Title from '../../components/owner/Title'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import toast from 'react-hot-toast'
import { getErrorMessage } from '../../utils/apiError'

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
  const [generating, setGenerating] = useState(false)
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

  const inputClass = 'border border-borderColor px-3 py-2 rounded-lg w-full text-sm'

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
      dateOfBirth: booking.dateOfBirth || '',
      nationality: booking.nationality || '',
      driverLicenseNumber: booking.driverLicenseNumber || '',
      driverLicenseExpiry: booking.driverLicenseExpiry || '',
      passportNumber: booking.passportNumber || '',
      secondDriverEnabled: Boolean(sd.enabled),
      secondDriverFullName: sd.fullName || '',
      secondDriverDob: sd.dateOfBirth || '',
      secondDriverNationality: sd.nationality || '',
      secondDriverLicense: sd.driverLicenseNumber || '',
      secondDriverLicenseExpiry: sd.driverLicenseExpiry || '',
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
        includeCompanyStamp: generateForm.includeCompanyStamp,
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

  const generateContract = async () => {
    if (!generateForm.bookingId) {
      toast.error(t('admin.contracts.bookingRequired'))
      return
    }
    setGenerating(true)
    try {
      const saved = await saveContractDetails()
      if (!saved) return
      const { data } = await axios.post('/api/contracts/generate', {
        bookingId: generateForm.bookingId,
        templateId: generateForm.templateId || undefined,
        includeCompanyStamp: generateForm.includeCompanyStamp,
      })
      if (data.success) {
        toast.success(data.message)
        setShowGenerate(false)
        setPreviewHtml('')
        fetchContracts()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setGenerating(false)
    }
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
      const { data } = await axios.get(`/api/contracts/${contract._id}/pdf`)
      if (data.success && data.pdfUrl) {
        window.open(data.pdfUrl, '_blank', 'noopener,noreferrer')
      } else {
        toast.error(data.message || t('admin.contracts.noPdf'))
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  return (
    <div className="px-4 pt-8 md:px-8 lg:px-10 xl:px-12 md:pt-10 flex-1 pb-12 min-w-0 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <Title title={t('admin.contracts.title')} subTitle={t('admin.contracts.subtitle')} />
        <button
          type="button"
          onClick={openGenerate}
          className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:opacity-90"
        >
          {t('admin.contracts.generate')}
        </button>
      </div>

      <form onSubmit={runSearch} className="rounded-2xl border border-borderColor bg-white p-4 space-y-4">
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
        <div className="rounded-2xl border border-borderColor bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">{t('admin.contracts.generate')}</h2>
            <button type="button" onClick={() => setShowGenerate(false)} className="text-sm text-gray-500">×</button>
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

          <div className="space-y-2 rounded-xl border border-borderColor bg-gray-50 p-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={generateForm.includeCompanyStamp}
                onChange={(e) => setGenerateForm((f) => ({ ...f, includeCompanyStamp: e.target.checked }))}
              />
              {t('admin.contracts.includeStamp')}
            </label>
            <p className="text-xs text-gray-500">{t('admin.contracts.includeStampHint')}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={previewFromBooking} className="px-4 py-2 rounded-xl border border-borderColor text-sm">
              {t('admin.contracts.previewDraft')}
            </button>
            <button
              type="button"
              disabled={generating}
              onClick={generateContract}
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm disabled:opacity-60"
            >
              {generating ? t('admin.contracts.generating') : t('admin.contracts.generateFinal')}
            </button>
          </div>
        </div>
      )}

      {previewHtml && (
        <div className="rounded-2xl border border-borderColor bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-borderColor flex items-center justify-between">
            <p className="font-medium text-sm">{previewTitle}</p>
            <button type="button" onClick={() => setPreviewHtml('')} className="text-xs text-gray-500">Close</button>
          </div>
          <iframe title="Contract preview" srcDoc={previewHtml} className="w-full min-h-[520px] bg-white" />
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
                  return (
                    <tr key={contract._id} className="border-t border-borderColor">
                      <td className="px-4 py-3 font-medium">{contract.contractNumber}</td>
                      <td className="px-4 py-3">{booking.reservationId || '—'}</td>
                      <td className="px-4 py-3">
                        <p>{booking.customerName || '—'}</p>
                        <p className="text-xs text-gray-500">{booking.customerPhone || ''}</p>
                      </td>
                      <td className="px-4 py-3">{car.brand ? `${car.brand} ${car.model}` : '—'}</td>
                      <td className="px-4 py-3">{booking.price != null ? `${currency}${booking.price}` : '—'}</td>
                      <td className="px-4 py-3">{formatDateTime(contract.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
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
    </div>
  )
}

export default Contracts

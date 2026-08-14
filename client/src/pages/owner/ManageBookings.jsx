import React, { useCallback, useEffect, useMemo, useState } from 'react'
import ChannelBadge from '../../components/owner/ChannelBadge'
import BookingRowActions from '../../components/owner/BookingRowActions'
import StatusBadge from '../../components/owner/StatusBadge'
import Pagination from '../../components/owner/Pagination'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import toast from 'react-hot-toast'
import { escapeHtml, getErrorMessage } from '../../utils/apiError'
import PhoneInput from '../../components/PhoneInput'
import { isPhoneValid } from '../../utils/phoneValidation'
import { Link } from 'react-router-dom'
import { buildOwnerCompletionWaUrl, buildWaMeUrl, getAgencyWhatsAppDial } from '../../utils/whatsapp'
import { downloadPdfFromApi } from '../../utils/downloadPdf'
import ContractExtensionModal from '../../components/owner/ContractExtensionModal'
import BookingRelationAssigners from '../../components/owner/BookingRelationAssigners'
import {
  AdminPage,
  PageHeader,
  EmptyState,
  SkeletonRows,
  AdminModal,
  ConfirmDialog,
} from '../../components/owner/ui'
import { DetailSection, DetailRow } from '../../components/owner/ui/DetailSection'

const emptyFilters = {
  customerName: '',
  phone: '',
  email: '',
  reservationId: '',
  vehicle: '',
  licensePlate: '',
  status: '',
  paymentStatus: '',
  channel: '',
  pickupLocation: '',
  pickupDateFrom: '',
  pickupDateTo: '',
}

const emptyEdit = {
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  pickupDate: '',
  returnDate: '',
  pickupLocation: '',
  returnLocation: '',
  notes: '',
  status: 'pending',
  paymentStatus: 'pending',
  carId: '',
}

const toInputDateTime = (value) => {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const d = new Date(value)
  return isNaN(d.getTime()) ? '-' : d.toLocaleString()
}

const ManageBookings = () => {
  const { currency, axios, hasPermission, user } = useAppContext()
  const whatsappSettings = user?.whatsappSettings
  const { t } = useI18n()

  const [bookings, setBookings] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 })
  const [filters, setFilters] = useState(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState(emptyEdit)
  const closeEdit = useCallback(() => setEditing(null), [])
  const patchEditForm = useCallback((patch) => {
    setEditForm((prev) => ({ ...prev, ...patch }))
  }, [])
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(true)
  const [fleetCars, setFleetCars] = useState([])
  const [assigningVehicle, setAssigningVehicle] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState('')
  const [identityType, setIdentityType] = useState('national_id')
  const [completionLinkCache, setCompletionLinkCache] = useState({})
  const [openingWhatsApp, setOpeningWhatsApp] = useState(false)
  const [extendBooking, setExtendBooking] = useState(null)
  const closeExtend = useCallback(() => setExtendBooking(null), [])
  const [confirmAction, setConfirmAction] = useState(null)

  const resolveCompletionUrl = (booking) =>
    booking?.completion?.shareableCompletionUrl ||
    booking?.completion?.completionUrl ||
    completionLinkCache[booking?._id] ||
    ''

  const cacheCompletionUrl = (bookingId, url) => {
    if (!bookingId || !url) return
    setCompletionLinkCache((prev) => ({ ...prev, [bookingId]: url }))
  }

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    Object.entries(appliedFilters).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    params.set('page', String(pagination.page))
    params.set('limit', String(pagination.limit))
    params.set('sortBy', 'createdAt')
    params.set('sortOrder', 'desc')
    return params.toString()
  }, [appliedFilters, pagination.page, pagination.limit])

  const fetchOwnerBookings = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`/api/bookings/owner?${queryString}`)
      if (data.success) {
        setBookings(data.bookings)
        setPagination((prev) => ({ ...prev, ...data.pagination }))
        if (selectedBooking) {
          const refreshed = data.bookings.find((b) => b._id === selectedBooking._id)
          if (refreshed) setSelectedBooking(refreshed)
        }
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
    fetchOwnerBookings()
  }, [queryString])

  useEffect(() => {
    axios.get('/api/owner/cars')
      .then(({ data }) => { if (data.success) setFleetCars(data.cars || []) })
      .catch(() => {})
  }, [axios])

  const compatibleVehicles = useMemo(() => {
    if (!selectedBooking?.car) return []
    const brand = selectedBooking.car.brand
    const model = selectedBooking.car.model
    return fleetCars.filter(
      (c) => c.brand === brand && c.model === model && c.status !== 'maintenance' && c.isAvaliable !== false,
    )
  }, [fleetCars, selectedBooking])

  const editVehicleOptions = useMemo(() => {
    if (!editing?.car) return []
    const brand = editing.car.brand
    const model = editing.car.model
    return fleetCars.filter(
      (c) => c.brand === brand && c.model === model && c.status !== 'maintenance' && c.isAvaliable !== false,
    )
  }, [fleetCars, editing])

  const applyFilters = (e) => {
    e?.preventDefault()
    setPagination((prev) => ({ ...prev, page: 1 }))
    setAppliedFilters({ ...filters })
  }

  const clearFilters = () => {
    setFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const changeBookingStatus = async (bookingId, status) => {
    try {
      const { data } = await axios.post('/api/bookings/change-status', { bookingId, status })
      if (data.success) {
        if (status === 'confirmed') {
          if (data.completion?.completionUrl) {
            cacheCompletionUrl(bookingId, data.completion.completionUrl)
          }
          if (data.completion?.emailSent) {
            toast.success(data.message)
          } else {
            toast.error(data.message, { duration: 8000 })
            if (data.completion?.completionUrl) {
              try {
                await navigator.clipboard.writeText(data.completion.completionUrl)
                toast.success(t('admin.bookings.linkCopied'))
              } catch { /* ignore */ }
            }
          }
        } else {
          toast.success(data.message)
        }
        fetchOwnerBookings()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const resendCompletionLink = async (bookingId) => {
    try {
      const { data } = await axios.post('/api/booking-completion/owner/resend-link', { bookingId })
      if (data.success) {
        toast.success(data.message)
      } else {
        toast.error(data.message || t('admin.bookings.emailFailed'), { duration: 8000 })
      }
      if (data.completionUrl) {
        cacheCompletionUrl(bookingId, data.completionUrl)
        try {
          await navigator.clipboard.writeText(data.completionUrl)
          toast.success(t('admin.bookings.linkCopied'))
        } catch { /* ignore */ }
      }
      fetchOwnerBookings()
    } catch (error) {
      toast.error(getErrorMessage(error), { duration: 8000 })
    }
  }

  const ensureCompletionUrl = async (booking) => {
    const cached = resolveCompletionUrl(booking)
    if (cached) return cached

    const bookingId = booking._id
    const tryEnsure = async (url) => {
      const { data } = await axios.post(url, { bookingId })
      return data
    }

    let data
    try {
      data = await tryEnsure('/api/booking-completion/owner/ensure-link')
    } catch (err) {
      if (err.response?.status === 404) {
        data = await tryEnsure('/api/bookings/owner/completion/ensure-link')
      } else {
        throw err
      }
    }

    const url = data.shareableCompletionUrl || data.completionUrl
    if (!data.success || !url) {
      throw new Error(data.message || t('admin.bookings.noCompletionLink'))
    }
    cacheCompletionUrl(bookingId, url)
    return url
  }

  const openCompletionWaMe = (booking, completionUrl) => {
    const url = buildOwnerCompletionWaUrl(booking, completionUrl, {
      currency,
      whatsappSettings,
    })
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  /** Ensures completion link exists, then opens wa.me (no WhatsApp send API). */
  const confirmViaWhatsApp = async (booking) => {
    if (!booking?._id) return
    setOpeningWhatsApp(true)
    try {
      const completionUrl = await ensureCompletionUrl(booking)
      openCompletionWaMe(booking, completionUrl)
      fetchOwnerBookings()
    } catch (error) {
      toast.error(getErrorMessage(error), { duration: 8000 })
    } finally {
      setOpeningWhatsApp(false)
    }
  }

  const changePaymentStatus = async (bookingId, paymentStatus) => {
    try {
      const { data } = await axios.post('/api/bookings/change-payment-status', { bookingId, paymentStatus })
      if (data.success) {
        toast.success(data.message)
        fetchOwnerBookings()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const startEdit = (booking) => {
    setEditing(booking)
    setEditForm({
      customerName: booking.customerName || '',
      customerEmail: booking.customerEmail || '',
      customerPhone: booking.customerPhone || '',
      pickupDate: toInputDateTime(booking.pickupDate),
      returnDate: toInputDateTime(booking.returnDate),
      pickupLocation: booking.pickupLocation || '',
      returnLocation: booking.returnLocation || '',
      notes: booking.notes || '',
      status: booking.status || 'pending',
      paymentStatus: booking.paymentStatus || 'pending',
      carId: booking.car?._id || booking.car || '',
    })
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    if (!isPhoneValid(editForm.customerPhone)) {
      toast.error(t('admin.bookings.invalidPhone'))
      return
    }
    try {
      const { data } = await axios.post('/api/bookings/update', {
        bookingId: editing._id,
        ...editForm,
      })
      if (data.success) {
        toast.success(data.message)
        setEditing(null)
        fetchOwnerBookings()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const deleteBooking = async (bookingId) => {
    setConfirmAction({
      type: 'delete',
      bookingId,
      title: 'Delete reservation',
      message: 'Delete this reservation permanently? This cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
    })
  }

  const runConfirmAction = async () => {
    if (!confirmAction) return
    const { type, bookingId, status } = confirmAction
    setConfirmAction(null)
    try {
      if (type === 'delete') {
        const { data } = await axios.post('/api/bookings/delete', { bookingId })
        if (data.success) {
          toast.success(data.message)
          if (selectedBooking?._id === bookingId) setSelectedBooking(null)
          fetchOwnerBookings()
        } else toast.error(data.message)
      } else if (type === 'status') {
        await changeBookingStatus(bookingId, status)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const requestCancel = (bookingId) => {
    setConfirmAction({
      type: 'status',
      bookingId,
      status: 'cancelled',
      title: 'Cancel reservation',
      message: 'Cancel this reservation? The customer will see it as cancelled.',
      confirmText: 'Cancel reservation',
      variant: 'danger',
    })
  }

  const downloadDocument = async (bookingId, docType) => {
    try {
      const { data } = await axios.get(`/api/bookings/owner/${bookingId}/documents/${docType}`)
      if (data.success && data.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer')
      } else {
        toast.error(data.message || t('admin.bookings.documentMissing'))
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const uploadDocument = async (bookingId, file, docType) => {
    if (!file) return
    setUploadingDoc(docType)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('docType', docType)
      if (docType === 'identity') formData.append('identityType', identityType)

      const { data } = await axios.post(`/api/bookings/owner/${bookingId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (data.success) {
        toast.success(data.message)
        fetchOwnerBookings()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setUploadingDoc('')
    }
  }

  const assignVehicle = async (bookingId, carId) => {
    if (!carId) return
    setAssigningVehicle(true)
    try {
      const { data } = await axios.post('/api/bookings/assign-vehicle', { bookingId, carId })
      if (data.success) {
        toast.success(data.message)
        setSelectedBooking(data.booking)
        fetchOwnerBookings()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setAssigningVehicle(false)
    }
  }

  const generateInvoiceForBooking = async (booking) => {
    try {
      const { data } = await axios.post('/api/invoices/generate', {
        bookingId: booking._id,
        includeCompanyStamp: true,
      })
      if (data.success) {
        toast.success(data.message)
        if (data.invoice?._id) {
          try {
            await downloadPdfFromApi(
              axios,
              `/api/invoices/${data.invoice._id}/pdf`,
              `${data.invoice.invoiceNumber || 'invoice'}.pdf`,
            )
          } catch (downloadError) {
            toast.error(getErrorMessage(downloadError, 'Invoice created but PDF download failed'))
          }
        }
        fetchOwnerBookings()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const openWhatsApp = (booking) => {
    const vehicle = booking.car
      ? `${booking.car.brand} ${booking.car.model}`
      : '—'
    const text = [
      'Hello, regarding this reservation:',
      '',
      `ID: ${booking.reservationId || '—'}`,
      `${t('admin.leftover.printCustomer')}: ${booking.customerName || '—'}`,
      `${t('admin.leftover.printPhone')}: ${booking.customerPhone || '—'}`,
      `${t('admin.leftover.printVehicle')}: ${vehicle}`,
      `${t('admin.leftover.printStatus')}: ${booking.status || '—'}`,
    ].join('\n')
    window.open(
      buildWaMeUrl(text, getAgencyWhatsAppDial(whatsappSettings, 'reservation')),
      '_blank',
      'noopener,noreferrer',
    )
  }

  const exportCsv = async () => {
    try {
      const params = new URLSearchParams()
      Object.entries(appliedFilters).forEach(([key, value]) => {
        if (value) params.set(key, value)
      })
      const response = await axios.get(`/api/bookings/owner/export?${params.toString()}`, {
        responseType: 'blob',
      })
      const contentType = response.headers['content-type'] || ''
      if (contentType.includes('application/json')) {
        const text = await response.data.text()
        const json = JSON.parse(text)
        toast.error(json.message || 'Export failed')
        return
      }
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `reservations-${Date.now()}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success(t('admin.leftover.exportDownloaded'))
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const printBooking = (booking) => {
    const reservationId = booking.reservationId || `RES-${booking._id?.toString().slice(-8).toUpperCase()}`
    const vehicle = booking.car ? `${booking.car.brand} ${booking.car.model}` : '-'
    const html = `
      <html>
        <head>
          <title>Reservation ${escapeHtml(reservationId)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
            h1 { margin-bottom: 4px; }
            .muted { color: #666; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 8px 4px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
            td:first-child { font-weight: 600; width: 40%; color: #374151; }
          </style>
        </head>
        <body>
          <h1>Reservation ${escapeHtml(reservationId)}</h1>
          <p class="muted">Printed ${escapeHtml(new Date().toLocaleString())}</p>
          <table>
            <tr><td>${t('admin.leftover.printCustomer')}</td><td>${escapeHtml(booking.customerName || '-')}</td></tr>
            <tr><td>${t('admin.leftover.printPhone')}</td><td>${escapeHtml(booking.customerPhone || '-')}</td></tr>
            <tr><td>${t('admin.leftover.printEmail')}</td><td>${escapeHtml(booking.customerEmail || '-')}</td></tr>
            <tr><td>${t('admin.leftover.printVehicle')}</td><td>${escapeHtml(vehicle)}</td></tr>
            <tr><td>${t('admin.leftover.printPickupLoc')}</td><td>${escapeHtml(booking.pickupLocation || '-')}</td></tr>
            <tr><td>${t('admin.leftover.printDropoff')}</td><td>${escapeHtml(booking.returnLocation || '-')}</td></tr>
            <tr><td>${t('admin.leftover.printPickup')}</td><td>${escapeHtml(formatDateTime(booking.pickupDate))}</td></tr>
            <tr><td>${t('admin.leftover.printReturn')}</td><td>${escapeHtml(formatDateTime(booking.returnDate))}</td></tr>
            <tr><td>${t('admin.leftover.printStatus')}</td><td>${escapeHtml(booking.status)}</td></tr>
            <tr><td>${t('admin.leftover.printPayment')}</td><td>${escapeHtml(booking.paymentStatus)}</td></tr>
            <tr><td>${t('admin.leftover.printTotal')}</td><td>${escapeHtml(String(currency))}${escapeHtml(String(booking.price))}</td></tr>
            <tr><td>${t('admin.leftover.printNotes')}</td><td>${escapeHtml(booking.notes || '-')}</td></tr>
          </table>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>
    `
    const win = window.open('', '_blank', 'width=800,height=900')
    if (!win) {
      toast.error(t('admin.leftover.allowPrint'))
      return
    }
    win.document.write(html)
    win.document.close()
  }

  const inputClass =
    'h-9 w-full rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 text-sm text-[var(--admin-fg)] outline-none focus:shadow-[var(--admin-focus)]'
  const labelClass = 'mb-1 block text-[11px] font-medium text-[var(--admin-fg-muted)]'
  const resId = (b) => b.reservationId || `RES-${b._id.toString().slice(-8).toUpperCase()}`

  return (
    <AdminPage>
      <PageHeader
        title={t('admin.bookings.title')}
        description={t('admin.bookings.subtitle')}
        actions={
          <>
            <Link to="/owner/walk-in" className="admin-btn admin-btn--secondary">
              {t('admin.walkIn.menu')}
            </Link>
            <button type="button" onClick={() => setShowFilters((v) => !v)} className="admin-btn admin-btn--ghost">
              {showFilters ? t('admin.bookings.hideFilters') : t('admin.bookings.showFilters')}
            </button>
            <button type="button" onClick={exportCsv} className="admin-btn admin-btn--primary">
              {t('admin.bookings.exportCsv')}
            </button>
          </>
        }
      />

      {showFilters && (
        <form
          onSubmit={applyFilters}
          className="mb-4 grid grid-cols-1 gap-3 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {[
            ['customerName', t('admin.bookings.customerName'), 'Name'],
            ['phone', t('admin.bookings.phone'), 'Phone'],
            ['email', t('admin.bookings.email'), 'Email'],
            ['reservationId', t('admin.bookings.reservationId'), 'RES-XXXXXXXX'],
            ['vehicle', t('admin.bookings.vehicle'), 'Brand or model'],
            ['licensePlate', t('admin.bookings.licensePlate'), t('admin.bookings.licensePlatePlaceholder')],
            ['pickupLocation', t('admin.bookings.pickupLocation'), 'Location'],
          ].map(([key, label, ph]) => (
            <div key={key}>
              <label className={labelClass}>{label}</label>
              <input
                className={inputClass}
                value={filters[key]}
                onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
                placeholder={ph}
              />
            </div>
          ))}
          <div>
            <label className={labelClass}>{t('admin.bookings.status')}</label>
            <select className={inputClass} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">{t('admin.common.allStatuses')}</option>
              <option value="pending">{t('admin.status.pending')}</option>
              <option value="confirmed">{t('admin.status.confirmed')}</option>
              <option value="ready_for_pickup">{t('admin.status.ready_for_pickup')}</option>
              <option value="active">{t('admin.status.active')}</option>
              <option value="completed">{t('admin.status.completed')}</option>
              <option value="cancelled">{t('admin.status.cancelled')}</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookings.paymentStatus')}</label>
            <select className={inputClass} value={filters.paymentStatus} onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}>
              <option value="">{t('admin.bookingsUi.allPayments')}</option>
              <option value="pending">{t('admin.status.pending')}</option>
              <option value="paid">{t('admin.status.paid')}</option>
              <option value="failed">{t('admin.status.failed')}</option>
              <option value="refunded">{t('admin.status.refunded')}</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookings.channel')}</label>
            <select className={inputClass} value={filters.channel} onChange={(e) => setFilters({ ...filters, channel: e.target.value })}>
              <option value="">{t('admin.bookingsUi.allChannels')}</option>
              <option value="online">{t('admin.bookingsUi.online')}</option>
              <option value="walk_in">{t('admin.bookingsUi.walkIn')}</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookings.pickupFrom')}</label>
            <input type="date" className={inputClass} value={filters.pickupDateFrom} onChange={(e) => setFilters({ ...filters, pickupDateFrom: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookings.pickupTo')}</label>
            <input type="date" className={inputClass} value={filters.pickupDateTo} onChange={(e) => setFilters({ ...filters, pickupDateTo: e.target.value })} />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-3 xl:col-span-4">
            <button type="submit" className="admin-btn admin-btn--primary">{t('admin.bookings.applyFilters')}</button>
            <button type="button" onClick={clearFilters} className="admin-btn admin-btn--secondary">{t('admin.bookings.clear')}</button>
            <span className="ml-auto text-xs text-[var(--admin-fg-muted)]">
              {pagination.total === 1
                ? t('admin.bookings.count', { count: pagination.total })
                : t('admin.bookings.count_plural', { count: pagination.total })}
            </span>
          </div>
        </form>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="admin-table-wrap min-w-0">
          {/* Mobile cards */}
          <div className="lg:hidden">
            {loading ? (
              <div className="p-4"><SkeletonRows rows={5} /></div>
            ) : bookings.length === 0 ? (
              <EmptyState
                icon="calendar"
                title={t('admin.bookings.none')}
                description={t('admin.leftover.adjustFilters')}
                action={<Link to="/owner/walk-in" className="admin-btn admin-btn--primary">{t('admin.walkIn.menu')}</Link>}
              />
            ) : (
              bookings.map((booking) => (
                <button
                  key={booking._id}
                  type="button"
                  className={`admin-booking-card ${selectedBooking?._id === booking._id ? 'is-selected' : ''}`}
                  onClick={() => setSelectedBooking(booking)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--admin-accent)]">{resId(booking)}</p>
                      <p className="truncate text-sm text-[var(--admin-fg)]">{booking.customerName || t('admin.common.guest')}</p>
                      <p className="truncate text-xs text-[var(--admin-fg-muted)]">
                        {booking.car?.brand} {booking.car?.model}
                        {booking.car?.licensePlate ? ` · ${booking.car.licensePlate}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--admin-fg-secondary)]">
                    <ChannelBadge channel={booking.channel || 'online'} />
                    <span className="tabular-nums">{currency}{booking.price}</span>
                    <StatusBadge status={booking.paymentStatus} />
                  </div>
                  <p className="text-[11px] text-[var(--admin-fg-muted)]">
                    {formatDateTime(booking.pickupDate)} → {formatDateTime(booking.returnDate)}
                  </p>
                </button>
              ))
            )}
          </div>

          {/* Desktop table */}
          <div className="table-scroll hidden lg:block max-h-[min(70vh,44rem)] overflow-auto">
            <table className="admin-table min-w-[720px]">
              <thead>
                <tr>
                  <th>{t('admin.bookings.reservation')}</th>
                  <th>{t('admin.bookings.customer')}</th>
                  <th>{t('admin.bookings.dates')}</th>
                  <th>{t('admin.bookings.total')}</th>
                  <th>{t('admin.bookings.status')}</th>
                  <th className="text-right">{t('admin.bookings.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="!p-4"><SkeletonRows rows={6} /></td></tr>
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="!p-0">
                      <EmptyState icon="calendar" title={t('admin.bookings.none')} description={t('admin.leftover.createWalkIn')} />
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr
                      key={booking._id}
                      className={selectedBooking?._id === booking._id ? 'bg-[var(--admin-accent-soft)]' : ''}
                    >
                      <td>
                        <button type="button" onClick={() => setSelectedBooking(booking)} className="cursor-pointer text-left">
                          <p className="font-medium text-[var(--admin-accent)]">{resId(booking)}</p>
                          <p className="text-xs text-[var(--admin-fg-muted)]">{booking.car?.brand} {booking.car?.model}</p>
                          {booking.car?.licensePlate && (
                            <p className="text-[10px] text-[var(--admin-fg-muted)]">{booking.car.licensePlate}</p>
                          )}
                          <ChannelBadge channel={booking.channel || 'online'} className="mt-1" />
                        </button>
                      </td>
                      <td>
                        <p className="font-medium text-[var(--admin-fg)]">{booking.customerName || t('admin.common.guest')}</p>
                        <p className="text-xs text-[var(--admin-fg-muted)]">{booking.customerPhone || '—'}</p>
                      </td>
                      <td className="text-xs text-[var(--admin-fg-secondary)]">
                        {formatDateTime(booking.pickupDate)}
                        <br />→ {formatDateTime(booking.returnDate)}
                      </td>
                      <td className="tabular-nums">{currency}{booking.price}</td>
                      <td>
                        <select
                          onChange={(e) => changeBookingStatus(booking._id, e.target.value)}
                          value={booking.status}
                          className="h-8 rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2 text-xs"
                        >
                          <option value="pending">{t('admin.status.pending')}</option>
                          <option value="confirmed">{t('admin.status.confirmed')}</option>
                          <option value="ready_for_pickup">{t('admin.status.ready_for_pickup')}</option>
                          <option value="active">{t('admin.status.active')}</option>
                          <option value="completed">{t('admin.status.completed')}</option>
                          <option value="cancelled">{t('admin.status.cancelled')}</option>
                        </select>
                        <div className="mt-1"><StatusBadge status={booking.paymentStatus} /></div>
                      </td>
                      <td className="align-middle">
                        <BookingRowActions
                          t={t}
                          onView={() => setSelectedBooking(booking)}
                          onEdit={() => startEdit(booking)}
                          onDownloadLicense={() => downloadDocument(booking._id, 'driving_license')}
                          onDownloadId={() => downloadDocument(booking._id, 'identity')}
                          onDownloadPassport={() => downloadDocument(booking._id, 'passport')}
                          onWhatsApp={() => openWhatsApp(booking)}
                          onPrint={() => printBooking(booking)}
                          onDelete={() => deleteBooking(booking._id)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[var(--admin-border)] px-3 py-2">
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
            />
          </div>
        </div>

        {selectedBooking ? (
          <aside className="admin-panel h-max min-w-0 xl:sticky xl:top-[calc(var(--admin-header-h)+0.75rem)]">
            <div className="admin-panel-header">
              <div className="min-w-0">
                <p className="admin-panel-title">{t('admin.bookings.details')}</p>
                <p className="mt-0.5 break-all text-sm font-semibold text-[var(--admin-accent)]">{resId(selectedBooking)}</p>
                <ChannelBadge channel={selectedBooking.channel || 'online'} className="mt-1.5" />
              </div>
              <StatusBadge status={selectedBooking.status} />
            </div>

            <div className="admin-panel-body space-y-3">
              <div className="admin-action-rail">
                <button type="button" className="admin-btn admin-btn--primary" onClick={() => changeBookingStatus(selectedBooking._id, 'confirmed')}>
                  {t('admin.bookings.confirm')}
                </button>
                <button type="button" className="admin-btn admin-btn--secondary" onClick={() => changeBookingStatus(selectedBooking._id, 'active')}>
                  {t('admin.bookings.markActive')}
                </button>
                <button type="button" className="admin-btn admin-btn--secondary" onClick={() => changeBookingStatus(selectedBooking._id, 'completed')}>
                  {t('admin.bookings.complete')}
                </button>
                <button type="button" className="admin-btn admin-btn--secondary" onClick={() => startEdit(selectedBooking)}>
                  {t('admin.bookings.edit')}
                </button>
              </div>

              <DetailSection title={t('admin.details.customer')}>
                <DetailRow label={t('admin.bookings.customer')}>{selectedBooking.customerName || '—'}</DetailRow>
                <DetailRow label={t('admin.bookings.email')}>{selectedBooking.customerEmail || '—'}</DetailRow>
                <DetailRow label={t('admin.bookings.phone')}>{selectedBooking.customerPhone || '—'}</DetailRow>
              </DetailSection>

              <DetailSection title={t('admin.details.vehicle')}>
                <DetailRow label={t('admin.bookings.vehicle')}>
                  {selectedBooking.car?.brand} {selectedBooking.car?.model}
                </DetailRow>
                {selectedBooking.car?.licensePlate && (
                  <DetailRow label={t('admin.bookings.licensePlate')}>{selectedBooking.car.licensePlate}</DetailRow>
                )}
                {compatibleVehicles.length > 0 && (
                  <div className="pt-1">
                    <label className={labelClass}>{t('admin.bookings.assignVehicle')}</label>
                    <select
                      className={inputClass}
                      disabled={assigningVehicle}
                      value={selectedBooking.car?._id || ''}
                      onChange={(e) => assignVehicle(selectedBooking._id, e.target.value)}
                    >
                      {compatibleVehicles.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.licensePlate || c.fleetId || c._id.slice(-6)} — {c.brand} {c.model}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </DetailSection>

              <DetailSection title={t('admin.details.period')}>
                <DetailRow label={t('admin.details.pickup')}>{formatDateTime(selectedBooking.pickupDate)}</DetailRow>
                <DetailRow label={t('admin.details.return')}>{formatDateTime(selectedBooking.returnDate)}</DetailRow>
                <DetailRow label={t('admin.bookings.pickupLocation')}>{selectedBooking.pickupLocation || '—'}</DetailRow>
                <DetailRow label={t('admin.details.dropoff')}>{selectedBooking.returnLocation || '—'}</DetailRow>
              </DetailSection>

              <DetailSection title={t('admin.details.pricing')}>
                {selectedBooking.priceBreakdown ? (
                  <>
                    <DetailRow label={t('admin.bookings.rentalPrice')}>{currency}{selectedBooking.priceBreakdown.rentalPrice ?? 0}</DetailRow>
                    <DetailRow label={t('admin.bookings.pickupFee')}>
                      {(selectedBooking.priceBreakdown.pickupDeliveryFee || 0) <= 0
                        ? t('admin.bookings.free')
                        : `${currency}${selectedBooking.priceBreakdown.pickupDeliveryFee}`}
                    </DetailRow>
                    <DetailRow label={t('admin.bookings.dropoffFee')}>
                      {(selectedBooking.priceBreakdown.dropoffDeliveryFee || 0) <= 0
                        ? t('admin.bookings.free')
                        : `${currency}${selectedBooking.priceBreakdown.dropoffDeliveryFee}`}
                    </DetailRow>
                    {(selectedBooking.priceBreakdown.discounts || []).length > 0
                      ? (selectedBooking.priceBreakdown.discounts || []).map((d, idx) => (
                          <DetailRow
                            key={`disc-${idx}`}
                            label={
                              d.code === 'partner_discount'
                                ? d.label || t('admin.bookings.partnerDiscount')
                                : d.label || t('admin.bookings.discounts')
                            }
                          >
                            −{currency}
                            {d.amount}
                          </DetailRow>
                        ))
                      : (selectedBooking.priceBreakdown.discountTotal || 0) > 0 && (
                          <DetailRow label={t('admin.bookings.discounts')}>
                            −{currency}
                            {selectedBooking.priceBreakdown.discountTotal}
                          </DetailRow>
                        )}
                    <DetailRow label={t('admin.bookings.total')}>
                      <strong>{currency}{selectedBooking.price}</strong>
                    </DetailRow>
                  </>
                ) : (
                  <DetailRow label={t('admin.bookings.total')}>
                    <strong>{currency}{selectedBooking.price}</strong>
                  </DetailRow>
                )}
                <DetailRow label={t('admin.details.notes')}>{selectedBooking.notes || '—'}</DetailRow>
              </DetailSection>

              <DetailSection title={t('admin.details.payment')}>
                <label className={labelClass}>{t('admin.bookings.paymentStatus')}</label>
                <select
                  className={inputClass}
                  value={selectedBooking.paymentStatus || 'pending'}
                  onChange={(e) => changePaymentStatus(selectedBooking._id, e.target.value)}
                >
                  <option value="pending">{t('admin.status.pending')}</option>
                  <option value="paid">{t('admin.status.paid')}</option>
                  <option value="failed">{t('admin.status.failed')}</option>
                  <option value="refunded">{t('admin.status.refunded')}</option>
                </select>
              </DetailSection>

              <DetailSection title={t('admin.details.contract')}>
                {selectedBooking.completion && (
                  <div className="mb-2 space-y-1 text-xs text-[var(--admin-fg-secondary)]">
                    <p>{t('admin.bookings.docs')}: {selectedBooking.completion.documentsComplete ? '✓' : '—'}</p>
                    <p>{t('admin.bookings.pay')}: {selectedBooking.completion.paymentComplete ? '✓' : '—'}</p>
                    <p>{t('admin.bookings.sign')}: {selectedBooking.completion.signatureComplete ? '✓' : '—'}</p>
                    {selectedBooking.completion.signatureRequestStatus && (
                      <div className="pt-1">
                        <StatusBadge status={selectedBooking.completion.signatureRequestStatus} />
                      </div>
                    )}
                  </div>
                )}
                <div className="admin-action-rail">
                  {hasPermission('contracts') && selectedBooking.status !== 'cancelled' && (
                    <>
                      <button type="button" className="admin-btn admin-btn--secondary" onClick={() => generateInvoiceForBooking(selectedBooking)}>
                        {t('admin.bookings.generateInvoice')}
                      </button>
                      <Link to={`/owner/contracts?bookingId=${selectedBooking._id}`} className="admin-btn admin-btn--secondary">
                        {t('admin.bookings.generateContract')}
                      </Link>
                    </>
                  )}
                  {hasPermission('contract_extensions') && !['cancelled', 'completed'].includes(selectedBooking.status) && (
                      <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setExtendBooking(selectedBooking)}>
                        {t('admin.extend.title')}
                      </button>
                  )}
                  {hasPermission('signature_requests') && (
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary"
                      onClick={async () => {
                        try {
                          const { data } = await axios.post('/api/owner/signature-requests/generate', {
                            bookingId: selectedBooking._id,
                          })
                          if (!data.success) throw new Error(data.message)
                          if (data.completionUrl) {
                            cacheCompletionUrl(selectedBooking._id, data.completionUrl)
                            await navigator.clipboard.writeText(data.completionUrl)
                          }
                          toast.success(t('admin.leftover.sigGenerated'))
                        } catch (e) {
                          toast.error(getErrorMessage(e))
                        }
                      }}
                    >
                      {t('admin.leftover.generateSig')}
                    </button>
                  )}
                  {(selectedBooking.status === 'confirmed' || selectedBooking.status === 'pending') && (
                    <>
                      <button type="button" className="admin-btn admin-btn--secondary" onClick={() => resendCompletionLink(selectedBooking._id)}>
                        {t('admin.bookings.resendLink')}
                      </button>
                      <button
                        type="button"
                        disabled={openingWhatsApp}
                        className="admin-btn admin-btn--secondary"
                        onClick={() => confirmViaWhatsApp(selectedBooking)}
                      >
                        {openingWhatsApp ? '…' : t('admin.bookings.confirmViaWhatsApp')}
                      </button>
                    </>
                  )}
                </div>
              </DetailSection>

              <DetailSection title={t('admin.details.relations')}>
                <BookingRelationAssigners
                  booking={selectedBooking}
                  onUpdated={(b) => {
                    setSelectedBooking(b)
                    fetchOwnerBookings()
                  }}
                />
              </DetailSection>

              <DetailSection title={t('admin.details.documents')}>
                <div className="admin-action-rail mb-2">
                  <button type="button" className="admin-btn admin-btn--ghost" onClick={() => downloadDocument(selectedBooking._id, 'driving_license')}>
                    ↓ {t('admin.bookings.downloadLicense')}
                  </button>
                  <button type="button" className="admin-btn admin-btn--ghost" onClick={() => downloadDocument(selectedBooking._id, 'identity')}>
                    ↓ {t('admin.bookings.downloadId')}
                  </button>
                  <button type="button" className="admin-btn admin-btn--ghost" onClick={() => downloadDocument(selectedBooking._id, 'passport')}>
                    ↓ {t('admin.bookings.downloadPassport')}
                  </button>
                </div>
                <label className={labelClass}>{t('admin.bookings.uploadLicense')}</label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingDoc === 'driving_license'}
                  onChange={(e) => {
                    uploadDocument(selectedBooking._id, e.target.files?.[0], 'driving_license')
                    e.target.value = ''
                  }}
                  className="text-xs"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select className={inputClass} value={identityType} onChange={(e) => setIdentityType(e.target.value)}>
                    <option value="national_id">{t('admin.bookings.nationalId')}</option>
                    <option value="passport">{t('admin.bookings.passport')}</option>
                  </select>
                </div>
                <label className={`${labelClass} mt-2`}>{t('admin.bookings.uploadIdentity')}</label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingDoc === 'identity'}
                  onChange={(e) => {
                    uploadDocument(selectedBooking._id, e.target.files?.[0], 'identity')
                    e.target.value = ''
                  }}
                  className="text-xs"
                />
                <label className={`${labelClass} mt-2`}>{t('admin.bookings.downloadPassport')} (upload)</label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingDoc === 'passport'}
                  onChange={(e) => {
                    uploadDocument(selectedBooking._id, e.target.files?.[0], 'passport')
                    e.target.value = ''
                  }}
                  className="text-xs"
                />
              </DetailSection>

              <DetailSection title={t('admin.details.activity')}>
                <DetailRow label={t('admin.details.created')}>{formatDateTime(selectedBooking.createdAt)}</DetailRow>
                <DetailRow label={t('admin.details.updated')}>{formatDateTime(selectedBooking.updatedAt)}</DetailRow>
                <DetailRow label={t('admin.leftover.printChannel')}>{selectedBooking.channel || 'online'}</DetailRow>
                <div className="admin-action-rail pt-1">
                  <button type="button" className="admin-btn admin-btn--ghost" onClick={() => openWhatsApp(selectedBooking)}>
                    {t('admin.bookings.whatsapp')}
                  </button>
                  <button type="button" className="admin-btn admin-btn--ghost" onClick={() => printBooking(selectedBooking)}>
                    {t('admin.bookings.print')}
                  </button>
                </div>
              </DetailSection>

              <div className="admin-danger-zone admin-action-rail">
                <button type="button" className="admin-btn admin-btn--danger" onClick={() => requestCancel(selectedBooking._id)}>
                  {t('admin.bookings.cancel')}
                </button>
                <button type="button" className="admin-btn admin-btn--danger" onClick={() => deleteBooking(selectedBooking._id)}>
                  {t('admin.bookings.delete')}
                </button>
              </div>
            </div>
          </aside>
        ) : (
          <div className="admin-panel">
            <EmptyState icon="inbox" title={t('admin.bookings.selectHint')} />
          </div>
        )}
      </div>

      {extendBooking && (
        <ContractExtensionModal
          booking={extendBooking}
          onClose={closeExtend}
          onExtended={(result) => {
            if (result?.booking) {
              setSelectedBooking((prev) => (prev ? { ...prev, ...result.booking } : prev))
            }
            fetchOwnerBookings()
          }}
        />
      )}

      <ConfirmDialog
        isOpen={Boolean(confirmAction)}
        title={confirmAction?.title}
        message={confirmAction?.message}
        confirmText={confirmAction?.confirmText || 'Confirm'}
        variant={confirmAction?.variant || 'danger'}
        onCancel={() => setConfirmAction(null)}
        onConfirm={runConfirmAction}
      />

      <AdminModal
        open={Boolean(editing)}
        onClose={closeEdit}
        title={`${t('admin.bookings.edit')} ${t('admin.bookings.reservation')}`}
        description={editing?.reservationId}
        size="lg"
        variant="drawer"
        footer={
          <>
            <button type="button" className="admin-btn admin-btn--secondary" onClick={closeEdit}>
              {t('admin.common.cancel')}
            </button>
            <button type="submit" form="booking-edit-form" className="admin-btn admin-btn--primary">
              {t('admin.common.save')}
            </button>
          </>
        }
      >
        {editing && (
          <form id="booking-edit-form" onSubmit={saveEdit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>{t('admin.bookings.customerName')}</label>
              <input className={inputClass} value={editForm.customerName} onChange={(e) => patchEditForm({ customerName: e.target.value })} required />
            </div>
            <div>
              <label className={labelClass}>{t('admin.bookings.phone')}</label>
              <PhoneInput value={editForm.customerPhone} onChange={(customerPhone) => patchEditForm({ customerPhone })} required />
            </div>
            <div>
              <label className={labelClass}>{t('admin.bookings.email')}</label>
              <input type="email" className={inputClass} value={editForm.customerEmail} onChange={(e) => patchEditForm({ customerEmail: e.target.value })} required />
            </div>
            <div>
              <label className={labelClass}>{t('admin.bookings.status')}</label>
              <select className={inputClass} value={editForm.status} onChange={(e) => patchEditForm({ status: e.target.value })}>
                <option value="pending">{t('admin.status.pending')}</option>
                <option value="confirmed">{t('admin.status.confirmed')}</option>
                <option value="ready_for_pickup">{t('admin.status.ready_for_pickup')}</option>
                <option value="active">{t('admin.status.active')}</option>
                <option value="completed">{t('admin.status.completed')}</option>
                <option value="cancelled">{t('admin.status.cancelled')}</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>{t('admin.invoiceUi.pickupAt')}</label>
              <input type="datetime-local" className={inputClass} value={editForm.pickupDate} onChange={(e) => patchEditForm({ pickupDate: e.target.value })} required />
            </div>
            <div>
              <label className={labelClass}>{t('admin.invoiceUi.returnAt')}</label>
              <input type="datetime-local" className={inputClass} value={editForm.returnDate} onChange={(e) => patchEditForm({ returnDate: e.target.value })} required />
            </div>
            <div>
              <label className={labelClass}>{t('admin.bookings.pickupLocation')}</label>
              <input className={inputClass} value={editForm.pickupLocation} onChange={(e) => patchEditForm({ pickupLocation: e.target.value })} required />
            </div>
            <div>
              <label className={labelClass}>{t('admin.details.dropoff')}</label>
              <input className={inputClass} value={editForm.returnLocation} onChange={(e) => patchEditForm({ returnLocation: e.target.value })} required />
            </div>
            <div>
              <label className={labelClass}>{t('admin.bookings.paymentStatus')}</label>
              <select className={inputClass} value={editForm.paymentStatus} onChange={(e) => patchEditForm({ paymentStatus: e.target.value })}>
                <option value="pending">{t('admin.status.pending')}</option>
                <option value="paid">{t('admin.status.paid')}</option>
                <option value="failed">{t('admin.status.failed')}</option>
                <option value="refunded">{t('admin.status.refunded')}</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>{t('admin.bookings.assignVehicle')}</label>
              <select className={inputClass} value={editForm.carId} onChange={(e) => patchEditForm({ carId: e.target.value })}>
                {editVehicleOptions.length === 0 ? (
                  <option value="">{t('admin.bookingsUi.noCompatible')}</option>
                ) : (
                  editVehicleOptions.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.licensePlate || c.fleetId || c._id.slice(-6)} — {c.brand} {c.model}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>{t('admin.details.notes')}</label>
              <textarea className={inputClass} rows="3" value={editForm.notes} onChange={(e) => patchEditForm({ notes: e.target.value })} />
            </div>
          </form>
        )}
      </AdminModal>
    </AdminPage>
  )
}

export default ManageBookings

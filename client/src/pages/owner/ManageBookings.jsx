import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Pagination from '../../components/owner/Pagination'
import {
  BookingInspector,
  BookingFilters,
  BookingOperationsTable,
  BookingCardList,
  formatDateTime,
  applyOpsScope,
} from '../../components/owner/booking'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import toast from 'react-hot-toast'
import { escapeHtml, getErrorMessage } from '../../utils/apiError'
import PhoneInput from '../../components/PhoneInput'
import { isPhoneValid } from '../../utils/phoneValidation'
import { Link } from 'react-router-dom'
import { buildCustomerConfirmationWaUrl, buildWaMeUrl, getAgencyWhatsAppDial } from '../../utils/whatsapp'
import { downloadPdfFromApi } from '../../utils/downloadPdf'
import { downloadXlsxFromApi } from '../../utils/downloadXlsx'
import ContractExtensionModal from '../../components/owner/ContractExtensionModal'
import BulkSelectionBar from '../../components/owner/BulkSelectionBar'
import {
  AdminPage,
  PageHeader,
  EmptyState,
  SkeletonRows,
  AdminModal,
  ConfirmDialog,
  AdminForm,
  AdminFormSection,
  AdminFormField,
  AdminFormInput,
  AdminFormTextarea,
  AdminFormSelect,
  AdminFormGrid,
} from '../../components/owner/ui'

const emptyFilters = {
  search: '',
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
  returnDateFrom: '',
  returnDateTo: '',
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

const ManageBookings = () => {
  const { currency, axios, hasPermission, user } = useAppContext()
  const whatsappSettings = user?.whatsappSettings
  const { t } = useI18n()

  const [bookings, setBookings] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 })
  const [filters, setFilters] = useState(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState(emptyEdit)
  const closeEdit = useCallback(() => setEditing(null), [])
  const patchEditForm = useCallback((patch) => {
    setEditForm((prev) => ({ ...prev, ...patch }))
  }, [])
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [fleetCars, setFleetCars] = useState([])
  const [assigningVehicle, setAssigningVehicle] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState('')
  const [identityType, setIdentityType] = useState('national_id')
  const [completionLinkCache, setCompletionLinkCache] = useState({})
  const [openingWhatsApp, setOpeningWhatsApp] = useState(false)
  const [exporting, setExporting] = useState(false)
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
    setSelectedIds(new Set())
  }, [queryString])

  const visibleIds = useMemo(() => bookings.map((b) => b._id), [bookings])
  const selectedCount = selectedIds.size
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))
  const someVisibleSelected =
    visibleIds.some((id) => selectedIds.has(id)) && !allVisibleSelected

  const toggleSelect = useCallback((bookingId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(bookingId)) next.delete(bookingId)
      else next.add(bookingId)
      return next
    })
  }, [])

  const toggleSelectAllVisible = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      const allSelected = visibleIds.length > 0 && visibleIds.every((id) => next.has(id))
      if (allSelected) {
        visibleIds.forEach((id) => next.delete(id))
      } else {
        visibleIds.forEach((id) => next.add(id))
      }
      return next
    })
  }, [visibleIds])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

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

  const applyScope = (scopeId) => {
    const next = applyOpsScope(filters, scopeId)
    setFilters(next)
    setAppliedFilters(next)
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
    const result = buildCustomerConfirmationWaUrl(booking, completionUrl, { currency })
    if (result.error === 'missing_phone') {
      throw new Error(t('admin.bookings.missingCustomerPhone'))
    }
    window.open(result.url, '_blank', 'noopener,noreferrer')
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
      title: t('admin.bookings.deleteTitle'),
      message: t('admin.bookings.deleteConfirm'),
      confirmText: t('admin.bookings.delete'),
      variant: 'danger',
    })
  }

  const deleteSelectedBookings = () => {
    if (selectedCount < 1) return
    setConfirmAction({
      type: 'bulk-delete',
      bookingIds: [...selectedIds],
      title: t('admin.bookings.bulkDeleteTitle'),
      message: t('admin.bookings.bulkDeleteConfirm', { count: selectedCount }),
      confirmText: t('admin.bookings.deleteSelected', { count: selectedCount }),
      variant: 'danger',
    })
  }

  const runConfirmAction = async () => {
    if (!confirmAction || confirmBusy) return
    const { type, bookingId, bookingIds, status } = confirmAction
    setConfirmBusy(true)
    try {
      if (type === 'delete') {
        const { data } = await axios.post('/api/bookings/delete', { bookingId })
        if (data.success) {
          toast.success(data.message)
          if (selectedBooking?._id === bookingId) setSelectedBooking(null)
          setSelectedIds((prev) => {
            const next = new Set(prev)
            next.delete(bookingId)
            return next
          })
          setConfirmAction(null)
          fetchOwnerBookings()
        } else toast.error(data.message)
      } else if (type === 'bulk-delete') {
        const { data } = await axios.post('/api/bookings/delete-bulk', { bookingIds })
        if (data.success) {
          toast.success(data.message || t('admin.bookings.bulkDeleteSuccess', { count: data.deletedCount || bookingIds.length }))
          if (selectedBooking && bookingIds.map(String).includes(String(selectedBooking._id))) {
            setSelectedBooking(null)
          }
          clearSelection()
          setConfirmAction(null)
          fetchOwnerBookings()
        } else toast.error(data.message)
      } else if (type === 'status') {
        setConfirmAction(null)
        await changeBookingStatus(bookingId, status)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setConfirmBusy(false)
    }
  }

  const requestCancel = (bookingId) => {
    setConfirmAction({
      type: 'status',
      bookingId,
      status: 'cancelled',
      title: t('admin.bookings.cancelTitle'),
      message: t('admin.bookings.cancelConfirm'),
      confirmText: t('admin.bookings.cancel'),
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

  const exportExcel = async () => {
    setExporting(true)
    try {
      const params = {}
      Object.entries(appliedFilters).forEach(([key, value]) => {
        if (value) params[key] = value
      })
      await downloadXlsxFromApi(axios, '/api/bookings/owner/export', {
        params,
        fallbackName: 'reservations.xlsx',
      })
      toast.success(t('admin.exportUi.success'))
    } catch (error) {
      toast.error(getErrorMessage(error) || t('admin.exportUi.failed'))
    } finally {
      setExporting(false)
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

  const closeMobileDetail = useCallback(() => setSelectedBooking(null), [])

  useEffect(() => {
    if (!selectedBooking) return undefined
    const mq = window.matchMedia('(max-width: 1023px)')
    const apply = () => {
      if (mq.matches) document.body.classList.add('nav-open')
      else document.body.classList.remove('nav-open')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => {
      mq.removeEventListener('change', apply)
      document.body.classList.remove('nav-open')
    }
  }, [selectedBooking])

  const buildMoreItems = useCallback(
    (booking) => [
      { key: 'edit', label: t('admin.bookings.edit'), onClick: () => startEdit(booking) },
      { key: 'sep-docs', separator: true, label: t('admin.bookings.docs') },
      { key: 'license', label: t('admin.bookings.downloadLicense'), onClick: () => downloadDocument(booking._id, 'driving_license') },
      { key: 'id', label: t('admin.bookings.downloadId'), onClick: () => downloadDocument(booking._id, 'identity') },
      { key: 'passport', label: t('admin.bookings.downloadPassport'), onClick: () => downloadDocument(booking._id, 'passport') },
      { key: 'sep-comm', separator: true },
      { key: 'print', label: t('admin.bookings.print'), onClick: () => printBooking(booking) },
      { key: 'whatsapp', label: t('admin.bookings.whatsapp'), tone: 'whatsapp', onClick: () => openWhatsApp(booking) },
      { key: 'sep-ops', separator: true },
      { key: 'confirm', label: t('admin.bookings.confirm'), onClick: () => changeBookingStatus(booking._id, 'confirmed'), hidden: booking.status === 'confirmed' },
      { key: 'complete', label: t('admin.bookings.complete'), onClick: () => changeBookingStatus(booking._id, 'completed'), hidden: booking.status === 'completed' },
      { key: 'cancel', label: t('admin.bookings.cancel'), tone: 'danger', onClick: () => requestCancel(booking._id), hidden: booking.status === 'cancelled' },
      { key: 'delete', label: t('admin.bookings.delete'), tone: 'danger', onClick: () => deleteBooking(booking._id) },
    ],
    [t],
  )

  const inspectorProps = selectedBooking
    ? {
        booking: selectedBooking,
        currency,
        compatibleVehicles,
        assigningVehicle,
        identityType,
        onIdentityTypeChange: setIdentityType,
        uploadingDoc,
        openingWhatsApp,
        completionUrl: resolveCompletionUrl(selectedBooking),
        onCacheUrl: cacheCompletionUrl,
        onRefresh: (updated) => {
          if (updated) setSelectedBooking(updated)
          fetchOwnerBookings()
        },
        onEdit: () => startEdit(selectedBooking),
        onExtend: () => setExtendBooking(selectedBooking),
        onChangeStatus: (status) => changeBookingStatus(selectedBooking._id, status),
        onChangePayment: (paymentStatus) => changePaymentStatus(selectedBooking._id, paymentStatus),
        onAssignVehicle: (carId) => assignVehicle(selectedBooking._id, carId),
        onDownloadDoc: (docType) => downloadDocument(selectedBooking._id, docType),
        onUploadDoc: (file, docType) => uploadDocument(selectedBooking._id, file, docType),
        onResendLink: () => resendCompletionLink(selectedBooking._id),
        onConfirmWhatsApp: () => confirmViaWhatsApp(selectedBooking),
        onGenerateInvoice: () => generateInvoiceForBooking(selectedBooking),
        onWhatsApp: () => openWhatsApp(selectedBooking),
        onPrint: () => printBooking(selectedBooking),
        onCancel: () => requestCancel(selectedBooking._id),
        onDelete: () => deleteBooking(selectedBooking._id),
        buildMoreItems,
      }
    : null

  const listEmpty = (
    <EmptyState
      icon="calendar"
      title={t('admin.bookings.none')}
      description={t('admin.leftover.adjustFilters')}
      action={<Link to="/owner/walk-in" className="admin-btn admin-btn--primary">{t('admin.walkIn.menu')}</Link>}
    />
  )

  return (
    <AdminPage>
      <PageHeader
        title={t('admin.bookings.title')}
        description={t('admin.bookings.subtitleOps')}
        actions={
          <>
            <Link to="/owner/walk-in" className="admin-btn admin-btn--secondary">
              {t('admin.walkIn.menu')}
            </Link>
            <button type="button" disabled={exporting} onClick={exportExcel} className="admin-btn admin-btn--primary">
              {exporting ? t('admin.exportUi.exporting') : t('admin.exportUi.excel')}
            </button>
          </>
        }
      />

      <BookingFilters
        filters={filters}
        onChange={setFilters}
        onApply={applyFilters}
        onClear={clearFilters}
        onApplyScope={applyScope}
        showAdvanced={showFilters}
        onToggleAdvanced={() => setShowFilters((v) => !v)}
        total={pagination.total}
        inputClass={inputClass}
        labelClass={labelClass}
      />

      {selectedCount > 0 && (
        <BulkSelectionBar
          count={selectedCount}
          onClear={clearSelection}
          onDelete={deleteSelectedBookings}
          busy={confirmBusy}
          ariaLabel={t('admin.bookings.bulkSelectionAria')}
          selectedCountLabel={t('admin.bookings.selectedCount', { count: selectedCount })}
          clearLabel={t('admin.bookings.clearSelection')}
          deleteLabel={t('admin.bookings.deleteSelected', { count: selectedCount })}
        />
      )}

      <div className="admin-booking-workspace">
        <div className="admin-booking-list-panel">
          {loading && bookings.length === 0 ? (
            <div className="admin-booking-list-loading">
              <SkeletonRows rows={7} />
            </div>
          ) : bookings.length === 0 ? (
            <div className="admin-booking-list-empty">{listEmpty}</div>
          ) : (
            <>
              <BookingCardList
                bookings={bookings}
                selectedId={selectedBooking?._id}
                selectedIds={selectedIds}
                currency={currency}
                t={t}
                onSelect={setSelectedBooking}
                onToggleSelect={toggleSelect}
                buildMoreItems={buildMoreItems}
              />
              <div className="admin-booking-ops-table-wrap">
                <BookingOperationsTable
                  bookings={bookings}
                  loading={loading}
                  selectedId={selectedBooking?._id}
                  selectedIds={selectedIds}
                  allVisibleSelected={allVisibleSelected}
                  someVisibleSelected={someVisibleSelected}
                  currency={currency}
                  t={t}
                  onSelect={setSelectedBooking}
                  onToggleSelect={toggleSelect}
                  onToggleSelectAll={toggleSelectAllVisible}
                  buildMoreItems={buildMoreItems}
                  skeleton={<SkeletonRows rows={6} />}
                  emptyState={listEmpty}
                />
              </div>
            </>
          )}
          <div className="admin-booking-pagination">
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
            />
          </div>
        </div>

        <div className="admin-booking-inspector-panel">
          {inspectorProps ? (
            <BookingInspector {...inspectorProps} variant="desktop" />
          ) : (
            <div className="admin-booking-inspector-empty">
              <EmptyState
                icon="inbox"
                title={t('admin.bookings.selectHint')}
                description={t('admin.bookings.selectHintDesc')}
              />
            </div>
          )}
        </div>
      </div>

      {selectedBooking && inspectorProps && (
        <div className="admin-booking-mobile-detail" role="dialog" aria-modal="true">
          <BookingInspector {...inspectorProps} variant="mobile" onClose={closeMobileDetail} />
        </div>
      )}

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
        loading={confirmBusy}
        onCancel={() => {
          if (confirmBusy) return
          setConfirmAction(null)
        }}
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
            <button type="button" className="admin-btn admin-btn--secondary admin-modal-action" onClick={closeEdit}>
              {t('admin.common.cancel')}
            </button>
            <button type="submit" form="booking-edit-form" className="admin-btn admin-btn--primary admin-modal-action">
              {t('admin.common.save')}
            </button>
          </>
        }
      >
        {editing && (
          <AdminForm id="booking-edit-form" onSubmit={saveEdit}>
            <AdminFormSection title={t('admin.details.customer')}>
              <AdminFormGrid columns={2}>
                <AdminFormField label={t('admin.bookings.customerName')} required>
                  <AdminFormInput value={editForm.customerName} onChange={(e) => patchEditForm({ customerName: e.target.value })} required autoComplete="name" />
                </AdminFormField>
                <AdminFormField label={t('admin.bookings.phone')} required>
                  <PhoneInput value={editForm.customerPhone} onChange={(customerPhone) => patchEditForm({ customerPhone })} required />
                </AdminFormField>
                <AdminFormField label={t('admin.bookings.email')} required>
                  <AdminFormInput type="email" inputMode="email" autoComplete="email" value={editForm.customerEmail} onChange={(e) => patchEditForm({ customerEmail: e.target.value })} required />
                </AdminFormField>
                <AdminFormField label={t('admin.bookings.status')}>
                  <AdminFormSelect value={editForm.status} onChange={(e) => patchEditForm({ status: e.target.value })}>
                    <option value="pending">{t('admin.status.pending')}</option>
                    <option value="confirmed">{t('admin.status.confirmed')}</option>
                    <option value="ready_for_pickup">{t('admin.status.ready_for_pickup')}</option>
                    <option value="active">{t('admin.status.active')}</option>
                    <option value="completed">{t('admin.status.completed')}</option>
                    <option value="cancelled">{t('admin.status.cancelled')}</option>
                  </AdminFormSelect>
                </AdminFormField>
              </AdminFormGrid>
            </AdminFormSection>
            <AdminFormSection title={t('admin.bookings.reservation')}>
              <AdminFormGrid columns={2}>
                <AdminFormField label={t('admin.invoiceUi.pickupAt')} required>
                  <AdminFormInput type="datetime-local" value={editForm.pickupDate} onChange={(e) => patchEditForm({ pickupDate: e.target.value })} required />
                </AdminFormField>
                <AdminFormField label={t('admin.invoiceUi.returnAt')} required>
                  <AdminFormInput type="datetime-local" value={editForm.returnDate} onChange={(e) => patchEditForm({ returnDate: e.target.value })} required />
                </AdminFormField>
                <AdminFormField label={t('admin.bookings.pickupLocation')} required>
                  <AdminFormInput value={editForm.pickupLocation} onChange={(e) => patchEditForm({ pickupLocation: e.target.value })} required />
                </AdminFormField>
                <AdminFormField label={t('admin.details.dropoff')} required>
                  <AdminFormInput value={editForm.returnLocation} onChange={(e) => patchEditForm({ returnLocation: e.target.value })} required />
                </AdminFormField>
                <AdminFormField label={t('admin.bookings.paymentStatus')}>
                  <AdminFormSelect value={editForm.paymentStatus} onChange={(e) => patchEditForm({ paymentStatus: e.target.value })}>
                    <option value="pending">{t('admin.status.pending')}</option>
                    <option value="paid">{t('admin.status.paid')}</option>
                    <option value="failed">{t('admin.status.failed')}</option>
                    <option value="refunded">{t('admin.status.refunded')}</option>
                  </AdminFormSelect>
                </AdminFormField>
              </AdminFormGrid>
              <AdminFormField label={t('admin.bookings.assignVehicle')}>
                <AdminFormSelect value={editForm.carId} onChange={(e) => patchEditForm({ carId: e.target.value })}>
                  {editVehicleOptions.length === 0 ? (
                    <option value="">{t('admin.bookingsUi.noCompatible')}</option>
                  ) : (
                    editVehicleOptions.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.licensePlate || c.fleetId || c._id.slice(-6)} — {c.brand} {c.model}
                      </option>
                    ))
                  )}
                </AdminFormSelect>
              </AdminFormField>
              <AdminFormField label={t('admin.details.notes')}>
                <AdminFormTextarea rows={3} value={editForm.notes} onChange={(e) => patchEditForm({ notes: e.target.value })} />
              </AdminFormField>
            </AdminFormSection>
          </AdminForm>
        )}
      </AdminModal>
    </AdminPage>
  )
}

export default ManageBookings

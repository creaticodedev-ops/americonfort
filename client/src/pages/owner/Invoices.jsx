import React, { useEffect, useMemo, useState } from 'react'
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

const createEmptyItem = () => ({ description: '', quantity: 1, unitPrice: '', taxRate: 0 })
const createEmptyForm = () => ({
  invoiceNumber: '',
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: '',
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  customerAddress: '',
  customerTaxId: '',
  vehicleBrand: '',
  vehicleModel: '',
  vehicleYear: '',
  vehiclePlate: '',
  vehicleType: '',
  items: [createEmptyItem()],
  discountAmount: '0',
  notes: '',
  paymentStatus: 'pending',
  paymentMethod: 'cash',
  paymentReference: '',
  currency: 'MAD',
  includeCompanyStamp: true,
})

const Invoices = () => {
  const { axios, currency } = useAppContext()
  const { t } = useI18n()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 })
  const [filters, setFilters] = useState({ search: '', customerName: '', cin: '', phone: '' })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(createEmptyForm())

  const fetchInvoices = async (override = {}) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(override.page ?? pagination.page),
        limit: String(override.limit ?? pagination.limit),
      })
      const search = (override.search ?? filters.search ?? '').trim()
      const customerName = (override.customerName ?? filters.customerName ?? '').trim()
      const cin = (override.cin ?? filters.cin ?? '').trim()
      const phone = (override.phone ?? filters.phone ?? '').trim()

      if (search) params.set('search', search)
      if (customerName) params.set('customerName', customerName)
      if (cin) params.set('cin', cin)
      if (phone) params.set('phone', phone)

      const { data } = await axios.get(`/api/invoices?${params}`)
      if (data.success) {
        setInvoices(data.invoices || [])
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
    fetchInvoices({ page: 1 })
  }, [axios])

  useEffect(() => {
    fetchInvoices({ page: pagination.page })
  }, [pagination.page, pagination.limit])

  const handleSubmit = (e) => {
    e.preventDefault()
    fetchInvoices({ page: 1 })
  }

  const handleReset = () => {
    const next = { search: '', customerName: '', cin: '', phone: '' }
    setFilters(next)
    fetchInvoices({ page: 1, ...next })
  }

  const handleDownload = async (invoice) => {
    try {
      const { data } = await axios.get(`/api/invoices/${invoice._id}/pdf`)
      if (data.success && data.pdfUrl) {
        window.open(data.pdfUrl, '_blank', 'noopener,noreferrer')
      } else {
        toast.error(data.message || 'PDF not available')
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const totals = useMemo(() => ({
    count: invoices.length,
    totalAmount: invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount ?? (invoice.booking?.price || 0)), 0),
  }), [invoices])

  const lineTotals = useMemo(() => {
    const subtotal = form.items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0)
    const taxAmount = form.items.reduce((sum, item) => sum + ((Number(item.quantity || 0) * Number(item.unitPrice || 0)) * (Number(item.taxRate || 0) / 100)), 0)
    const discountAmount = Number(form.discountAmount || 0)
    return {
      subtotal,
      taxAmount,
      totalAmount: Math.max(0, subtotal + taxAmount - discountAmount),
    }
  }, [form.items, form.discountAmount])

  const updateForm = (changes) => setForm((prev) => ({ ...prev, ...changes }))

  const updateItem = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }))
  }

  const addItem = () => setForm((prev) => ({ ...prev, items: [...prev.items, createEmptyItem()] }))

  const removeItem = (index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const handleCreateInvoice = async (e) => {
    e.preventDefault()
    if (!form.customerName.trim()) {
      toast.error(t('admin.invoices.customerRequired'))
      return
    }

    const items = form.items.filter((item) => item.description || item.quantity || item.unitPrice)
    if (!items.length) {
      toast.error(t('admin.invoices.itemRequired'))
      return
    }

    setCreating(true)
    try {
      const { data } = await axios.post('/api/invoices/manual', {
        invoiceNumber: form.invoiceNumber || '',
        invoiceDate: form.invoiceDate || new Date().toISOString().slice(0, 10),
        dueDate: form.dueDate || '',
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        customerPhone: form.customerPhone,
        customerAddress: form.customerAddress,
        customerTaxId: form.customerTaxId,
        vehicleBrand: form.vehicleBrand,
        vehicleModel: form.vehicleModel,
        vehicleYear: form.vehicleYear,
        vehiclePlate: form.vehiclePlate,
        vehicleType: form.vehicleType,
        items,
        discountAmount: Number(form.discountAmount || 0),
        notes: form.notes,
        paymentStatus: form.paymentStatus,
        paymentMethod: form.paymentMethod,
        paymentReference: form.paymentReference,
        currency: form.currency,
        includeCompanyStamp: form.includeCompanyStamp,
      })
      if (data.success) {
        toast.success(data.message)
        setShowCreateModal(false)
        setForm(createEmptyForm())
        await fetchInvoices({ page: 1 })
        if (data.invoice?.pdfUrl) {
          window.open(data.invoice.pdfUrl, '_blank', 'noopener,noreferrer')
        }
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="px-4 pt-8 md:px-8 lg:px-10 xl:px-12 md:pt-10 flex-1 pb-12 min-w-0 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <Title title={t('admin.invoices.title')} subTitle={t('admin.invoices.subtitle')} />
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-borderColor bg-white px-4 py-3 text-sm text-gray-600">
            <div>{t('admin.invoices.totalCount', { count: totals.count })}</div>
            <div>{t('admin.invoices.totalAmount', { amount: `${currency}${totals.totalAmount.toFixed(2)}` })}</div>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dull"
          >
            {t('admin.invoices.create')}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-borderColor bg-white p-4 space-y-4">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
          <input
            className="border border-borderColor px-3 py-2 rounded-lg w-full text-sm"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            placeholder={t('admin.invoices.searchPlaceholder')}
          />
          <input
            className="border border-borderColor px-3 py-2 rounded-lg w-full text-sm"
            value={filters.customerName}
            onChange={(e) => setFilters((prev) => ({ ...prev, customerName: e.target.value }))}
            placeholder={t('admin.invoices.customerNamePlaceholder')}
          />
          <input
            className="border border-borderColor px-3 py-2 rounded-lg w-full text-sm"
            value={filters.cin}
            onChange={(e) => setFilters((prev) => ({ ...prev, cin: e.target.value }))}
            placeholder={t('admin.invoices.cinPlaceholder')}
          />
          <input
            className="border border-borderColor px-3 py-2 rounded-lg w-full text-sm"
            value={filters.phone}
            onChange={(e) => setFilters((prev) => ({ ...prev, phone: e.target.value }))}
            placeholder={t('admin.invoices.phonePlaceholder')}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="px-4 py-2 rounded-xl bg-primary text-white text-sm">{t('admin.bookings.applyFilters')}</button>
          <button type="button" onClick={handleReset} className="px-4 py-2 rounded-xl border border-borderColor text-sm">{t('admin.bookings.clear')}</button>
        </div>
      </form>

      <div className="rounded-2xl border border-borderColor bg-white overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">{t('admin.invoices.loading')}</p>
        ) : invoices.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">{t('admin.invoices.none')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-light text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3">{t('admin.invoices.number')}</th>
                  <th className="px-4 py-3">{t('admin.invoices.reservation')}</th>
                  <th className="px-4 py-3">{t('admin.invoices.customer')}</th>
                  <th className="px-4 py-3">{t('admin.invoices.total')}</th>
                  <th className="px-4 py-3">{t('admin.invoices.created')}</th>
                  <th className="px-4 py-3">{t('admin.invoices.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  const booking = invoice.booking || {}
                  return (
                    <tr key={invoice._id} className="border-t border-borderColor">
                      <td className="px-4 py-3 font-medium">{invoice.invoiceNumber}</td>
                      <td className="px-4 py-3">{invoice.source === 'manual' ? t('admin.invoices.manual') : (booking.reservationId || '—')}</td>
                      <td className="px-4 py-3">
                        <p>{invoice.customerName || booking.customerName || '—'}</p>
                        <p className="text-xs text-gray-500">{invoice.customerPhone || booking.customerPhone || ''}</p>
                      </td>
                      <td className="px-4 py-3">{invoice.totalAmount != null ? `${invoice.currency || currency}${Number(invoice.totalAmount).toFixed(2)}` : (booking.price != null ? `${currency}${booking.price}` : '—')}</td>
                      <td className="px-4 py-3">{formatDateTime(invoice.createdAt)}</td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => handleDownload(invoice)} className="text-primary text-xs font-medium">
                          {t('admin.invoices.download')}
                        </button>
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
          <span className="text-gray-600">{pagination.page} / {pagination.totalPages}</span>
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

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-borderColor bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{t('admin.invoices.createManual')}</h3>
                <p className="text-sm text-gray-500">{t('admin.invoices.createManualHint')}</p>
              </div>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-sm text-gray-500">✕</button>
            </div>

            <form onSubmit={handleCreateInvoice} className="mt-5 space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">{t('admin.invoices.invoiceNumber')}</label>
                  <input className="w-full rounded-lg border border-borderColor px-3 py-2 text-sm" value={form.invoiceNumber} onChange={(e) => updateForm({ invoiceNumber: e.target.value })} placeholder="INV-001" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">{t('admin.invoices.invoiceDate')}</label>
                  <input type="date" className="w-full rounded-lg border border-borderColor px-3 py-2 text-sm" value={form.invoiceDate} onChange={(e) => updateForm({ invoiceDate: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">{t('admin.invoices.dueDate')}</label>
                  <input type="date" className="w-full rounded-lg border border-borderColor px-3 py-2 text-sm" value={form.dueDate} onChange={(e) => updateForm({ dueDate: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">{t('admin.invoices.customerName')}</label>
                  <input className="w-full rounded-lg border border-borderColor px-3 py-2 text-sm" value={form.customerName} onChange={(e) => updateForm({ customerName: e.target.value })} required />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">{t('admin.invoices.customerEmail')}</label>
                  <input type="email" className="w-full rounded-lg border border-borderColor px-3 py-2 text-sm" value={form.customerEmail} onChange={(e) => updateForm({ customerEmail: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">{t('admin.invoices.customerPhone')}</label>
                  <input className="w-full rounded-lg border border-borderColor px-3 py-2 text-sm" value={form.customerPhone} onChange={(e) => updateForm({ customerPhone: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">{t('admin.invoices.customerAddress')}</label>
                  <input className="w-full rounded-lg border border-borderColor px-3 py-2 text-sm" value={form.customerAddress} onChange={(e) => updateForm({ customerAddress: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">{t('admin.invoices.customerTaxId')}</label>
                  <input className="w-full rounded-lg border border-borderColor px-3 py-2 text-sm" value={form.customerTaxId} onChange={(e) => updateForm({ customerTaxId: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">{t('admin.invoices.currency')}</label>
                  <input className="w-full rounded-lg border border-borderColor px-3 py-2 text-sm" value={form.currency} onChange={(e) => updateForm({ currency: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">{t('admin.invoices.vehicleBrand')}</label>
                  <input className="w-full rounded-lg border border-borderColor px-3 py-2 text-sm" value={form.vehicleBrand} onChange={(e) => updateForm({ vehicleBrand: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">{t('admin.invoices.vehicleModel')}</label>
                  <input className="w-full rounded-lg border border-borderColor px-3 py-2 text-sm" value={form.vehicleModel} onChange={(e) => updateForm({ vehicleModel: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">{t('admin.invoices.vehiclePlate')}</label>
                  <input className="w-full rounded-lg border border-borderColor px-3 py-2 text-sm" value={form.vehiclePlate} onChange={(e) => updateForm({ vehiclePlate: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">{t('admin.invoices.vehicleYear')}</label>
                  <input className="w-full rounded-lg border border-borderColor px-3 py-2 text-sm" value={form.vehicleYear} onChange={(e) => updateForm({ vehicleYear: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">{t('admin.invoices.vehicleType')}</label>
                  <input className="w-full rounded-lg border border-borderColor px-3 py-2 text-sm" value={form.vehicleType} onChange={(e) => updateForm({ vehicleType: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">{t('admin.invoices.paymentStatus')}</label>
                  <select className="w-full rounded-lg border border-borderColor px-3 py-2 text-sm" value={form.paymentStatus} onChange={(e) => updateForm({ paymentStatus: e.target.value })}>
                    <option value="pending">{t('admin.invoices.pending')}</option>
                    <option value="paid">{t('admin.invoices.paid')}</option>
                    <option value="partial">{t('admin.invoices.partial')}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">{t('admin.invoices.paymentMethod')}</label>
                  <select className="w-full rounded-lg border border-borderColor px-3 py-2 text-sm" value={form.paymentMethod} onChange={(e) => updateForm({ paymentMethod: e.target.value })}>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="card">Card</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">{t('admin.invoices.paymentReference')}</label>
                  <input className="w-full rounded-lg border border-borderColor px-3 py-2 text-sm" value={form.paymentReference} onChange={(e) => updateForm({ paymentReference: e.target.value })} />
                </div>
              </div>

              <div className="rounded-xl border border-borderColor bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-gray-700">{t('admin.invoices.items')}</h4>
                  <button type="button" onClick={addItem} className="rounded-lg border border-borderColor bg-white px-3 py-1.5 text-sm">{t('admin.invoices.addItem')}</button>
                </div>
                <div className="mt-3 space-y-3">
                  {form.items.map((item, index) => (
                    <div key={`${item.description}-${index}`} className="grid gap-2 rounded-lg border border-borderColor bg-white p-3 md:grid-cols-[2fr_0.8fr_1fr_0.7fr_auto]">
                      <input className="rounded-lg border border-borderColor px-3 py-2 text-sm" value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} placeholder={t('admin.invoices.itemDescription')} />
                      <input type="number" min="1" className="rounded-lg border border-borderColor px-3 py-2 text-sm" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} />
                      <input type="number" min="0" step="0.01" className="rounded-lg border border-borderColor px-3 py-2 text-sm" value={item.unitPrice} onChange={(e) => updateItem(index, 'unitPrice', e.target.value)} />
                      <input type="number" min="0" max="100" step="0.01" className="rounded-lg border border-borderColor px-3 py-2 text-sm" value={item.taxRate} onChange={(e) => updateItem(index, 'taxRate', e.target.value)} />
                      <button type="button" onClick={() => removeItem(index)} className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600">×</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 rounded-xl border border-borderColor bg-gray-50 p-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">{t('admin.invoices.discount')}</label>
                  <input type="number" min="0" step="0.01" className="w-full rounded-lg border border-borderColor px-3 py-2 text-sm" value={form.discountAmount} onChange={(e) => updateForm({ discountAmount: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">{t('admin.invoices.notes')}</label>
                  <textarea rows="4" className="w-full rounded-lg border border-borderColor px-3 py-2 text-sm" value={form.notes} onChange={(e) => updateForm({ notes: e.target.value })} />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-borderColor bg-white p-4">
                <div className="text-sm text-gray-600">
                  <div>{t('admin.invoices.subtotal')}: {currency}{Number(lineTotals.subtotal).toFixed(2)}</div>
                  <div>{t('admin.invoices.tax')}: {currency}{Number(lineTotals.taxAmount).toFixed(2)}</div>
                  <div className="font-semibold">{t('admin.invoices.total')}: {currency}{Number(lineTotals.totalAmount).toFixed(2)}</div>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" checked={form.includeCompanyStamp} onChange={(e) => updateForm({ includeCompanyStamp: e.target.checked })} />
                  {t('admin.invoices.includeStamp')}
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="rounded-lg border border-borderColor px-4 py-2 text-sm">{t('admin.common.cancel')}</button>
                <button type="submit" disabled={creating} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
                  {creating ? t('admin.invoices.saving') : t('admin.invoices.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Invoices

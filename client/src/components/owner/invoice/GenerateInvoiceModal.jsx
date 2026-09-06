import React, { useEffect, useMemo, useState } from 'react'
import { AdminModal } from '../ui'
import { DateField } from '../../date/DateField'
import { DateTimeField } from '../../date/DateTimeField'
import { useI18n } from '../../../i18n/I18nContext'
import toast from 'react-hot-toast'
import { getErrorMessage } from '../../../utils/apiError'
import { downloadPdfFromApi } from '../../../utils/downloadPdf'
import {
  invoiceNumberValidationMessage,
  normalizeInvoiceNumber,
} from '../../../utils/invoiceNumber'
import { invoiceAmountInWordsSentence } from '../../../utils/amountInWordsFr'

const pad = (n) => String(n).padStart(2, '0')

const toDateInput = (value) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const toDateTimeLocal = (value) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const emptyForm = () => ({
  invoiceNumber: '',
  invoiceDate: toDateInput(new Date()),
  dueDate: '',
  reservationId: '',
  contractNumber: '',
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  customerAddress: '',
  customerTaxId: '',
  currency: 'MAD',
  vehicleBrand: '',
  vehicleModel: '',
  vehiclePlate: '',
  vehicleYear: '',
  vehicleType: '',
  pickupDate: '',
  returnDate: '',
  rentalDays: '',
  totalAmount: '0',
  amountPaid: '0',
  paymentStatus: 'pending',
  notes: '',
  includeCompanyStamp: true,
  items: [{ description: '', quantity: 1, unitPrice: 0, taxRate: 0 }],
})

const draftToForm = (draft, suggested) => ({
  ...emptyForm(),
  invoiceNumber: draft?.invoiceNumber || suggested || '',
  invoiceDate: toDateInput(draft?.invoiceDate || new Date()),
  dueDate: toDateInput(draft?.dueDate),
  reservationId: draft?.reservationId || '',
  contractNumber: draft?.contractNumber || '',
  customerName: draft?.customerName || '',
  customerEmail: draft?.customerEmail || '',
  customerPhone: draft?.customerPhone || '',
  customerAddress: draft?.customerAddress || '',
  customerTaxId: draft?.customerTaxId || '',
  currency: draft?.currency || 'MAD',
  vehicleBrand: draft?.vehicleBrand || '',
  vehicleModel: draft?.vehicleModel || '',
  vehiclePlate: draft?.vehiclePlate || '',
  vehicleYear: draft?.vehicleYear || '',
  vehicleType: draft?.vehicleType || '',
  pickupDate: toDateTimeLocal(draft?.pickupDate),
  returnDate: toDateTimeLocal(draft?.returnDate),
  rentalDays: draft?.rentalDays != null ? String(draft.rentalDays) : '',
  totalAmount: String(draft?.totalAmount ?? 0),
  amountPaid: String(draft?.amountPaid ?? 0),
  paymentStatus: draft?.paymentStatus || 'pending',
  notes: draft?.notes || '',
  includeCompanyStamp: draft?.includeCompanyStamp !== false,
  items: Array.isArray(draft?.items) && draft.items.length
    ? draft.items.map((item) => ({
      description: item.description || '',
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.unitPrice || 0),
      taxRate: Number(item.taxRate || 0),
    }))
    : [{ description: '', quantity: 1, unitPrice: 0, taxRate: 0 }],
})

/** Verification modal before generating an invoice from a booking. */
const GenerateInvoiceModal = ({
  open,
  bookingId,
  axios,
  onClose,
  onSuccess,
}) => {
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [suggested, setSuggested] = useState('')
  const [existingInvoice, setExistingInvoice] = useState(null)
  const [form, setForm] = useState(emptyForm())

  useEffect(() => {
    if (!open || !bookingId) return undefined
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await axios.get(`/api/invoices/draft-from-booking/${bookingId}`)
        if (cancelled) return
        if (!data.success) {
          toast.error(data.message || t('admin.invoices.draftLoadFailed'))
          return
        }
        setSuggested(data.suggestedInvoiceNumber || '')
        setExistingInvoice(data.existingInvoice || null)
        setForm(draftToForm(data.draft, data.suggestedInvoiceNumber))
      } catch (error) {
        if (!cancelled) toast.error(getErrorMessage(error, t('admin.invoices.draftLoadFailed')))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [open, bookingId, axios, t])

  const totals = useMemo(() => {
    const items = Array.isArray(form.items) ? form.items : []
    const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0)
    const taxAmount = items.reduce(
      (sum, item) => sum + ((Number(item.quantity || 0) * Number(item.unitPrice || 0)) * (Number(item.taxRate || 0) / 100)),
      0,
    )
    const totalAmount = Number(form.totalAmount != null && form.totalAmount !== ''
      ? form.totalAmount
      : subtotal + taxAmount) || 0
    const amountPaid = Number(form.amountPaid || 0) || 0
    return {
      subtotal,
      taxAmount,
      totalAmount,
      amountPaid,
      balanceDue: Math.max(0, totalAmount - amountPaid),
    }
  }, [form.items, form.totalAmount, form.amountPaid])

  const update = (changes) => setForm((prev) => ({ ...prev, ...changes }))

  const fieldClass = 'w-full rounded-lg border border-borderColor px-3 py-2 text-sm'
  const labelClass = 'mb-1 block text-xs font-medium text-gray-500'

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    const numberError = invoiceNumberValidationMessage(form.invoiceNumber, t)
    if (numberError) {
      toast.error(numberError)
      return
    }
    if (!form.customerName?.trim()) {
      toast.error(t('admin.invoices.customerRequired'))
      return
    }
    if (!form.invoiceDate) {
      toast.error(t('admin.invoices.invoiceDateRequired'))
      return
    }
    if (!form.dueDate) {
      toast.error(t('admin.invoices.dueDateRequired'))
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        bookingId,
        invoiceNumber: normalizeInvoiceNumber(form.invoiceNumber),
        invoiceDate: form.invoiceDate,
        dueDate: form.dueDate,
        reservationId: form.reservationId,
        contractNumber: form.contractNumber,
        customerName: form.customerName.trim(),
        customerEmail: form.customerEmail,
        customerPhone: form.customerPhone,
        customerAddress: form.customerAddress,
        customerTaxId: form.customerTaxId,
        currency: form.currency || 'MAD',
        vehicleBrand: form.vehicleBrand,
        vehicleModel: form.vehicleModel,
        vehiclePlate: form.vehiclePlate,
        vehicleYear: form.vehicleYear,
        vehicleType: form.vehicleType,
        pickupDate: form.pickupDate || null,
        returnDate: form.returnDate || null,
        rentalDays: form.rentalDays !== '' ? Number(form.rentalDays) : undefined,
        items: form.items,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        amountPaid: totals.amountPaid,
        paymentStatus: form.paymentStatus,
        notes: form.notes,
        includeCompanyStamp: Boolean(form.includeCompanyStamp),
        forceFromBooking: Boolean(existingInvoice?.sourceLocked),
      }

      const { data } = await axios.post('/api/invoices/generate', payload)
      if (!data.success) {
        toast.error(data.message)
        return
      }
      toast.success(data.message || t('admin.invoices.generated'))
      if (data.invoice?._id) {
        try {
          await downloadPdfFromApi(
            axios,
            `/api/invoices/${data.invoice._id}/pdf`,
            `${data.invoice.invoiceNumber || 'invoice'}.pdf`,
          )
        } catch (downloadError) {
          toast.error(getErrorMessage(downloadError, t('admin.invoices.pdfDownloadFailed')))
        }
      }
      onSuccess?.(data.invoice)
      onClose?.()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      size="xl"
      variant="center"
      title={t('admin.invoices.generateTitle')}
      description={t('admin.invoices.generateHint')}
      footer={(
        <>
          <button type="button" className="admin-btn admin-btn--secondary" onClick={onClose} disabled={submitting}>
            {t('admin.bookings.cancel')}
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            disabled={loading || submitting}
            onClick={handleSubmit}
          >
            {submitting ? t('admin.invoices.generating') : t('admin.invoices.confirmGenerate')}
          </button>
        </>
      )}
    >
      {loading ? (
        <p className="py-8 text-center text-sm text-gray-500">{t('admin.invoices.loadingDraft')}</p>
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <h4 className="border-b border-borderColor pb-1 text-sm font-semibold text-gray-800">
              {t('admin.invoices.verificationBlock')}
            </h4>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className={labelClass}>{t('admin.invoices.invoiceNumber')}</label>
                <input
                  className={fieldClass}
                  value={form.invoiceNumber}
                  onChange={(e) => update({ invoiceNumber: e.target.value })}
                  placeholder="001/2026"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  {t('admin.invoices.numberFormatHint')}
                  {suggested ? ` · ${t('admin.invoices.suggested')}: ${suggested}` : ''}
                </p>
              </div>
              <div>
                <label className={labelClass}>{t('admin.invoices.invoiceDate')}</label>
                <DateField
                  variant="admin"
                  value={form.invoiceDate}
                  onChange={(e) => update({ invoiceDate: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>{t('admin.invoices.dueDate')}</label>
                <DateField
                  variant="admin"
                  value={form.dueDate}
                  onChange={(e) => update({ dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className={labelClass}>{t('admin.invoices.reservationRef')}</label>
                <input className={`${fieldClass} bg-gray-50`} value={form.reservationId} readOnly />
              </div>
              <div>
                <label className={labelClass}>{t('admin.invoices.contractRef')}</label>
                <input className={`${fieldClass} bg-gray-50`} value={form.contractNumber || '—'} readOnly />
              </div>
              <div>
                <label className={labelClass}>{t('admin.invoices.currency')}</label>
                <input className={fieldClass} value={form.currency} onChange={(e) => update({ currency: e.target.value })} />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="border-b border-borderColor pb-1 text-sm font-semibold text-gray-800">
              {t('admin.invoiceUi.customer')}
            </h4>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className={labelClass}>{t('admin.invoices.customerName')}</label>
                <input className={fieldClass} value={form.customerName} onChange={(e) => update({ customerName: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>{t('admin.invoices.customerPhone')}</label>
                <input className={fieldClass} value={form.customerPhone} onChange={(e) => update({ customerPhone: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>{t('admin.invoices.customerEmail')}</label>
                <input className={fieldClass} value={form.customerEmail} onChange={(e) => update({ customerEmail: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>{t('admin.invoices.customerAddress')}</label>
                <input className={fieldClass} value={form.customerAddress} onChange={(e) => update({ customerAddress: e.target.value })} />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="border-b border-borderColor pb-1 text-sm font-semibold text-gray-800">
              {t('admin.invoiceUi.vehicleRental')}
            </h4>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className={labelClass}>{t('admin.invoices.vehicleBrand')}</label>
                <input className={fieldClass} value={form.vehicleBrand} onChange={(e) => update({ vehicleBrand: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>{t('admin.invoices.vehicleModel')}</label>
                <input className={fieldClass} value={form.vehicleModel} onChange={(e) => update({ vehicleModel: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>{t('admin.invoices.vehiclePlate')}</label>
                <input className={fieldClass} value={form.vehiclePlate} onChange={(e) => update({ vehiclePlate: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>{t('admin.invoiceUi.pickupAt')}</label>
                <DateTimeField
                  variant="admin"
                  value={form.pickupDate}
                  onChange={(e) => update({ pickupDate: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>{t('admin.invoiceUi.returnAt')}</label>
                <DateTimeField
                  variant="admin"
                  value={form.returnDate}
                  onChange={(e) => update({ returnDate: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>{t('admin.invoiceUi.rentalDays')}</label>
                <input
                  type="number"
                  min="1"
                  className={fieldClass}
                  value={form.rentalDays}
                  onChange={(e) => update({ rentalDays: e.target.value })}
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="border-b border-borderColor pb-1 text-sm font-semibold text-gray-800">
              {t('admin.invoices.totalsBlock')}
            </h4>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className={labelClass}>{t('admin.invoices.total')}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={fieldClass}
                  value={form.totalAmount}
                  onChange={(e) => update({ totalAmount: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>{t('admin.invoices.amountPaid')}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={fieldClass}
                  value={form.amountPaid}
                  onChange={(e) => update({ amountPaid: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>{t('admin.invoices.balanceDue')}</label>
                <input className={`${fieldClass} bg-gray-50`} value={totals.balanceDue.toFixed(2)} readOnly />
              </div>
            </div>
            <p className="rounded-lg border-l-4 border-primary/70 bg-gray-50 px-3 py-2 text-xs text-gray-700">
              {invoiceAmountInWordsSentence(totals.totalAmount, form.currency || 'MAD')}
            </p>
          </section>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.includeCompanyStamp !== false}
              onChange={(e) => update({ includeCompanyStamp: e.target.checked })}
            />
            {t('admin.invoices.includeStamp')}
          </label>

          {existingInvoice ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {t('admin.invoices.existingWarning', { number: existingInvoice.invoiceNumber })}
            </p>
          ) : null}
        </div>
      )}
    </AdminModal>
  )
}

export default GenerateInvoiceModal

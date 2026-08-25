import React, { useCallback, useEffect, useState } from 'react'
import { DetailSection, DetailRow } from '../ui/DetailSection'
import StatusBadge from '../StatusBadge'
import { useAppContext } from '../../../context/AppContext'
import { useI18n } from '../../../i18n/I18nContext'
import { getErrorMessage } from '../../../utils/apiError'
import toast from 'react-hot-toast'

const money = (currency, value) =>
  `${currency}${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`

const newIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `idemp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

const formatWhen = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const inputClass =
  'h-9 w-full min-w-0 rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 text-sm text-[var(--admin-fg)] outline-none focus:shadow-[var(--admin-focus)]'
const labelClass = 'mb-1 block text-[11px] font-medium text-[var(--admin-fg-muted)]'

/**
 * Phase 2: operational offline money panel (payments + charges).
 * Deposit hold/release is out of scope — shows required/held from franchiseAmount only.
 */
const BookingMoneySummary = ({ bookingId, currency: currencyProp }) => {
  const { axios, currency: ctxCurrency, hasPermission } = useAppContext()
  const { t } = useI18n()
  const currency = currencyProp || ctxCurrency || 'MAD '
  const canRefund = hasPermission('accounting')

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [financial, setFinancial] = useState(null)
  const [tab, setTab] = useState('payment') // payment | charge | refund

  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('cash')
  const [payRef, setPayRef] = useState('')
  const [payNotes, setPayNotes] = useState('')
  const [allowOverpay, setAllowOverpay] = useState(false)

  const [chargeAmount, setChargeAmount] = useState('')
  const [chargeCategory, setChargeCategory] = useState('extra')
  const [chargeRef, setChargeRef] = useState('')
  const [chargeNotes, setChargeNotes] = useState('')

  const [refundAmount, setRefundAmount] = useState('')
  const [refundMethod, setRefundMethod] = useState('cash')
  const [refundRef, setRefundRef] = useState('')
  const [refundNotes, setRefundNotes] = useState('')

  const load = useCallback(async () => {
    if (!bookingId) return
    setLoading(true)
    setError('')
    try {
      const { data } = await axios.get(`/api/bookings/owner/${bookingId}/financial`)
      if (data.success) {
        setFinancial(data.financial)
        const due = Number(data.financial?.balanceDue) || 0
        if (due > 0) setPayAmount(String(due))
      } else {
        setError(data.message || t('admin.bookingMoney.loadError'))
      }
    } catch (err) {
      setError(getErrorMessage(err) || t('admin.bookingMoney.loadError'))
    } finally {
      setLoading(false)
    }
  }, [axios, bookingId, t])

  useEffect(() => {
    load()
  }, [load])

  const submitPayment = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      const { data } = await axios.post(`/api/bookings/owner/${bookingId}/ledger/payments`, {
        amount: Number(payAmount),
        method: payMethod,
        reference: payRef,
        notes: payNotes,
        allowOverpayment: allowOverpay,
        idempotencyKey: newIdempotencyKey(),
      })
      if (data.success) {
        toast.success(data.message || t('admin.bookingMoney.paymentOk'))
        setPayRef('')
        setPayNotes('')
        setAllowOverpay(false)
        setFinancial(data.financial)
        const due = Number(data.financial?.balanceDue) || 0
        setPayAmount(due > 0 ? String(due) : '')
      } else {
        toast.error(data.message || t('admin.bookingMoney.paymentFail'))
      }
    } catch (err) {
      toast.error(getErrorMessage(err) || t('admin.bookingMoney.paymentFail'))
    } finally {
      setBusy(false)
    }
  }

  const submitCharge = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      const { data } = await axios.post(`/api/bookings/owner/${bookingId}/ledger/charges`, {
        amount: Number(chargeAmount),
        category: chargeCategory,
        reference: chargeRef,
        notes: chargeNotes,
        idempotencyKey: newIdempotencyKey(),
      })
      if (data.success) {
        toast.success(data.message || t('admin.bookingMoney.chargeOk'))
        setChargeAmount('')
        setChargeRef('')
        setChargeNotes('')
        setFinancial(data.financial)
        const due = Number(data.financial?.balanceDue) || 0
        if (due > 0) setPayAmount(String(due))
      } else {
        toast.error(data.message || t('admin.bookingMoney.chargeFail'))
      }
    } catch (err) {
      toast.error(getErrorMessage(err) || t('admin.bookingMoney.chargeFail'))
    } finally {
      setBusy(false)
    }
  }

  const submitRefund = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      const { data } = await axios.post(`/api/bookings/owner/${bookingId}/ledger/refunds`, {
        amount: Number(refundAmount),
        method: refundMethod,
        reference: refundRef,
        notes: refundNotes,
        idempotencyKey: newIdempotencyKey(),
      })
      if (data.success) {
        toast.success(data.message || t('admin.bookingMoney.refundOk'))
        setRefundAmount('')
        setRefundRef('')
        setRefundNotes('')
        setFinancial(data.financial)
      } else {
        toast.error(data.message || t('admin.bookingMoney.refundFail'))
      }
    } catch (err) {
      toast.error(getErrorMessage(err) || t('admin.bookingMoney.refundFail'))
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <DetailSection title={t('admin.bookingMoney.title')} collapsible defaultOpen>
        <p className="text-sm text-[var(--admin-fg-muted)]">{t('admin.common.loading')}</p>
      </DetailSection>
    )
  }

  if (error || !financial) {
    return (
      <DetailSection title={t('admin.bookingMoney.title')} collapsible defaultOpen>
        <p className="text-sm text-[var(--admin-danger)]">{error || t('admin.bookingMoney.loadError')}</p>
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--sm mt-2" onClick={load}>
          {t('admin.leftover.tryAgain')}
        </button>
      </DetailSection>
    )
  }

  const sourceLabel =
    financial.source === 'ledger'
      ? t('admin.bookingMoney.sourceLedger')
      : t('admin.bookingMoney.sourceLegacy')

  const methods = financial.methods?.length
    ? financial.methods
    : ['cash', 'card_tpe', 'bank_transfer', 'other']
  const categories = financial.chargeCategories?.length
    ? financial.chargeCategories.filter((c) => c !== 'security_deposit')
    : ['extra', 'late_fee', 'fuel', 'damage', 'extension', 'adjustment', 'other']

  return (
    <DetailSection
      title={t('admin.bookingMoney.title')}
      collapsible
      defaultOpen
      actions={
        <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--admin-fg-muted)]">
          {sourceLabel}
        </span>
      }
    >
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] px-2.5 py-2">
          <p className="text-[10px] font-medium uppercase text-[var(--admin-fg-muted)]">
            {t('admin.bookingMoney.charges')}
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums">{money(currency, financial.chargesTotal)}</p>
        </div>
        <div className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] px-2.5 py-2">
          <p className="text-[10px] font-medium uppercase text-[var(--admin-fg-muted)]">
            {t('admin.bookingMoney.paid')}
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums">{money(currency, financial.paymentsTotal)}</p>
        </div>
        <div className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] px-2.5 py-2">
          <p className="text-[10px] font-medium uppercase text-[var(--admin-fg-muted)]">
            {t('admin.bookingMoney.balanceDue')}
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums">{money(currency, financial.balanceDue)}</p>
        </div>
        <div className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] px-2.5 py-2">
          <p className="text-[10px] font-medium uppercase text-[var(--admin-fg-muted)]">
            {t('admin.bookingMoney.deposit')}
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums">{money(currency, financial.depositRequired)}</p>
        </div>
      </div>

      <DetailRow label={t('admin.bookingMoney.settlement')}>
        <StatusBadge
          status={financial.settlementStatus || 'unpaid'}
          label={t(`admin.bookingMoney.settlementStatuses.${financial.settlementStatus || 'unpaid'}`)}
        />
      </DetailRow>
      <DetailRow label={t('admin.bookingMoney.depositStatus')}>
        <StatusBadge
          status={financial.depositStatus || 'none'}
          label={t(`admin.bookingMoney.depositStatuses.${financial.depositStatus || 'none'}`)}
        />
      </DetailRow>

      {financial.source === 'legacy' ? (
        <p className="mt-2 mb-3 text-[11px] leading-relaxed text-[var(--admin-fg-muted)]">
          {t('admin.bookingMoney.legacyHint')}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1 border-b border-[var(--admin-border)] pb-2">
        {[
          { id: 'payment', label: t('admin.bookingMoney.recordPayment') },
          { id: 'charge', label: t('admin.bookingMoney.addCharge') },
          ...(canRefund ? [{ id: 'refund', label: t('admin.bookingMoney.recordRefund') }] : []),
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            className={`admin-btn admin-btn--sm ${tab === item.id ? 'admin-btn--primary' : 'admin-btn--secondary'}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'payment' && (
        <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={submitPayment}>
          <div>
            <label className={labelClass}>{t('admin.bookingMoney.amount')}</label>
            <input
              className={inputClass}
              type="number"
              min="0.01"
              step="0.01"
              required
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookingMoney.method')}</label>
            <select className={inputClass} value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
              {methods.map((m) => (
                <option key={m} value={m}>{t(`admin.bookingMoney.methods.${m}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookingMoney.reference')}</label>
            <input className={inputClass} value={payRef} onChange={(e) => setPayRef(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookingMoney.notes')}</label>
            <input className={inputClass} value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
          </div>
          <label className="sm:col-span-2 flex items-center gap-2 text-xs text-[var(--admin-fg-secondary)]">
            <input type="checkbox" checked={allowOverpay} onChange={(e) => setAllowOverpay(e.target.checked)} />
            {t('admin.bookingMoney.allowOverpayment')}
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className="admin-btn admin-btn--primary admin-btn--sm">
              {busy ? t('admin.common.saving') : t('admin.bookingMoney.recordPayment')}
            </button>
          </div>
        </form>
      )}

      {tab === 'charge' && (
        <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={submitCharge}>
          <div>
            <label className={labelClass}>{t('admin.bookingMoney.amount')}</label>
            <input
              className={inputClass}
              type="number"
              min="0.01"
              step="0.01"
              required
              value={chargeAmount}
              onChange={(e) => setChargeAmount(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookingMoney.category')}</label>
            <select
              className={inputClass}
              value={chargeCategory}
              onChange={(e) => setChargeCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>{t(`admin.bookingMoney.categories.${c}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookingMoney.reference')}</label>
            <input className={inputClass} value={chargeRef} onChange={(e) => setChargeRef(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookingMoney.notes')}</label>
            <input className={inputClass} value={chargeNotes} onChange={(e) => setChargeNotes(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className="admin-btn admin-btn--primary admin-btn--sm">
              {busy ? t('admin.common.saving') : t('admin.bookingMoney.addCharge')}
            </button>
          </div>
        </form>
      )}

      {tab === 'refund' && canRefund && (
        <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={submitRefund}>
          <div>
            <label className={labelClass}>{t('admin.bookingMoney.amount')}</label>
            <input
              className={inputClass}
              type="number"
              min="0.01"
              step="0.01"
              required
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookingMoney.method')}</label>
            <select className={inputClass} value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)}>
              {methods.map((m) => (
                <option key={m} value={m}>{t(`admin.bookingMoney.methods.${m}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookingMoney.reference')}</label>
            <input className={inputClass} value={refundRef} onChange={(e) => setRefundRef(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookingMoney.notes')}</label>
            <input className={inputClass} value={refundNotes} onChange={(e) => setRefundNotes(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className="admin-btn admin-btn--danger admin-btn--sm">
              {busy ? t('admin.common.saving') : t('admin.bookingMoney.recordRefund')}
            </button>
          </div>
        </form>
      )}

      <div className="mt-4 overflow-x-auto">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-fg-muted)]">
          {t('admin.bookingMoney.history')}
        </p>
        {Array.isArray(financial.entries) && financial.entries.length > 0 ? (
          <table className="w-full min-w-[28rem] text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--admin-border)] text-[var(--admin-fg-muted)]">
                <th className="py-1.5 pe-2 font-medium">{t('admin.bookingMoney.colWhen')}</th>
                <th className="py-1.5 pe-2 font-medium">{t('admin.bookingMoney.colKind')}</th>
                <th className="py-1.5 pe-2 font-medium">{t('admin.bookingMoney.colCategory')}</th>
                <th className="py-1.5 pe-2 font-medium">{t('admin.bookingMoney.method')}</th>
                <th className="py-1.5 pe-2 font-medium">{t('admin.bookingMoney.colBy')}</th>
                <th className="py-1.5 font-medium text-end">{t('admin.bookingMoney.colAmount')}</th>
              </tr>
            </thead>
            <tbody>
              {[...financial.entries].reverse().map((row) => (
                <tr key={row.id} className="border-b border-[var(--admin-border)]/60">
                  <td className="py-1.5 pe-2 whitespace-nowrap text-[var(--admin-fg-secondary)]">
                    {formatWhen(row.occurredAt || row.createdAt)}
                  </td>
                  <td className="py-1.5 pe-2 text-[var(--admin-fg)]">{row.kind}</td>
                  <td className="py-1.5 pe-2 text-[var(--admin-fg-secondary)]">{row.category}</td>
                  <td className="py-1.5 pe-2 text-[var(--admin-fg-secondary)]">
                    {row.method ? t(`admin.bookingMoney.methods.${row.method}`) : '—'}
                  </td>
                  <td className="py-1.5 pe-2 text-[var(--admin-fg-secondary)]">
                    {row.createdBy?.name || '—'}
                  </td>
                  <td className="py-1.5 text-end tabular-nums text-[var(--admin-fg)]">
                    {money(currency, row.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-[11px] text-[var(--admin-fg-muted)]">{t('admin.bookingMoney.noEntries')}</p>
        )}
      </div>
    </DetailSection>
  )
}

export default BookingMoneySummary

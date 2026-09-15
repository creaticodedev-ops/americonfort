import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
 * Compact reservation financial strip + quick capture actions + collapsible history.
 */
const BookingMoneySummary = ({ bookingId, currency: currencyProp, reservationId }) => {
  const { axios, currency: ctxCurrency, hasPermission } = useAppContext()
  const { t } = useI18n()
  const currency = currencyProp || ctxCurrency || 'MAD '
  const canRefund = hasPermission('accounting')
  const canAccounting = hasPermission('accounting')

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [financial, setFinancial] = useState(null)
  const [action, setAction] = useState(null) // payment | charge | refund | deposit | null
  const [historyOpen, setHistoryOpen] = useState(false)

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

  const [depositAmount, setDepositAmount] = useState('')
  const [depositMethod, setDepositMethod] = useState('cash')

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
        const req = Number(data.financial?.depositRequired) || 0
        const held = Number(data.financial?.depositHeld) || 0
        const remaining = Math.max(0, req - held)
        setDepositAmount(remaining > 0 ? String(remaining) : req > 0 ? String(req) : '')
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

  const afterWrite = (nextFinancial) => {
    setFinancial(nextFinancial)
    const due = Number(nextFinancial?.balanceDue) || 0
    setPayAmount(due > 0 ? String(due) : '')
    setAction(null)
  }

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
        afterWrite(data.financial)
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
        afterWrite(data.financial)
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
        afterWrite(data.financial)
      } else {
        toast.error(data.message || t('admin.bookingMoney.refundFail'))
      }
    } catch (err) {
      toast.error(getErrorMessage(err) || t('admin.bookingMoney.refundFail'))
    } finally {
      setBusy(false)
    }
  }

  const submitDepositHold = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      const { data } = await axios.post(`/api/bookings/owner/${bookingId}/deposit/hold`, {
        amount: Number(depositAmount),
        method: depositMethod,
        idempotencyKey: newIdempotencyKey(),
      })
      if (data.success) {
        toast.success(data.message || t('admin.bookingMoney.paymentOk'))
        afterWrite(data.financial)
      } else {
        toast.error(data.message || t('admin.bookingMoney.paymentFail'))
      }
    } catch (err) {
      toast.error(getErrorMessage(err) || t('admin.bookingMoney.paymentFail'))
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

  const resId = reservationId || financial.reservationId || ''

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
      {/* Compact financial strip */}
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: t('admin.bookingMoney.charges'), value: financial.chargesTotal },
          { label: t('admin.bookingMoney.paid'), value: financial.paymentsTotal },
          { label: t('admin.bookingMoney.balanceDue'), value: financial.balanceDue },
          { label: t('admin.bookingMoney.depositHeld'), value: financial.depositHeld },
          { label: t('admin.bookingMoney.refunds'), value: financial.refundsTotal },
        ].map((tile) => (
          <div
            key={tile.label}
            className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] px-2.5 py-2"
          >
            <p className="text-[10px] font-medium uppercase text-[var(--admin-fg-muted)]">{tile.label}</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums">{money(currency, tile.value)}</p>
          </div>
        ))}
        <div className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] px-2.5 py-2">
          <p className="text-[10px] font-medium uppercase text-[var(--admin-fg-muted)]">
            {t('admin.bookingMoney.settlement')}
          </p>
          <div className="mt-1">
            <StatusBadge
              status={financial.settlementStatus || 'unpaid'}
              label={t(`admin.bookingMoney.settlementStatuses.${financial.settlementStatus || 'unpaid'}`)}
            />
          </div>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <DetailRow label={t('admin.bookingMoney.depositStatus')}>
          <StatusBadge
            status={financial.depositStatus || 'none'}
            label={t(`admin.bookingMoney.depositStatuses.${financial.depositStatus || 'none'}`)}
          />
        </DetailRow>
      </div>

      {financial.source === 'legacy' ? (
        <p className="mb-3 text-[11px] leading-relaxed text-[var(--admin-fg-muted)]">
          {t('admin.bookingMoney.legacyHint')}
        </p>
      ) : null}

      {/* Quick actions */}
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-fg-muted)]">
        {t('admin.bookingMoney.quickActions')}
      </p>
      <div className="mb-2 flex flex-wrap gap-1">
        {[
          { id: 'payment', label: t('admin.bookingMoney.recordPayment') },
          { id: 'deposit', label: t('admin.bookingMoney.holdDeposit') },
          { id: 'charge', label: t('admin.bookingMoney.addCharge') },
          ...(canRefund ? [{ id: 'refund', label: t('admin.bookingMoney.recordRefund') }] : []),
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            className={`admin-btn admin-btn--sm ${action === item.id ? 'admin-btn--primary' : 'admin-btn--secondary'}`}
            onClick={() => setAction((prev) => (prev === item.id ? null : item.id))}
          >
            {item.label}
          </button>
        ))}
        {canAccounting && resId ? (
          <>
            <Link
              className="admin-btn admin-btn--secondary admin-btn--sm"
              to={`/owner/encaissements?reservationId=${encodeURIComponent(resId)}`}
            >
              {t('admin.bookingMoney.viewInCash')}
            </Link>
            <Link
              className="admin-btn admin-btn--secondary admin-btn--sm"
              to={`/owner/decaissements?reservationId=${encodeURIComponent(resId)}`}
            >
              {t('admin.bookingMoney.viewInCashOut')}
            </Link>
          </>
        ) : null}
      </div>

      {action === 'payment' && (
        <form className="mt-2 grid gap-2 sm:grid-cols-2" onSubmit={submitPayment}>
          <div>
            <label className={labelClass}>{t('admin.bookingMoney.amount')}</label>
            <input className={inputClass} type="number" min="0.01" step="0.01" required value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
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

      {action === 'deposit' && (
        <form className="mt-2 grid gap-2 sm:grid-cols-3" onSubmit={submitDepositHold}>
          <div>
            <label className={labelClass}>{t('admin.bookingMoney.amount')}</label>
            <input className={inputClass} type="number" min="0.01" step="0.01" required value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookingMoney.method')}</label>
            <select className={inputClass} value={depositMethod} onChange={(e) => setDepositMethod(e.target.value)}>
              {methods.map((m) => (
                <option key={m} value={m}>{t(`admin.bookingMoney.methods.${m}`)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={busy} className="admin-btn admin-btn--primary admin-btn--sm">
              {busy ? t('admin.common.saving') : t('admin.bookingMoney.holdDeposit')}
            </button>
          </div>
        </form>
      )}

      {action === 'charge' && (
        <form className="mt-2 grid gap-2 sm:grid-cols-2" onSubmit={submitCharge}>
          <div>
            <label className={labelClass}>{t('admin.bookingMoney.amount')}</label>
            <input className={inputClass} type="number" min="0.01" step="0.01" required value={chargeAmount} onChange={(e) => setChargeAmount(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookingMoney.category')}</label>
            <select className={inputClass} value={chargeCategory} onChange={(e) => setChargeCategory(e.target.value)}>
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

      {action === 'refund' && canRefund && (
        <form className="mt-2 grid gap-2 sm:grid-cols-2" onSubmit={submitRefund}>
          <div>
            <label className={labelClass}>{t('admin.bookingMoney.amount')}</label>
            <input className={inputClass} type="number" min="0.01" step="0.01" required value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
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

      {/* Collapsible history */}
      <button
        type="button"
        className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-accent)]"
        onClick={() => setHistoryOpen((v) => !v)}
      >
        {historyOpen ? t('admin.bookingMoney.hideHistory') : t('admin.bookingMoney.showHistory')}
        {' · '}
        {Array.isArray(financial.entries) ? financial.entries.length : 0}
      </button>

      {historyOpen ? (
        <div className="mt-2 overflow-x-auto">
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
      ) : null}
    </DetailSection>
  )
}

export default BookingMoneySummary

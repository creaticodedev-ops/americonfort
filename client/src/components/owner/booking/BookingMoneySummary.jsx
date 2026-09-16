import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DetailSection } from '../ui/DetailSection'
import StatusBadge from '../StatusBadge'
import { Icon } from '../ui/adminIcons'
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

const OUT_KINDS = new Set(['refund', 'deposit_release'])
const IN_KINDS = new Set(['payment', 'deposit_hold'])

/**
 * Premium reservation financial surface — hero balance, action chips, ledger timeline.
 * Business logic unchanged: same financial + ledger APIs.
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
  const [action, setAction] = useState(null)
  const [historyOpen, setHistoryOpen] = useState(true)

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
  const balanceDue = Number(financial.balanceDue) || 0
  const isDue = balanceDue > 0.001
  const settlement = financial.settlementStatus || 'unpaid'
  const isSettled = !isDue && ['paid', 'overpaid', 'settled'].includes(String(settlement))
  const entries = Array.isArray(financial.entries) ? [...financial.entries].reverse() : []
  const heroClass = [
    'admin-finance__hero',
    isDue ? 'is-due' : '',
    isSettled ? 'is-settled' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const actionMeta = {
    payment: { title: t('admin.bookingMoney.recordPayment'), icon: 'cash-in' },
    deposit: { title: t('admin.bookingMoney.holdDeposit'), icon: 'lock' },
    charge: { title: t('admin.bookingMoney.addCharge'), icon: 'plus-circle' },
    refund: { title: t('admin.bookingMoney.recordRefund'), icon: 'cash-out' },
  }

  const chips = [
    { id: 'payment', label: t('admin.bookingMoney.recordPayment'), icon: 'cash-in' },
    { id: 'deposit', label: t('admin.bookingMoney.holdDeposit'), icon: 'lock' },
    { id: 'charge', label: t('admin.bookingMoney.addCharge'), icon: 'plus-circle' },
    ...(canRefund
      ? [{ id: 'refund', label: t('admin.bookingMoney.recordRefund'), icon: 'cash-out', danger: true }]
      : []),
  ]

  const amountTone = (kind) => {
    if (OUT_KINDS.has(kind)) return 'is-out'
    if (IN_KINDS.has(kind)) return 'is-in'
    return ''
  }

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
      <div className="admin-finance">
        <div className={heroClass}>
          <div className="admin-finance__hero-top">
            <div className="admin-finance__focal">
              <p className="admin-finance__focal-label">{t('admin.bookingMoney.balanceDue')}</p>
              <p className="admin-finance__focal-value">{money(currency, balanceDue)}</p>
              <p className="admin-finance__focal-hint">
                {isDue
                  ? `${t('admin.bookingMoney.paid')} ${money(currency, financial.paymentsTotal)} · ${t('admin.bookingMoney.charges')} ${money(currency, financial.chargesTotal)}`
                  : `${t('admin.bookingMoney.charges')} ${money(currency, financial.chargesTotal)}`}
              </p>
            </div>
            <div className="admin-finance__badges">
              <StatusBadge
                status={settlement}
                label={t(`admin.bookingMoney.settlementStatuses.${settlement}`)}
              />
              <StatusBadge
                status={financial.depositStatus || 'none'}
                label={t(`admin.bookingMoney.depositStatuses.${financial.depositStatus || 'none'}`)}
              />
            </div>
          </div>

          <div className="admin-finance__rail">
            <div className="admin-finance__metric">
              <span className="admin-finance__metric-label">{t('admin.bookingMoney.charges')}</span>
              <span className="admin-finance__metric-value">{money(currency, financial.chargesTotal)}</span>
            </div>
            <div className="admin-finance__metric">
              <span className="admin-finance__metric-label">{t('admin.bookingMoney.paid')}</span>
              <span className="admin-finance__metric-value">{money(currency, financial.paymentsTotal)}</span>
            </div>
            <div className="admin-finance__metric">
              <span className="admin-finance__metric-label">{t('admin.bookingMoney.depositHeld')}</span>
              <span className="admin-finance__metric-value">{money(currency, financial.depositHeld)}</span>
            </div>
            <div className={`admin-finance__metric${!financial.refundsTotal ? ' is-muted' : ''}`}>
              <span className="admin-finance__metric-label">{t('admin.bookingMoney.refunds')}</span>
              <span className="admin-finance__metric-value">{money(currency, financial.refundsTotal)}</span>
            </div>
          </div>
        </div>

        {financial.source === 'legacy' ? (
          <p className="admin-finance__legacy">{t('admin.bookingMoney.legacyHint')}</p>
        ) : null}

        <div className="admin-finance__toolbar">
          <p className="admin-finance__toolbar-label">{t('admin.bookingMoney.quickActions')}</p>
          <div className="admin-finance__actions">
            {chips.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`admin-finance__chip${action === item.id ? ' is-active' : ''}${
                  item.danger ? ' is-danger' : ''
                }`}
                onClick={() => setAction((prev) => (prev === item.id ? null : item.id))}
              >
                <Icon name={item.icon} />
                {item.label}
              </button>
            ))}
          </div>
          {canAccounting && resId ? (
            <div className="admin-finance__links">
              <Link
                className="admin-finance__link"
                to={`/owner/encaissements?reservationId=${encodeURIComponent(resId)}`}
              >
                {t('admin.bookingMoney.viewInCash')}
                <Icon name="external" />
              </Link>
              <Link
                className="admin-finance__link"
                to={`/owner/decaissements?reservationId=${encodeURIComponent(resId)}`}
              >
                {t('admin.bookingMoney.viewInCashOut')}
                <Icon name="external" />
              </Link>
            </div>
          ) : null}
        </div>

        {action === 'payment' && (
          <div className="admin-finance__capture">
            <p className="admin-finance__capture-title">{actionMeta.payment.title}</p>
            <form className="grid gap-2 sm:grid-cols-2" onSubmit={submitPayment}>
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
          </div>
        )}

        {action === 'deposit' && (
          <div className="admin-finance__capture">
            <p className="admin-finance__capture-title">{actionMeta.deposit.title}</p>
            <form className="grid gap-2 sm:grid-cols-3" onSubmit={submitDepositHold}>
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
          </div>
        )}

        {action === 'charge' && (
          <div className="admin-finance__capture">
            <p className="admin-finance__capture-title">{actionMeta.charge.title}</p>
            <form className="grid gap-2 sm:grid-cols-2" onSubmit={submitCharge}>
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
          </div>
        )}

        {action === 'refund' && canRefund && (
          <div className="admin-finance__capture">
            <p className="admin-finance__capture-title">{actionMeta.refund.title}</p>
            <form className="grid gap-2 sm:grid-cols-2" onSubmit={submitRefund}>
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
          </div>
        )}

        <div className={`admin-finance__history${historyOpen ? ' is-open' : ''}`}>
          <button
            type="button"
            className="admin-finance__history-head"
            aria-expanded={historyOpen}
            onClick={() => setHistoryOpen((v) => !v)}
          >
            <p className="admin-finance__history-title">
              {t('admin.bookingMoney.history')}
              <span className="admin-finance__history-count">{entries.length}</span>
            </p>
            <svg className="admin-finance__history-chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {historyOpen ? (
            <div className="admin-finance__history-body">
              {entries.length > 0 ? (
                <ul className="admin-finance__timeline">
                  {entries.map((row) => (
                    <li key={row.id} className="admin-finance__timeline-item">
                      <div className="admin-finance__timeline-main">
                        <p className="admin-finance__timeline-kind">{row.kind}</p>
                        <p className="admin-finance__timeline-meta">
                          {formatWhen(row.occurredAt || row.createdAt)}
                          {row.category ? ` · ${row.category}` : ''}
                          {row.method ? ` · ${t(`admin.bookingMoney.methods.${row.method}`)}` : ''}
                          {row.createdBy?.name ? ` · ${row.createdBy.name}` : ''}
                        </p>
                      </div>
                      <p className={`admin-finance__timeline-amount ${amountTone(row.kind)}`.trim()}>
                        {money(currency, row.amount)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="admin-finance__empty">
                  <p className="admin-finance__empty-title">{t('admin.bookingMoney.noEntries')}</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </DetailSection>
  )
}

export default BookingMoneySummary

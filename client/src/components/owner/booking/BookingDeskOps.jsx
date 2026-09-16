import React, { useCallback, useEffect, useState } from 'react'
import { DetailSection, DetailRow } from '../ui/DetailSection'
import StatusBadge from '../StatusBadge'
import { Icon } from '../ui/adminIcons'
import { useAppContext } from '../../../context/AppContext'
import { useI18n } from '../../../i18n/I18nContext'
import { getErrorMessage } from '../../../utils/apiError'
import toast from 'react-hot-toast'

const inputClass =
  'h-9 w-full min-w-0 rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 text-sm text-[var(--admin-fg)] outline-none focus:shadow-[var(--admin-focus)]'
const labelClass = 'mb-1 block text-[11px] font-medium text-[var(--admin-fg-muted)]'

const newKey = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `k_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)

const FUEL = ['empty', 'quarter', 'half', 'three_quarter', 'full']

const moneyFmt = (currency, value) =>
  `${currency}${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`

/**
 * Premium desk ops — deposit hero + journey tiles for pickup/return inspections.
 * Same deposit / inspection APIs; presentation only.
 */
const BookingDeskOps = ({ bookingId, currency: currencyProp, onFinancialChange, onStatusHint }) => {
  const { axios, currency: ctxCurrency } = useAppContext()
  const { t } = useI18n()
  const currency = currencyProp || ctxCurrency || 'MAD '

  const [financial, setFinancial] = useState(null)
  const [inspections, setInspections] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [depositMethod, setDepositMethod] = useState('cash')
  const [depositAmount, setDepositAmount] = useState('')
  const [draft, setDraft] = useState(null)

  const refresh = useCallback(async () => {
    if (!bookingId) return
    setLoading(true)
    try {
      const [finRes, inspRes] = await Promise.all([
        axios.get(`/api/bookings/owner/${bookingId}/financial`),
        axios.get(`/api/bookings/owner/${bookingId}/inspections`),
      ])
      if (finRes.data.success) {
        setFinancial(finRes.data.financial)
        onFinancialChange?.(finRes.data.financial)
        const req = Number(finRes.data.financial?.depositRequired) || 0
        const held = Number(finRes.data.financial?.depositHeld) || 0
        const remaining = Math.max(0, req - held)
        setDepositAmount(remaining > 0 ? String(remaining) : req > 0 ? String(req) : '')
      }
      if (inspRes.data.success) setInspections(inspRes.data.inspections || [])
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [axios, bookingId, onFinancialChange])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!financial) return
    const pickup = inspections.find((i) => i.type === 'pickup' && i.status === 'completed')
    const ret = inspections.find((i) => i.type === 'return' && i.status === 'completed')
    onStatusHint?.({
      pickupDone: Boolean(pickup),
      returnDone: Boolean(ret),
      depositOk:
        !(Number(financial.depositRequired) > 0) ||
        Number(financial.depositHeld) + 0.001 >= Number(financial.depositRequired),
      depositCleared: Number(financial.depositHeld) <= 0.001,
      balanceCleared: Number(financial.balanceDue) <= 0.001,
    })
  }, [financial, inspections, onStatusHint])

  const openInspection = async (type) => {
    setBusy(true)
    try {
      const { data } = await axios.post(`/api/bookings/owner/${bookingId}/inspections`, { type })
      if (data.success) setDraft(data.inspection)
      else toast.error(data.message)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const saveDraft = async () => {
    if (!draft?.id || draft.status === 'completed') return
    setBusy(true)
    try {
      const { data } = await axios.patch(`/api/bookings/owner/inspections/${draft.id}`, {
        odometer: draft.odometer,
        fuelLevel: draft.fuelLevel,
        conditionNotes: draft.conditionNotes,
        notes: draft.notes,
        checklist: draft.checklist,
        damages: draft.damages,
      })
      if (data.success) {
        setDraft(data.inspection)
        toast.success(t('admin.deskOps.saved'))
      } else toast.error(data.message)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const completeDraft = async () => {
    if (!draft?.id) return
    setBusy(true)
    try {
      await axios.patch(`/api/bookings/owner/inspections/${draft.id}`, {
        odometer: draft.odometer,
        fuelLevel: draft.fuelLevel,
        conditionNotes: draft.conditionNotes,
        notes: draft.notes,
        checklist: draft.checklist,
        damages: draft.damages,
      })
      const { data } = await axios.post(`/api/bookings/owner/inspections/${draft.id}/complete`, {})
      if (data.success) {
        toast.success(data.message)
        setDraft(data.inspection)
        await refresh()
        if (data.inspection?.suggestedLateFee > 0) {
          toast.success(
            `${t('admin.deskOps.lateFeeSuggest')}: ${data.inspection.suggestedLateFee}`,
          )
        }
      } else toast.error(data.message)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !draft?.id) return
    setBusy(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await axios.post(
        `/api/bookings/owner/inspections/${draft.id}/photos`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      if (data.success) {
        setDraft(data.inspection)
        toast.success(t('admin.deskOps.photoOk'))
      } else toast.error(data.message)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  const depositAction = async (action) => {
    setBusy(true)
    try {
      const body = {
        amount: depositAmount === '' ? undefined : Number(depositAmount),
        method: depositMethod,
        idempotencyKey: newKey(),
      }
      const { data } = await axios.post(`/api/bookings/owner/${bookingId}/deposit/${action}`, body)
      if (data.success) {
        toast.success(data.message)
        setFinancial(data.financial)
        onFinancialChange?.(data.financial)
        await refresh()
      } else toast.error(data.message)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const addDamageRow = () => {
    setDraft((prev) => ({
      ...prev,
      damages: [
        ...(prev.damages || []),
        { area: '', severity: 'minor', description: '', estimatedCost: 0, photoUrls: [] },
      ],
    }))
  }

  if (loading) {
    return (
      <DetailSection title={t('admin.deskOps.title')} collapsible defaultOpen>
        <p className="text-sm text-[var(--admin-fg-muted)]">{t('admin.common.loading')}</p>
      </DetailSection>
    )
  }

  const held = Number(financial?.depositHeld) || 0
  const required = Number(financial?.depositRequired) || 0
  const depositStatus = financial?.depositStatus || 'none'
  const isHeld = held > 0.001
  const isCleared = !isHeld && required > 0
  const heroClass = [
    'admin-desk__hero',
    isHeld ? 'is-held' : '',
    isCleared ? 'is-cleared' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const pickupDone = inspections.find((i) => i.type === 'pickup' && i.status === 'completed')
  const returnDone = inspections.find((i) => i.type === 'return' && i.status === 'completed')
  const pickupDraft = inspections.find((i) => i.type === 'pickup' && i.status !== 'completed')
  const returnDraft = inspections.find((i) => i.type === 'return' && i.status !== 'completed')

  const journeyStatus = (done, draftRow, type) => {
    if (draft?.type === type && draft?.status !== 'completed') {
      return { label: t('admin.deskOps.draft'), tone: 'is-draft' }
    }
    if (done) return { label: t('admin.deskOps.done'), tone: 'is-done' }
    if (draftRow) return { label: t('admin.deskOps.draft'), tone: 'is-draft' }
    return { label: t('admin.deskOps.pending'), tone: '' }
  }

  const pickupStatus = journeyStatus(pickupDone, pickupDraft, 'pickup')
  const returnStatus = journeyStatus(returnDone, returnDraft, 'return')

  return (
    <DetailSection title={t('admin.deskOps.title')} collapsible defaultOpen>
      <div className="admin-desk">
        <div className={heroClass}>
          <div className="admin-desk__hero-top">
            <div>
              <p className="admin-desk__focal-label">{t('admin.bookingMoney.depositHeld')}</p>
              <p className="admin-desk__focal-value">{moneyFmt(currency, held)}</p>
              <p className="admin-desk__focal-hint">
                {t('admin.bookingMoney.deposit')} {moneyFmt(currency, required)}
              </p>
            </div>
            <div className="admin-desk__badges">
              <StatusBadge
                status={depositStatus}
                label={t(`admin.bookingMoney.depositStatuses.${depositStatus}`)}
              />
            </div>
          </div>

          <div className="admin-desk__rail">
            <div>
              <span className="admin-desk__metric-label">{t('admin.bookingMoney.deposit')}</span>
              <span className="admin-desk__metric-value">{moneyFmt(currency, required)}</span>
            </div>
            <div>
              <span className="admin-desk__metric-label">{t('admin.deskOps.pickup')}</span>
              <span
                className={`admin-desk__metric-value ${
                  pickupDone ? 'is-ok' : 'is-pending'
                }`}
              >
                {pickupDone ? t('admin.deskOps.done') : t('admin.deskOps.pending')}
              </span>
            </div>
            <div>
              <span className="admin-desk__metric-label">{t('admin.deskOps.return')}</span>
              <span
                className={`admin-desk__metric-value ${
                  returnDone ? 'is-ok' : 'is-pending'
                }`}
              >
                {returnDone ? t('admin.deskOps.done') : t('admin.deskOps.pending')}
              </span>
            </div>
          </div>
        </div>

        <div className="admin-desk__capture">
          <p className="admin-desk__capture-label">{t('admin.deskOps.depositActions')}</p>
          <div className="admin-desk__capture-row">
            <div>
              <label className={labelClass}>{t('admin.bookingMoney.amount')}</label>
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>{t('admin.bookingMoney.method')}</label>
              <select
                className={inputClass}
                value={depositMethod}
                onChange={(e) => setDepositMethod(e.target.value)}
              >
                {['cash', 'card_tpe', 'bank_transfer', 'other'].map((m) => (
                  <option key={m} value={m}>
                    {t(`admin.bookingMoney.methods.${m}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-desk__capture-actions">
              <button
                type="button"
                disabled={busy}
                className="admin-desk__chip is-primary"
                onClick={() => depositAction('hold')}
              >
                <Icon name="lock" />
                {t('admin.deskOps.hold')}
              </button>
              <button
                type="button"
                disabled={busy}
                className="admin-desk__chip"
                onClick={() => depositAction('release')}
              >
                <Icon name="cash-out" />
                {t('admin.deskOps.release')}
              </button>
              <button
                type="button"
                disabled={busy}
                className="admin-desk__chip is-danger"
                onClick={() => depositAction('claim')}
              >
                <Icon name="coins" />
                {t('admin.deskOps.claim')}
              </button>
            </div>
          </div>
        </div>

        <p className="admin-desk__section-label">{t('admin.deskOps.inspections')}</p>
        <div className="admin-desk__journeys">
          {[
            {
              type: 'pickup',
              title: t('admin.deskOps.pickup'),
              cta: t('admin.deskOps.openPickup'),
              status: pickupStatus,
              done: Boolean(pickupDone),
              icon: 'car',
            },
            {
              type: 'return',
              title: t('admin.deskOps.return'),
              cta: t('admin.deskOps.openReturn'),
              status: returnStatus,
              done: Boolean(returnDone),
              icon: 'camera',
            },
          ].map((j) => (
            <div
              key={j.type}
              className={`admin-desk__journey${j.done ? ' is-done' : ''}${
                draft?.type === j.type ? ' is-active' : ''
              }`}
            >
              <div className="admin-desk__journey-head">
                <div>
                  <p className="admin-desk__journey-title">{j.title}</p>
                  <p className="admin-desk__journey-meta">
                    {j.done
                      ? t('admin.deskOps.done')
                      : t('admin.deskOps.pending')}
                  </p>
                </div>
                <span className={`admin-desk__journey-status ${j.status.tone}`.trim()}>
                  {j.status.label}
                </span>
              </div>
              <button
                type="button"
                disabled={busy}
                className="admin-btn admin-btn--secondary admin-btn--sm admin-desk__journey-cta"
                onClick={() => openInspection(j.type)}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Icon name={j.icon} className="h-3.5 w-3.5" />
                  {j.cta}
                </span>
              </button>
            </div>
          ))}
        </div>

        {draft ? (
          <div className="admin-desk__editor">
            <div className="admin-desk__editor-head">
              <p className="admin-desk__editor-title">
                {draft.type === 'pickup' ? t('admin.deskOps.pickup') : t('admin.deskOps.return')}
              </p>
              <span
                className={`admin-desk__journey-status ${
                  draft.status === 'completed' ? 'is-done' : 'is-draft'
                }`}
              >
                {draft.status === 'completed' ? t('admin.deskOps.done') : t('admin.deskOps.draft')}
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className={labelClass}>{t('admin.deskOps.odometer')}</label>
                <input
                  className={inputClass}
                  type="number"
                  disabled={draft.status === 'completed'}
                  value={draft.odometer ?? ''}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      odometer: e.target.value === '' ? null : Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div>
                <label className={labelClass}>{t('admin.deskOps.fuel')}</label>
                <select
                  className={inputClass}
                  disabled={draft.status === 'completed'}
                  value={draft.fuelLevel || ''}
                  onChange={(e) => setDraft((p) => ({ ...p, fuelLevel: e.target.value }))}
                >
                  <option value="">—</option>
                  {FUEL.map((f) => (
                    <option key={f} value={f}>
                      {t(`admin.deskOps.fuelLevels.${f}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>{t('admin.deskOps.condition')}</label>
                <input
                  className={inputClass}
                  disabled={draft.status === 'completed'}
                  value={draft.conditionNotes || ''}
                  onChange={(e) => setDraft((p) => ({ ...p, conditionNotes: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>{t('admin.bookingMoney.notes')}</label>
                <input
                  className={inputClass}
                  disabled={draft.status === 'completed'}
                  value={draft.notes || ''}
                  onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="admin-desk__checks">
              {['keys', 'papers', 'spareTire', 'jack', 'clean'].map((key) => (
                <label key={key} className="admin-desk__check">
                  <input
                    type="checkbox"
                    disabled={draft.status === 'completed'}
                    checked={Boolean(draft.checklist?.[key])}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        checklist: { ...(p.checklist || {}), [key]: e.target.checked },
                      }))
                    }
                  />
                  {t(`admin.deskOps.check.${key}`)}
                </label>
              ))}
            </div>

            {draft.type === 'return' && (
              <div>
                <div className="admin-desk__damages-head">
                  <p className="admin-desk__section-label">{t('admin.deskOps.damages')}</p>
                  {draft.status !== 'completed' && (
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary admin-btn--sm"
                      onClick={addDamageRow}
                    >
                      {t('admin.deskOps.addDamage')}
                    </button>
                  )}
                </div>
                {(draft.damages || []).map((d, idx) => (
                  <div key={d.id || idx} className="admin-desk__damage-row">
                    <input
                      className={inputClass}
                      placeholder={t('admin.deskOps.area')}
                      disabled={draft.status === 'completed'}
                      value={d.area || ''}
                      onChange={(e) => {
                        const damages = [...(draft.damages || [])]
                        damages[idx] = { ...damages[idx], area: e.target.value }
                        setDraft((p) => ({ ...p, damages }))
                      }}
                    />
                    <select
                      className={inputClass}
                      disabled={draft.status === 'completed'}
                      value={d.severity || 'minor'}
                      onChange={(e) => {
                        const damages = [...(draft.damages || [])]
                        damages[idx] = { ...damages[idx], severity: e.target.value }
                        setDraft((p) => ({ ...p, damages }))
                      }}
                    >
                      <option value="minor">{t('admin.deskOps.severity.minor')}</option>
                      <option value="major">{t('admin.deskOps.severity.major')}</option>
                      <option value="total">{t('admin.deskOps.severity.total')}</option>
                    </select>
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={draft.status === 'completed'}
                      placeholder={t('admin.bookingMoney.amount')}
                      value={d.estimatedCost ?? 0}
                      onChange={(e) => {
                        const damages = [...(draft.damages || [])]
                        damages[idx] = {
                          ...damages[idx],
                          estimatedCost: Number(e.target.value) || 0,
                        }
                        setDraft((p) => ({ ...p, damages }))
                      }}
                    />
                    <input
                      className={inputClass}
                      disabled={draft.status === 'completed'}
                      placeholder={t('admin.deskOps.damageDesc')}
                      value={d.description || ''}
                      onChange={(e) => {
                        const damages = [...(draft.damages || [])]
                        damages[idx] = { ...damages[idx], description: e.target.value }
                        setDraft((p) => ({ ...p, damages }))
                      }}
                    />
                  </div>
                ))}
                {draft.suggestedLateFee > 0 ? (
                  <DetailRow label={t('admin.deskOps.lateFeeSuggest')}>
                    {moneyFmt(currency, draft.suggestedLateFee)} ({draft.suggestedLateHours}h)
                  </DetailRow>
                ) : null}
              </div>
            )}

            <div className="admin-desk__editor-footer">
              {draft.status !== 'completed' && (
                <>
                  <label className="admin-btn admin-btn--secondary admin-btn--sm cursor-pointer">
                    {t('admin.deskOps.addPhoto')}
                    <input type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    className="admin-btn admin-btn--secondary admin-btn--sm"
                    onClick={saveDraft}
                  >
                    {t('admin.common.save')}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="admin-btn admin-btn--primary admin-btn--sm"
                    onClick={completeDraft}
                  >
                    {t('admin.deskOps.complete')}
                  </button>
                </>
              )}
              <span className="admin-desk__photo-count">
                {(draft.photos || []).length} {t('admin.deskOps.photos')}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </DetailSection>
  )
}

export default BookingDeskOps

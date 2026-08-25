import React, { useCallback, useEffect, useState } from 'react'
import { DetailSection, DetailRow } from '../ui/DetailSection'
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

/**
 * Deposit ops + pickup/return inspections for desk workflow.
 */
const BookingDeskOps = ({ bookingId, currency, onFinancialChange, onStatusHint }) => {
  const { axios, currency: ctxCurrency } = useAppContext()
  const { t } = useI18n()
  const money = currency || ctxCurrency || 'MAD '

  const [financial, setFinancial] = useState(null)
  const [inspections, setInspections] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [depositMethod, setDepositMethod] = useState('cash')
  const [depositAmount, setDepositAmount] = useState('')
  const [activeType, setActiveType] = useState('pickup')
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
        setDepositAmount(remaining > 0 ? String(remaining) : (req > 0 ? String(req) : ''))
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
    setActiveType(type)
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

  const pickup = inspections.find((i) => i.type === 'pickup' && i.status === 'completed')
  const ret = inspections.find((i) => i.type === 'return' && i.status === 'completed')

  return (
    <DetailSection title={t('admin.deskOps.title')} collapsible defaultOpen>
      <div className="mb-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] px-2 py-2">
          <p className="text-[10px] uppercase text-[var(--admin-fg-muted)]">{t('admin.bookingMoney.deposit')}</p>
          <p className="font-semibold tabular-nums">{money}{financial?.depositRequired || 0}</p>
        </div>
        <div className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] px-2 py-2">
          <p className="text-[10px] uppercase text-[var(--admin-fg-muted)]">{t('admin.bookingMoney.depositHeld')}</p>
          <p className="font-semibold tabular-nums">{money}{financial?.depositHeld || 0}</p>
        </div>
        <div className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] px-2 py-2">
          <p className="text-[10px] uppercase text-[var(--admin-fg-muted)]">{t('admin.deskOps.pickup')}</p>
          <p className="font-semibold">{pickup ? t('admin.deskOps.done') : t('admin.deskOps.pending')}</p>
        </div>
        <div className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] px-2 py-2">
          <p className="text-[10px] uppercase text-[var(--admin-fg-muted)]">{t('admin.deskOps.return')}</p>
          <p className="font-semibold">{ret ? t('admin.deskOps.done') : t('admin.deskOps.pending')}</p>
        </div>
      </div>

      <p className="mb-2 text-[11px] font-semibold uppercase text-[var(--admin-fg-muted)]">
        {t('admin.deskOps.depositActions')}
      </p>
      <div className="mb-3 grid gap-2 sm:grid-cols-3">
        <div>
          <label className={labelClass}>{t('admin.bookingMoney.amount')}</label>
          <input className={inputClass} type="number" min="0" step="0.01" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>{t('admin.bookingMoney.method')}</label>
          <select className={inputClass} value={depositMethod} onChange={(e) => setDepositMethod(e.target.value)}>
            {['cash', 'card_tpe', 'bank_transfer', 'other'].map((m) => (
              <option key={m} value={m}>{t(`admin.bookingMoney.methods.${m}`)}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-end gap-1">
          <button type="button" disabled={busy} className="admin-btn admin-btn--primary admin-btn--sm" onClick={() => depositAction('hold')}>
            {t('admin.deskOps.hold')}
          </button>
          <button type="button" disabled={busy} className="admin-btn admin-btn--secondary admin-btn--sm" onClick={() => depositAction('release')}>
            {t('admin.deskOps.release')}
          </button>
          <button type="button" disabled={busy} className="admin-btn admin-btn--danger admin-btn--sm" onClick={() => depositAction('claim')}>
            {t('admin.deskOps.claim')}
          </button>
        </div>
      </div>

      <p className="mb-2 text-[11px] font-semibold uppercase text-[var(--admin-fg-muted)]">
        {t('admin.deskOps.inspections')}
      </p>
      <div className="mb-3 flex flex-wrap gap-1">
        <button type="button" disabled={busy} className="admin-btn admin-btn--secondary admin-btn--sm" onClick={() => openInspection('pickup')}>
          {t('admin.deskOps.openPickup')}
        </button>
        <button type="button" disabled={busy} className="admin-btn admin-btn--secondary admin-btn--sm" onClick={() => openInspection('return')}>
          {t('admin.deskOps.openReturn')}
        </button>
      </div>

      {draft ? (
        <div className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] p-3">
          <p className="mb-2 text-sm font-semibold text-[var(--admin-fg)]">
            {draft.type === 'pickup' ? t('admin.deskOps.pickup') : t('admin.deskOps.return')}
            {' · '}
            {draft.status === 'completed' ? t('admin.deskOps.done') : t('admin.deskOps.draft')}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className={labelClass}>{t('admin.deskOps.odometer')}</label>
              <input
                className={inputClass}
                type="number"
                disabled={draft.status === 'completed'}
                value={draft.odometer ?? ''}
                onChange={(e) => setDraft((p) => ({ ...p, odometer: e.target.value === '' ? null : Number(e.target.value) }))}
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
                  <option key={f} value={f}>{t(`admin.deskOps.fuelLevels.${f}`)}</option>
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

          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            {['keys', 'papers', 'spareTire', 'jack', 'clean'].map((key) => (
              <label key={key} className="inline-flex items-center gap-1.5">
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
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase text-[var(--admin-fg-muted)]">{t('admin.deskOps.damages')}</p>
                {draft.status !== 'completed' && (
                  <button type="button" className="admin-btn admin-btn--secondary admin-btn--sm" onClick={addDamageRow}>
                    {t('admin.deskOps.addDamage')}
                  </button>
                )}
              </div>
              {(draft.damages || []).map((d, idx) => (
                <div key={d.id || idx} className="mb-2 grid gap-1 sm:grid-cols-4">
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
                      damages[idx] = { ...damages[idx], estimatedCost: Number(e.target.value) || 0 }
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
                  {money}{draft.suggestedLateFee} ({draft.suggestedLateHours}h)
                </DetailRow>
              ) : null}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {draft.status !== 'completed' && (
              <>
                <label className="admin-btn admin-btn--secondary admin-btn--sm cursor-pointer">
                  {t('admin.deskOps.addPhoto')}
                  <input type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
                </label>
                <button type="button" disabled={busy} className="admin-btn admin-btn--secondary admin-btn--sm" onClick={saveDraft}>
                  {t('admin.common.save')}
                </button>
                <button type="button" disabled={busy} className="admin-btn admin-btn--primary admin-btn--sm" onClick={completeDraft}>
                  {t('admin.deskOps.complete')}
                </button>
              </>
            )}
            <span className="text-[11px] text-[var(--admin-fg-muted)]">
              {(draft.photos || []).length} {t('admin.deskOps.photos')}
            </span>
          </div>
        </div>
      ) : null}
    </DetailSection>
  )
}

export default BookingDeskOps

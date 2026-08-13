import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAppContext } from '../../../context/AppContext'
import { getErrorMessage } from '../../../utils/apiError'
import {
  Field,
  SettingsPanel,
  settingsInputClass,
  useSettingsLabel,
} from './settingsShared'

const WhatsAppSettings = () => {
  const { axios, fetchUser } = useAppContext()
  const label = useSettingsLabel()
  const [waForm, setWaForm] = useState({
    reservationNumber: '',
    confirmationNumber: '',
  })
  const [resolved, setResolved] = useState({ reservation: '', confirmation: '' })
  const [fallbackDial, setFallbackDial] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await axios.get('/api/owner/settings/whatsapp')
        if (cancelled) return
        if (data.success) {
          const settings = data.whatsappSettings || {}
          setWaForm({
            reservationNumber: settings.reservationNumber || '',
            confirmationNumber: settings.confirmationNumber || '',
          })
          setResolved(settings.resolved || { reservation: '', confirmation: '' })
          setFallbackDial(settings.fallbackDial || '')
        } else {
          toast.error(data.message || label('admin.settings.loadFailed', 'Could not load WhatsApp settings'))
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(getErrorMessage(error, label('admin.settings.loadFailed', 'Could not load WhatsApp settings')))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [axios])

  const handleSave = async (e) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      const { data } = await axios.put('/api/owner/settings/whatsapp', {
        reservationNumber: waForm.reservationNumber,
        confirmationNumber: waForm.confirmationNumber,
      })
      if (!data.success) {
        toast.error(data.message || label('admin.settings.saveFailed', 'Could not save WhatsApp settings'))
        return
      }
      const settings = data.whatsappSettings || {}
      setWaForm({
        reservationNumber: settings.reservationNumber || '',
        confirmationNumber: settings.confirmationNumber || '',
      })
      setResolved(settings.resolved || { reservation: '', confirmation: '' })
      setFallbackDial(settings.fallbackDial || '')
      await fetchUser()
      toast.success(data.message || label('admin.settings.saved', 'WhatsApp settings saved'))
    } catch (error) {
      toast.error(getErrorMessage(error, label('admin.settings.saveFailed', 'Could not save WhatsApp settings')))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <SettingsPanel>
        <p className="text-sm text-muted">{label('admin.common.loading', 'Loading...')}</p>
      </SettingsPanel>
    )
  }

  return (
    <SettingsPanel className="max-w-3xl">
      <form onSubmit={handleSave} className="space-y-4">
        <p className="text-sm text-muted">
          {label(
            'admin.settings.whatsappHint',
            'These numbers are saved in the database and used for wa.me reservation and confirmation messages. No redeploy needed when you change them.',
          )}
        </p>
        <Field
          label={label('admin.settings.reservationNumber', 'Reservation WhatsApp number')}
          hint={`${label('admin.settings.usedForReservations', 'Used when guests send reservation messages.')}${resolved.reservation ? ` · ${label('admin.settings.activeDial', 'Active')}: +${resolved.reservation}` : ''}`}
        >
          <input
            className={settingsInputClass}
            value={waForm.reservationNumber}
            onChange={(e) => setWaForm((f) => ({ ...f, reservationNumber: e.target.value }))}
            placeholder={label('admin.settings.numberPlaceholder', 'e.g. 212665330116 or +212 665 330 116')}
            inputMode="tel"
            autoComplete="tel"
          />
        </Field>
        <Field
          label={label('admin.settings.confirmationNumber', 'Booking confirmation WhatsApp number')}
          hint={`${label('admin.settings.usedForConfirmations', 'Used when you send booking confirmation / completion links.')}${resolved.confirmation ? ` · ${label('admin.settings.activeDial', 'Active')}: +${resolved.confirmation}` : ''}`}
        >
          <input
            className={settingsInputClass}
            value={waForm.confirmationNumber}
            onChange={(e) => setWaForm((f) => ({ ...f, confirmationNumber: e.target.value }))}
            placeholder={label('admin.settings.numberPlaceholder', 'e.g. 212665330116 or +212 665 330 116')}
            inputMode="tel"
            autoComplete="tel"
          />
        </Field>
        {fallbackDial ? (
          <p className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2 text-xs text-[var(--admin-fg-muted)]">
            {label('admin.settings.fallbackNote', 'If a field is empty, the app falls back to {{number}} (environment default).').replace('{{number}}', `+${fallbackDial}`)}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={saving}
          className="admin-btn admin-btn--primary disabled:opacity-60"
        >
          {saving
            ? label('admin.common.loading', 'Loading...')
            : label('admin.settings.save', 'Save WhatsApp settings')}
        </button>
      </form>
    </SettingsPanel>
  )
}

export default WhatsAppSettings

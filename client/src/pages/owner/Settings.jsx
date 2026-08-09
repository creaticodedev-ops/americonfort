import React, { useEffect, useState } from 'react'
import Title from '../../components/owner/Title'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import toast from 'react-hot-toast'
import { getErrorMessage } from '../../utils/apiError'

const Settings = () => {
  const { axios, fetchUser } = useAppContext()
  const { t } = useI18n()
  const [form, setForm] = useState({
    reservationNumber: '',
    confirmationNumber: '',
  })
  const [resolved, setResolved] = useState({ reservation: '', confirmation: '' })
  const [fallbackDial, setFallbackDial] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/owner/settings/whatsapp')
      if (!data.success) {
        toast.error(data.message || t('admin.settings.loadFailed'))
        return
      }
      const settings = data.whatsappSettings || {}
      setForm({
        reservationNumber: settings.reservationNumber || '',
        confirmationNumber: settings.confirmationNumber || '',
      })
      setResolved(settings.resolved || { reservation: '', confirmation: '' })
      setFallbackDial(settings.fallbackDial || '')
    } catch (error) {
      toast.error(getErrorMessage(error, t('admin.settings.loadFailed')))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      const { data } = await axios.put('/api/owner/settings/whatsapp', {
        reservationNumber: form.reservationNumber,
        confirmationNumber: form.confirmationNumber,
      })
      if (!data.success) {
        toast.error(data.message || t('admin.settings.saveFailed'))
        return
      }
      const settings = data.whatsappSettings || {}
      setForm({
        reservationNumber: settings.reservationNumber || '',
        confirmationNumber: settings.confirmationNumber || '',
      })
      setResolved(settings.resolved || { reservation: '', confirmation: '' })
      setFallbackDial(settings.fallbackDial || '')
      await fetchUser()
      toast.success(data.message || t('admin.settings.saved'))
    } catch (error) {
      toast.error(getErrorMessage(error, t('admin.settings.saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-borderColor bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-primary/40'

  return (
    <div className="px-4 pt-8 md:px-8 lg:px-10 xl:px-12 md:pt-10 flex-1 pb-12 min-w-0 space-y-6">
      <Title title={t('admin.settings.title')} subTitle={t('admin.settings.subtitle')} />

      <section className="max-w-2xl rounded-2xl border border-borderColor bg-white p-5 sm:p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-ink">{t('admin.settings.whatsappTitle')}</h2>
          <p className="mt-1 text-sm text-muted">{t('admin.settings.whatsappHint')}</p>
        </div>

        {loading ? (
          <p className="text-sm text-muted">{t('admin.common.loading')}</p>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-600" htmlFor="wa-reservation">
                {t('admin.settings.reservationNumber')}
              </label>
              <input
                id="wa-reservation"
                className={inputClass}
                value={form.reservationNumber}
                onChange={(e) => setForm((f) => ({ ...f, reservationNumber: e.target.value }))}
                placeholder={t('admin.settings.numberPlaceholder')}
                inputMode="tel"
                autoComplete="tel"
              />
              <p className="text-xs text-muted">
                {t('admin.settings.usedForReservations')}
                {resolved.reservation ? ` · ${t('admin.settings.activeDial')}: +${resolved.reservation}` : ''}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-600" htmlFor="wa-confirmation">
                {t('admin.settings.confirmationNumber')}
              </label>
              <input
                id="wa-confirmation"
                className={inputClass}
                value={form.confirmationNumber}
                onChange={(e) => setForm((f) => ({ ...f, confirmationNumber: e.target.value }))}
                placeholder={t('admin.settings.numberPlaceholder')}
                inputMode="tel"
                autoComplete="tel"
              />
              <p className="text-xs text-muted">
                {t('admin.settings.usedForConfirmations')}
                {resolved.confirmation ? ` · ${t('admin.settings.activeDial')}: +${resolved.confirmation}` : ''}
              </p>
            </div>

            {fallbackDial ? (
              <p className="rounded-xl border border-borderColor bg-sand/40 px-3 py-2 text-xs text-muted">
                {t('admin.settings.fallbackNote', { number: `+${fallbackDial}` })}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? t('admin.common.loading') : t('admin.settings.save')}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}

export default Settings

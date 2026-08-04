import React from 'react'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'

const CONTACT_PHONE = '+212665330116'
const CONTACT_EMAIL = 'americonfort@gmail.com'
const CONTACT_WHATSAPP = '212665330116'

/**
 * Shown when the agency trial has expired.
 * Does not delete or alter any business data — only blocks admin UI.
 */
const TrialExpired = () => {
  const { logout, license } = useAppContext()
  const { t } = useI18n()

  const endsAt = license?.trialEndsAt
    ? new Date(license.trialEndsAt).toLocaleString()
    : null

  const whatsappUrl = `https://wa.me/${CONTACT_WHATSAPP}?text=${encodeURIComponent(
    t('admin.trial.whatsappMessage')
  )}`

  return (
    <div className="min-h-[calc(100svh-57px)] flex items-center justify-center px-4 py-12 bg-light">
      <div className="w-full max-w-lg rounded-2xl border border-borderColor bg-white p-8 sm:p-10 shadow-[0_18px_50px_-28px_rgba(22,18,16,0.3)] text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700 text-2xl font-semibold">
          !
        </div>

        <p className="text-[11px] uppercase tracking-[0.18em] text-primary font-medium mb-2">
          {t('admin.trial.eyebrow')}
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-medium text-ink">
          {t('admin.trial.title')}
        </h1>
        <p className="mt-3 text-sm sm:text-base text-muted leading-relaxed">
          {t('admin.trial.subtitle')}
        </p>

        {endsAt && (
          <p className="mt-4 text-xs text-gray-400">
            {t('admin.trial.endedOn', { date: endsAt })}
          </p>
        )}

        <div className="mt-6 rounded-xl bg-light border border-borderColor px-4 py-3 text-left text-sm text-gray-600 space-y-1.5">
          <p className="font-medium text-ink">{t('admin.trial.dataSafeTitle')}</p>
          <p className="text-muted text-xs sm:text-sm leading-relaxed">
            {t('admin.trial.dataSafeBody')}
          </p>
        </div>

        <div className="mt-6 space-y-2 text-sm text-gray-700">
          <p className="font-medium text-ink">{t('admin.trial.contactTitle')}</p>
          <p>
            <a href={`tel:${CONTACT_PHONE}`} className="text-primary hover:underline">
              {CONTACT_PHONE}
            </a>
          </p>
          <p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dull text-white text-sm font-medium transition-colors"
          >
            {t('admin.trial.contactWhatsapp')}
          </a>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-borderColor text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            {t('admin.trial.logout')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default TrialExpired

import React from 'react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../../../context/AppContext'
import { RelatedLink, SettingsPanel, useSettingsLabel } from './settingsShared'

const GeneralSettings = () => {
  const { user, license } = useAppContext()
  const label = useSettingsLabel()
  const profile = user?.agencyProfile || {}
  const planName = user?.entitlements?.name || user?.planSnapshot?.name || ''

  const rows = [
    { label: label('admin.generalPage.name', 'Name'), value: user?.name },
    { label: label('admin.generalPage.email', 'Email'), value: user?.email },
    { label: label('admin.generalPage.agencyName', 'Agency name'), value: user?.agencyName || profile.legalName },
    { label: label('admin.generalPage.phone', 'Phone'), value: profile.phone },
    { label: label('admin.generalPage.city', 'City'), value: profile.city },
    { label: label('admin.generalPage.country', 'Country'), value: profile.country },
    { label: label('admin.generalPage.plan', 'Plan'), value: planName },
    {
      label: label('admin.generalPage.license', 'License'),
      value: license?.licenseStatus || user?.license?.licenseStatus,
    },
  ]

  return (
    <div className="space-y-4 max-w-3xl">
      <SettingsPanel>
        <div>
          <h2 className="text-base font-semibold text-[var(--admin-fg)]">
            {label('admin.generalPage.profileTitle', 'Agency profile')}
          </h2>
          <p className="mt-1 text-sm text-[var(--admin-fg-secondary)]">
            {label(
              'admin.generalPage.profileHint',
              'These details identify your agency in the admin panel. Legal profile fields are managed with your Americonfort account.',
            )}
          </p>
        </div>
        <dl className="grid sm:grid-cols-2 gap-3">
          {rows.map((row) => (
            <div
              key={row.label}
              className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2.5"
            >
              <dt className="text-[11px] uppercase tracking-wide text-[var(--admin-fg-muted)]">{row.label}</dt>
              <dd className="mt-0.5 text-sm text-[var(--admin-fg)] break-words">{row.value || '—'}</dd>
            </div>
          ))}
        </dl>
      </SettingsPanel>

      <SettingsPanel>
        <h3 className="text-sm font-semibold text-[var(--admin-fg)]">
          {label('admin.settings.nav.relatedTools', 'Related tools')}
        </h3>
        <div className="space-y-2">
          <RelatedLink
            to="/owner/settings/whatsapp"
            title={label('admin.settings.nav.whatsapp', 'WhatsApp')}
            description={label('admin.settings.nav.whatsappDesc', 'Reservation and confirmation WhatsApp numbers.')}
          />
          <RelatedLink
            to="/owner/settings/booking"
            title={label('admin.settings.nav.booking', 'Booking Settings')}
            description={label(
              'admin.settings.nav.bookingDesc',
              'Duration, deposits, cancellation, mileage, and pickup rules.',
            )}
          />
          <RelatedLink
            to="/owner/staff"
            title={label('admin.menu.staff', 'Staff')}
            description={label('admin.staff.subtitle', 'Current dashboard account and module permissions.')}
          />
        </div>
        <p className="text-xs text-[var(--admin-fg-muted)]">
          {label('admin.generalPage.editHint', 'To change legal name, address, or billing details, contact Americonfort.')}
        </p>
        <Link to="/owner/settings/branding" className="admin-btn admin-btn--secondary inline-flex">
          {label('admin.menu.branding', 'Branding')}
        </Link>
      </SettingsPanel>
    </div>
  )
}

export default GeneralSettings

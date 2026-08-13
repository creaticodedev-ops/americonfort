import React from 'react'
import { useAppContext } from '../../../context/AppContext'
import { RelatedLink, SettingsPanel, useSettingsLabel } from './settingsShared'

const DomainSettings = () => {
  const { user, hasFeature } = useAppContext()
  const label = useSettingsLabel()
  const enabled = hasFeature('custom_domain')
  const domain = user?.agencyProfile?.primaryDomain || ''

  return (
    <div className="space-y-4 max-w-3xl">
      <SettingsPanel>
        <div>
          <h2 className="text-base font-semibold text-[var(--admin-fg)]">
            {label('admin.domainsPage.title', 'Custom domain')}
          </h2>
          <p className="mt-1 text-sm text-[var(--admin-fg-secondary)]">
            {label(
              'admin.domainsPage.hint',
              'Your public booking domain is provisioned with your plan. Domain changes are handled by Americonfort — this page is read-only.',
            )}
          </p>
        </div>

        <div className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-4 py-3 space-y-2">
          <p className="text-[11px] uppercase tracking-wide text-[var(--admin-fg-muted)]">
            {label('admin.domainsPage.status', 'Plan feature')}
          </p>
          <p className="text-sm font-medium text-[var(--admin-fg)]">
            {enabled
              ? label('admin.domainsPage.enabled', 'Custom domain is included on your plan')
              : label('admin.domainsPage.disabled', 'Custom domain is not included on your current plan')}
          </p>
        </div>

        <div className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-4 py-3 space-y-2">
          <p className="text-[11px] uppercase tracking-wide text-[var(--admin-fg-muted)]">
            {label('admin.domainsPage.current', 'Primary domain')}
          </p>
          <p className="text-sm font-medium text-[var(--admin-fg)] break-all" dir="ltr">
            {domain || label('admin.domainsPage.none', 'No custom domain configured yet')}
          </p>
        </div>

        <p className="text-xs text-[var(--admin-fg-muted)] leading-relaxed">
          {label(
            'admin.domainsPage.contact',
            'To connect or change a domain (for example agence.example.ma), contact Americonfort support. DNS and SSL are applied on the platform side.',
          )}
        </p>
      </SettingsPanel>

      <SettingsPanel>
        <h3 className="text-sm font-semibold text-[var(--admin-fg)]">
          {label('admin.settings.nav.relatedTools', 'Related tools')}
        </h3>
        <div className="space-y-2">
          <RelatedLink
            to="/owner/settings/branding"
            title={label('admin.menu.branding', 'Branding')}
            description={label('admin.settings.nav.brandingDesc', 'Logo, cachet, and template branding assets.')}
          />
          <RelatedLink
            to="/owner/settings/general"
            title={label('admin.menu.general', 'General')}
            description={label('admin.settings.nav.generalDesc', 'Agency profile and general preferences.')}
          />
        </div>
      </SettingsPanel>
    </div>
  )
}

export default DomainSettings

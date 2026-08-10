import React from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { getSettingsCategory } from './settingsCategories'
import { GuidePage, RelatedLink, useSettingsLabel } from './settingsShared'

const GUIDE_LINKS = {
  general: [
    {
      to: '/owner/settings/whatsapp',
      titleKey: 'admin.settings.nav.whatsapp',
      title: 'WhatsApp',
      descriptionKey: 'admin.settings.nav.whatsappDesc',
      description: 'Configure reservation and confirmation numbers.',
    },
    {
      to: '/owner/settings/branding',
      titleKey: 'admin.settings.nav.branding',
      title: 'Agency Branding',
      descriptionKey: 'admin.settings.nav.brandingDesc',
      description: 'Manage logo and stamp assets via templates.',
    },
  ],
  pricing: [
    {
      to: '/owner/manage-cars',
      titleKey: 'admin.menu.fleet',
      title: 'Fleet',
      descriptionKey: 'admin.settings.nav.pricingDesc',
      description: 'Set daily rates and availability per vehicle.',
    },
  ],
  branding: [
    {
      to: '/owner/templates',
      titleKey: 'admin.menu.templates',
      title: 'Export Templates',
      descriptionKey: 'admin.settings.nav.templatesHint',
      description: 'Upload logo and agency stamp used on contracts and invoices.',
    },
    {
      to: '/owner/settings/documents',
      titleKey: 'admin.settings.nav.documents',
      title: 'Contracts & Documents',
      descriptionKey: 'admin.settings.nav.documentsDesc',
      description: 'Default show/hide for the agency stamp on contracts.',
    },
  ],
  printing: [
    {
      to: '/owner/templates',
      titleKey: 'admin.menu.templates',
      title: 'Export Templates',
      descriptionKey: 'admin.settings.nav.templatesHint',
      description: 'Page size, CSS, and PDF layout for printed documents.',
    },
    {
      to: '/owner/contracts',
      titleKey: 'admin.menu.contracts',
      title: 'Contracts',
      descriptionKey: 'admin.settings.nav.contractsHint',
      description: 'Generate and download printable contract PDFs.',
    },
  ],
  security: [
    {
      to: '/owner/audit',
      titleKey: 'admin.menu.audit',
      title: 'Audit log',
      description: 'Review owner-scoped actions recorded for this agency.',
    },
  ],
  notifications: [
    {
      to: '/owner/settings/booking',
      titleKey: 'admin.settings.nav.booking',
      title: 'Booking Settings',
      descriptionKey: 'admin.settings.nav.bookingDesc',
      description: 'Pending reservation expiry and owner notify options.',
    },
    {
      to: '/owner/settings/whatsapp',
      titleKey: 'admin.settings.nav.whatsapp',
      title: 'WhatsApp',
      descriptionKey: 'admin.settings.nav.whatsappDesc',
      description: 'Numbers used for reservation and confirmation messages.',
    },
  ],
}

const GuideSettings = () => {
  const { categoryId } = useParams()
  const label = useSettingsLabel()
  const category = getSettingsCategory(categoryId)
  const links = GUIDE_LINKS[categoryId] || []

  if (!category) {
    return (
      <GuidePage
        title={label('admin.settings.nav.notFound', 'Settings category not found')}
        description={label('admin.settings.nav.notFoundDesc', 'Return to Settings and choose a valid category.')}
      />
    )
  }

  if (category.kind === 'link' && category.to) {
    return <Navigate to={category.to} replace />
  }

  return (
    <GuidePage
      title={label(category.titleKey, category.title)}
      description={label(category.descriptionKey, category.description)}
    >
      {links.map((item) => (
        <RelatedLink
          key={item.to}
          to={item.to}
          title={label(item.titleKey || '', item.title)}
          description={label(item.descriptionKey || '', item.description)}
        />
      ))}
    </GuidePage>
  )
}

export default GuideSettings

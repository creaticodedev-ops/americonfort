/**
 * Settings hub categories. `kind`:
 * - `page` → dedicated settings form under /owner/settings/:id
 * - `link` → navigates to an existing owner module (no duplicated logic)
 * - `guide` → informational page with deep-links to related modules
 */
export const SETTINGS_CATEGORIES = [
  {
    id: 'general',
    kind: 'page',
    titleKey: 'admin.settings.nav.general',
    title: 'General Settings',
    descriptionKey: 'admin.settings.nav.generalDesc',
    description: 'Agency profile and general preferences.',
    icon: 'sliders',
  },
  {
    id: 'booking',
    kind: 'page',
    titleKey: 'admin.settings.nav.booking',
    title: 'Booking Settings',
    descriptionKey: 'admin.settings.nav.bookingDesc',
    description: 'Duration, deposits, cancellation, mileage, and pickup rules.',
    icon: 'car',
  },
  {
    id: 'pricing',
    kind: 'guide',
    titleKey: 'admin.settings.nav.pricing',
    title: 'Pricing & Promotions',
    descriptionKey: 'admin.settings.nav.pricingDesc',
    description: 'Vehicle rates and promotional pricing.',
    icon: 'tag',
  },
  {
    id: 'documents',
    kind: 'page',
    titleKey: 'admin.settings.nav.documents',
    title: 'Contracts & Documents',
    descriptionKey: 'admin.settings.nav.documentsDesc',
    description: 'Agency stamp, contract defaults, and document templates.',
    icon: 'document',
  },
  {
    id: 'invoices',
    kind: 'page',
    titleKey: 'admin.settings.nav.invoices',
    title: 'Invoices',
    descriptionKey: 'admin.settings.nav.invoicesDesc',
    description: 'Invoice stamp defaults and billing documents.',
    icon: 'invoice',
  },
  {
    id: 'branding',
    kind: 'page',
    titleKey: 'admin.settings.nav.branding',
    title: 'Agency Branding',
    descriptionKey: 'admin.settings.nav.brandingDesc',
    description: 'Logo, cachet, and template branding assets.',
    icon: 'brand',
  },
  {
    id: 'domains',
    kind: 'page',
    titleKey: 'admin.settings.nav.domains',
    title: 'Custom Domain',
    descriptionKey: 'admin.settings.nav.domainsDesc',
    description: 'Public booking domain linked to your agency plan.',
    icon: 'pin',
  },
  {
    id: 'printing',
    kind: 'guide',
    titleKey: 'admin.settings.nav.printing',
    title: 'Printing',
    descriptionKey: 'admin.settings.nav.printingDesc',
    description: 'Print-ready PDF layout and export options.',
    icon: 'print',
  },
  {
    id: 'whatsapp',
    kind: 'page',
    titleKey: 'admin.settings.nav.whatsapp',
    title: 'WhatsApp',
    descriptionKey: 'admin.settings.nav.whatsappDesc',
    description: 'Reservation and confirmation WhatsApp numbers.',
    icon: 'chat',
  },
  {
    id: 'locations',
    kind: 'link',
    to: '/owner/locations',
    kindLabel: 'module',
    titleKey: 'admin.settings.nav.locations',
    title: 'Locations',
    descriptionKey: 'admin.settings.nav.locationsDesc',
    description: 'Pickup cities, addresses, and delivery fees.',
    icon: 'pin',
  },
  {
    id: 'security',
    kind: 'link',
    to: '/owner/staff',
    kindLabel: 'module',
    titleKey: 'admin.settings.nav.security',
    title: 'Security & Permissions',
    descriptionKey: 'admin.settings.nav.securityDesc',
    description: 'Access control and account security.',
    icon: 'lock',
  },
  {
    id: 'notifications',
    kind: 'guide',
    titleKey: 'admin.settings.nav.notifications',
    title: 'Notifications',
    descriptionKey: 'admin.settings.nav.notificationsDesc',
    description: 'Owner alerts and reservation notifications.',
    icon: 'bell',
  },
]

export const getSettingsCategory = (id) =>
  SETTINGS_CATEGORIES.find((c) => c.id === id) || null

export default SETTINGS_CATEGORIES

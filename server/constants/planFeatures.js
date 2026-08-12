/**
 * Single catalog of SaaS product features (entitlements).
 * Controllers/middleware must import keys from here — never scatter ad-hoc strings.
 * Plan names live in the Plan collection (DB), not in this file.
 *
 * Distinct from OWNER_PERMISSIONS (staff RBAC on a single agency).
 */

export const PLAN_FEATURES = Object.freeze([
  'fleet',
  'bookings',
  'online_reservations',
  'whatsapp',
  'promotions',
  'contracts',
  'invoices',
  'analytics',
  'custom_domain',
  'seo_tools',
  'agency',
  'customers',
  'calendar',
  'maintenance',
  'reports',
  'templates',
  'payments',
  'accounting',
  'chauffeurs',
  'partners',
  'signature_requests',
  'contract_extensions',
  'employees',
]);

/** Human labels for Super Admin / owner UI (keys stay the source of truth). */
export const PLAN_FEATURE_META = Object.freeze({
  fleet: { label: 'Fleet management', description: 'Vehicles, availability, and website visibility' },
  bookings: { label: 'Reservations', description: 'Owner booking management and walk-in flows' },
  online_reservations: { label: 'Online reservations', description: 'Public website booking' },
  whatsapp: { label: 'WhatsApp', description: 'WhatsApp reservation and notification settings' },
  promotions: { label: 'Promotions', description: 'Promotional offers and campaigns' },
  contracts: { label: 'Contracts', description: 'Rental contract generation and PDFs' },
  invoices: { label: 'Invoices', description: 'Customer invoice generation and PDFs' },
  analytics: { label: 'Analytics', description: 'Revenue and performance analytics' },
  custom_domain: { label: 'Custom domain', description: 'Agency custom domain / subdomain' },
  seo_tools: { label: 'SEO tools', description: 'SEO and landing-page tooling' },
  agency: { label: 'Agency profile', description: 'Agency branding and profile settings' },
  customers: { label: 'Customers', description: 'CRM and guest customer records' },
  calendar: { label: 'Calendar', description: 'Booking calendar views' },
  maintenance: { label: 'Maintenance', description: 'Fleet maintenance tracking' },
  reports: { label: 'Reports', description: 'Operational report exports' },
  templates: { label: 'Export templates', description: 'Document export templates' },
  payments: { label: 'Payments', description: 'Booking payment tracking' },
  accounting: { label: 'Accounting', description: 'Revenues, expenses, and net result' },
  chauffeurs: { label: 'Chauffeurs', description: 'Agency chauffeur management' },
  partners: { label: 'Partners', description: 'Samsars and partner companies' },
  signature_requests: { label: 'Signature requests', description: 'Customer contract signature workflow' },
  contract_extensions: { label: 'Contract extensions', description: 'Extend rental periods with pricing' },
  employees: { label: 'Employees', description: 'Agency employee directory (personnel records, not logins)' },
});

/** 0 = unlimited for every numeric limit. */
export const UNLIMITED_LIMITS = Object.freeze({
  maxVehicles: 0,
  maxUsers: 0,
  maxReservations: 0,
});

export const LIMIT_KEYS = Object.freeze(['maxVehicles', 'maxUsers', 'maxReservations']);

export const isPlanFeature = (key) => PLAN_FEATURES.includes(key);

export const normalizePlanFeatures = (features) => {
  if (!Array.isArray(features)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of features) {
    const key = String(raw || '').trim();
    if (!isPlanFeature(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
};

export const normalizePlanLimits = (limits = {}) => {
  const next = { ...UNLIMITED_LIMITS };
  for (const key of LIMIT_KEYS) {
    if (limits[key] === undefined || limits[key] === null || limits[key] === '') continue;
    const n = Number(limits[key]);
    next[key] = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  }
  return next;
};

export const featureCatalog = () =>
  PLAN_FEATURES.map((key) => ({
    key,
    label: PLAN_FEATURE_META[key]?.label || key,
    description: PLAN_FEATURE_META[key]?.description || '',
  }));

export default {
  PLAN_FEATURES,
  PLAN_FEATURE_META,
  UNLIMITED_LIMITS,
  LIMIT_KEYS,
  isPlanFeature,
  normalizePlanFeatures,
  normalizePlanLimits,
  featureCatalog,
};

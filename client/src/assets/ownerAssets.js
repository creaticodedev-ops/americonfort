/** Owner/admin-only assets — imported by lazy owner routes, not the public shell. */
import { assets as publicAssets } from './assets';
import addIcon from './addIcon.svg';
import carIcon from './carIcon.svg';
import carIconColored from './carIconColored.svg';
import dashboardIcon from './dashboardIcon.svg';
import dashboardIconColored from './dashboardIconColored.svg';
import addIconColored from './addIconColored.svg';
import listIcon from './listIcon.svg';
import listIconColored from './listIconColored.svg';
import cautionIconColored from './cautionIconColored.svg';
import arrow_icon from './arrow_icon.svg';
import check_icon from './check_icon.svg';
import tick_icon from './tick_icon.svg';
import delete_icon from './delete_icon.svg';
import eye_icon from './eye_icon.svg';
import eye_close_icon from './eye_close_icon.svg';
import filter_icon from './filter_icon.svg';
import edit_icon from './edit_icon.svg';
import calendar_icon_colored from './calendar_icon_colored.svg';
import location_icon_colored from './location_icon_colored.svg';
import upload_icon from './upload_icon.svg';

export const assets = {
  ...publicAssets,
  addIcon,
  carIcon,
  carIconColored,
  dashboardIcon,
  dashboardIconColored,
  addIconColored,
  listIcon,
  listIconColored,
  cautionIconColored,
  arrow_icon,
  check_icon,
  tick_icon,
  delete_icon,
  eye_icon,
  eye_close_icon,
  filter_icon,
  edit_icon,
  calendar_icon_colored,
  location_icon_colored,
  upload_icon,
};

export const ownerMenuLinks = [
  { nameKey: 'admin.menu.dashboard', path: '/owner', icon: dashboardIcon, coloredIcon: dashboardIconColored, permission: 'dashboard', feature: null },
  { nameKey: 'admin.menu.analytics', path: '/owner/analytics', icon: dashboardIcon, coloredIcon: dashboardIconColored, permission: 'analytics', feature: 'analytics' },
  { nameKey: 'admin.menu.reservations', path: '/owner/manage-bookings', icon: listIcon, coloredIcon: listIconColored, permission: 'bookings', feature: 'bookings' },
  { nameKey: 'admin.menu.walkIn', path: '/owner/walk-in', icon: addIcon, coloredIcon: addIconColored, permission: 'bookings', feature: 'bookings' },
  { nameKey: 'admin.menu.calendar', path: '/owner/calendar', icon: calendar_icon_colored, coloredIcon: calendar_icon_colored, permission: 'calendar', feature: 'calendar' },
  { nameKey: 'admin.menu.customers', path: '/owner/customers', icon: publicAssets.users_icon, coloredIcon: publicAssets.users_icon, permission: 'customers', feature: 'customers' },
  { nameKey: 'admin.menu.signatureRequests', path: '/owner/signature-requests', icon: listIcon, coloredIcon: listIconColored, permission: 'signature_requests', feature: 'signature_requests' },
  { nameKey: 'admin.menu.addCar', path: '/owner/add-car', icon: addIcon, coloredIcon: addIconColored, permission: 'fleet', feature: 'fleet' },
  { nameKey: 'admin.menu.fleet', path: '/owner/manage-cars', icon: carIcon, coloredIcon: carIconColored, permission: 'fleet', feature: 'fleet' },
  { nameKey: 'admin.menu.statistics', path: '/owner/vehicle-stats', icon: dashboardIcon, coloredIcon: dashboardIconColored, permission: 'fleet', feature: 'fleet' },
  { nameKey: 'admin.menu.maintenance', path: '/owner/maintenance', icon: cautionIconColored, coloredIcon: cautionIconColored, permission: 'maintenance', feature: 'maintenance' },
  { nameKey: 'admin.menu.locations', path: '/owner/locations', icon: publicAssets.location_icon, coloredIcon: location_icon_colored, permission: 'locations', feature: null },
  { nameKey: 'admin.menu.chauffeurs', path: '/owner/chauffeurs', icon: publicAssets.users_icon, coloredIcon: publicAssets.users_icon, permission: 'chauffeurs', feature: 'chauffeurs' },
  { nameKey: 'admin.menu.samsars', path: '/owner/samsars', icon: publicAssets.users_icon, coloredIcon: publicAssets.users_icon, permission: 'partners', feature: 'partners' },
  { nameKey: 'admin.menu.partnerCompanies', path: '/owner/partner-companies', icon: listIcon, coloredIcon: listIconColored, permission: 'partners', feature: 'partners' },
  { nameKey: 'admin.menu.employees', path: '/owner/employees', icon: publicAssets.users_icon, coloredIcon: publicAssets.users_icon, permission: 'employees', feature: 'employees' },
  { nameKey: 'admin.menu.reports', path: '/owner/reports', icon: listIcon, coloredIcon: listIconColored, permission: 'reports', feature: 'reports' },
  { nameKey: 'admin.menu.contracts', path: '/owner/contracts', icon: listIcon, coloredIcon: listIconColored, permission: 'contracts', feature: 'contracts' },
  { nameKey: 'admin.menu.invoices', path: '/owner/invoices', icon: listIcon, coloredIcon: listIconColored, permission: 'contracts', feature: 'invoices' },
  { nameKey: 'admin.menu.templates', path: '/owner/templates', icon: edit_icon, coloredIcon: edit_icon, permission: 'templates', feature: 'templates' },
  { nameKey: 'admin.menu.accounting', path: '/owner/accounting', icon: dashboardIcon, coloredIcon: dashboardIconColored, permission: 'accounting', feature: 'accounting' },
  { nameKey: 'admin.menu.revenues', path: '/owner/accounting/revenues', icon: listIcon, coloredIcon: listIconColored, permission: 'accounting', feature: 'accounting' },
  { nameKey: 'admin.menu.samsarPayments', path: '/owner/accounting/samsar-payments', icon: listIcon, coloredIcon: listIconColored, permission: 'accounting', feature: 'accounting' },
  { nameKey: 'admin.menu.agencyExpenses', path: '/owner/accounting/agency-expenses', icon: listIcon, coloredIcon: listIconColored, permission: 'accounting', feature: 'accounting' },
  { nameKey: 'admin.menu.vehicleExpenses', path: '/owner/accounting/vehicle-expenses', icon: listIcon, coloredIcon: listIconColored, permission: 'accounting', feature: 'accounting' },
  { nameKey: 'admin.menu.audit', path: '/owner/audit', icon: listIcon, coloredIcon: listIconColored, permission: 'audit', feature: null },
  { nameKey: 'admin.menu.staff', path: '/owner/staff', icon: publicAssets.users_icon, coloredIcon: publicAssets.users_icon, permission: null, feature: null },
  // Always visible to owners (permission null) — agency WhatsApp config must stay reachable
  { nameKey: 'admin.menu.settings', path: '/owner/settings', icon: edit_icon, coloredIcon: edit_icon, permission: null, feature: null },
  { nameKey: 'admin.menu.general', path: '/owner/settings/general', icon: edit_icon, coloredIcon: edit_icon, permission: null, feature: null },
  { nameKey: 'admin.menu.branding', path: '/owner/settings/branding', icon: edit_icon, coloredIcon: edit_icon, permission: null, feature: null },
  { nameKey: 'admin.menu.domains', path: '/owner/settings/domains', icon: edit_icon, coloredIcon: edit_icon, permission: null, feature: null },
];

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
  { nameKey: 'admin.menu.dashboard', path: '/owner', icon: dashboardIcon, coloredIcon: dashboardIconColored, permission: 'dashboard' },
  { nameKey: 'admin.menu.analytics', path: '/owner/analytics', icon: dashboardIcon, coloredIcon: dashboardIconColored, permission: 'analytics' },
  { nameKey: 'admin.menu.reservations', path: '/owner/manage-bookings', icon: listIcon, coloredIcon: listIconColored, permission: 'bookings' },
  { nameKey: 'admin.menu.walkIn', path: '/owner/walk-in', icon: addIcon, coloredIcon: addIconColored, permission: 'bookings' },
  { nameKey: 'admin.menu.calendar', path: '/owner/calendar', icon: calendar_icon_colored, coloredIcon: calendar_icon_colored, permission: 'calendar' },
  { nameKey: 'admin.menu.customers', path: '/owner/customers', icon: publicAssets.users_icon, coloredIcon: publicAssets.users_icon, permission: 'customers' },
  { nameKey: 'admin.menu.addCar', path: '/owner/add-car', icon: addIcon, coloredIcon: addIconColored, permission: 'fleet' },
  { nameKey: 'admin.menu.fleet', path: '/owner/manage-cars', icon: carIcon, coloredIcon: carIconColored, permission: 'fleet' },
  { nameKey: 'admin.menu.vehicleStats', path: '/owner/vehicle-stats', icon: dashboardIcon, coloredIcon: dashboardIconColored, permission: 'fleet' },
  { nameKey: 'admin.menu.maintenance', path: '/owner/maintenance', icon: cautionIconColored, coloredIcon: cautionIconColored, permission: 'maintenance' },
  { nameKey: 'admin.menu.locations', path: '/owner/locations', icon: publicAssets.location_icon, coloredIcon: location_icon_colored, permission: 'locations' },
  { nameKey: 'admin.menu.reports', path: '/owner/reports', icon: listIcon, coloredIcon: listIconColored, permission: 'reports' },
  { nameKey: 'admin.menu.contracts', path: '/owner/contracts', icon: listIcon, coloredIcon: listIconColored, permission: 'contracts' },
  { nameKey: 'admin.menu.invoices', path: '/owner/invoices', icon: listIcon, coloredIcon: listIconColored, permission: 'contracts' },
  { nameKey: 'admin.menu.templates', path: '/owner/templates', icon: edit_icon, coloredIcon: edit_icon, permission: 'templates' },
  { nameKey: 'admin.menu.audit', path: '/owner/audit', icon: listIcon, coloredIcon: listIconColored, permission: 'audit' },
];

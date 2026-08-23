import express from "express";
import { protect } from "../middleware/auth.js";
import { requireOwner } from "../middleware/ownerAuth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import { requireFeature } from "../middleware/requireFeature.js";
import upload, { handleMulterError } from "../middleware/multer.js";
import {
  addCar,
  deleteCar,
  getAdminOverview,
  getCustomers,
  getDashboardData,
  getOwnerCarById,
  getOwnerCars,
  getVehicleStats,
  toggleCarAvailability,
  toggleCarWebsiteVisibility,
  updateCar,
  updateUserImage,
} from "../controllers/ownerController.js";
import {
  addCustomerNote,
  exportReport,
  getAuditLogs,
  getCrmCustomerDetail,
  getCrmCustomers,
  getNotifications,
  getOpsDashboard,
  getRevenueAnalytics,
  globalSearch,
  markNotificationRead,
  rateCustomer,
  updateCustomerStatus,
} from "../controllers/adminOpsController.js";
import {
  getFleetMaintenance,
  updateCarMaintenance,
  listMaintenanceRecords,
  createMaintenanceRecord,
  updateMaintenanceRecord,
  deleteMaintenanceRecord,
  getMaintenanceCalendar,
  getMaintenanceReport,
} from "../controllers/maintenanceController.js";
import {
  getWhatsAppSettings,
  updateWhatsAppSettings,
  getBookingSettings,
  updateBookingSettings,
  getDocumentSettings,
  updateDocumentSettings,
} from "../controllers/settingsController.js";
import {
  listOwnerClientDocuments,
  getOwnerClientDocument,
  getOwnerClientDocumentStats,
  replaceClientDocument,
} from "../controllers/clientDocumentController.js";

const ownerRouter = express.Router();
/** perm = staff RBAC; feature = SaaS plan entitlement (backend authority). */
const gate = (perm, feature) => [
  protect,
  requireOwner,
  ...(feature ? [requireFeature(feature)] : []),
  requirePermission(perm),
];

ownerRouter.post("/add-car", ...gate('fleet', 'fleet'), upload.single("image"), handleMulterError, addCar);
ownerRouter.get("/cars", ...gate('fleet', 'fleet'), getOwnerCars);
ownerRouter.get("/cars/:id", ...gate('fleet', 'fleet'), getOwnerCarById);
ownerRouter.get("/cars/:id/stats", ...gate('fleet', 'fleet'), getVehicleStats);
ownerRouter.get("/vehicles/:id", ...gate('fleet', 'fleet'), getOwnerCarById);
ownerRouter.get("/vehicles/:id/stats", ...gate('fleet', 'fleet'), getVehicleStats);
ownerRouter.post("/update-car", ...gate('fleet', 'fleet'), upload.single("image"), handleMulterError, updateCar);
ownerRouter.post("/toggle-car", ...gate('fleet', 'fleet'), toggleCarAvailability);
ownerRouter.post("/toggle-car-visibility", ...gate('fleet', 'fleet'), toggleCarWebsiteVisibility);
ownerRouter.post("/delete-car", ...gate('fleet', 'fleet'), deleteCar);

ownerRouter.get('/dashboard', ...gate('dashboard'), getDashboardData);
ownerRouter.get('/ops-dashboard', ...gate('dashboard'), getOpsDashboard);
ownerRouter.get('/analytics', ...gate('analytics', 'analytics'), getRevenueAnalytics);
ownerRouter.get('/overview', ...gate('dashboard'), getAdminOverview);
ownerRouter.get('/customers', ...gate('customers', 'customers'), getCustomers);
ownerRouter.get('/crm/customers', ...gate('customers', 'customers'), getCrmCustomers);
ownerRouter.get('/crm/customers/:email', ...gate('customers', 'customers'), getCrmCustomerDetail);
ownerRouter.get('/client-documents/stats', ...gate('customers', 'customers'), getOwnerClientDocumentStats);
ownerRouter.get('/client-documents', ...gate('customers', 'customers'), listOwnerClientDocuments);
ownerRouter.get('/client-documents/:id', ...gate('customers', 'customers'), getOwnerClientDocument);
ownerRouter.post(
  '/client-documents/:id/replace',
  ...gate('customers', 'customers'),
  upload.single('file'),
  handleMulterError,
  replaceClientDocument,
);
ownerRouter.post('/crm/rate', ...gate('customers', 'customers'), rateCustomer);
ownerRouter.post('/crm/note', ...gate('customers', 'customers'), addCustomerNote);
ownerRouter.post('/crm/status', ...gate('customers', 'customers'), updateCustomerStatus);
ownerRouter.get('/maintenance', ...gate('maintenance'), getFleetMaintenance);
ownerRouter.post('/maintenance/update', ...gate('maintenance'), updateCarMaintenance);
ownerRouter.get('/maintenance/records', ...gate('maintenance'), listMaintenanceRecords);
ownerRouter.post('/maintenance/records', ...gate('maintenance'), createMaintenanceRecord);
ownerRouter.patch('/maintenance/records', ...gate('maintenance'), updateMaintenanceRecord);
ownerRouter.post('/maintenance/records/delete', ...gate('maintenance'), deleteMaintenanceRecord);
ownerRouter.get('/maintenance/calendar', ...gate('maintenance'), getMaintenanceCalendar);
ownerRouter.get('/maintenance/report', ...gate('maintenance'), getMaintenanceReport);
ownerRouter.get('/notifications', protect, requireOwner, getNotifications);
ownerRouter.post('/notifications/read', protect, requireOwner, markNotificationRead);
ownerRouter.get('/audit-logs', ...gate('audit'), getAuditLogs);
ownerRouter.get('/search', protect, requireOwner, globalSearch);
ownerRouter.get('/reports/export', ...gate('reports'), exportReport);
ownerRouter.get('/settings/whatsapp', protect, requireOwner, requireFeature('whatsapp'), getWhatsAppSettings);
ownerRouter.put('/settings/whatsapp', protect, requireOwner, requireFeature('whatsapp'), updateWhatsAppSettings);
ownerRouter.get('/settings/booking', protect, requireOwner, getBookingSettings);
ownerRouter.put('/settings/booking', protect, requireOwner, updateBookingSettings);
ownerRouter.get('/settings/documents', protect, requireOwner, getDocumentSettings);
ownerRouter.put('/settings/documents', protect, requireOwner, updateDocumentSettings);
ownerRouter.post('/update-image', protect, requireOwner, upload.single("image"), handleMulterError, updateUserImage);

export default ownerRouter;

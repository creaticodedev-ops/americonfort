import express from "express";
import { protect } from "../middleware/auth.js";
import { requireOwner } from "../middleware/ownerAuth.js";
import { requirePermission } from "../middleware/requirePermission.js";
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

const ownerRouter = express.Router();
const gate = (perm) => [protect, requireOwner, requirePermission(perm)];

ownerRouter.post("/add-car", ...gate('fleet'), upload.single("image"), handleMulterError, addCar);
ownerRouter.get("/cars", ...gate('fleet'), getOwnerCars);
ownerRouter.get("/cars/:id", ...gate('fleet'), getOwnerCarById);
ownerRouter.get("/cars/:id/stats", ...gate('fleet'), getVehicleStats);
ownerRouter.get("/vehicles/:id", ...gate('fleet'), getOwnerCarById);
ownerRouter.get("/vehicles/:id/stats", ...gate('fleet'), getVehicleStats);
ownerRouter.post("/update-car", ...gate('fleet'), upload.single("image"), handleMulterError, updateCar);
ownerRouter.post("/toggle-car", ...gate('fleet'), toggleCarAvailability);
ownerRouter.post("/delete-car", ...gate('fleet'), deleteCar);

ownerRouter.get('/dashboard', ...gate('dashboard'), getDashboardData);
ownerRouter.get('/ops-dashboard', ...gate('dashboard'), getOpsDashboard);
ownerRouter.get('/analytics', ...gate('analytics'), getRevenueAnalytics);
ownerRouter.get('/overview', ...gate('dashboard'), getAdminOverview);
ownerRouter.get('/customers', ...gate('customers'), getCustomers);
ownerRouter.get('/crm/customers', ...gate('customers'), getCrmCustomers);
ownerRouter.get('/crm/customers/:email', ...gate('customers'), getCrmCustomerDetail);
ownerRouter.post('/crm/rate', ...gate('customers'), rateCustomer);
ownerRouter.post('/crm/note', ...gate('customers'), addCustomerNote);
ownerRouter.post('/crm/status', ...gate('customers'), updateCustomerStatus);
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
ownerRouter.post('/update-image', protect, requireOwner, upload.single("image"), handleMulterError, updateUserImage);

export default ownerRouter;

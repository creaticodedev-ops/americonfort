import express from "express";
import {
  assignBookingVehicle,
  assignBookingRelations,
  changeBookingStatus,
  changePaymentStatus,
  checkAvailabilityOfCar,
  createBooking,
  createWalkInBooking,
  deleteBooking,
  deleteBookingsBulk,
  exportOwnerBookings,
  getCalendarBookings,
  getOwnerBookings,
  updateBooking
} from "../controllers/bookingController.js";
import { getBookingFinancial, createLedgerPayment, createLedgerCharge, createLedgerRefund } from "../controllers/bookingLedgerController.js";
import { ensureCompletionLink } from "../controllers/bookingCompletionController.js";
import { protect } from "../middleware/auth.js";
import { requireOwner } from "../middleware/ownerAuth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { rateLimit } from "../middleware/rateLimit.js";

import upload, { handleMulterError } from "../middleware/multer.js";
import {
    getBookingDocumentUrl,
    uploadBookingDocuments,
    lookupClientDocument,
    linkExistingClientDocument,
} from "../controllers/bookingDocumentController.js";

const bookingRouter = express.Router();
const bookingsGate = [protect, requireOwner, requireFeature('bookings'), requirePermission('bookings')];
const calendarGate = [protect, requireOwner, requireFeature('calendar'), requirePermission('calendar')];
/** Refunds: accounting when plan/RBAC uses it; empty permissions still = full access */
const refundsGate = [protect, requireOwner, requireFeature('bookings'), requirePermission('accounting')];
const ledgerWriteLimit = rateLimit({ windowMs: 60_000, max: 40, message: 'Too many financial actions' });

bookingRouter.post('/check-availability', rateLimit({ windowMs: 60_000, max: 30 }), checkAvailabilityOfCar);
bookingRouter.post('/create', rateLimit({ windowMs: 60_000, max: 10, message: 'Too many booking attempts' }), createBooking);
bookingRouter.post('/owner/walk-in', ...bookingsGate, createWalkInBooking);
bookingRouter.get('/owner', ...bookingsGate, getOwnerBookings);
bookingRouter.get('/owner/export', ...bookingsGate, exportOwnerBookings);
bookingRouter.get('/owner/calendar', ...calendarGate, getCalendarBookings);
bookingRouter.post('/owner/completion/ensure-link', ...bookingsGate, ensureCompletionLink);
bookingRouter.post('/change-status', ...bookingsGate, changeBookingStatus);
bookingRouter.post('/change-payment-status', ...bookingsGate, changePaymentStatus);
bookingRouter.post('/update', ...bookingsGate, updateBooking);
bookingRouter.post('/assign-vehicle', ...bookingsGate, assignBookingVehicle);
bookingRouter.post('/assign-relations', ...bookingsGate, assignBookingRelations);
bookingRouter.get('/owner/client-documents/lookup', ...bookingsGate, lookupClientDocument);
bookingRouter.post('/owner/client-documents/link', ...bookingsGate, linkExistingClientDocument);
bookingRouter.get('/owner/:bookingId/financial', ...bookingsGate, getBookingFinancial);
bookingRouter.post('/owner/:bookingId/ledger/payments', ...bookingsGate, ledgerWriteLimit, createLedgerPayment);
bookingRouter.post('/owner/:bookingId/ledger/charges', ...bookingsGate, ledgerWriteLimit, createLedgerCharge);
bookingRouter.post('/owner/:bookingId/ledger/refunds', ...refundsGate, ledgerWriteLimit, createLedgerRefund);
bookingRouter.post(
  '/owner/:bookingId/documents',
  ...bookingsGate,
  rateLimit({ windowMs: 60_000, max: 20, message: 'Too many document uploads' }),
  upload.single('file'),
  handleMulterError,
  uploadBookingDocuments
);
bookingRouter.get('/owner/:bookingId/documents/:docType', ...bookingsGate, getBookingDocumentUrl);
bookingRouter.post('/delete', ...bookingsGate, deleteBooking);
bookingRouter.post('/delete-bulk', ...bookingsGate, deleteBookingsBulk);

export default bookingRouter;

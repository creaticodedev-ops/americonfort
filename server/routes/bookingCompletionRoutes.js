import express from "express";
import {
  confirmDemoPayment,
  confirmStripePayment,
  createCompletionPayment,
  getCompletionBooking,
  getCompletionContractPreview,
  streamCompletionContractPreview,
  resendCompletionLink,
  ensureCompletionLink,
  saveCompletionDetails,
  submitCompletionSignature,
  uploadCompletionDocument,
  emailDiagnostics,
  sendTestEmail,
} from "../controllers/bookingCompletionController.js";
import { protect } from "../middleware/auth.js";
import { requireOwner } from "../middleware/ownerAuth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import { rateLimit } from "../middleware/rateLimit.js";
import upload, { handleMulterError } from "../middleware/multer.js";

const completionRouter = express.Router();

const tokenLimit = rateLimit({ windowMs: 60_000, max: 30, message: "Too many requests" });
const documentUploadLimit = rateLimit({ windowMs: 60_000, max: 15, message: "Too many document uploads" });

const ownerGate = [protect, requireOwner, requirePermission("bookings")];

// Owner routes first so they are not captured by :token
completionRouter.post("/owner/ensure-link", ...ownerGate, ensureCompletionLink);
completionRouter.post("/owner/resend-link", ...ownerGate, resendCompletionLink);
completionRouter.get("/owner/email-diagnostics", ...ownerGate, emailDiagnostics);
completionRouter.post("/owner/test-email", ...ownerGate, sendTestEmail);

completionRouter.get("/:token", tokenLimit, getCompletionBooking);
completionRouter.get("/:token/contract-preview", tokenLimit, getCompletionContractPreview);
completionRouter.get("/:token/contract-preview.pdf", tokenLimit, streamCompletionContractPreview);
completionRouter.post(
  "/:token/documents",
  documentUploadLimit,
  upload.single("file"),
  handleMulterError,
  uploadCompletionDocument
);
completionRouter.post("/:token/details", tokenLimit, saveCompletionDetails);
completionRouter.post("/:token/payment/create", tokenLimit, createCompletionPayment);
completionRouter.post("/:token/payment/demo-confirm", tokenLimit, confirmDemoPayment);
completionRouter.post("/:token/payment/stripe-confirm", tokenLimit, confirmStripePayment);
completionRouter.post("/:token/signature", tokenLimit, submitCompletionSignature);

export default completionRouter;

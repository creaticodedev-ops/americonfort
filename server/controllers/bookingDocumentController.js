import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import ClientDocument from '../models/ClientDocument.js';
import { storeDocumentImage } from '../services/documentStore.js';
import {
  applyAdminDocumentUpload,
  applyWalkInCombinedDocument,
  getDocumentUrls,
} from '../services/customerDocuments.js';
import {
  upsertClientDocumentFromWalkIn,
  linkBookingToClientDocument,
} from '../services/clientDocumentService.js';
import { cleanupUploadedFile } from '../middleware/multer.js';
import { signDocumentAccessUrl } from '../middleware/uploadAccess.js';
import { logAudit } from '../utils/adminOps.js';
import { isWalkInChannel } from '../utils/bookingChannel.js';

const signDocUrl = (url) => signDocumentAccessUrl(url);

/** Upload customer documents for a reservation (walk-in / admin). */
export const uploadBookingDocuments = async (req, res) => {
  let file = req.file;
  try {
    const { bookingId } = req.params;
    const { docType, identityType } = req.body;

    if (!mongoose.isValidObjectId(bookingId)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }
    if (!file) {
      return res.status(400).json({ success: false, message: 'Please upload an image file' });
    }

    const booking = await Booking.findOne({ _id: bookingId, owner: req.user._id });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (docType === 'combined') {
      if (!isWalkInChannel(booking.channel)) {
        return res.status(400).json({
          success: false,
          message: 'Combined document upload is only available for walk-in reservations',
        });
      }
      const url = await storeDocumentImage(file, `/client-docs/${booking.reservationId || bookingId}`);
      file = null;

      const clientDoc = await upsertClientDocumentFromWalkIn({
        ownerId: req.user._id,
        booking,
        documentUrl: url,
        uploadedBy: req.user._id,
        replaceExisting: true,
      });

      applyWalkInCombinedDocument(booking, {
        url,
        uploadedBy: req.user._id,
        clientDocumentId: clientDoc?._id,
      });

      await booking.save();

      await logAudit({
        owner: req.user._id,
        actor: req.user._id,
        action: 'booking.documents.upload',
        entityType: 'Booking',
        entityId: booking._id,
        details: `Uploaded combined customer documents for ${booking.reservationId}`,
      });

      const docs = getDocumentUrls(booking);
      return res.json({
        success: true,
        message: 'Customer documents uploaded',
        clientDocumentId: clientDoc?._id,
        documents: { combinedDocumentUrl: signDocUrl(docs.combinedDocumentUrl) },
      });
    }

    if (!['driving_license', 'identity', 'passport'].includes(docType)) {
      return res.status(400).json({ success: false, message: 'Invalid document type' });
    }
    if (docType === 'identity' && !['national_id', 'passport'].includes(identityType)) {
      return res.status(400).json({ success: false, message: 'Select National ID or Passport' });
    }

    const url = await storeDocumentImage(file, `/booking-docs/${booking.reservationId || bookingId}`);
    file = null;

    applyAdminDocumentUpload(booking, {
      docType,
      identityType: docType === 'passport' ? 'passport' : identityType,
      url,
      uploadedBy: req.user._id,
    });

    await booking.save();

    await logAudit({
      owner: req.user._id,
      actor: req.user._id,
      action: 'booking.documents.upload',
      entityType: 'Booking',
      entityId: booking._id,
      details: `Uploaded ${docType} for ${booking.reservationId}`,
    });

    const docs = getDocumentUrls(booking);
    res.json({
      success: true,
      message: 'Document uploaded',
      documents: {
        drivingLicenseUrl: signDocUrl(docs.drivingLicenseUrl),
        identityDocumentUrl: signDocUrl(docs.identityDocumentUrl),
        passportUrl: signDocUrl(docs.passportUrl),
        identityType: docs.identityType,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to upload document' });
  } finally {
    cleanupUploadedFile(file);
  }
};

/** Return signed download URL for a stored customer document. */
export const getBookingDocumentUrl = async (req, res) => {
  try {
    const { bookingId, docType } = req.params;

    if (!mongoose.isValidObjectId(bookingId)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }

    const booking = await Booking.findOne({ _id: bookingId, owner: req.user._id }).lean();
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const docs = getDocumentUrls(booking);
    let url = '';
    if (docType === 'combined') url = docs.combinedDocumentUrl;
    else if (docType === 'driving_license') url = docs.drivingLicenseUrl;
    else if (docType === 'identity') url = docs.identityDocumentUrl;
    else if (docType === 'passport') url = docs.passportUrl || (docs.identityType === 'passport' ? docs.identityDocumentUrl : '');

    if (!url) {
      return res.status(404).json({ success: false, message: 'Document not available' });
    }

    res.json({ success: true, url: signDocUrl(url) });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to get document URL' });
  }
};

/** Lookup existing client document by multi-signal identity (walk-in form). */
export const lookupClientDocument = async (req, res) => {
  try {
    const { findClientDocumentMatch } = await import('../services/clientDocumentService.js');
    const {
      phone,
      customerName,
      name,
      identityDocumentNumber,
      passportNumber,
      clientDocumentId,
    } = req.query;
    const result = await findClientDocumentMatch({
      ownerId: req.user._id,
      phone,
      customerName: customerName || name,
      identityDocumentNumber,
      passportNumber,
      clientDocumentId,
    });

    // Ambiguous shared-phone hits: do not auto-reuse — staff must upload / pick explicitly
    if (result.ambiguous || !result.document?.documentUrl) {
      return res.json({
        success: true,
        found: false,
        ambiguous: Boolean(result.ambiguous),
        document: null,
        candidates: (result.candidates || []).slice(0, 5).map((c) => ({
          _id: c._id,
          customerName: c.customerName,
          customerPhone: c.customerPhone,
          identityDocumentNumber: c.identityDocumentNumber,
          passportNumber: c.passportNumber,
        })),
      });
    }

    const match = result.document;
    res.json({
      success: true,
      found: true,
      ambiguous: false,
      document: {
        _id: match._id,
        customerName: match.customerName,
        customerPhone: match.customerPhone,
        identityDocumentNumber: match.identityDocumentNumber,
        passportNumber: match.passportNumber,
        documentUrl: signDocUrl(match.documentUrl),
        reservationCount: match.reservationCount || match.bookingIds?.length || 0,
        updatedAt: match.updatedAt,
        uploadedAt: match.uploadedAt,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Lookup failed' });
  }
};

/** Link an existing client document to a walk-in booking (reuse without re-upload). */
export const linkExistingClientDocument = async (req, res) => {
  try {
    const { bookingId, clientDocumentId } = req.body;
    if (!mongoose.isValidObjectId(bookingId) || !mongoose.isValidObjectId(clientDocumentId)) {
      return res.status(400).json({ success: false, message: 'Invalid booking or document ID' });
    }

    const booking = await Booking.findOne({ _id: bookingId, owner: req.user._id });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    if (!isWalkInChannel(booking.channel)) {
      return res.status(400).json({ success: false, message: 'Only walk-in reservations support client document linking' });
    }

    const clientDoc = await ClientDocument.findOne({ _id: clientDocumentId, owner: req.user._id });
    if (!clientDoc?.documentUrl) {
      return res.status(404).json({ success: false, message: 'Client document not found' });
    }

    applyWalkInCombinedDocument(booking, {
      url: clientDoc.documentUrl,
      uploadedBy: req.user._id,
      clientDocumentId: clientDoc._id,
    });
    await booking.save();
    await linkBookingToClientDocument(booking._id, clientDoc._id);

    res.json({
      success: true,
      message: 'Existing client documents linked',
      documents: { combinedDocumentUrl: signDocUrl(clientDoc.documentUrl) },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to link document' });
  }
};

export default {
  uploadBookingDocuments,
  getBookingDocumentUrl,
  lookupClientDocument,
  linkExistingClientDocument,
};

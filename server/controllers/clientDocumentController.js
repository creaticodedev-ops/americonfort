import mongoose from 'mongoose';
import ClientDocument from '../models/ClientDocument.js';
import Booking from '../models/Booking.js';
import { storeDocumentImage } from '../services/documentStore.js';
import {
  listClientDocuments,
  getClientDocumentDetail,
  getClientDocumentStats,
} from '../services/clientDocumentService.js';
import { cleanupUploadedFile } from '../middleware/multer.js';
import { signDocumentAccessUrl } from '../middleware/uploadAccess.js';
import { logAudit } from '../utils/adminOps.js';

const signDocUrl = (url) => (url ? signDocumentAccessUrl(url) : '');

const mapClientRow = (row) => ({
  ...row,
  documentUrl: row.documentUrl ? signDocUrl(row.documentUrl) : '',
  documentCount: row.documentCount ?? (row.files?.length || (row.documentUrl ? 1 : 0)),
  hasDocuments: Boolean(row.documentCount || row.files?.length || row.documentUrl),
  files: (row.files || []).map((f) => ({
    ...f,
    url: signDocUrl(f.url),
  })),
});

const mapClientDetail = (detail) => ({
  ...detail,
  documentUrl: detail.documentUrl ? signDocUrl(detail.documentUrl) : '',
  files: (detail.files || []).map((f) => ({
    ...f,
    url: signDocUrl(f.url),
  })),
});

export const getOwnerClientDocumentStats = async (req, res) => {
  try {
    const stats = await getClientDocumentStats(req.user._id);
    res.json({ success: true, stats });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to load statistics' });
  }
};

export const listOwnerClientDocuments = async (req, res) => {
  try {
    const result = await listClientDocuments({ ownerId: req.user._id, query: req.query });
    const items = result.items.map(mapClientRow);
    res.json({ success: true, items, pagination: result.pagination });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to list client documents' });
  }
};

export const getOwnerClientDocument = async (req, res) => {
  try {
    const detail = await getClientDocumentDetail({ ownerId: req.user._id, id: req.params.id });
    if (!detail) {
      return res.status(404).json({ success: false, message: 'Client document not found' });
    }
    res.json({
      success: true,
      document: mapClientDetail(detail),
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to load client document' });
  }
};

export const replaceClientDocument = async (req, res) => {
  let file = req.file;
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid document ID' });
    }
    if (!file) {
      return res.status(400).json({ success: false, message: 'Please upload an image file' });
    }

    const doc = await ClientDocument.findOne({ _id: id, owner: req.user._id });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Client document not found' });
    }

    const url = await storeDocumentImage(file, `/client-docs/${doc._id}`);
    file = null;

    const now = new Date();
    doc.documentUrl = url;
    doc.uploadedAt = now;
    doc.uploadedBy = req.user._id;
    doc.files = doc.files || [];
    const combinedIdx = doc.files.findIndex((f) => f.type === 'combined');
    const fileEntry = {
      type: 'combined',
      url,
      uploadedAt: now,
      sourceBookingId: doc.lastBooking || null,
      channel: doc.channelFlags?.walkIn ? 'walk_in' : 'online',
    };
    if (combinedIdx >= 0) doc.files[combinedIdx] = fileEntry;
    else doc.files.push(fileEntry);

    await doc.save();

    await Booking.updateMany(
      { clientDocument: doc._id, owner: req.user._id },
      {
        $set: {
          'customerDocuments.combinedDocumentUrl': url,
          'customerDocuments.uploadedAt': now,
        },
      },
    );

    await logAudit({
      owner: req.user._id,
      actor: req.user._id,
      action: 'client_document.replace',
      entityType: 'ClientDocument',
      entityId: doc._id,
      details: `Replaced document for ${doc.customerName || doc.customerPhone}`,
    });

    res.json({
      success: true,
      message: 'Document updated',
      documentUrl: signDocUrl(url),
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to replace document' });
  } finally {
    cleanupUploadedFile(file);
  }
};

export default {
  getOwnerClientDocumentStats,
  listOwnerClientDocuments,
  getOwnerClientDocument,
  replaceClientDocument,
};

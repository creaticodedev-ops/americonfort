import mongoose from 'mongoose';
import ClientDocument from '../models/ClientDocument.js';
import Booking from '../models/Booking.js';
import { storeDocumentImage } from '../services/documentStore.js';
import {
  listClientDocuments,
  getClientDocumentDetail,
} from '../services/clientDocumentService.js';
import { cleanupUploadedFile } from '../middleware/multer.js';
import { signDocumentAccessUrl } from '../middleware/uploadAccess.js';
import { logAudit } from '../utils/adminOps.js';

const signDocUrl = (url) => signDocumentAccessUrl(url);

export const listOwnerClientDocuments = async (req, res) => {
  try {
    const result = await listClientDocuments({ ownerId: req.user._id, query: req.query });
    const items = result.items.map((row) => ({
      ...row,
      documentUrl: row.documentUrl ? signDocUrl(row.documentUrl) : '',
      hasDocument: Boolean(row.documentUrl),
    }));
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
      document: {
        ...detail,
        documentUrl: detail.documentUrl ? signDocUrl(detail.documentUrl) : '',
      },
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

    doc.documentUrl = url;
    doc.uploadedAt = new Date();
    doc.uploadedBy = req.user._id;
    await doc.save();

    await Booking.updateMany(
      { clientDocument: doc._id, owner: req.user._id },
      {
        $set: {
          'customerDocuments.combinedDocumentUrl': url,
          'customerDocuments.uploadedAt': new Date(),
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
  listOwnerClientDocuments,
  getOwnerClientDocument,
  replaceClientDocument,
};

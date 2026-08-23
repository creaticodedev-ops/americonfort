import mongoose from 'mongoose';
import ClientDocument from '../models/ClientDocument.js';
import Booking from '../models/Booking.js';
import { escapeRegex } from '../utils/listQuery.js';
import { normalizeToE164 } from '../utils/phoneValidation.js';

const asObjectId = (id) => {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return null;
  }
};

const normalizePhone = (phone) => {
  const check = normalizeToE164(phone);
  return check.valid ? check.e164 : String(phone || '').trim();
};

export const findClientDocumentMatch = async ({ ownerId, phone, identityDocumentNumber, passportNumber, clientDocumentId }) => {
  const owner = asObjectId(ownerId);
  if (!owner) return null;

  if (clientDocumentId && mongoose.isValidObjectId(clientDocumentId)) {
    const byId = await ClientDocument.findOne({ _id: clientDocumentId, owner }).lean();
    if (byId) return byId;
  }

  const phoneNorm = normalizePhone(phone);
  const cin = String(identityDocumentNumber || '').trim();
  const passport = String(passportNumber || '').trim();

  const or = [];
  if (phoneNorm) or.push({ customerPhone: phoneNorm });
  if (cin) or.push({ identityDocumentNumber: cin });
  if (passport) or.push({ passportNumber: passport });
  if (!or.length) return null;

  return ClientDocument.findOne({ owner, $or: or }).sort({ updatedAt: -1 }).lean();
};

export const upsertClientDocumentFromWalkIn = async ({
  ownerId,
  booking,
  documentUrl,
  uploadedBy,
  replaceExisting = false,
  existingClientDocumentId = null,
}) => {
  const owner = asObjectId(ownerId);
  const bookingId = booking._id || booking.id;
  if (!owner || !documentUrl) return null;

  const phone = normalizePhone(booking.customerPhone);
  const cin = String(booking.identityDocumentNumber || '').trim();
  const passport = String(booking.passportNumber || '').trim();

  let doc = null;
  if (existingClientDocumentId && mongoose.isValidObjectId(existingClientDocumentId)) {
    doc = await ClientDocument.findOne({ _id: existingClientDocumentId, owner });
  }
  if (!doc) {
    doc = await ClientDocument.findOne({
      owner,
      $or: [
        ...(phone ? [{ customerPhone: phone }] : []),
        ...(cin ? [{ identityDocumentNumber: cin }] : []),
        ...(passport ? [{ passportNumber: passport }] : []),
      ],
    }).sort({ updatedAt: -1 });
  }

  const now = new Date();
  if (doc) {
    doc.customerName = booking.customerName || doc.customerName;
    if (phone) doc.customerPhone = phone;
    if (cin) doc.identityDocumentNumber = cin;
    if (passport) doc.passportNumber = passport;
    if (replaceExisting || !doc.documentUrl) {
      doc.documentUrl = documentUrl;
      doc.uploadedAt = now;
      doc.uploadedBy = uploadedBy || doc.uploadedBy;
    }
    if (bookingId && !doc.bookingIds.some((id) => String(id) === String(bookingId))) {
      doc.bookingIds.push(bookingId);
    }
    doc.lastBooking = bookingId || doc.lastBooking;
    doc.reservationCount = doc.bookingIds.length;
    await doc.save();
    return doc;
  }

  doc = await ClientDocument.create({
    owner,
    customerName: booking.customerName || '',
    customerPhone: phone,
    identityDocumentNumber: cin,
    passportNumber: passport,
    documentUrl,
    documentType: 'combined',
    bookingIds: bookingId ? [bookingId] : [],
    lastBooking: bookingId || null,
    reservationCount: bookingId ? 1 : 0,
    uploadedBy: uploadedBy || null,
    uploadedAt: now,
  });
  return doc;
};

export const linkBookingToClientDocument = async (bookingId, clientDocumentId) => {
  if (!mongoose.isValidObjectId(bookingId) || !mongoose.isValidObjectId(clientDocumentId)) return null;
  const doc = await ClientDocument.findById(clientDocumentId);
  if (!doc) return null;
  if (!doc.bookingIds.some((id) => String(id) === String(bookingId))) {
    doc.bookingIds.push(bookingId);
    doc.reservationCount = doc.bookingIds.length;
  }
  doc.lastBooking = bookingId;
  await doc.save();
  await Booking.findByIdAndUpdate(bookingId, { $set: { clientDocument: clientDocumentId } });
  return doc;
};

export const listClientDocuments = async ({ ownerId, query = {} }) => {
  const owner = asObjectId(ownerId);
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  const filter = { owner, documentUrl: { $ne: '' } };

  const search = String(query.search || '').trim();
  if (search) {
    const re = new RegExp(escapeRegex(search), 'i');
    const digits = search.replace(/\D/g, '');
    filter.$or = [
      { customerName: re },
      { identityDocumentNumber: re },
      { passportNumber: re },
      { customerPhone: re },
    ];
    if (digits.length >= 4) {
      filter.$or.push({ customerPhone: new RegExp(escapeRegex(digits), 'i') });
    }
  }

  const [items, total] = await Promise.all([
    ClientDocument.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ClientDocument.countDocuments(filter),
  ]);

  return {
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  };
};

export const getClientDocumentDetail = async ({ ownerId, id }) => {
  const owner = asObjectId(ownerId);
  if (!owner || !mongoose.isValidObjectId(id)) return null;

  const doc = await ClientDocument.findOne({ _id: id, owner }).lean();
  if (!doc) return null;

  const bookings = doc.bookingIds?.length
    ? await Booking.find({ _id: { $in: doc.bookingIds }, owner })
        .select('reservationId status pickupDate returnDate car customerName createdAt')
        .populate('car', 'brand model licensePlate')
        .sort({ createdAt: -1 })
        .lean()
    : [];

  return { ...doc, bookings };
};

export default {
  findClientDocumentMatch,
  upsertClientDocumentFromWalkIn,
  linkBookingToClientDocument,
  listClientDocuments,
  getClientDocumentDetail,
};

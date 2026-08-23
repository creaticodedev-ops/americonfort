import mongoose from 'mongoose';
import ClientDocument from '../models/ClientDocument.js';
import Booking from '../models/Booking.js';
import { escapeRegex } from '../utils/listQuery.js';
import { backfillClientDocumentsForOwner, normalizeClientPhone, buildCustomerKey } from './clientDocumentBackfill.js';

const asObjectId = (id) => {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return null;
  }
};

const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const parseDateFilter = (query = {}) => {
  const preset = String(query.datePreset || query.date || 'all').toLowerCase();
  const now = new Date();
  if (preset === 'today') return { $gte: startOfDay(now) };
  if (preset === 'week') return { $gte: new Date(now.getTime() - 7 * 86400000) };
  if (preset === 'month') return { $gte: new Date(now.getTime() - 30 * 86400000) };
  if (preset === 'custom') {
    const from = query.from ? new Date(query.from) : null;
    const to = query.to ? new Date(query.to) : null;
    const range = {};
    if (from && !Number.isNaN(from.getTime())) range.$gte = from;
    if (to && !Number.isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999);
      range.$lte = to;
    }
    if (Object.keys(range).length) return range;
  }
  return null;
};

const documentCountOf = (row) => (Array.isArray(row.files) && row.files.length ? row.files.length : (row.documentUrl ? 1 : 0));

export const ensureClientDocumentsSynced = async (ownerId) => {
  return backfillClientDocumentsForOwner(ownerId);
};

export const findClientDocumentMatch = async ({ ownerId, phone, identityDocumentNumber, passportNumber, clientDocumentId }) => {
  await ensureClientDocumentsSynced(ownerId);
  const owner = asObjectId(ownerId);
  if (!owner) return null;

  if (clientDocumentId && mongoose.isValidObjectId(clientDocumentId)) {
    const byId = await ClientDocument.findOne({ _id: clientDocumentId, owner }).lean();
    if (byId) return byId;
  }

  const phoneNorm = normalizeClientPhone(phone);
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

  const phone = normalizeClientPhone(booking.customerPhone);
  const cin = String(booking.identityDocumentNumber || '').trim();
  const passport = String(booking.passportNumber || '').trim();
  const legacyKey = `booking:${bookingId}:combined`;
  const now = new Date();

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

  if (!doc) {
    doc = new ClientDocument({
      owner,
      customerKey: buildCustomerKey(booking),
      customerName: booking.customerName || '',
      customerPhone: phone,
      customerEmail: String(booking.customerEmail || '').trim().toLowerCase(),
      identityDocumentNumber: cin,
      passportNumber: passport,
      files: [],
      syncedLegacyKeys: [],
      bookingIds: [],
      channelFlags: { walkIn: true, online: false, channels: ['walk_in'] },
    });
  }

  doc.customerName = booking.customerName || doc.customerName;
  if (phone) doc.customerPhone = phone;
  if (cin) doc.identityDocumentNumber = cin;
  if (passport) doc.passportNumber = passport;

  doc.files = doc.files || [];
  doc.syncedLegacyKeys = doc.syncedLegacyKeys || [];

  const filePayload = {
    type: 'combined',
    url: documentUrl,
    uploadedAt: now,
    sourceBookingId: bookingId,
    channel: 'walk_in',
  };

  if (replaceExisting) {
    const idx = doc.files.findIndex((f) => f.type === 'combined');
    if (idx >= 0) doc.files[idx] = { ...doc.files[idx].toObject?.() || doc.files[idx], ...filePayload };
    else doc.files.push(filePayload);
  } else if (!doc.syncedLegacyKeys.includes(legacyKey)) {
    doc.files.push(filePayload);
    doc.syncedLegacyKeys.push(legacyKey);
  }

  doc.documentUrl = documentUrl;
  doc.documentType = 'combined';
  doc.uploadedAt = now;
  doc.uploadedBy = uploadedBy || doc.uploadedBy;

  if (bookingId && !doc.bookingIds.some((id) => String(id) === String(bookingId))) {
    doc.bookingIds.push(bookingId);
  }
  doc.lastBooking = bookingId || doc.lastBooking;
  doc.reservationCount = doc.bookingIds.length;
  doc.channelFlags = {
    walkIn: true,
    online: Boolean(doc.channelFlags?.online),
    channels: [...new Set([...(doc.channelFlags?.channels || []), 'walk_in'])],
  };

  await doc.save();
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

export const getClientDocumentStats = async (ownerId) => {
  await ensureClientDocumentsSynced(ownerId);
  const owner = asObjectId(ownerId);
  const clients = await ClientDocument.find({ owner }).lean();

  let totalDocuments = 0;
  let walkInClients = 0;
  let recentlyUpdated = 0;
  const weekAgo = new Date(Date.now() - 7 * 86400000);

  for (const c of clients) {
    const count = documentCountOf(c);
    if (count === 0) continue;
    totalDocuments += count;
    if (c.channelFlags?.walkIn) walkInClients += 1;
    if (new Date(c.updatedAt) >= weekAgo) recentlyUpdated += 1;
  }

  const clientsWithDocuments = clients.filter((c) => documentCountOf(c) > 0).length;

  return {
    totalClientsWithDocuments: clientsWithDocuments,
    totalDocuments,
    walkInClients,
    recentlyUpdated,
  };
};

export const listClientDocuments = async ({ ownerId, query = {} }) => {
  await ensureClientDocumentsSynced(ownerId);
  const owner = asObjectId(ownerId);
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const filter = { owner };

  const docStatus = String(query.docStatus || query.status || 'all').toLowerCase();
  if (docStatus === 'available') {
    filter.$or = [{ 'files.0': { $exists: true } }, { documentUrl: { $nin: ['', null] } }];
  } else if (docStatus === 'missing') {
    filter.$and = [
      { $or: [{ files: { $size: 0 } }, { files: { $exists: false } }] },
      { $or: [{ documentUrl: '' }, { documentUrl: { $exists: false } }] },
      { reservationCount: { $gt: 0 } },
    ];
  } else {
    filter.$or = [{ 'files.0': { $exists: true } }, { documentUrl: { $nin: ['', null] } }];
  }

  const search = String(query.search || '').trim();
  if (search) {
    const re = new RegExp(escapeRegex(search), 'i');
    const digits = search.replace(/\D/g, '');
    const searchOr = [
      { customerName: re },
      { identityDocumentNumber: re },
      { passportNumber: re },
      { customerPhone: re },
      { customerEmail: re },
    ];
    if (digits.length >= 4) {
      searchOr.push({ customerPhone: new RegExp(escapeRegex(digits), 'i') });
    }
    filter.$and = filter.$and || [];
    filter.$and.push({ $or: searchOr });
  }

  const docType = String(query.documentType || query.docType || 'all').toLowerCase();
  if (docType !== 'all') {
    const typeMap = {
      combined: 'combined',
      national_id: 'national_id',
      'national id': 'national_id',
      driving_license: 'driving_license',
      'driving licence': 'driving_license',
      license: 'driving_license',
      passport: 'passport',
      identity: 'identity',
      other: 'other',
    };
    const mapped = typeMap[docType] || docType;
    filter['files.type'] = mapped;
  }

  const channel = String(query.channel || query.reservationType || 'all').toLowerCase();
  if (channel === 'walk_in' || channel === 'walk-in') {
    filter['channelFlags.walkIn'] = true;
  } else if (channel === 'online') {
    filter['channelFlags.online'] = true;
  }

  const dateRange = parseDateFilter(query);
  if (dateRange) filter.updatedAt = dateRange;

  const sortBy = String(query.sortBy || 'updated').toLowerCase();
  let sort = { updatedAt: -1 };
  if (sortBy === 'name') sort = { customerName: 1 };
  else if (sortBy === 'documents') sort = { 'files': -1, updatedAt: -1 };
  else if (sortBy === 'reservations') sort = { reservationCount: -1, updatedAt: -1 };

  let items = await ClientDocument.find(filter).sort(sort).lean();

  if (sortBy === 'documents') {
    items.sort((a, b) => documentCountOf(b) - documentCountOf(a));
  }

  const total = items.length;
  items = items.slice(skip, skip + limit);

  items = items.map((row) => ({
    ...row,
    documentCount: documentCountOf(row),
    hasDocuments: documentCountOf(row) > 0,
  }));

  return {
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  };
};

export const getClientDocumentDetail = async ({ ownerId, id }) => {
  await ensureClientDocumentsSynced(ownerId);
  const owner = asObjectId(ownerId);
  if (!owner || !mongoose.isValidObjectId(id)) return null;

  const doc = await ClientDocument.findOne({ _id: id, owner }).lean();
  if (!doc) return null;

  const bookingIds = doc.bookingIds?.length ? doc.bookingIds : (doc.lastBooking ? [doc.lastBooking] : []);
  const bookings = bookingIds.length
    ? await Booking.find({ _id: { $in: bookingIds }, owner })
        .select('reservationId status pickupDate returnDate car customerName channel createdAt')
        .populate('car', 'brand model licensePlate')
        .sort({ createdAt: -1 })
        .lean()
    : [];

  return {
    ...doc,
    documentCount: documentCountOf(doc),
    reservationCount: doc.reservationCount ?? bookingIds.length,
    bookings,
  };
};

export default {
  ensureClientDocumentsSynced,
  findClientDocumentMatch,
  upsertClientDocumentFromWalkIn,
  linkBookingToClientDocument,
  listClientDocuments,
  getClientDocumentDetail,
  getClientDocumentStats,
};

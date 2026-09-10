import mongoose from 'mongoose';
import ClientDocument from '../models/ClientDocument.js';
import Booking from '../models/Booking.js';
import { escapeRegex } from '../utils/listQuery.js';
import {
  backfillClientDocumentsForOwner,
  buildCustomerKey,
  resolveClientDocumentForIdentity,
} from './clientDocumentBackfill.js';
import { identityFromFields, identityFromBooking } from './customerIdentity.js';

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

/**
 * Resolve a ClientDocument for lookup / reuse.
 * Uses multi-signal identity scoring — shared phones are not auto-merged
 * when names or official IDs indicate different people.
 *
 * @returns {{ document: object|null, ambiguous: boolean, candidates: object[], score: number }}
 */
export const findClientDocumentMatch = async ({
  ownerId,
  phone,
  customerName,
  name,
  identityDocumentNumber,
  passportNumber,
  clientDocumentId,
}) => {
  await ensureClientDocumentsSynced(ownerId);
  const owner = asObjectId(ownerId);
  if (!owner) {
    return { document: null, ambiguous: false, candidates: [], score: 0 };
  }

  const identity = identityFromFields({
    clientDocumentId,
    name: customerName || name,
    phone,
    identityDocumentNumber,
    passportNumber,
  });

  const resolved = await resolveClientDocumentForIdentity(owner, identity, {
    preferredId: clientDocumentId,
  });

  return {
    document: resolved.match || null,
    ambiguous: Boolean(resolved.ambiguous),
    candidates: resolved.candidates || [],
    score: resolved.score || 0,
  };
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

  const identity = identityFromBooking(booking);
  const phone = identity.phone;
  const cin = identity.cin;
  const passport = identity.passport;
  const legacyKey = `booking:${bookingId}:combined`;
  const now = new Date();

  let doc = null;
  if (existingClientDocumentId && mongoose.isValidObjectId(existingClientDocumentId)) {
    doc = await ClientDocument.findOne({ _id: existingClientDocumentId, owner });
  }
  if (!doc) {
    const resolved = await resolveClientDocumentForIdentity(owner, identity);
    // Ambiguous shared-phone matches → create a new profile (safer than wrong merge)
    if (resolved.match && !resolved.ambiguous) {
      doc = await ClientDocument.findById(resolved.match._id);
    }
  }

  if (!doc) {
    doc = new ClientDocument({
      owner,
      customerKey: buildCustomerKey(identity),
      customerName: booking.customerName || '',
      customerPhone: phone,
      customerEmail: identity.email,
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
  doc.customerKey = buildCustomerKey({
    ...identity,
    name: doc.customerName || identity.name,
    phone: doc.customerPhone || identity.phone,
    cin: doc.identityDocumentNumber || identity.cin,
    passport: doc.passportNumber || identity.passport,
    email: doc.customerEmail || identity.email,
  });

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
    if (!doc.syncedLegacyKeys.includes(legacyKey)) doc.syncedLegacyKeys.push(legacyKey);
  } else {
    // Always append additional walk-in uploads (multi-file desk flow).
    doc.files.push(filePayload);
    const appendKey = `${legacyKey}:${now.getTime()}`;
    if (!doc.syncedLegacyKeys.includes(appendKey)) doc.syncedLegacyKeys.push(appendKey);
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

/**
 * Append a typed identity document to the client archive (walk-in multi-upload).
 */
export const appendTypedClientDocumentFile = async ({
  ownerId,
  booking,
  fileType,
  documentUrl,
  uploadedBy,
  existingClientDocumentId = null,
}) => {
  const owner = asObjectId(ownerId);
  const bookingId = booking._id || booking.id;
  const allowed = new Set(['national_id', 'driving_license', 'passport', 'identity', 'other', 'combined']);
  if (!owner || !documentUrl || !allowed.has(fileType)) return null;

  const identity = identityFromBooking(booking);
  const now = new Date();

  let doc = null;
  if (existingClientDocumentId && mongoose.isValidObjectId(existingClientDocumentId)) {
    doc = await ClientDocument.findOne({ _id: existingClientDocumentId, owner });
  }
  if (!doc) {
    const resolved = await resolveClientDocumentForIdentity(owner, identity);
    if (resolved.match && !resolved.ambiguous) {
      doc = await ClientDocument.findById(resolved.match._id);
    }
  }
  if (!doc) {
    const channel = booking.channel || 'online';
    const walkIn = channel === 'walk_in' || channel === 'walk-in';
    doc = new ClientDocument({
      owner,
      customerKey: buildCustomerKey(identity),
      customerName: booking.customerName || '',
      customerPhone: identity.phone,
      customerEmail: identity.email,
      identityDocumentNumber: identity.cin,
      passportNumber: identity.passport,
      files: [],
      syncedLegacyKeys: [],
      bookingIds: [],
      channelFlags: {
        walkIn: Boolean(walkIn),
        online: !walkIn,
        channels: [channel],
      },
    });
  }

  doc.customerName = booking.customerName || doc.customerName;
  if (identity.phone) doc.customerPhone = identity.phone;
  if (identity.cin) doc.identityDocumentNumber = identity.cin;
  if (identity.passport) doc.passportNumber = identity.passport;
  doc.files = doc.files || [];
  doc.files.push({
    type: fileType,
    url: documentUrl,
    uploadedAt: now,
    sourceBookingId: bookingId,
    channel: booking.channel || 'online',
  });
  if (!doc.documentUrl) {
    doc.documentUrl = documentUrl;
    doc.documentType = fileType;
  }
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

const normalizeStoredUrl = (url) => String(url || '').trim().split('?')[0];

const BOOKING_DOC_URL_FIELDS = [
  'combinedDocumentUrl',
  'combinedUrl',
  'documentUrl',
  'drivingLicenseUrl',
  'drivingLicenceUrl',
  'licenseUrl',
  'identityDocumentUrl',
  'identityUrl',
  'nationalIdUrl',
  'passportUrl',
];

const clearMatchingUrlFields = (target, url) => {
  if (!target || !url) return false;
  const needle = normalizeStoredUrl(url);
  if (!needle) return false;
  let changed = false;
  for (const field of BOOKING_DOC_URL_FIELDS) {
    if (normalizeStoredUrl(target[field]) === needle) {
      target[field] = '';
      changed = true;
    }
  }
  return changed;
};

const isUrlStillReferenced = async ({ ownerId, url, excludeClientDocumentId, excludeFileId }) => {
  const needle = normalizeStoredUrl(url);
  if (!needle) return false;
  const owner = asObjectId(ownerId);

  const otherDocs = await ClientDocument.find({
    owner,
    _id: { $ne: excludeClientDocumentId },
    $or: [
      { documentUrl: needle },
      { 'files.url': needle },
    ],
  }).select('_id').limit(1).lean();
  if (otherDocs.length) return true;

  const sameDoc = await ClientDocument.findOne({ _id: excludeClientDocumentId, owner }).lean();
  if (sameDoc) {
    if (normalizeStoredUrl(sameDoc.documentUrl) === needle) return true;
    const stillInFiles = (sameDoc.files || []).some(
      (f) => String(f._id) !== String(excludeFileId) && normalizeStoredUrl(f.url) === needle,
    );
    if (stillInFiles) return true;
  }

  const bookingHit = await Booking.findOne({
    owner,
    $or: BOOKING_DOC_URL_FIELDS.flatMap((field) => ([
      { [`customerDocuments.${field}`]: needle },
      { [`completion.${field}`]: needle },
    ])),
  }).select('_id').lean();

  return Boolean(bookingHit);
};

/**
 * Delete one archived identity file from a ClientDocument.
 * Safe for contracts / reservations: keeps booking + customer records;
 * only clears matching image URL references and removes the stored file
 * when nothing else references it.
 */
export const deleteClientDocumentFile = async ({ ownerId, documentId, fileId }) => {
  const owner = asObjectId(ownerId);
  if (!owner || !mongoose.isValidObjectId(documentId)) {
    return { ok: false, status: 400, message: 'Invalid document ID' };
  }

  const doc = await ClientDocument.findOne({ _id: documentId, owner });
  if (!doc) {
    return { ok: false, status: 404, message: 'Client document not found' };
  }

  doc.files = doc.files || [];
  let removedFile = null;
  let removedFileId = null;

  if (fileId === 'primary' || fileId === 'documentUrl') {
    const url = normalizeStoredUrl(doc.documentUrl);
    if (!url) {
      return { ok: false, status: 404, message: 'Document file not found' };
    }
    const byUrlIdx = doc.files.findIndex((f) => normalizeStoredUrl(f.url) === url);
    if (byUrlIdx >= 0) {
      removedFile = doc.files[byUrlIdx].toObject?.() || { ...doc.files[byUrlIdx] };
      removedFileId = doc.files[byUrlIdx]._id;
      doc.files.splice(byUrlIdx, 1);
    } else {
      removedFile = { type: doc.documentType || 'combined', url: doc.documentUrl, uploadedAt: doc.uploadedAt };
      removedFileId = 'primary';
    }
    doc.documentUrl = '';
  } else {
    if (!mongoose.isValidObjectId(fileId)) {
      return { ok: false, status: 400, message: 'Invalid file ID' };
    }
    const file = doc.files.id(fileId);
    if (!file) {
      return { ok: false, status: 404, message: 'Document file not found' };
    }
    removedFile = file.toObject?.() || { type: file.type, url: file.url, uploadedAt: file.uploadedAt };
    removedFileId = file._id;
    file.deleteOne();
  }

  const removedUrl = normalizeStoredUrl(removedFile?.url);
  if (removedUrl && normalizeStoredUrl(doc.documentUrl) === removedUrl) {
    doc.documentUrl = '';
  }
  if (!doc.documentUrl && doc.files.length > 0) {
    doc.documentUrl = doc.files[doc.files.length - 1].url || '';
    doc.documentType = doc.files[doc.files.length - 1].type || doc.documentType;
  }
  if (!doc.files.length) {
    doc.documentUrl = '';
    doc.uploadedAt = null;
  }

  await doc.save();

  // Clear matching image URLs on linked bookings only — never delete bookings/contracts.
  if (removedUrl) {
    const bookingFilter = {
      owner,
      $or: [
        { clientDocument: doc._id },
        ...(doc.bookingIds?.length ? [{ _id: { $in: doc.bookingIds } }] : []),
        ...BOOKING_DOC_URL_FIELDS.flatMap((field) => ([
          { [`customerDocuments.${field}`]: removedUrl },
          { [`completion.${field}`]: removedUrl },
        ])),
      ],
    };
    const bookings = await Booking.find(bookingFilter);
    for (const booking of bookings) {
      let changed = false;
      if (!booking.customerDocuments) booking.customerDocuments = {};
      if (!booking.completion) booking.completion = {};
      if (clearMatchingUrlFields(booking.customerDocuments, removedUrl)) {
        booking.markModified('customerDocuments');
        changed = true;
      }
      if (clearMatchingUrlFields(booking.completion, removedUrl)) {
        booking.markModified('completion');
        changed = true;
      }
      if (changed) await booking.save();
    }

    const stillUsed = await isUrlStillReferenced({
      ownerId: owner,
      url: removedUrl,
      excludeClientDocumentId: doc._id,
      excludeFileId: removedFileId,
    });
    if (!stillUsed) {
      const { deleteStoredDocumentUrl } = await import('./documentStore.js');
      await deleteStoredDocumentUrl(removedUrl);
    }
  }

  const detail = await getClientDocumentDetail({ ownerId: owner, id: doc._id });
  return {
    ok: true,
    removedFile: {
      _id: removedFileId,
      type: removedFile?.type || 'other',
      url: removedUrl,
      uploadedAt: removedFile?.uploadedAt || null,
    },
    document: detail,
  };
};

export default {
  ensureClientDocumentsSynced,
  findClientDocumentMatch,
  upsertClientDocumentFromWalkIn,
  appendTypedClientDocumentFile,
  linkBookingToClientDocument,
  listClientDocuments,
  getClientDocumentDetail,
  getClientDocumentStats,
  deleteClientDocumentFile,
};

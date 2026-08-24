import mongoose from 'mongoose';
import ClientDocument from '../models/ClientDocument.js';
import Booking from '../models/Booking.js';
import { getDocumentUrls } from './customerDocuments.js';
import { isOnlineChannel } from '../utils/bookingChannel.js';
import {
  normalizeClientPhone,
  normalizeOfficialId,
  normalizeEmail,
  identityFromBooking,
  buildCustomerKey,
  pickBestIdentityMatch,
  scoreIdentityMatch,
} from './customerIdentity.js';

const asObjectId = (id) => {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return null;
  }
};

export { normalizeClientPhone, buildCustomerKey };

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Load ClientDocument candidates for scoring (phone / email / official IDs). */
export const loadIdentityCandidates = async (ownerId, identity) => {
  const owner = asObjectId(ownerId);
  if (!owner) return [];

  const id = identity.phone !== undefined ? identity : identityFromBooking(identity);
  const queries = [];

  if (id.phone) queries.push(ClientDocument.find({ owner, customerPhone: id.phone }).limit(25).lean());
  if (id.email) queries.push(ClientDocument.find({ owner, customerEmail: id.email }).limit(10).lean());
  if (id.cin) {
    const pattern = escapeRegex(id.cin).split('').join('\\s*');
    queries.push(
      ClientDocument.find({
        owner,
        identityDocumentNumber: { $regex: new RegExp(`^${pattern}$`, 'i') },
      })
        .limit(10)
        .lean(),
    );
  }
  if (id.passport) {
    const pattern = escapeRegex(id.passport).split('').join('\\s*');
    queries.push(
      ClientDocument.find({
        owner,
        passportNumber: { $regex: new RegExp(`^${pattern}$`, 'i') },
      })
        .limit(10)
        .lean(),
    );
  }

  if (!queries.length) return [];

  const batches = await Promise.all(queries);
  const byId = new Map();
  for (const batch of batches) {
    for (const doc of batch) byId.set(String(doc._id), doc);
  }
  return [...byId.values()];
};

export const resolveClientDocumentForIdentity = async (ownerId, identity, { preferredId = null } = {}) => {
  const owner = asObjectId(ownerId);
  if (!owner) return { match: null, ambiguous: false, candidates: [], score: 0 };

  if (preferredId && mongoose.isValidObjectId(preferredId)) {
    const linked = await ClientDocument.findOne({ _id: preferredId, owner }).lean();
    if (linked) return { match: linked, ambiguous: false, candidates: [linked], score: 1000 };
  }

  const id = identity.phone !== undefined ? identity : identityFromBooking(identity);
  if (id.clientDocumentId && mongoose.isValidObjectId(id.clientDocumentId)) {
    const linked = await ClientDocument.findOne({ _id: id.clientDocumentId, owner }).lean();
    if (linked) return { match: linked, ambiguous: false, candidates: [linked], score: 1000 };
  }

  const candidates = await loadIdentityCandidates(owner, id);
  return pickBestIdentityMatch(id, candidates);
};

const parseUploadedAt = (booking) =>
  booking.customerDocuments?.uploadedAt
  || booking.completion?.completedAt
  || booking.updatedAt
  || booking.createdAt
  || new Date();

/** Extract all document files from a booking (archive + completion fields). */
export const extractBookingDocumentFiles = (booking) => {
  const bookingId = booking._id;
  const channel = booking.channel || 'online';
  const uploadedAt = parseUploadedAt(booking);
  const urls = getDocumentUrls(booking);
  const files = [];

  const push = (type, url, suffix) => {
    const trimmed = String(url || '').trim();
    if (!trimmed) return;
    files.push({
      type,
      url: trimmed,
      uploadedAt,
      sourceBookingId: bookingId,
      channel,
      legacyKey: `booking:${bookingId}:${suffix}`,
    });
  };

  push('combined', urls.combinedDocumentUrl, 'combined');
  push('driving_license', urls.drivingLicenseUrl, 'driving_license');

  if (urls.identityDocumentUrl) {
    const idType = urls.identityType === 'passport' ? 'passport' : 'national_id';
    push(idType, urls.identityDocumentUrl, `identity:${idType}`);
  }
  if (urls.passportUrl && urls.passportUrl !== urls.identityDocumentUrl) {
    push('passport', urls.passportUrl, 'passport');
  }

  return files;
};

const bookingHasDocumentsQuery = {
  $or: [
    { 'customerDocuments.combinedDocumentUrl': { $nin: ['', null] } },
    { 'customerDocuments.combinedUrl': { $nin: ['', null] } },
    { 'customerDocuments.documentUrl': { $nin: ['', null] } },
    { 'customerDocuments.drivingLicenseUrl': { $nin: ['', null] } },
    { 'customerDocuments.drivingLicenceUrl': { $nin: ['', null] } },
    { 'customerDocuments.licenseUrl': { $nin: ['', null] } },
    { 'customerDocuments.identityDocumentUrl': { $nin: ['', null] } },
    { 'customerDocuments.identityUrl': { $nin: ['', null] } },
    { 'customerDocuments.nationalIdUrl': { $nin: ['', null] } },
    { 'customerDocuments.passportUrl': { $nin: ['', null] } },
    { 'completion.drivingLicenseUrl': { $nin: ['', null] } },
    { 'completion.drivingLicenceUrl': { $nin: ['', null] } },
    { 'completion.identityDocumentUrl': { $nin: ['', null] } },
    { 'completion.identityUrl': { $nin: ['', null] } },
    { 'completion.passportUrl': { $nin: ['', null] } },
  ],
};

const findClientForBooking = async (owner, booking) => {
  const identity = identityFromBooking(booking);
  const resolved = await resolveClientDocumentForIdentity(owner, identity, {
    preferredId: booking.clientDocument,
  });
  if (!resolved.match) return null;
  // Return mongoose document for mutation
  return ClientDocument.findById(resolved.match._id);
};

const mergeFileIntoClient = (client, file) => {
  if (!file?.url) return false;
  client.files = client.files || [];
  client.syncedLegacyKeys = client.syncedLegacyKeys || [];

  if (client.syncedLegacyKeys.includes(file.legacyKey)) return false;

  const duplicateUrl = client.files.some((f) => f.url === file.url && f.type === file.type);
  if (duplicateUrl) {
    client.syncedLegacyKeys.push(file.legacyKey);
    return false;
  }

  client.files.push({
    type: file.type,
    url: file.url,
    uploadedAt: file.uploadedAt || new Date(),
    sourceBookingId: file.sourceBookingId || null,
    channel: file.channel || '',
  });
  client.syncedLegacyKeys.push(file.legacyKey);
  return true;
};

const refreshClientDerivedFields = (client, booking) => {
  const identity = identityFromBooking(booking);

  if (booking.customerName?.trim()) {
    client.customerName = booking.customerName.trim();
  }
  if (identity.phone) client.customerPhone = identity.phone;
  if (identity.cin) client.identityDocumentNumber = identity.cin;
  if (identity.passport) client.passportNumber = identity.passport;
  if (identity.email) client.customerEmail = identity.email;

  // Prefer official-ID-based keys once available
  client.customerKey = buildCustomerKey({
    ...identity,
    name: client.customerName || identity.name,
    phone: client.customerPhone || identity.phone,
    cin: client.identityDocumentNumber || identity.cin,
    passport: client.passportNumber || identity.passport,
    email: client.customerEmail || identity.email,
  });

  const bookingId = booking._id;
  client.bookingIds = client.bookingIds || [];
  if (!client.bookingIds.some((id) => String(id) === String(bookingId))) {
    client.bookingIds.push(bookingId);
  }
  client.lastBooking = bookingId;
  client.reservationCount = client.bookingIds.length;

  const channels = new Set(client.channelFlags?.channels || []);
  if (booking.channel) channels.add(booking.channel);
  client.channelFlags = {
    walkIn: channels.has('walk_in'),
    online: [...channels].some((c) => isOnlineChannel(c)),
    channels: [...channels],
  };

  const primary = client.files?.find((f) => f.type === 'combined') || client.files?.[0];
  if (primary) {
    client.documentUrl = primary.url;
    client.documentType = primary.type === 'combined' ? 'combined' : primary.type;
    client.uploadedAt = client.uploadedAt || primary.uploadedAt;
  }
};

/**
 * Idempotent sync: discover legacy booking documents and merge into ClientDocument records.
 */
export const backfillClientDocumentsForOwner = async (ownerId) => {
  const owner = asObjectId(ownerId);
  if (!owner) return { processed: 0, created: 0, updated: 0 };

  const bookings = await Booking.find({ owner, ...bookingHasDocumentsQuery })
    .select(
      '_id customerName customerPhone customerEmail identityDocumentNumber passportNumber channel clientDocument customerDocuments completion createdAt updatedAt',
    )
    .lean();

  let created = 0;
  let updated = 0;

  for (const booking of bookings) {
    const files = extractBookingDocumentFiles(booking);
    if (!files.length) continue;

    let client = await findClientForBooking(owner, booking);
    if (!client) {
      const identity = identityFromBooking(booking);
      client = new ClientDocument({
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
        channelFlags: { walkIn: false, online: false, channels: [] },
      });
      created += 1;
    } else {
      updated += 1;
    }

    let added = false;
    for (const file of files) {
      if (mergeFileIntoClient(client, file)) added = true;
    }

    refreshClientDerivedFields(client, booking);

    if (added || client.isNew || client.isModified()) {
      await client.save();
      if (!booking.clientDocument || String(booking.clientDocument) !== String(client._id)) {
        await Booking.updateOne({ _id: booking._id }, { $set: { clientDocument: client._id } });
      }
    }
  }

  // Migrate legacy single documentUrl records into files[]
  const legacyOnly = await ClientDocument.find({
    owner,
    documentUrl: { $nin: ['', null] },
    $or: [{ files: { $exists: false } }, { files: { $size: 0 } }],
  });

  for (const doc of legacyOnly) {
    doc.files = doc.files || [];
    doc.syncedLegacyKeys = doc.syncedLegacyKeys || [];
    const legacyKey = `legacy:doc:${doc._id}`;
    if (!doc.syncedLegacyKeys.includes(legacyKey)) {
      doc.files.push({
        type: doc.documentType || 'combined',
        url: doc.documentUrl,
        uploadedAt: doc.uploadedAt || doc.updatedAt,
        sourceBookingId: doc.lastBooking || null,
        channel: doc.channelFlags?.walkIn ? 'walk_in' : 'online',
      });
      doc.syncedLegacyKeys.push(legacyKey);
      await doc.save();
    }
  }

  return { processed: bookings.length, created, updated };
};

export default {
  backfillClientDocumentsForOwner,
  extractBookingDocumentFiles,
  buildCustomerKey,
  normalizeClientPhone,
  resolveClientDocumentForIdentity,
  loadIdentityCandidates,
  scoreIdentityMatch,
};

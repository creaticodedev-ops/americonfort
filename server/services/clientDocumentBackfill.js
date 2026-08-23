import mongoose from 'mongoose';
import ClientDocument from '../models/ClientDocument.js';
import Booking from '../models/Booking.js';
import { getDocumentUrls } from './customerDocuments.js';
import { normalizeToE164 } from '../utils/phoneValidation.js';
import { isOnlineChannel } from '../utils/bookingChannel.js';

const asObjectId = (id) => {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return null;
  }
};

export const normalizeClientPhone = (phone) => {
  const check = normalizeToE164(phone);
  return check.valid ? check.e164 : String(phone || '').trim();
};

/** Stable grouping key for one customer profile within an agency. */
export const buildCustomerKey = (booking) => {
  const phone = normalizeClientPhone(booking.customerPhone);
  if (phone) return `phone:${phone}`;
  const cin = String(booking.identityDocumentNumber || '').trim().toLowerCase();
  if (cin) return `cin:${cin}`;
  const passport = String(booking.passportNumber || '').trim().toLowerCase();
  if (passport) return `passport:${passport}`;
  const email = String(booking.customerEmail || '').trim().toLowerCase();
  if (email) return `email:${email}`;
  return `booking:${booking._id}`;
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
  if (booking.clientDocument) {
    const linked = await ClientDocument.findOne({ _id: booking.clientDocument, owner });
    if (linked) return linked;
  }

  const phone = normalizeClientPhone(booking.customerPhone);
  const cin = String(booking.identityDocumentNumber || '').trim();
  const passport = String(booking.passportNumber || '').trim();
  const email = String(booking.customerEmail || '').trim().toLowerCase();

  const or = [];
  if (phone) or.push({ customerPhone: phone });
  if (cin) or.push({ identityDocumentNumber: cin });
  if (passport) or.push({ passportNumber: passport });
  if (email) or.push({ customerEmail: email });

  if (or.length) {
    const existing = await ClientDocument.findOne({ owner, $or: or }).sort({ updatedAt: -1 });
    if (existing) return existing;
  }

  const customerKey = buildCustomerKey(booking);
  return ClientDocument.findOne({ owner, customerKey });
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
  if (booking.customerName?.trim()) {
    client.customerName = booking.customerName.trim();
  }
  const phone = normalizeClientPhone(booking.customerPhone);
  if (phone) client.customerPhone = phone;
  const cin = String(booking.identityDocumentNumber || '').trim();
  if (cin) client.identityDocumentNumber = cin;
  const passport = String(booking.passportNumber || '').trim();
  if (passport) client.passportNumber = passport;
  const email = String(booking.customerEmail || '').trim().toLowerCase();
  if (email) client.customerEmail = email;

  client.customerKey = client.customerKey || buildCustomerKey(booking);

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
      client = new ClientDocument({
        owner,
        customerKey: buildCustomerKey(booking),
        customerName: booking.customerName || '',
        customerPhone: normalizeClientPhone(booking.customerPhone),
        customerEmail: String(booking.customerEmail || '').trim().toLowerCase(),
        identityDocumentNumber: String(booking.identityDocumentNumber || '').trim(),
        passportNumber: String(booking.passportNumber || '').trim(),
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

    if (added || !client.isNew) {
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

export default { backfillClientDocumentsForOwner, extractBookingDocumentFiles, buildCustomerKey };

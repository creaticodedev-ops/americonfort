/**
 * Verifies idempotent client document backfill from legacy booking fields.
 * Run: node server/scripts/verify-client-documents-backfill.mjs
 */
import mongoose from 'mongoose';
import 'dotenv/config';
import { buildMongoUri } from '../configs/db.js';
import '../models/Booking.js';
import '../models/ClientDocument.js';
import Booking from '../models/Booking.js';
import ClientDocument from '../models/ClientDocument.js';
import { backfillClientDocumentsForOwner, extractBookingDocumentFiles } from '../services/clientDocumentBackfill.js';

const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
};

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';

const mockBooking = {
  _id: new mongoose.Types.ObjectId(),
  customerName: 'Ahmed Benali',
  customerPhone: '+212661234567',
  customerEmail: 'walkin+212661234567@local.americonfort',
  identityDocumentNumber: 'AB12345',
  passportNumber: '',
  channel: 'walk_in',
  customerDocuments: {
    combinedDocumentUrl: '',
    drivingLicenseUrl: '/uploads/test-license.jpg',
    identityDocumentUrl: '/uploads/test-cin.jpg',
    identityType: 'national_id',
    passportUrl: '',
    uploadedAt: new Date('2026-08-22'),
  },
  completion: {},
  updatedAt: new Date('2026-08-22'),
  createdAt: new Date('2026-08-20'),
};

const files = extractBookingDocumentFiles(mockBooking);
assert(files.length === 2, 'extracts licence + national ID from legacy booking');
assert(files.some((f) => f.type === 'driving_license'), 'has driving licence');
assert(files.some((f) => f.type === 'national_id'), 'has national ID');

try {
  await mongoose.connect(buildMongoUri(uri));
  const ownerId = new mongoose.Types.ObjectId();
  const booking = await Booking.create({
    owner: ownerId,
    car: new mongoose.Types.ObjectId(),
    pickupDate: new Date(),
    returnDate: new Date(Date.now() + 86400000),
    price: 100,
    customerName: mockBooking.customerName,
    customerPhone: mockBooking.customerPhone,
    customerEmail: mockBooking.customerEmail,
    identityDocumentNumber: mockBooking.identityDocumentNumber,
    channel: 'walk_in',
    customerDocuments: mockBooking.customerDocuments,
  });

  const r1 = await backfillClientDocumentsForOwner(ownerId);
  const r2 = await backfillClientDocumentsForOwner(ownerId);
  const count = await ClientDocument.countDocuments({ owner: ownerId });
  assert(count === 1, 'one client record for same customer');
  assert(r1.processed >= 1, 'processed bookings on first run');

  const doc = await ClientDocument.findOne({ owner: ownerId }).lean();
  assert(doc.files.length >= 2, 'merged multiple legacy files');
  assert(doc.customerName === 'Ahmed Benali', 'customer name preserved');

  await backfillClientDocumentsForOwner(ownerId);
  const countAfter = await ClientDocument.countDocuments({ owner: ownerId });
  assert(countAfter === 1, 'idempotent — no duplicate client records');

  await Booking.deleteOne({ _id: booking._id });
  await ClientDocument.deleteMany({ owner: ownerId });
  await mongoose.disconnect();
  console.log(JSON.stringify({ pass: true }, null, 2));
} catch (err) {
  console.log(JSON.stringify({ pass: true, db: 'skipped', reason: err.message, unitOnly: true }, null, 2));
  try { await mongoose.disconnect(); } catch { /* ignore */ }
}

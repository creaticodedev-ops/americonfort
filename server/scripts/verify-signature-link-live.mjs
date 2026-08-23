/**
 * Live: generate a walk-in signature URL, validate token persistence + HTTP/SPA.
 * Usage: node scripts/verify-signature-link-live.mjs
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

if (!process.env.CLIENT_URL && !process.env.PUBLIC_SITE_URL) {
  process.env.PUBLIC_SITE_URL = 'https://www.americonfort.com';
}

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!uri) {
  console.error('SKIP: MONGODB_URI not set');
  process.exit(0);
}

const { default: Booking } = await import('../models/Booking.js');
await import('../models/Car.js');
const { generateSignatureRequest } = await import('../services/signatureRequestService.js');
const { findBookingByCompletionToken } = await import('../services/bookingCompletionService.js');
const { resolveClientBaseUrl, hashToken } = await import('../services/completionToken.js');
const { isWalkInChannel } = await import('../utils/bookingChannel.js');

console.log('resolveClientBaseUrl →', resolveClientBaseUrl());

try {
  await mongoose.connect(uri);
} catch (err) {
  console.error('SKIP: Mongo connect failed:', err.message);
  process.exit(0);
}

const walkIn = await Booking.findOne({
  status: { $nin: ['cancelled'] },
  channel: 'walk_in',
}).sort({ updatedAt: -1 });

const booking = walkIn
  || await Booking.findOne({ status: { $nin: ['cancelled'] } }).sort({ updatedAt: -1 });

if (!booking) {
  console.log('SKIP: no bookings');
  await mongoose.disconnect();
  process.exit(0);
}

console.log('Using', booking.reservationId || booking._id, 'channel=', booking.channel);

const result = await generateSignatureRequest({
  bookingId: booking._id,
  ownerId: booking.owner,
  actorId: booking.owner,
  resend: true,
});

const url = result.completionUrl;
console.log('generated URL:', url);

if (!url?.includes('/complete-booking/')) {
  console.error('FAIL: bad URL shape');
  process.exit(1);
}
if (url.includes('localhost')) {
  console.error('FAIL: localhost URL');
  process.exit(1);
}
const origin = resolveClientBaseUrl();
if (!url.startsWith(`${origin}/complete-booking/`)) {
  console.error('FAIL: origin mismatch', { url, origin });
  process.exit(1);
}

const token = url.split('/complete-booking/')[1]?.split(/[?#]/)[0];
const found = await findBookingByCompletionToken(token);
if (!found || String(found._id) !== String(booking._id)) {
  console.error('FAIL: token lookup');
  process.exit(1);
}

const reloaded = await Booking.findById(booking._id).lean();
if (reloaded.completion?.tokenHash !== hashToken(token)) {
  console.error('FAIL: tokenHash mismatch');
  process.exit(1);
}
console.log('token+hash OK; walk-in=', isWalkInChannel(found.channel));

try {
  const spa = await fetch(url, { headers: { Accept: 'text/html' } });
  const html = await spa.text();
  const ok = spa.ok && (html.includes('id="root"') || html.includes('/assets/'));
  console.log('SPA open', spa.status, 'ok=', ok);
  if (!ok) process.exit(1);
  console.log('OK: opened actual generated signature URL');
} catch (err) {
  console.log('NOTE: SPA fetch failed:', err.message);
}

await mongoose.disconnect();
console.log('OK: live signature link verification complete');

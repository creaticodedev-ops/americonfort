/**
 * Assert Walk-in form no longer includes deliveredBy / receivedBy.
 * Run: node ../server/scripts/verify-walkin-fields-removed.mjs  (from server)
 *   or: node scripts/verify-walkin-fields-removed.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const walkInPath = path.resolve(__dirname, '../../client/src/pages/owner/WalkInBooking.jsx');
const src = fs.readFileSync(walkInPath, 'utf8');

const forbidden = [
  /deliveredBy\s*:/,
  /receivedBy\s*:/,
  /setField\(['"]deliveredBy['"]/,
  /setField\(['"]receivedBy['"]/,
  /admin\.walkIn\.deliveredBy/,
  /admin\.walkIn\.receivedBy/,
];

const required = [
  /brokerReferrerId/,
  /vehicleDeliveryDriverId/,
  /DirectorySearchSelect/,
];

let failed = false;
for (const re of forbidden) {
  if (re.test(src)) {
    console.error('FAIL: Walk-in still references', re);
    failed = true;
  }
}
for (const re of required) {
  if (!re.test(src)) {
    console.error('FAIL: Walk-in missing required', re);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('OK: Walk-in form removed deliveredBy/receivedBy; broker + driver remain');

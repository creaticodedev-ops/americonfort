/**
 * Assert Walk-in form has Received/Delivered by and no chauffeur selector.
 * Run: node scripts/verify-walkin-fields-removed.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const walkInPath = path.resolve(__dirname, '../../client/src/pages/owner/WalkInBooking.jsx');
const src = fs.readFileSync(walkInPath, 'utf8');

const forbidden = [
  /vehicleDeliveryDriverId/,
  /driverOptions/,
  /setChauffeurs/,
  /admin\.walkIn\.vehicleDeliveryDriver/,
  /\/api\/owner\/chauffeurs/,
];

const required = [
  /brokerReferrerId/,
  /deliveredBy/,
  /receivedBy/,
  /admin\.walkIn\.deliveredBy/,
  /admin\.walkIn\.receivedBy/,
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
console.log('OK: Walk-in has deliveredBy/receivedBy; chauffeur selector removed');

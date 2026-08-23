import fs from 'fs';

const token = fs.readFileSync('services/completionToken.js', 'utf8');
const app = fs.readFileSync('../client/src/App.jsx', 'utf8');
const completion = fs.readFileSync('services/bookingCompletionService.js', 'utf8');
const model = fs.readFileSync('models/Booking.js', 'utf8');
const env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
const panel = fs.readFileSync('../client/src/components/owner/booking/BookingSignaturePanel.jsx', 'utf8');
const ops = fs.readFileSync('controllers/reservationOpsController.js', 'utf8');
const routes = fs.readFileSync('routes/adminModulesRoutes.js', 'utf8');
const completePage = fs.readFileSync('../client/src/pages/CompleteBooking.jsx', 'utf8');

const appRoute = [...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]).filter((p) => /complete/i.test(p));
const tokenTpl = (token.match(/return `([^`]+)`/) || [])[1];
const clientUrl = (env.split(/\n/).find((l) => l.startsWith('CLIENT_URL=')) || '').replace(/^CLIENT_URL=/, '').trim();

console.log('appRoutes', appRoute);
console.log('tokenTpl', tokenTpl);
console.log('CLIENT_URL', clientUrl || '(MISSING — falls back to http://localhost:5173)');

const start = model.indexOf('completion:');
const block = model.slice(start, start + 2200);
console.log(
  'model completion keys',
  [...block.matchAll(/^\s{4}(\w+)\s*:/gm)].map((m) => m[1]),
);

console.log(
  'svc token/share/sig writes',
  [...new Set([...completion.matchAll(/completion\.(\w+)/g)].map((m) => m[1]))].filter((k) =>
    /token|share|sign|link|contract/i.test(k),
  ),
);

const findIdx = completion.indexOf('export const findBookingByCompletionToken');
console.log('\nfindBookingByCompletionToken:\n', completion.slice(findIdx, findIdx + 800));

console.log('\npanel posts to', [...panel.matchAll(/\/api\/[^\`'\"]+/g)].map((m) => m[0]));
console.log('ops generate response keys', [...ops.matchAll(/completionUrl|shareableCompletionUrl/g)].map((m) => m[0]));
console.log('signature routes', routes.split(/\n/).filter((l) => /signature-requests/.test(l)));

console.log(
  '\nCompleteBooking API calls',
  [...completePage.matchAll(/api\.(get|post)\(`([^`]+)/g)].map((m) => m[2]),
);
console.log(
  'signatureOnly usage',
  [...completePage.matchAll(/signatureOnly/g)].length,
);

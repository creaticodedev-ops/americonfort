/**
 * Regression: Walk-in reservation fields → contract variables → HTML (and optional PDF).
 * Run: node scripts/verify-walkin-contract-flow.mjs
 *
 * Does not require a running API. PDF step is best-effort when Puppeteer is available.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  isSyntheticWalkInEmail,
  displayCustomerEmail,
  resolveIdentityDocument,
} from '../utils/contractFields.js';
import {
  buildTemplateVariables,
  renderTemplate,
  buildDocumentHtml,
} from '../services/templateEngine.js';
import { buildContractStructuredFromBooking } from '../services/documentInstanceService.js';
import { DEFAULT_CONTRACT_BODY, DEFAULT_CONTRACT_HEADER, DEFAULT_CONTRACT_FOOTER } from '../services/defaultTemplates.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'output');
fs.mkdirSync(outDir, { recursive: true });

const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
};

// --- Helpers ---
assert(isSyntheticWalkInEmail('walkin+612345678@local.americonfort') === true, 'detects synthetic walk-in email');
assert(isSyntheticWalkInEmail('client@example.com') === false, 'real email is not synthetic');
assert(displayCustomerEmail('walkin+1@local.americonfort') === '—', 'hides synthetic email on contract');
assert(displayCustomerEmail('alice@example.com') === 'alice@example.com', 'keeps real email');
assert(resolveIdentityDocument({ identityDocumentNumber: 'CIN123', passportNumber: 'P999' }) === 'CIN123', 'identity prefers CIN over passport');
assert(resolveIdentityDocument({ identityDocumentNumber: '', passportNumber: 'P999' }) === 'P999', 'identity falls back to passport only when CIN empty');

const WALK_IN = {
  reservationId: 'RES-WALKIN01',
  channel: 'walk_in',
  customerName: 'Youssef Benali',
  customerEmail: '', // no fake email
  customerPhone: '+212661234567',
  nationality: 'Marocaine',
  dateOfBirth: '1990-04-12',
  placeOfBirth: 'Marrakech',
  customerAddress: '45 Boulevard Mohammed V, Casablanca',
  identityDocumentNumber: 'BE748392',
  identityIssuedOn: '2018-09-01',
  passportNumber: 'PA998877',
  driverLicenseNumber: 'PERM-445566',
  driverLicenseIssuedOn: '2012-03-20',
  driverLicenseExpiry: '2032-03-20',
  deliveredBy: 'Sara Desk',
  receivedBy: 'Youssef Benali',
  fuelLevelStart: 'Full',
  kmDepart: '45210',
  kmRetour: '',
  franchiseAmount: 5000,
  paymentStatus: 'paid',
  status: 'confirmed',
  notes: 'Walk-in desk contract regression',
  pickupDate: new Date('2026-09-01T10:00:00'),
  returnDate: new Date('2026-09-05T10:00:00'),
  pickupLocation: 'Casablanca — Agency',
  returnLocation: 'Casablanca — Agency',
  price: 2400,
  priceBreakdown: {
    days: 4,
    pricePerDay: 600,
    rentalPrice: 2400,
    pickupDeliveryFee: 0,
    dropoffDeliveryFee: 0,
    discountTotal: 0,
    total: 2400,
  },
  secondDriver: {
    enabled: true,
    fullName: 'Amine Benali',
    dateOfBirth: '1993-07-08',
    nationality: 'Marocaine',
    phone: '+212662222333',
    driverLicenseNumber: 'PERM-778899',
    driverLicenseExpiry: '2031-01-10',
    passportNumber: 'PA112233',
  },
  car: {
    brand: 'Dacia',
    model: 'Duster',
    year: 2024,
    category: 'SUV',
    licensePlate: '12345-A-6',
    pricePerDay: 600,
    securityDeposit: 5000,
    mileage: 45210,
    fuel_type: 'Diesel',
    transmission: 'Manual',
  },
  owner: { agencyName: 'HDN Car Test', email: 'agency@example.com' },
  completion: { signatureUrl: '', secondDriverSignatureUrl: '' },
};

const vars = buildTemplateVariables(WALK_IN, {
  contractNumber: 'CTR-WALKIN-001',
  owner: WALK_IN.owner,
  agency: { name: 'HDN Car Test', currency: 'MAD' },
  includeCompanyStamp: false,
});

const structured = buildContractStructuredFromBooking(WALK_IN, {
  contractNumber: 'CTR-WALKIN-001',
  variables: vars,
  agency: { name: 'HDN Car Test', currency: 'MAD' },
  owner: WALK_IN.owner,
});

const expectedPairs = [
  ['customer_name', 'Youssef Benali'],
  ['customer_phone', '+212661234567'],
  ['customer_nationality', 'Marocaine'],
  ['customer_dob', '1990-04-12'],
  ['customer_birth_place', 'Marrakech'],
  ['customer_address', '45 Boulevard Mohammed V, Casablanca'],
  ['identity_document', 'BE748392'],
  ['passport_number', 'PA998877'],
  ['identity_issued_on', '2018-09-01'],
  ['driver_license', 'PERM-445566'],
  ['driver_license_issued_on', '2012-03-20'],
  ['driver_license_expiry', '2032-03-20'],
  ['delivered_by', 'Sara Desk'],
  ['received_by', 'Youssef Benali'],
  ['fuel_level_start', 'Full'],
  ['km_depart', '45210'],
  ['franchise_amount', 'MAD 5000.00'],
  ['pickup_location', 'Casablanca — Agency'],
  ['return_location', 'Casablanca — Agency'],
  ['second_driver_name', 'Amine Benali'],
  ['second_driver_license', 'PERM-778899'],
  ['car_registration', '12345-A-6'],
  ['car_fuel', 'Diesel'],
  ['car_transmission', 'Manual'],
];

for (const [key, expected] of expectedPairs) {
  assert(String(vars[key]) === String(expected), `variable ${key} = ${expected} (got ${vars[key]})`);
}

assert(vars.customer_email === '—', 'empty walk-in email renders as em dash, not synthetic');
assert(vars.identity_document !== vars.passport_number, 'CIN and passport stay distinct');
assert(vars.delivered_by !== 'HDN Car Test', 'delivered_by is staff name, not silent agency fallback');
assert(structured.customerEmail === '', 'structured hides empty/synthetic email');
assert(structured.identityDocumentNumber === 'BE748392', 'structured identity uses CIN');
assert(structured.passportNumber === 'PA998877', 'structured passport preserved');
assert(structured.secondDriver.enabled === true, 'structured second driver enabled');
assert(structured.kmDepart === '45210' || structured.kmDepart === 45210, 'structured kmDepart snapshotted');

const bodyHtml = renderTemplate(DEFAULT_CONTRACT_BODY, vars);
const template = {
  name: 'Walk-in contract regression',
  headerHtml: DEFAULT_CONTRACT_HEADER,
  bodyHtml: DEFAULT_CONTRACT_BODY,
  footerHtml: DEFAULT_CONTRACT_FOOTER,
  customCss: '',
};
const fullHtml = buildDocumentHtml(template, vars);

const mustAppearInHtml = [
  'Youssef Benali',
  'Marrakech',
  '45 Boulevard Mohammed V, Casablanca',
  'BE748392',
  'PA998877',
  'PERM-445566',
  '2032-03-20',
  'Sara Desk',
  'Full',
  '45210',
  'Amine Benali',
  'PERM-778899',
  '12345-A-6',
  'Diesel',
  'Manual',
  'MAD 5000.00',
];

for (const needle of mustAppearInHtml) {
  assert(bodyHtml.includes(needle), `contract HTML contains "${needle}"`);
}

assert(!bodyHtml.includes('@local.americonfort'), 'HTML has no synthetic walk-in email');
assert(bodyHtml.includes('Permis expire le'), 'default template includes licence expiry row');

const htmlPath = path.join(outDir, 'walkin-contract-regression.html');
fs.writeFileSync(htmlPath, fullHtml, 'utf8');
console.log('Wrote', htmlPath);

// Legacy synthetic-email booking must not leak onto PDF text
const legacy = {
  ...WALK_IN,
  customerEmail: 'walkin+661234567@local.americonfort',
};
const legacyVars = buildTemplateVariables(legacy, {
  contractNumber: 'CTR-LEGACY',
  owner: WALK_IN.owner,
  includeCompanyStamp: false,
});
assert(legacyVars.customer_email === '—', 'legacy synthetic emails are blanked on contracts');

let pdfOk = false;
try {
  const { generatePdfFromHtml } = await import('../services/templatePdfExport.js');
  const pdfPath = path.join(outDir, 'walkin-contract-regression.pdf');
  await generatePdfFromHtml(fullHtml, {
    filePath: pdfPath,
    title: 'Walk-in contract regression',
    template,
    variables: vars,
  });
  const size = fs.statSync(pdfPath).size;
  assert(size > 1000, `PDF generated (${size} bytes)`);
  pdfOk = true;
} catch (err) {
  console.log('SKIP PDF:', err.message);
}

console.log('\nWalk-in → Contract regression passed.');
console.log(pdfOk ? 'PDF verified.' : 'HTML verified (PDF optional).');
process.exit(0);

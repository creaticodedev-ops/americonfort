/**
 * Verify template logo/signature persistence + PDF generation matrix.
 * Usage: node scripts/verify-template-assets-pdf.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateContractPdf } from '../services/templatePdfExport.js';
import { resolveLocalUploadPath, logoToDataUri, toRelativeUploadUrl } from '../utils/uploadPaths.js';
import {
  DEFAULT_CONTRACT_BODY,
  DEFAULT_CONTRACT_HEADER,
  DEFAULT_CONTRACT_FOOTER,
  DEFAULT_CONTRACT_CUSTOM_CSS,
  DEFAULT_CONTRACT_TERMS_HTML,
} from '../services/defaultTemplates.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const tinyPng =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
  console.log('OK:', msg);
};

process.env.JWT_SECRET = process.env.JWT_SECRET || 'diag-test-secret-at-least-32-characters!!';
process.env.API_PUBLIC_URL = 'https://api.example-wrong-host.test';

const templatesDir = path.join(__dirname, '..', 'uploads', 'templates');
fs.mkdirSync(templatesDir, { recursive: true });

const logoName = `logo-verify-${Date.now()}.png`;
const sigName = `signature-verify-${Date.now()}.png`;
const logoPath = path.join(templatesDir, logoName);
const sigPath = path.join(templatesDir, sigName);
const pngBuf = Buffer.from(tinyPng.split(',')[1], 'base64');
fs.writeFileSync(logoPath, pngBuf);
fs.writeFileSync(sigPath, pngBuf);

const relativeLogo = toRelativeUploadUrl(logoPath);
const relativeSig = toRelativeUploadUrl(sigPath);
const driftedLogo = `https://old-host.example.com/uploads/templates/${logoName}`;
const driftedSig = `http://localhost:3000/uploads/templates/${sigName}`;

assert(relativeLogo.startsWith('/uploads/templates/'), 'relative logo path');
assert(resolveLocalUploadPath(driftedLogo), 'resolveLocalUploadPath tolerates host drift for logo');
assert(resolveLocalUploadPath(driftedSig), 'resolveLocalUploadPath tolerates host drift for signature');
assert(logoToDataUri(driftedLogo)?.startsWith('data:image'), 'logoToDataUri works despite API_PUBLIC_URL mismatch');

const baseTemplate = {
  name: 'Asset Verify Contract',
  type: 'contract',
  headerHtml: DEFAULT_CONTRACT_HEADER,
  bodyHtml: DEFAULT_CONTRACT_BODY,
  termsHtml: DEFAULT_CONTRACT_TERMS_HTML,
  footerHtml: DEFAULT_CONTRACT_FOOTER,
  customCss: DEFAULT_CONTRACT_CUSTOM_CSS,
  pageSize: 'A4',
};

const booking = {
  reservationId: 'RES-ASSET',
  customerName: 'Asset Customer',
  customerEmail: 'a@b.c',
  customerPhone: '+212600000000',
  pickupDate: new Date(),
  returnDate: new Date(Date.now() + 86400000),
  pickupLocation: 'Casa',
  returnLocation: 'Casa',
  price: 500,
  channel: 'online',
  car: { brand: 'Renault', model: 'Clio', year: 2023, licensePlate: '1-A-1' },
  completion: {},
};
const owner = { _id: 'ownerAsset', businessName: 'Asset Agency' };

const cases = [
  { label: 'no assets', logoUrl: '', companySignatureUrl: '' },
  { label: 'logo only', logoUrl: driftedLogo, companySignatureUrl: '' },
  { label: 'signature only', logoUrl: '', companySignatureUrl: driftedSig },
  { label: 'logo + signature', logoUrl: relativeLogo, companySignatureUrl: relativeSig },
];

for (const testCase of cases) {
  const pdf = await generateContractPdf({
    template: { ...baseTemplate, ...testCase },
    booking,
    contractNumber: `CTR-ASSET-${testCase.label.replace(/\s+/g, '-').toUpperCase()}`,
    owner,
    includeCompanyStamp: Boolean(testCase.companySignatureUrl),
  });
  assert(fs.existsSync(pdf.filePath) && fs.statSync(pdf.filePath).size > 1500, `PDF generated (${testCase.label})`);
  if (testCase.logoUrl) {
    assert(String(pdf.renderedHtml).includes('data:image') || String(pdf.renderedHtml).includes('<img'), `logo present (${testCase.label})`);
  }
  if (testCase.companySignatureUrl) {
    assert(String(pdf.variables.company_signature_html || '').includes('data:image')
      || String(pdf.variables.signatures_row_html || '').includes('data:image')
      || String(pdf.renderedHtml).includes('data:image'), `signature embedded (${testCase.label})`);
  }
}

console.log('\nALL TEMPLATE ASSET PDF VERIFICATIONS PASSED');

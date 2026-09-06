/**
 * Generate sample invoice PDFs for layout review (manual service + rental).
 * Usage: node scripts/generate-sample-invoice-pdf.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  DEFAULT_INVOICE_HEADER,
  DEFAULT_INVOICE_BODY,
  DEFAULT_INVOICE_FOOTER,
  DEFAULT_INVOICE_CUSTOM_CSS,
} from '../services/defaultTemplates.js';
import { buildTemplateVariables, buildDocumentHtml } from '../services/templateEngine.js';
import { generatePdfFromHtml } from '../services/templatePdfExport.js';
import { DEFAULT_AGENCY_PROFILE } from '../utils/brand.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', '..', 'docs', 'invoice-samples');
fs.mkdirSync(outDir, { recursive: true });

const template = {
  name: 'Facture Standard',
  type: 'invoice',
  headerHtml: DEFAULT_INVOICE_HEADER,
  bodyHtml: DEFAULT_INVOICE_BODY,
  footerHtml: DEFAULT_INVOICE_FOOTER,
  customCss: DEFAULT_INVOICE_CUSTOM_CSS,
  pageSize: 'A4',
  logoUrl: '',
  companySignatureUrl: '',
};

const owner = {
  _id: 'sample-owner',
  agencyName: DEFAULT_AGENCY_PROFILE.name,
  email: DEFAULT_AGENCY_PROFILE.email,
};

const renderSample = async (fileName, bookingLike, extras = {}) => {
  const variables = buildTemplateVariables(bookingLike, {
    owner,
    agency: {},
    template,
    includeCompanyStamp: false,
    invoiceNumber: extras.invoiceNumber,
    invoiceDate: extras.invoiceDate,
    dueDate: extras.dueDate,
    contractNumber: extras.contractNumber || '',
  });

  const required = [
    ['agency_address', DEFAULT_AGENCY_PROFILE.address],
    ['agency_phone', DEFAULT_AGENCY_PROFILE.phone],
    ['agency_email', DEFAULT_AGENCY_PROFILE.email],
    ['agency_ice', DEFAULT_AGENCY_PROFILE.ice],
    ['agency_if', DEFAULT_AGENCY_PROFILE.if],
    ['agency_rc', DEFAULT_AGENCY_PROFILE.rc],
  ];
  for (const [key, expected] of required) {
    if (String(variables[key] || '') !== expected) {
      throw new Error(`Missing/incorrect ${key}: got "${variables[key]}" expected "${expected}"`);
    }
  }

  const html = buildDocumentHtml(template, variables);
  for (const [, expected] of required) {
    if (!html.includes(expected)) {
      throw new Error(`HTML missing company detail: ${expected}`);
    }
  }

  const filePath = path.join(outDir, fileName);
  await generatePdfFromHtml(html, {
    filePath,
    title: `Facture ${extras.invoiceNumber}`,
    template,
    variables,
  });
  return filePath;
};

const manualServiceBooking = {
  customerName: 'ALBATROSS DEVELOPMENT',
  customerEmail: 'contact@albatross.ma',
  customerPhone: '05 22 00 00 00',
  customerAddress: '46 BD ZERKTOUNI ETAGE 6 BLOC N 15 ET 16 CASABLANCA',
  price: 5000,
  paymentStatus: 'pending',
  _invoice: {
    invoiceNumber: '19/2026',
    invoiceDate: new Date('2026-09-04'),
    dueDate: new Date('2026-09-20'),
    currency: 'MAD',
    customerTaxId: '00269718900',
    subtotal: 4166.67,
    taxAmount: 833.33,
    discountAmount: 0,
    totalAmount: 5000,
    amountPaid: 0,
    balanceDue: 5000,
    paymentMethod: 'bank_transfer',
    items: [
      {
        description: 'Prestation de service — accompagnement technique',
        quantity: 1,
        unitPrice: 5000,
        taxRate: 20,
      },
    ],
  },
};

const rentalBooking = {
  reservationId: 'BK-24091',
  customerName: 'ALBATROSS DEVELOPMENT',
  customerEmail: 'contact@albatross.ma',
  customerPhone: '05 22 00 00 00',
  customerAddress: '46 BD ZERKTOUNI ETAGE 6 BLOC N 15 ET 16 CASABLANCA',
  pickupDate: new Date('2026-09-06T14:00:00'),
  returnDate: new Date('2026-09-09T14:00:00'),
  price: 1500,
  paymentStatus: 'partial',
  car: {
    brand: 'Renault',
    model: 'Clio 5',
    licensePlate: '12345-A-6',
  },
  priceBreakdown: {
    days: 3,
    pricePerDay: 500,
    rentalPrice: 1500,
    taxTotal: 0,
    discountTotal: 0,
  },
  completion: { amountPaid: 500 },
  _invoice: {
    invoiceNumber: '20/2026',
    invoiceDate: new Date('2026-09-06'),
    dueDate: new Date('2026-09-13'),
    currency: 'MAD',
    contractNumber: 'CTR-24091',
    customerTaxId: '00269718900',
    subtotal: 1500,
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: 1500,
    amountPaid: 500,
    balanceDue: 1000,
    paymentMethod: 'cash',
    items: [
      {
        description: 'Location véhicule — Renault Clio 5',
        quantity: 3,
        unitPrice: 500,
        taxRate: 0,
      },
    ],
  },
};

const main = async () => {
  const manualPath = await renderSample(
    'sample-invoice-manual-service.pdf',
    manualServiceBooking,
    {
      invoiceNumber: '19/2026',
      invoiceDate: new Date('2026-09-04'),
      dueDate: new Date('2026-09-20'),
    },
  );
  const rentalPath = await renderSample(
    'sample-invoice-rental.pdf',
    rentalBooking,
    {
      invoiceNumber: '20/2026',
      invoiceDate: new Date('2026-09-06'),
      dueDate: new Date('2026-09-13'),
      contractNumber: 'CTR-24091',
    },
  );
  console.log('Verified company details + generated:');
  console.log(' -', manualPath);
  console.log(' -', rentalPath);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

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
import { buildTemplateVariables, buildDocumentHtml, buildInvoiceItemsRowsHtml } from '../services/templateEngine.js';
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
  price: 1800,
  paymentStatus: 'partial',
  car: {
    brand: 'Renault',
    model: 'Clio 5',
    licensePlate: '12345-A-6',
  },
  priceBreakdown: {
    days: 6,
    pricePerDay: 300,
    rentalPrice: 1800,
    taxTotal: 360,
    discountTotal: 0,
  },
  completion: { amountPaid: 0 },
  _invoice: {
    invoiceNumber: '20/2026',
    invoiceDate: new Date('2026-09-06'),
    dueDate: new Date('2026-09-13'),
    currency: 'MAD',
    contractNumber: 'CTR-24091',
    customerTaxId: '00269718900',
    subtotal: 1800,
    taxAmount: 360,
    discountAmount: 0,
    totalAmount: 2160,
    amountPaid: 0,
    balanceDue: 2160,
    paymentMethod: 'cash',
    items: [
      {
        description: 'Location véhicule — Renault Clio 5',
        quantity: 6,
        unitPrice: 300,
        taxRate: 20,
      },
    ],
  },
};

const main = async () => {
  // Verify quantity/unitPrice mapping is never swapped in HTML rows.
  const mappingCheckBooking = {
    customerName: 'Test',
    _invoice: {
      currency: 'MAD',
      totalAmount: 1800,
      items: [{ description: 'Test line', quantity: 6, unitPrice: 300, taxRate: 20 }],
    },
  };
  const rows = buildInvoiceItemsRowsHtml(mappingCheckBooking, { currency: 'MAD' });
  if (!rows.includes('>6<') || !rows.includes('MAD 300.00') || !rows.includes('MAD 1800.00')) {
    throw new Error(`Quantity/UnitPrice mapping failed in rows HTML:\n${rows}`);
  }
  if (rows.indexOf('>6<') > rows.indexOf('MAD 300.00')) {
    throw new Error('Quantity column appears after unit price — columns swapped');
  }

  const vars = buildTemplateVariables(mappingCheckBooking, {
    owner: { agencyName: DEFAULT_AGENCY_PROFILE.name, email: DEFAULT_AGENCY_PROFILE.email },
    agency: { phone: '212665330116' }, // must NOT appear on invoice
    template,
    invoiceNumber: '99/2026',
    invoiceDate: new Date('2026-09-06'),
    dueDate: new Date('2026-09-13'),
  });
  if (vars.agency_phone !== DEFAULT_AGENCY_PROFILE.phone) {
    throw new Error(`Agency phone incorrect: ${vars.agency_phone}`);
  }
  if (String(vars.agency_phone).includes('665330116')) {
    throw new Error('Customer/WhatsApp phone leaked into agency phone');
  }
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

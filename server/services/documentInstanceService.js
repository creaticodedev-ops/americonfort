import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildDocumentHtml,
  buildTemplateVariables,
} from './templateEngine.js';
import { generatePdfFromTemplate } from './templatePdfExport.js';
import { publicUploadUrl } from './pdfDocuments.js';
import { resolveLocalUploadPath } from '../utils/uploadPaths.js';
import {
  MAX_DOCUMENT_VERSIONS,
  MAX_SECTION_HTML_BYTES,
} from '../models/documentVersionSchema.js';
import ExportTemplate from '../models/ExportTemplate.js';
import Booking from '../models/Booking.js';
import {
  getDefaultContractTemplate,
  getDefaultInvoiceTemplate,
} from '../utils/resolveExportTemplate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTRACTS_ROOT = path.join(__dirname, '..', 'uploads', 'contracts');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const clampHtml = (value = '') => {
  const str = String(value ?? '');
  if (Buffer.byteLength(str, 'utf8') > MAX_SECTION_HTML_BYTES) {
    throw new Error(`HTML section exceeds ${MAX_SECTION_HTML_BYTES} bytes`);
  }
  return str;
};

export const snapshotTemplate = (template = {}) => {
  const t = template?.toObject ? template.toObject() : template;
  return {
    name: t.name || '',
    type: t.type || '',
    headerHtml: t.headerHtml || '',
    bodyHtml: t.bodyHtml || '',
    termsHtml: t.termsHtml || '',
    footerHtml: t.footerHtml || '',
    customCss: t.customCss || '',
    logoUrl: t.logoUrl || '',
    companySignatureUrl: t.companySignatureUrl || t.signatureUrl || '',
    pageSize: t.pageSize === 'Letter' ? 'Letter' : 'A4',
  };
};

export const templateFromSnapshot = (snapshot = {}) => ({
  name: snapshot.name || 'Document',
  type: snapshot.type || '',
  headerHtml: snapshot.headerHtml || '',
  bodyHtml: snapshot.bodyHtml || '',
  termsHtml: snapshot.termsHtml || '',
  footerHtml: snapshot.footerHtml || '',
  customCss: snapshot.customCss || '',
  logoUrl: snapshot.logoUrl || '',
  companySignatureUrl: snapshot.companySignatureUrl || '',
  signatureUrl: snapshot.companySignatureUrl || '',
  pageSize: snapshot.pageSize === 'Letter' ? 'Letter' : 'A4',
});

const cloneDeep = (value) => {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
};

export const pushVersion = (doc, user, note = '') => {
  if (!doc) return;
  const hasContent = Boolean(doc.renderedHtml || doc.pdfUrl || doc.sourceData?.variables);
  if (!hasContent && !(doc.versions?.length)) {
    // First create — nothing meaningful to snapshot yet
  } else if (doc.renderedHtml || doc.pdfPath || Object.keys(doc.sourceData || {}).length) {
    const entry = {
      version: Number(doc.version) || 1,
      savedAt: new Date(),
      savedBy: user?._id || user || null,
      note: String(note || '').slice(0, 500),
      sourceData: cloneDeep(doc.sourceData || {}),
      templateSnapshot: cloneDeep(doc.templateSnapshot || {}),
      renderedHtml: doc.renderedHtml || '',
      pdfUrl: doc.pdfUrl || '',
      pdfPath: doc.pdfPath || '',
      status: doc.status || 'final',
    };
    doc.versions = Array.isArray(doc.versions) ? doc.versions : [];
    doc.versions.push(entry);
    if (doc.versions.length > MAX_DOCUMENT_VERSIONS) {
      doc.versions = doc.versions.slice(-MAX_DOCUMENT_VERSIONS);
    }
  }
  doc.version = (Number(doc.version) || 1) + 1;
};

export const buildBookingLikeFromInvoice = (invoice, booking = null) => {
  const structured = invoice.sourceData?.structured || {};
  return {
    ...(booking || {}),
    _id: booking?._id || invoice.booking || null,
    reservationId: invoice.invoiceNumber,
    customerName: invoice.customerName || structured.customerName || '',
    customerEmail: invoice.customerEmail || structured.customerEmail || '',
    customerPhone: invoice.customerPhone || structured.customerPhone || '',
    customerAddress: invoice.customerAddress || structured.customerAddress || '',
    nationality: structured.customerNationality || '',
    dateOfBirth: structured.customerDob || '',
    pickupDate: invoice.invoiceDate || new Date(),
    returnDate: invoice.dueDate || invoice.invoiceDate || new Date(),
    price: invoice.totalAmount || 0,
    paymentStatus: invoice.paymentStatus || 'pending',
    notes: invoice.notes || '',
    channel: invoice.source === 'manual' ? 'walk_in' : (booking?.channel || 'online'),
    car: {
      brand: invoice.vehicleBrand || '',
      model: invoice.vehicleModel || '',
      year: invoice.vehicleYear || '',
      licensePlate: invoice.vehiclePlate || '',
      category: invoice.vehicleType || '',
      ...(booking?.car || {}),
    },
    priceBreakdown: {
      rentalPrice: invoice.subtotal || 0,
      pickupDeliveryFee: 0,
      dropoffDeliveryFee: 0,
      discountTotal: invoice.discountAmount || 0,
      ...(booking?.priceBreakdown || {}),
    },
  };
};

export const buildContractSourceData = (booking, {
  contractNumber,
  owner,
  template,
  includeCompanyStamp = true,
} = {}) => {
  const bookingObj = booking?.toObject ? booking.toObject() : booking;
  const templateObj = template?.toObject ? template.toObject() : template;
  const variables = buildTemplateVariables(bookingObj, {
    contractNumber,
    owner,
    template: templateObj,
    includeCompanyStamp,
  });
  const car = bookingObj?.car || {};
  return {
    variables,
    structured: {
      contractNumber,
      customerName: bookingObj?.customerName || '',
      customerEmail: bookingObj?.customerEmail || '',
      customerPhone: bookingObj?.customerPhone || '',
      customerAddress: bookingObj?.customerAddress || '',
      nationality: bookingObj?.nationality || '',
      dateOfBirth: bookingObj?.dateOfBirth || '',
      placeOfBirth: bookingObj?.placeOfBirth || '',
      driverLicenseNumber: bookingObj?.driverLicenseNumber || '',
      driverLicenseExpiry: bookingObj?.driverLicenseExpiry || '',
      passportNumber: bookingObj?.passportNumber || '',
      identityDocumentNumber: bookingObj?.identityDocumentNumber || '',
      pickupDate: bookingObj?.pickupDate || null,
      returnDate: bookingObj?.returnDate || null,
      pickupLocation: bookingObj?.pickupLocation || '',
      returnLocation: bookingObj?.returnLocation || '',
      price: bookingObj?.price ?? 0,
      paymentStatus: bookingObj?.paymentStatus || '',
      notes: bookingObj?.notes || '',
      vehicleBrand: car.brand || '',
      vehicleModel: car.model || '',
      vehicleYear: car.year || '',
      vehiclePlate: car.licensePlate || '',
      vehicleCategory: car.category || '',
      secondDriver: bookingObj?.secondDriver || { enabled: false },
      franchiseAmount: bookingObj?.franchiseAmount ?? car.securityDeposit ?? 0,
    },
    meta: {
      includeCompanyStamp: Boolean(includeCompanyStamp),
      reservationId: bookingObj?.reservationId || '',
      bookingId: bookingObj?._id?.toString?.() || '',
    },
  };
};

export const buildInvoiceSourceData = ({
  owner,
  template,
  invoiceNumber,
  invoiceData = {},
  booking = null,
  includeCompanyStamp = true,
}) => {
  const bookingLike = buildBookingLikeFromInvoice(
    {
      invoiceNumber,
      customerName: invoiceData.customerName,
      customerEmail: invoiceData.customerEmail,
      customerPhone: invoiceData.customerPhone,
      customerAddress: invoiceData.customerAddress,
      vehicleBrand: invoiceData.vehicleBrand,
      vehicleModel: invoiceData.vehicleModel,
      vehicleYear: invoiceData.vehicleYear,
      vehiclePlate: invoiceData.vehiclePlate,
      vehicleType: invoiceData.vehicleType,
      invoiceDate: invoiceData.invoiceDate,
      dueDate: invoiceData.dueDate,
      subtotal: invoiceData.subtotal,
      discountAmount: invoiceData.discountAmount,
      totalAmount: invoiceData.totalAmount,
      paymentStatus: invoiceData.paymentStatus,
      notes: invoiceData.notes,
      source: booking ? 'booking' : 'manual',
    },
    booking?.toObject ? booking.toObject() : booking,
  );
  const templateObj = template?.toObject ? template.toObject() : template;
  const variables = buildTemplateVariables(bookingLike, {
    contractNumber: invoiceNumber,
    owner,
    template: templateObj,
    includeCompanyStamp,
  });
  return {
    variables,
    structured: {
      invoiceNumber,
      invoiceDate: invoiceData.invoiceDate || new Date(),
      dueDate: invoiceData.dueDate || null,
      currency: invoiceData.currency || 'MAD',
      customerName: invoiceData.customerName || '',
      customerEmail: invoiceData.customerEmail || '',
      customerPhone: invoiceData.customerPhone || '',
      customerAddress: invoiceData.customerAddress || '',
      customerTaxId: invoiceData.customerTaxId || '',
      customerNationality: invoiceData.customerNationality || '',
      customerDob: invoiceData.customerDob || '',
      vehicleBrand: invoiceData.vehicleBrand || '',
      vehicleModel: invoiceData.vehicleModel || '',
      vehicleYear: invoiceData.vehicleYear || '',
      vehiclePlate: invoiceData.vehiclePlate || '',
      vehicleType: invoiceData.vehicleType || '',
      items: Array.isArray(invoiceData.items) ? invoiceData.items : [],
      subtotal: Number(invoiceData.subtotal) || 0,
      discountAmount: Number(invoiceData.discountAmount) || 0,
      taxAmount: Number(invoiceData.taxAmount) || 0,
      totalAmount: Number(invoiceData.totalAmount) || 0,
      paymentStatus: invoiceData.paymentStatus || 'pending',
      paymentMethod: invoiceData.paymentMethod || 'cash',
      paymentReference: invoiceData.paymentReference || '',
      notes: invoiceData.notes || '',
    },
    meta: {
      includeCompanyStamp: Boolean(includeCompanyStamp),
      bookingId: booking?._id?.toString?.() || '',
    },
  };
};

/** Rebuild template variables from structured edits + optional booking */
export const rebuildVariablesFromStructured = (doc, {
  type,
  owner,
  booking = null,
} = {}) => {
  const snap = templateFromSnapshot(doc.templateSnapshot || {});
  const includeCompanyStamp = doc.includeCompanyStamp !== false;
  const structured = doc.sourceData?.structured || {};

  if (type === 'invoice') {
    const bookingLike = buildBookingLikeFromInvoice(
      {
        ...doc.toObject?.() || doc,
        ...structured,
        invoiceNumber: doc.invoiceNumber || structured.invoiceNumber,
      },
      booking,
    );
    return buildTemplateVariables(bookingLike, {
      contractNumber: doc.invoiceNumber,
      owner,
      template: snap,
      includeCompanyStamp,
    });
  }

  // Contract: merge structured onto booking-like
  const base = booking?.toObject ? booking.toObject() : (booking || {});
  const bookingLike = {
    ...base,
    customerName: structured.customerName ?? base.customerName,
    customerEmail: structured.customerEmail ?? base.customerEmail,
    customerPhone: structured.customerPhone ?? base.customerPhone,
    customerAddress: structured.customerAddress ?? base.customerAddress,
    nationality: structured.nationality ?? base.nationality,
    dateOfBirth: structured.dateOfBirth ?? base.dateOfBirth,
    placeOfBirth: structured.placeOfBirth ?? base.placeOfBirth,
    driverLicenseNumber: structured.driverLicenseNumber ?? base.driverLicenseNumber,
    driverLicenseExpiry: structured.driverLicenseExpiry ?? base.driverLicenseExpiry,
    passportNumber: structured.passportNumber ?? base.passportNumber,
    identityDocumentNumber: structured.identityDocumentNumber ?? base.identityDocumentNumber,
    pickupDate: structured.pickupDate ?? base.pickupDate,
    returnDate: structured.returnDate ?? base.returnDate,
    pickupLocation: structured.pickupLocation ?? base.pickupLocation,
    returnLocation: structured.returnLocation ?? base.returnLocation,
    price: structured.price ?? base.price,
    paymentStatus: structured.paymentStatus ?? base.paymentStatus,
    notes: structured.notes ?? base.notes,
    franchiseAmount: structured.franchiseAmount ?? base.franchiseAmount,
    secondDriver: structured.secondDriver ?? base.secondDriver,
    car: {
      ...(base.car || {}),
      brand: structured.vehicleBrand || base.car?.brand,
      model: structured.vehicleModel || base.car?.model,
      year: structured.vehicleYear || base.car?.year,
      licensePlate: structured.vehiclePlate || base.car?.licensePlate,
      category: structured.vehicleCategory || base.car?.category,
    },
  };
  return buildTemplateVariables(bookingLike, {
    contractNumber: doc.contractNumber || structured.contractNumber,
    owner,
    template: snap,
    includeCompanyStamp,
  });
};

export const renderAndStorePdf = async ({
  type,
  doc,
  owner,
  title,
}) => {
  const snap = templateFromSnapshot(doc.templateSnapshot || {});
  let variables = doc.sourceData?.variables;
  if (!variables || !Object.keys(variables).length) {
    let booking = null;
    if (doc.booking) {
      booking = await Booking.findById(doc.booking).populate('car').lean();
    }
    variables = rebuildVariablesFromStructured(doc, { type, owner, booking });
    doc.sourceData = {
      ...(doc.sourceData || {}),
      variables,
    };
  }

  const ownerId = owner?._id || owner;
  const dir = path.join(
    CONTRACTS_ROOT,
    String(ownerId),
    type === 'invoice' ? 'exports' : '',
  );
  ensureDir(dir);
  const token = Math.random().toString(36).slice(2, 10);
  const number = type === 'invoice' ? doc.invoiceNumber : doc.contractNumber;
  const safeNumber = String(number || type).replace(/[^a-zA-Z0-9-]/g, '');
  const fileName = `${type}-${safeNumber}-${token}.pdf`;
  const filePath = path.join(dir, fileName);
  const documentTitle = title || (type === 'invoice'
    ? `Invoice ${doc.invoiceNumber}`
    : `Contract ${doc.contractNumber}`);

  const fullHtml = buildDocumentHtml(snap, variables);
  await generatePdfFromTemplate({
    template: snap,
    variables,
    filePath,
    title: documentTitle,
  });

  doc.renderedHtml = fullHtml;
  doc.pdfPath = filePath;
  doc.pdfUrl = publicUploadUrl(filePath);
  doc.lastGeneratedAt = new Date();
  return { filePath, pdfUrl: doc.pdfUrl, renderedHtml: fullHtml, variables };
};

export const applySectionEdits = (doc, sections = {}) => {
  if (!doc.templateSnapshot) doc.templateSnapshot = {};
  const snap = typeof doc.templateSnapshot.toObject === 'function'
    ? doc.templateSnapshot.toObject()
    : { ...(doc.templateSnapshot || {}) };

  for (const key of ['headerHtml', 'bodyHtml', 'footerHtml', 'termsHtml', 'customCss']) {
    if (sections[key] !== undefined) {
      snap[key] = clampHtml(sections[key]);
    }
  }
  if (sections.pageSize !== undefined) {
    snap.pageSize = sections.pageSize === 'Letter' ? 'Letter' : 'A4';
  }
  if (sections.logoUrl !== undefined) snap.logoUrl = String(sections.logoUrl || '');
  if (sections.companySignatureUrl !== undefined) {
    snap.companySignatureUrl = String(sections.companySignatureUrl || '');
  }
  doc.templateSnapshot = snap;
};

export const applyContractStructuredEdits = (doc, patch = {}) => {
  if (!doc.sourceData) doc.sourceData = {};
  const structured = { ...(doc.sourceData.structured || {}) };
  const keys = [
    'customerName', 'customerEmail', 'customerPhone', 'customerAddress',
    'nationality', 'dateOfBirth', 'placeOfBirth',
    'driverLicenseNumber', 'driverLicenseExpiry', 'passportNumber', 'identityDocumentNumber',
    'pickupDate', 'returnDate', 'pickupLocation', 'returnLocation',
    'price', 'paymentStatus', 'notes', 'franchiseAmount',
    'vehicleBrand', 'vehicleModel', 'vehicleYear', 'vehiclePlate', 'vehicleCategory',
    'secondDriver',
  ];
  for (const key of keys) {
    if (patch[key] !== undefined) structured[key] = patch[key];
  }
  if (patch.includeCompanyStamp !== undefined) {
    doc.includeCompanyStamp = Boolean(patch.includeCompanyStamp);
  }
  if (patch.status === 'draft' || patch.status === 'final') {
    doc.status = patch.status;
  }
  doc.sourceData = { ...(doc.sourceData || {}), structured };
  doc.customerName = structured.customerName || doc.customerName || '';
  doc.customerPhone = structured.customerPhone || doc.customerPhone || '';
  doc.customerEmail = structured.customerEmail || doc.customerEmail || '';
};

const INVOICE_FLAT_FIELDS = [
  'invoiceDate', 'dueDate', 'currency',
  'customerName', 'customerEmail', 'customerPhone', 'customerAddress', 'customerTaxId',
  'vehicleBrand', 'vehicleModel', 'vehicleYear', 'vehiclePlate', 'vehicleType',
  'subtotal', 'discountAmount', 'taxAmount', 'totalAmount',
  'paymentStatus', 'paymentMethod', 'paymentReference', 'notes',
];

export const applyInvoiceStructuredEdits = (doc, patch = {}) => {
  if (!doc.sourceData) doc.sourceData = {};
  const structured = { ...(doc.sourceData.structured || {}) };

  const scalarMap = [
    ...INVOICE_FLAT_FIELDS,
    'customerNationality', 'customerDob',
  ];
  for (const key of scalarMap) {
    if (patch[key] !== undefined) {
      structured[key] = patch[key];
      if (INVOICE_FLAT_FIELDS.includes(key)) {
        doc[key] = patch[key];
      }
    }
  }

  if (Array.isArray(patch.items)) {
    const items = patch.items.map((item) => ({
      description: String(item.description || '').trim(),
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.unitPrice || 0),
      taxRate: Number(item.taxRate || 0),
    })).filter((item) => item.description || item.quantity || item.unitPrice);

    if (!items.length) {
      throw new Error('At least one invoice item is required');
    }
    for (const item of items) {
      if (item.quantity < 0 || item.unitPrice < 0 || item.taxRate < 0) {
        throw new Error('Invoice amounts must be non-negative');
      }
    }
    structured.items = items;
    doc.items = items;

    if (patch.subtotal === undefined) {
      const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const taxAmount = items.reduce(
        (sum, item) => sum + (item.quantity * item.unitPrice * (item.taxRate || 0) / 100),
        0,
      );
      const discount = Number(patch.discountAmount ?? doc.discountAmount ?? 0);
      structured.subtotal = subtotal;
      structured.taxAmount = taxAmount;
      structured.discountAmount = discount;
      structured.totalAmount = Math.max(0, subtotal + taxAmount - discount);
      doc.subtotal = structured.subtotal;
      doc.taxAmount = structured.taxAmount;
      doc.discountAmount = structured.discountAmount;
      doc.totalAmount = structured.totalAmount;
    }
  }

  for (const amountKey of ['subtotal', 'discountAmount', 'taxAmount', 'totalAmount']) {
    if (doc[amountKey] != null && Number(doc[amountKey]) < 0) {
      throw new Error('Invoice amounts must be non-negative');
    }
  }

  if (patch.includeCompanyStamp !== undefined) {
    doc.includeCompanyStamp = Boolean(patch.includeCompanyStamp);
  }
  if (patch.status === 'draft' || patch.status === 'final') {
    doc.status = patch.status;
  }

  doc.sourceData = { ...(doc.sourceData || {}), structured };
};

export const hydrateLegacyDocument = async (doc, { type, owner }) => {
  const needsSource = !doc.sourceData?.variables || !Object.keys(doc.sourceData.variables || {}).length;
  const needsSnap = !doc.templateSnapshot?.bodyHtml && !doc.templateSnapshot?.headerHtml;
  if (!needsSource && !needsSnap) return doc;

  const { ensureDefaultTemplates } = await import('../controllers/exportTemplateController.js');
  await ensureDefaultTemplates(owner._id || owner);
  let template = null;
  if (doc.template) {
    template = await ExportTemplate.findById(doc.template).lean();
  }
  if (!template) {
    template = type === 'invoice'
      ? await getDefaultInvoiceTemplate(owner._id || owner)
      : await getDefaultContractTemplate(owner._id || owner);
  }
  if (needsSnap && template) {
    doc.templateSnapshot = snapshotTemplate(template);
    if (!doc.template && template._id) doc.template = template._id;
  }

  let booking = null;
  if (doc.booking) {
    booking = await Booking.findById(doc.booking).populate('car');
  }

  if (needsSource) {
    if (type === 'contract' && booking) {
      doc.sourceData = buildContractSourceData(booking, {
        contractNumber: doc.contractNumber,
        owner,
        template: doc.templateSnapshot || template,
        includeCompanyStamp: doc.includeCompanyStamp !== false,
      });
      doc.customerName = doc.customerName || booking.customerName || '';
      doc.customerPhone = doc.customerPhone || booking.customerPhone || '';
      doc.customerEmail = doc.customerEmail || booking.customerEmail || '';
    } else if (type === 'invoice') {
      doc.sourceData = buildInvoiceSourceData({
        owner,
        template: doc.templateSnapshot || template,
        invoiceNumber: doc.invoiceNumber,
        invoiceData: {
          invoiceDate: doc.invoiceDate,
          dueDate: doc.dueDate,
          currency: doc.currency,
          customerName: doc.customerName,
          customerEmail: doc.customerEmail,
          customerPhone: doc.customerPhone,
          customerAddress: doc.customerAddress,
          customerTaxId: doc.customerTaxId,
          vehicleBrand: doc.vehicleBrand,
          vehicleModel: doc.vehicleModel,
          vehicleYear: doc.vehicleYear,
          vehiclePlate: doc.vehiclePlate,
          vehicleType: doc.vehicleType,
          items: doc.items,
          subtotal: doc.subtotal,
          discountAmount: doc.discountAmount,
          taxAmount: doc.taxAmount,
          totalAmount: doc.totalAmount,
          paymentStatus: doc.paymentStatus,
          paymentMethod: doc.paymentMethod,
          paymentReference: doc.paymentReference,
          notes: doc.notes,
        },
        booking,
        includeCompanyStamp: doc.includeCompanyStamp !== false,
      });
    }
  }
  return doc;
};

export const resolveExistingPdfPath = (doc) => {
  if (doc?.pdfPath && fs.existsSync(doc.pdfPath)) return doc.pdfPath;
  const fromUrl = resolveLocalUploadPath(doc?.pdfUrl);
  if (fromUrl && fs.existsSync(fromUrl)) return fromUrl;
  return null;
};

export const versionSummary = (versions = []) =>
  (versions || []).map((v) => ({
    version: v.version,
    savedAt: v.savedAt,
    savedBy: v.savedBy,
    note: v.note,
    status: v.status,
    hasPdf: Boolean(v.pdfUrl || v.pdfPath),
  }));

export default {
  snapshotTemplate,
  templateFromSnapshot,
  pushVersion,
  buildContractSourceData,
  buildInvoiceSourceData,
  rebuildVariablesFromStructured,
  renderAndStorePdf,
  applySectionEdits,
  applyContractStructuredEdits,
  applyInvoiceStructuredEdits,
  hydrateLegacyDocument,
  resolveExistingPdfPath,
  versionSummary,
  buildBookingLikeFromInvoice,
};

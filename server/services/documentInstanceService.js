import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildDocumentHtml,
  buildTemplateVariables,
  buildTemplateVariablesAsync,
} from './templateEngine.js';
import { generatePdfFromTemplate } from './templatePdfExport.js';
import { publicUploadUrl } from './pdfDocuments.js';
import { resolveLocalUploadPath, embedCompletionSignatures } from '../utils/uploadPaths.js';
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
import { displayCustomerEmail, resolveIdentityDocument } from '../utils/contractFields.js';

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
  const vehicleBrand = invoice.vehicleBrand || structured.vehicleBrand || booking?.car?.brand || '';
  const vehicleModel = invoice.vehicleModel || structured.vehicleModel || booking?.car?.model || '';
  const vehicleYear = invoice.vehicleYear || structured.vehicleYear || booking?.car?.year || '';
  const vehiclePlate = invoice.vehiclePlate || structured.vehiclePlate || booking?.car?.licensePlate || '';
  const vehicleType = invoice.vehicleType || structured.vehicleType || booking?.car?.category || '';
  return {
    ...(booking || {}),
    _id: booking?._id || invoice.booking || null,
    reservationId: booking?.reservationId || invoice.invoiceNumber,
    customerName: invoice.customerName || structured.customerName || booking?.customerName || '',
    customerEmail: invoice.customerEmail || structured.customerEmail || booking?.customerEmail || '',
    customerPhone: invoice.customerPhone || structured.customerPhone || booking?.customerPhone || '',
    customerAddress: invoice.customerAddress || structured.customerAddress || booking?.customerAddress || '',
    nationality: structured.customerNationality || booking?.nationality || '',
    dateOfBirth: structured.customerDob || booking?.dateOfBirth || '',
    pickupDate: invoice.invoiceDate || booking?.pickupDate || new Date(),
    returnDate: invoice.dueDate || invoice.invoiceDate || booking?.returnDate || new Date(),
    price: invoice.totalAmount ?? structured.totalAmount ?? booking?.price ?? 0,
    paymentStatus: invoice.paymentStatus || structured.paymentStatus || booking?.paymentStatus || 'pending',
    notes: invoice.notes || structured.notes || booking?.notes || '',
    channel: invoice.source === 'manual' ? 'walk_in' : (booking?.channel || 'online'),
    car: {
      ...(booking?.car || {}),
      brand: vehicleBrand,
      model: vehicleModel,
      year: vehicleYear,
      licensePlate: vehiclePlate,
      category: vehicleType,
    },
    priceBreakdown: {
      ...(booking?.priceBreakdown || {}),
      rentalPrice: invoice.subtotal ?? structured.subtotal ?? booking?.priceBreakdown?.rentalPrice ?? 0,
      pickupDeliveryFee: structured.pickupFee ?? booking?.priceBreakdown?.pickupDeliveryFee ?? 0,
      dropoffDeliveryFee: structured.dropoffFee ?? booking?.priceBreakdown?.dropoffDeliveryFee ?? 0,
      discountTotal: invoice.discountAmount ?? structured.discountAmount ?? 0,
      days: structured.rentalDays ?? booking?.priceBreakdown?.days,
      pricePerDay: structured.pricePerDay ?? booking?.priceBreakdown?.pricePerDay,
    },
    completion: {
      ...(booking?.completion || {}),
      signatureUrl: structured.customerSignatureUrl || booking?.completion?.signatureUrl || '',
      secondDriverSignatureUrl:
        structured.secondDriverSignatureUrl || booking?.completion?.secondDriverSignatureUrl || '',
    },
  };
};

/** Build the full editable structured payload from a booking (+ optional variable fallbacks). */
export const buildContractStructuredFromBooking = (booking, {
  contractNumber,
  includeCompanyStamp = true,
  variables = {},
  agency = {},
  owner = null,
} = {}) => {
  const bookingObj = booking?.toObject ? booking.toObject() : (booking || {});
  const car = bookingObj.car || {};
  const b = bookingObj.priceBreakdown || {};
  const sd = bookingObj.secondDriver || {};
  const pick = (...vals) => {
    for (const v of vals) {
      if (v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim() !== '—') {
        return v;
      }
    }
    return '';
  };
  const identityDocumentNumber = pick(
    bookingObj.identityDocumentNumber,
    variables.identity_document === '—' ? '' : variables.identity_document,
  );
  const passportNumber = pick(bookingObj.passportNumber, variables.passport_number);
  return {
    contractNumber: contractNumber || '',
    reservationId: pick(bookingObj.reservationId, variables.reservation_id),
    customerName: pick(bookingObj.customerName, variables.customer_name),
    customerEmail: displayCustomerEmail(
      pick(bookingObj.customerEmail, variables.customer_email),
      '',
    ),
    customerPhone: pick(bookingObj.customerPhone, variables.customer_phone),
    customerAddress: pick(bookingObj.customerAddress, variables.customer_address),
    nationality: pick(bookingObj.nationality, variables.customer_nationality),
    dateOfBirth: pick(bookingObj.dateOfBirth, variables.customer_dob),
    placeOfBirth: pick(bookingObj.placeOfBirth, variables.customer_birth_place),
    driverLicenseNumber: pick(bookingObj.driverLicenseNumber, variables.driver_license),
    driverLicenseExpiry: pick(bookingObj.driverLicenseExpiry, variables.driver_license_expiry),
    driverLicenseIssuedOn: pick(bookingObj.driverLicenseIssuedOn, variables.driver_license_issued_on),
    passportNumber,
    identityDocumentNumber: resolveIdentityDocument(
      { identityDocumentNumber, passportNumber },
      '',
    ),
    identityIssuedOn: pick(bookingObj.identityIssuedOn, variables.identity_issued_on),
    pickupDate: bookingObj.pickupDate || null,
    returnDate: bookingObj.returnDate || null,
    pickupLocation: pick(bookingObj.pickupLocation, variables.pickup_location),
    returnLocation: pick(bookingObj.returnLocation, variables.return_location),
    deliveredBy: pick(bookingObj.deliveredBy, variables.delivered_by),
    receivedBy: pick(bookingObj.receivedBy, variables.received_by),
    fuelLevelStart: pick(bookingObj.fuelLevelStart, variables.fuel_level_start),
    kmDepart: bookingObj.kmDepart != null && bookingObj.kmDepart !== ''
      ? bookingObj.kmDepart
      : (car.mileage != null ? car.mileage : pick(variables.km_depart)),
    kmRetour: bookingObj.kmRetour != null && bookingObj.kmRetour !== ''
      ? bookingObj.kmRetour
      : pick(variables.km_retour),
    rentalDays: b.days ?? bookingObj.rentalDays ?? '',
    pricePerDay: b.pricePerDay ?? car.pricePerDay ?? '',
    rentalPrice: b.rentalPrice ?? bookingObj.price ?? 0,
    pickupFee: b.pickupDeliveryFee ?? 0,
    dropoffFee: b.dropoffDeliveryFee ?? 0,
    discountTotal: b.discountTotal ?? 0,
    price: bookingObj.price ?? b.total ?? b.rentalPrice ?? 0,
    franchiseAmount: bookingObj.franchiseAmount ?? car.securityDeposit ?? 0,
    currency: pick(variables.currency, process.env.CURRENCY, 'MAD') || 'MAD',
    paymentStatus: pick(bookingObj.paymentStatus, variables.payment_status),
    bookingStatus: pick(bookingObj.status, variables.booking_status),
    bookingMethod: bookingObj.channel === 'walk_in' ? 'Walk-in' : (pick(variables.booking_method) || 'Online'),
    notes: pick(bookingObj.notes, variables.notes === '—' ? '' : variables.notes),
    vehicleBrand: pick(car.brand, variables.car_brand),
    vehicleModel: pick(car.model, variables.car_model),
    vehicleYear: pick(car.year, variables.car_year),
    vehiclePlate: pick(car.licensePlate, car.registrationNumber, variables.car_registration),
    vehicleCategory: pick(car.category, variables.car_category),
    vehicleFuel: pick(car.fuel_type, car.fuelType, variables.car_fuel),
    vehicleTransmission: pick(car.transmission, variables.car_transmission),
    brokerReferrer: pick(variables.broker_referrer),
    vehicleDeliveryDriver: pick(variables.vehicle_delivery_driver),
    secondDriver: {
      enabled: Boolean(sd.enabled),
      fullName: sd.fullName || '',
      dateOfBirth: sd.dateOfBirth || '',
      nationality: sd.nationality || '',
      driverLicenseNumber: sd.driverLicenseNumber || '',
      driverLicenseExpiry: sd.driverLicenseExpiry || '',
      passportNumber: sd.passportNumber || '',
      phone: sd.phone || '',
    },
    agencyName: pick(agency.name, owner?.agencyName, variables.agency_name),
    agencyPhone: pick(agency.phone, variables.agency_phone),
    agencyEmail: pick(agency.email, owner?.email, variables.agency_email),
    agencyAddress: pick(agency.address, variables.agency_address),
    agencyTaxId: pick(agency.taxId, variables.agency_tax_id),
    customerSignatureUrl: bookingObj.completion?.signatureUrl || '',
    secondDriverSignatureUrl: bookingObj.completion?.secondDriverSignatureUrl || '',
    includeCompanyStamp: Boolean(includeCompanyStamp),
  };
};

export const buildContractSourceData = async (booking, {
  contractNumber,
  owner,
  template,
  includeCompanyStamp = true,
  agency = {},
} = {}) => {
  const bookingObj = await embedCompletionSignatures(
    booking?.toObject ? booking.toObject() : booking,
  );
  const templateObj = template?.toObject ? template.toObject() : template;
  const variables = buildTemplateVariables(bookingObj, {
    contractNumber,
    owner,
    template: templateObj,
    includeCompanyStamp,
    agency,
  });
  const structured = buildContractStructuredFromBooking(bookingObj, {
    contractNumber,
    includeCompanyStamp,
    variables,
    agency,
    owner,
  });
  return {
    variables,
    structured,
    meta: {
      includeCompanyStamp: Boolean(includeCompanyStamp),
      reservationId: bookingObj?.reservationId || '',
      bookingId: bookingObj?._id?.toString?.() || '',
    },
  };
};

export const buildInvoiceSourceData = async ({
  owner,
  template,
  invoiceNumber,
  invoiceData = {},
  booking = null,
  includeCompanyStamp = true,
}) => {
  const bookingLike = await embedCompletionSignatures(
    buildBookingLikeFromInvoice(
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
    ),
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

const hasStructured = (structured, key) =>
  Object.prototype.hasOwnProperty.call(structured || {}, key);

const fromStructured = (structured, key, fallback) =>
  (hasStructured(structured, key) ? structured[key] : fallback);

/** Mark document instance as manually edited source of truth */
export const markSourceLocked = (doc) => {
  if (!doc) return;
  doc.sourceLocked = true;
  doc.manuallyEditedAt = new Date();
  doc.sourceData = {
    ...(doc.sourceData || {}),
    meta: {
      ...((doc.sourceData && doc.sourceData.meta) || {}),
      sourceLocked: true,
      manuallyEditedAt: doc.manuallyEditedAt,
    },
  };
};

/** Sync denormalized list fields from structured/instance data (document SSOT). */
export const syncDocumentListFields = (doc, type = 'contract') => {
  const s = doc.sourceData?.structured || {};
  if (type === 'invoice') {
    doc.customerName = fromStructured(s, 'customerName', doc.customerName) || doc.customerName || '';
    doc.customerEmail = fromStructured(s, 'customerEmail', doc.customerEmail) || doc.customerEmail || '';
    doc.customerPhone = fromStructured(s, 'customerPhone', doc.customerPhone) || doc.customerPhone || '';
    doc.customerAddress = fromStructured(s, 'customerAddress', doc.customerAddress) || doc.customerAddress || '';
    if (hasStructured(s, 'totalAmount')) doc.totalAmount = Number(s.totalAmount) || 0;
    if (hasStructured(s, 'vehicleBrand')) doc.vehicleBrand = s.vehicleBrand || '';
    if (hasStructured(s, 'vehicleModel')) doc.vehicleModel = s.vehicleModel || '';
    if (hasStructured(s, 'vehiclePlate')) doc.vehiclePlate = s.vehiclePlate || '';
    return doc;
  }

  doc.customerName = fromStructured(s, 'customerName', doc.customerName) || doc.customerName || '';
  doc.customerEmail = fromStructured(s, 'customerEmail', doc.customerEmail) || doc.customerEmail || '';
  doc.customerPhone = fromStructured(s, 'customerPhone', doc.customerPhone) || doc.customerPhone || '';
  doc.reservationId = fromStructured(s, 'reservationId', doc.reservationId) || doc.reservationId || '';
  const brand = fromStructured(s, 'vehicleBrand', '');
  const model = fromStructured(s, 'vehicleModel', '');
  const summary = [brand, model].filter(Boolean).join(' ').trim();
  if (summary) doc.vehicleSummary = summary;
  if (hasStructured(s, 'price') && s.price !== '' && s.price != null) {
    doc.totalAmount = Number(s.price) || 0;
  }
  return doc;
};

/** Rebuild template variables from structured edits + optional booking */
export const rebuildVariablesFromStructured = async (doc, {
  type,
  owner,
  booking = null,
} = {}) => {
  const snap = templateFromSnapshot(doc.templateSnapshot || {});
  const includeCompanyStamp = doc.includeCompanyStamp !== false;
  const structured = doc.sourceData?.structured || {};
  // Locked docs must never pull live booking values into the render
  const locked = Boolean(doc.sourceLocked);
  const bookingSource = locked ? null : booking;
  const agency = {
    name: structured.agencyName || undefined,
    phone: structured.agencyPhone || undefined,
    email: structured.agencyEmail || undefined,
    address: structured.agencyAddress || undefined,
    taxId: structured.agencyTaxId || undefined,
    currency: structured.currency || undefined,
  };

  if (type === 'invoice') {
    const bookingLike = await embedCompletionSignatures(
      buildBookingLikeFromInvoice(
        {
          ...doc.toObject?.() || doc,
          ...structured,
          invoiceNumber: doc.invoiceNumber || structured.invoiceNumber,
          sourceData: { structured },
        },
        bookingSource,
      ),
    );
    return buildTemplateVariables(bookingLike, {
      contractNumber: doc.invoiceNumber,
      owner,
      template: snap,
      includeCompanyStamp,
      agency,
    });
  }

  // Contract: structured wins; booking is only a gap-fill when not locked
  const base = bookingSource?.toObject ? bookingSource.toObject() : (bookingSource || {});
  const sd = fromStructured(structured, 'secondDriver', base.secondDriver) || { enabled: false };
  const bookingLike = {
    ...base,
    reservationId: fromStructured(structured, 'reservationId', base.reservationId),
    customerName: fromStructured(structured, 'customerName', base.customerName),
    customerEmail: fromStructured(structured, 'customerEmail', base.customerEmail),
    customerPhone: fromStructured(structured, 'customerPhone', base.customerPhone),
    customerAddress: fromStructured(structured, 'customerAddress', base.customerAddress),
    nationality: fromStructured(structured, 'nationality', base.nationality),
    dateOfBirth: fromStructured(structured, 'dateOfBirth', base.dateOfBirth),
    placeOfBirth: fromStructured(structured, 'placeOfBirth', base.placeOfBirth),
    driverLicenseNumber: fromStructured(structured, 'driverLicenseNumber', base.driverLicenseNumber),
    driverLicenseExpiry: fromStructured(structured, 'driverLicenseExpiry', base.driverLicenseExpiry),
    driverLicenseIssuedOn: fromStructured(structured, 'driverLicenseIssuedOn', base.driverLicenseIssuedOn),
    passportNumber: fromStructured(structured, 'passportNumber', base.passportNumber),
    identityDocumentNumber: fromStructured(structured, 'identityDocumentNumber', base.identityDocumentNumber),
    identityIssuedOn: fromStructured(structured, 'identityIssuedOn', base.identityIssuedOn),
    pickupDate: fromStructured(structured, 'pickupDate', base.pickupDate),
    returnDate: fromStructured(structured, 'returnDate', base.returnDate),
    pickupLocation: fromStructured(structured, 'pickupLocation', base.pickupLocation),
    returnLocation: fromStructured(structured, 'returnLocation', base.returnLocation),
    deliveredBy: fromStructured(structured, 'deliveredBy', base.deliveredBy),
    receivedBy: fromStructured(structured, 'receivedBy', base.receivedBy),
    brokerReferrer: fromStructured(structured, 'brokerReferrer', base.brokerReferrer),
    vehicleDeliveryDriver: fromStructured(structured, 'vehicleDeliveryDriver', base.vehicleDeliveryDriver),
    fuelLevelStart: fromStructured(structured, 'fuelLevelStart', base.fuelLevelStart),
    kmDepart: fromStructured(structured, 'kmDepart', base.kmDepart),
    kmRetour: fromStructured(structured, 'kmRetour', base.kmRetour),
    price: fromStructured(structured, 'price', base.price),
    paymentStatus: fromStructured(structured, 'paymentStatus', base.paymentStatus),
    status: fromStructured(structured, 'bookingStatus', base.status),
    notes: fromStructured(structured, 'notes', base.notes),
    franchiseAmount: fromStructured(structured, 'franchiseAmount', base.franchiseAmount),
    channel: structured.bookingMethod === 'Walk-in'
      ? 'walk_in'
      : (structured.bookingMethod === 'Online' ? 'online' : (base.channel || 'online')),
    secondDriver: {
      enabled: Boolean(sd.enabled),
      fullName: sd.fullName || '',
      dateOfBirth: sd.dateOfBirth || '',
      nationality: sd.nationality || '',
      driverLicenseNumber: sd.driverLicenseNumber || '',
      driverLicenseExpiry: sd.driverLicenseExpiry || '',
      passportNumber: sd.passportNumber || '',
      phone: sd.phone || '',
    },
    car: {
      ...(locked ? {} : (base.car || {})),
      brand: fromStructured(structured, 'vehicleBrand', base.car?.brand),
      model: fromStructured(structured, 'vehicleModel', base.car?.model),
      year: fromStructured(structured, 'vehicleYear', base.car?.year),
      licensePlate: fromStructured(structured, 'vehiclePlate', base.car?.licensePlate),
      category: fromStructured(structured, 'vehicleCategory', base.car?.category),
      fuel_type: fromStructured(structured, 'vehicleFuel', base.car?.fuel_type),
      transmission: fromStructured(structured, 'vehicleTransmission', base.car?.transmission),
      pricePerDay: fromStructured(structured, 'pricePerDay', base.car?.pricePerDay),
      securityDeposit: fromStructured(structured, 'franchiseAmount', base.car?.securityDeposit),
      mileage: fromStructured(structured, 'kmDepart', base.car?.mileage),
    },
    priceBreakdown: {
      ...(locked ? {} : (base.priceBreakdown || {})),
      days: hasStructured(structured, 'rentalDays') && structured.rentalDays !== ''
        ? Number(structured.rentalDays)
        : base.priceBreakdown?.days,
      pricePerDay: hasStructured(structured, 'pricePerDay') && structured.pricePerDay !== ''
        ? Number(structured.pricePerDay)
        : base.priceBreakdown?.pricePerDay,
      rentalPrice: hasStructured(structured, 'rentalPrice')
        ? Number(structured.rentalPrice)
        : base.priceBreakdown?.rentalPrice,
      pickupDeliveryFee: hasStructured(structured, 'pickupFee')
        ? Number(structured.pickupFee)
        : base.priceBreakdown?.pickupDeliveryFee,
      dropoffDeliveryFee: hasStructured(structured, 'dropoffFee')
        ? Number(structured.dropoffFee)
        : base.priceBreakdown?.dropoffDeliveryFee,
      discountTotal: hasStructured(structured, 'discountTotal')
        ? Number(structured.discountTotal)
        : base.priceBreakdown?.discountTotal,
      total: hasStructured(structured, 'price')
        ? Number(structured.price)
        : base.priceBreakdown?.total,
    },
    completion: {
      ...(locked ? {} : (base.completion || {})),
      signatureUrl: fromStructured(structured, 'customerSignatureUrl', base.completion?.signatureUrl) || '',
      secondDriverSignatureUrl:
        fromStructured(structured, 'secondDriverSignatureUrl', base.completion?.secondDriverSignatureUrl) || '',
    },
  };
  const readyBooking = await embedCompletionSignatures(bookingLike);
  return buildTemplateVariables(readyBooking, {
    contractNumber: doc.contractNumber || structured.contractNumber,
    owner,
    template: snap,
    includeCompanyStamp,
    agency,
  });
};

export const renderAndStorePdf = async ({
  type,
  doc,
  owner,
  title,
}) => {
  const snap = templateFromSnapshot(doc.templateSnapshot || {});
  // Always rebuild from structured when locked (or variables missing) so PDF matches edits
  let variables = doc.sourceData?.variables;
  const mustRebuild = doc.sourceLocked
    || !variables
    || !Object.keys(variables).length;
  if (mustRebuild) {
    let booking = null;
    if (!doc.sourceLocked && doc.booking) {
      booking = await Booking.findById(doc.booking).populate('car').lean();
    }
    variables = await rebuildVariablesFromStructured(doc, { type, owner, booking });
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
  // Never wipe template assets with accidental empty strings from the editor.
  // Replace only when a non-empty URL is provided, or clear* is explicitly true.
  if (sections.logoUrl !== undefined) {
    const next = String(sections.logoUrl || '').trim();
    if (next) snap.logoUrl = next;
    else if (sections.clearLogo === true) snap.logoUrl = '';
  }
  if (sections.companySignatureUrl !== undefined) {
    const next = String(sections.companySignatureUrl || '').trim();
    if (next) snap.companySignatureUrl = next;
    else if (sections.clearCompanySignature === true) snap.companySignatureUrl = '';
  }
  doc.templateSnapshot = snap;
};

export const applyContractStructuredEdits = (doc, patch = {}) => {
  if (!doc.sourceData) doc.sourceData = {};
  const structured = { ...(doc.sourceData.structured || {}) };
  const keys = [
    'reservationId',
    'customerName', 'customerEmail', 'customerPhone', 'customerAddress',
    'nationality', 'dateOfBirth', 'placeOfBirth',
    'driverLicenseNumber', 'driverLicenseExpiry', 'driverLicenseIssuedOn',
    'passportNumber', 'identityDocumentNumber', 'identityIssuedOn',
    'pickupDate', 'returnDate', 'pickupLocation', 'returnLocation',
    'deliveredBy', 'receivedBy', 'fuelLevelStart', 'kmDepart', 'kmRetour',
    'rentalDays', 'pricePerDay', 'rentalPrice', 'pickupFee', 'dropoffFee', 'discountTotal',
    'price', 'paymentStatus', 'bookingStatus', 'bookingMethod', 'notes', 'franchiseAmount', 'currency',
    'vehicleBrand', 'vehicleModel', 'vehicleYear', 'vehiclePlate', 'vehicleCategory',
    'vehicleFuel', 'vehicleTransmission', 'brokerReferrer', 'vehicleDeliveryDriver',
    'agencyName', 'agencyPhone', 'agencyEmail', 'agencyAddress', 'agencyTaxId',
    'customerSignatureUrl', 'secondDriverSignatureUrl',
    'secondDriver',
  ];
  for (const key of keys) {
    if (patch[key] !== undefined) structured[key] = patch[key];
  }

  // Flat second-driver fields from the admin form
  if (
    patch.secondDriverEnabled !== undefined
    || patch.secondDriverFullName !== undefined
    || patch.secondDriverDob !== undefined
    || patch.secondDriverNationality !== undefined
    || patch.secondDriverLicense !== undefined
    || patch.secondDriverLicenseExpiry !== undefined
    || patch.secondDriverPassport !== undefined
    || patch.secondDriverPhone !== undefined
  ) {
    const prev = structured.secondDriver || { enabled: false };
    structured.secondDriver = {
      enabled: patch.secondDriverEnabled !== undefined
        ? Boolean(patch.secondDriverEnabled)
        : Boolean(prev.enabled),
      fullName: patch.secondDriverFullName !== undefined ? patch.secondDriverFullName : (prev.fullName || ''),
      dateOfBirth: patch.secondDriverDob !== undefined ? patch.secondDriverDob : (prev.dateOfBirth || ''),
      nationality: patch.secondDriverNationality !== undefined
        ? patch.secondDriverNationality
        : (prev.nationality || ''),
      driverLicenseNumber: patch.secondDriverLicense !== undefined
        ? patch.secondDriverLicense
        : (prev.driverLicenseNumber || ''),
      driverLicenseExpiry: patch.secondDriverLicenseExpiry !== undefined
        ? patch.secondDriverLicenseExpiry
        : (prev.driverLicenseExpiry || ''),
      passportNumber: patch.secondDriverPassport !== undefined
        ? patch.secondDriverPassport
        : (prev.passportNumber || ''),
      phone: patch.secondDriverPhone !== undefined ? patch.secondDriverPhone : (prev.phone || ''),
    };
  }

  for (const amountKey of [
    'price', 'franchiseAmount', 'pricePerDay', 'rentalPrice',
    'pickupFee', 'dropoffFee', 'discountTotal', 'rentalDays', 'kmDepart', 'kmRetour',
  ]) {
    if (structured[amountKey] !== undefined && structured[amountKey] !== null && structured[amountKey] !== '') {
      const n = Number(structured[amountKey]);
      if (Number.isFinite(n) && n < 0) {
        throw new Error('Amounts must be non-negative');
      }
    }
  }

  if (patch.includeCompanyStamp !== undefined) {
    doc.includeCompanyStamp = Boolean(patch.includeCompanyStamp);
    structured.includeCompanyStamp = doc.includeCompanyStamp;
  }
  if (patch.status === 'draft' || patch.status === 'final') {
    doc.status = patch.status;
  }
  if (patch.companySignatureUrl !== undefined && doc.templateSnapshot) {
    const next = String(patch.companySignatureUrl || '').trim();
    if (next || patch.clearCompanySignature === true) {
      const snap = typeof doc.templateSnapshot.toObject === 'function'
        ? doc.templateSnapshot.toObject()
        : { ...(doc.templateSnapshot || {}) };
      snap.companySignatureUrl = next;
      doc.templateSnapshot = snap;
    }
  }
  if (patch.logoUrl !== undefined && doc.templateSnapshot) {
    const next = String(patch.logoUrl || '').trim();
    if (next || patch.clearLogo === true) {
      const snap = typeof doc.templateSnapshot.toObject === 'function'
        ? doc.templateSnapshot.toObject()
        : { ...(doc.templateSnapshot || {}) };
      snap.logoUrl = next;
      doc.templateSnapshot = snap;
    }
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
    'customerNationality', 'customerDob', 'customerAddress',
    'rentalDays', 'pricePerDay', 'pickupFee', 'dropoffFee',
    'pickupLocation', 'returnLocation', 'pickupDate', 'returnDate',
    'agencyName', 'agencyPhone', 'agencyEmail', 'agencyAddress', 'agencyTaxId',
    'customerSignatureUrl', 'franchiseAmount',
  ];
  for (const key of scalarMap) {
    if (patch[key] !== undefined) {
      structured[key] = patch[key];
      if (INVOICE_FLAT_FIELDS.includes(key)) {
        doc[key] = patch[key];
      }
    }
  }

  if (patch.companySignatureUrl !== undefined && doc.templateSnapshot) {
    const next = String(patch.companySignatureUrl || '').trim();
    if (next || patch.clearCompanySignature === true) {
      const snap = typeof doc.templateSnapshot.toObject === 'function'
        ? doc.templateSnapshot.toObject()
        : { ...(doc.templateSnapshot || {}) };
      snap.companySignatureUrl = next;
      doc.templateSnapshot = snap;
    }
  }
  if (patch.logoUrl !== undefined && doc.templateSnapshot) {
    const next = String(patch.logoUrl || '').trim();
    if (next || patch.clearLogo === true) {
      const snap = typeof doc.templateSnapshot.toObject === 'function'
        ? doc.templateSnapshot.toObject()
        : { ...(doc.templateSnapshot || {}) };
      snap.logoUrl = next;
      doc.templateSnapshot = snap;
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

const structuredLooksSparse = (structured = {}) => {
  const keys = Object.keys(structured || {});
  if (keys.length < 8) return true;
  const identity = structured.customerName || structured.customerPhone || structured.customerEmail;
  return !identity;
};

/**
 * If a document snapshot is missing logo/signature but the linked ExportTemplate
 * still has them, copy those URLs into the snapshot (does not overwrite HTML).
 */
export const backfillSnapshotAssetsFromTemplate = async (doc) => {
  if (!doc) return doc;
  const snap = typeof doc.templateSnapshot?.toObject === 'function'
    ? doc.templateSnapshot.toObject()
    : { ...(doc.templateSnapshot || {}) };
  const needsLogo = !String(snap.logoUrl || '').trim();
  const needsSig = !String(snap.companySignatureUrl || '').trim();
  if (!needsLogo && !needsSig) return doc;

  let template = null;
  if (doc.template) {
    template = await ExportTemplate.findById(doc.template).select('logoUrl companySignatureUrl').lean();
  }
  if (!template) return doc;

  let changed = false;
  if (needsLogo && template.logoUrl) {
    snap.logoUrl = template.logoUrl;
    changed = true;
  }
  if (needsSig && template.companySignatureUrl) {
    snap.companySignatureUrl = template.companySignatureUrl;
    changed = true;
  }
  if (changed) doc.templateSnapshot = snap;
  return doc;
};

export const hydrateLegacyDocument = async (doc, { type, owner }) => {
  const needsSource = !doc.sourceData?.variables || !Object.keys(doc.sourceData.variables || {}).length;
  const needsSnap = !doc.templateSnapshot?.bodyHtml && !doc.templateSnapshot?.headerHtml;
  const needsStructuredEnrich = structuredLooksSparse(doc.sourceData?.structured);
  const locked = Boolean(doc.sourceLocked);

  // Locked documents: only fill a missing template snapshot — never re-pull booking/template content
  if (locked) {
    if (needsSnap) {
      const { ensureDefaultTemplates } = await import('../controllers/exportTemplateController.js');
      await ensureDefaultTemplates(owner._id || owner);
      let template = null;
      if (doc.template) template = await ExportTemplate.findById(doc.template).lean();
      if (!template) {
        template = type === 'invoice'
          ? await getDefaultInvoiceTemplate(owner._id || owner)
          : await getDefaultContractTemplate(owner._id || owner);
      }
      if (template) {
        doc.templateSnapshot = snapshotTemplate(template);
        if (!doc.template && template._id) doc.template = template._id;
      }
    }
    await backfillSnapshotAssetsFromTemplate(doc);
    return doc;
  }

  if (!needsSource && !needsSnap && !needsStructuredEnrich) {
    await backfillSnapshotAssetsFromTemplate(doc);
    return doc;
  }

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

  const mergeStructured = (base = {}, prev = {}) => {
    const merged = { ...base };
    for (const [key, value] of Object.entries(prev || {})) {
      if (value === undefined || value === null) continue;
      if (typeof value === 'object' && !Array.isArray(value)) {
        merged[key] = { ...(base[key] || {}), ...value };
        continue;
      }
      if (Array.isArray(value)) {
        if (value.length) merged[key] = value;
        continue;
      }
      const asText = String(value).trim();
      if (asText && asText !== '—') merged[key] = value;
    }
    return merged;
  };

  if (needsSource || needsStructuredEnrich) {
    if (type === 'contract' && booking) {
      const built = await buildContractSourceData(booking, {
        contractNumber: doc.contractNumber,
        owner,
        template: doc.templateSnapshot || template,
        includeCompanyStamp: doc.includeCompanyStamp !== false,
      });
      doc.sourceData = {
        variables: needsSource ? built.variables : (doc.sourceData?.variables || built.variables),
        structured: mergeStructured(built.structured, doc.sourceData?.structured),
        meta: built.meta,
      };
      doc.customerName = doc.customerName || doc.sourceData.structured.customerName || booking.customerName || '';
      doc.customerPhone = doc.customerPhone || doc.sourceData.structured.customerPhone || booking.customerPhone || '';
      doc.customerEmail = doc.customerEmail || doc.sourceData.structured.customerEmail || booking.customerEmail || '';
    } else if (type === 'invoice') {
      const built = await buildInvoiceSourceData({
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
          customerNationality: doc.sourceData?.structured?.customerNationality || booking?.nationality || '',
          customerDob: doc.sourceData?.structured?.customerDob || booking?.dateOfBirth || '',
        },
        booking,
        includeCompanyStamp: doc.includeCompanyStamp !== false,
      });
      // Enrich invoice structured with booking/agency fields used by templates
      const enriched = {
        ...built.structured,
        pickupDate: built.structured.pickupDate || booking?.pickupDate || built.structured.invoiceDate,
        returnDate: built.structured.returnDate || booking?.returnDate || built.structured.dueDate,
        pickupLocation: booking?.pickupLocation || '',
        returnLocation: booking?.returnLocation || '',
        rentalDays: booking?.priceBreakdown?.days ?? '',
        pricePerDay: booking?.priceBreakdown?.pricePerDay ?? '',
        pickupFee: booking?.priceBreakdown?.pickupDeliveryFee ?? 0,
        dropoffFee: booking?.priceBreakdown?.dropoffDeliveryFee ?? 0,
        franchiseAmount: booking?.franchiseAmount ?? 0,
        agencyName: built.variables?.agency_name || '',
        agencyPhone: built.variables?.agency_phone || '',
        agencyEmail: built.variables?.agency_email || '',
        agencyAddress: built.variables?.agency_address || '',
        agencyTaxId: built.variables?.agency_tax_id || '',
        customerSignatureUrl: booking?.completion?.signatureUrl || '',
      };
      doc.sourceData = {
        variables: needsSource ? built.variables : (doc.sourceData?.variables || built.variables),
        structured: mergeStructured(enriched, doc.sourceData?.structured),
        meta: built.meta,
      };
    }
  }
  await backfillSnapshotAssetsFromTemplate(doc);
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
  buildContractStructuredFromBooking,
  buildInvoiceSourceData,
  rebuildVariablesFromStructured,
  renderAndStorePdf,
  backfillSnapshotAssetsFromTemplate,
  applySectionEdits,
  applyContractStructuredEdits,
  applyInvoiceStructuredEdits,
  hydrateLegacyDocument,
  markSourceLocked,
  syncDocumentListFields,
  resolveExistingPdfPath,
  versionSummary,
  buildBookingLikeFromInvoice,
};

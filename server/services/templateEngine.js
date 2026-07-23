/**
 * Available template variables for export documents.
 * Used by admin template editor and server-side rendering.
 */
export const TEMPLATE_VARIABLES = [
  { key: 'contract_number', label: 'Contract Number', group: 'contract' },
  { key: 'reservation_id', label: 'Reservation ID', group: 'booking' },
  { key: 'customer_name', label: 'Customer Name', group: 'customer' },
  { key: 'customer_email', label: 'Customer Email', group: 'customer' },
  { key: 'customer_phone', label: 'Customer Phone', group: 'customer' },
  { key: 'customer_nationality', label: 'Customer Nationality', group: 'customer' },
  { key: 'customer_dob', label: 'Date of Birth', group: 'customer' },
  { key: 'driver_license', label: 'Driver License No.', group: 'customer' },
  { key: 'driver_license_expiry', label: 'License Expiry', group: 'customer' },
  { key: 'passport_number', label: 'Passport Number', group: 'customer' },
  { key: 'car_brand', label: 'Car Brand', group: 'vehicle' },
  { key: 'car_model', label: 'Car Model', group: 'vehicle' },
  { key: 'car_make', label: 'Make (Brand + Model)', group: 'vehicle' },
  { key: 'car_year', label: 'Car Year', group: 'vehicle' },
  { key: 'car_category', label: 'Car Category', group: 'vehicle' },
  { key: 'car_registration', label: 'Registration', group: 'vehicle' },
  { key: 'pickup_date', label: 'Pickup Date & Time', group: 'rental' },
  { key: 'return_date', label: 'Return Date & Time', group: 'rental' },
  { key: 'pickup_location', label: 'Pickup Location', group: 'rental' },
  { key: 'return_location', label: 'Return Location', group: 'rental' },
  { key: 'rental_days', label: 'Rental Duration (days)', group: 'rental' },
  { key: 'rental_price', label: 'Rental Price', group: 'pricing' },
  { key: 'pickup_fee', label: 'Pickup Delivery Fee', group: 'pricing' },
  { key: 'dropoff_fee', label: 'Drop-off Delivery Fee', group: 'pricing' },
  { key: 'discount_total', label: 'Discount Total', group: 'pricing' },
  { key: 'total_price', label: 'Total Price', group: 'pricing' },
  { key: 'currency', label: 'Currency', group: 'pricing' },
  { key: 'payment_status', label: 'Payment Status', group: 'pricing' },
  { key: 'booking_status', label: 'Booking Status', group: 'booking' },
  { key: 'booking_method', label: 'Booking Method', group: 'booking' },
  { key: 'notes', label: 'Notes', group: 'booking' },
  { key: 'agency_name', label: 'Agency Name', group: 'agency' },
  { key: 'agency_phone', label: 'Agency Phone', group: 'agency' },
  { key: 'agency_email', label: 'Agency Email', group: 'agency' },
  { key: 'agency_address', label: 'Agency Address', group: 'agency' },
  { key: 'agency_tax_id', label: 'Agency Tax ID', group: 'agency' },
  { key: 'generated_date', label: 'Generated Date', group: 'meta' },
  { key: 'generated_datetime', label: 'Generated Date & Time', group: 'meta' },
];

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString('en-GB', { hour12: false });
};

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-GB');
};

const money = (amount, currency = 'MAD') => {
  const n = Number(amount) || 0;
  return `${currency} ${n.toFixed(2)}`;
};

/**
 * Build variable map from booking (+ car, owner, contract) for template substitution.
 */
export const buildTemplateVariables = (booking, { contractNumber, owner, agency = {} } = {}) => {
  const car = booking?.car || {};
  const b = booking?.priceBreakdown || {};
  const currency = agency.currency || process.env.CURRENCY || 'MAD';

  return {
    contract_number: contractNumber || '—',
    reservation_id: booking?.reservationId || '—',
    customer_name: booking?.customerName || '—',
    customer_email: booking?.customerEmail || '—',
    customer_phone: booking?.customerPhone || '—',
    customer_nationality: booking?.nationality || '—',
    customer_dob: booking?.dateOfBirth || '—',
    driver_license: booking?.driverLicenseNumber || '—',
    driver_license_expiry: booking?.driverLicenseExpiry || '—',
    passport_number: booking?.passportNumber || '—',
    car_brand: car.brand || '—',
    car_model: car.model || '—',
    car_make: `${car.brand || ''} ${car.model || ''}`.trim() || '—',
    car_year: car.year ? String(car.year) : '—',
    car_category: car.category || '—',
    car_registration: car.registrationNumber || car.plateNumber || '—',
    pickup_date: formatDateTime(booking?.pickupDate),
    return_date: formatDateTime(booking?.returnDate),
    pickup_location: booking?.pickupLocation || '—',
    return_location: booking?.returnLocation || '—',
    rental_days: String(b.days || 0),
    rental_price: money(b.rentalPrice ?? booking?.price, currency),
    pickup_fee: money(b.pickupDeliveryFee, currency),
    dropoff_fee: money(b.dropoffDeliveryFee, currency),
    discount_total: money(b.discountTotal, currency),
    total_price: money(booking?.price, currency),
    currency,
    payment_status: booking?.paymentStatus || '—',
    booking_status: booking?.status || '—',
    booking_method: booking?.channel === 'walk_in' ? 'Walk-in' : booking?.channel === 'online' ? 'Website' : '—',
    notes: booking?.notes?.trim() || '—',
    agency_name: agency.name || owner?.agencyName || process.env.AGENCY_NAME || 'HDN Car Rental',
    agency_phone: agency.phone || process.env.AGENCY_PHONE || process.env.WHATSAPP_BUSINESS_NUMBER || '—',
    agency_email: agency.email || owner?.email || process.env.AGENCY_EMAIL || '—',
    agency_address: agency.address || process.env.AGENCY_ADDRESS || '—',
    agency_tax_id: agency.taxId || process.env.AGENCY_TAX_ID || '—',
    generated_date: formatDate(new Date()),
    generated_datetime: formatDateTime(new Date()),
  };
};

/**
 * Replace {{variable}} placeholders in template HTML.
 */
export const renderTemplate = (html, variables) => {
  if (!html) return '';
  return String(html).replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_match, key) => {
    const val = variables[key.toLowerCase()];
    return val !== undefined && val !== null ? String(val) : '—';
  });
};

/**
 * Wrap rendered sections into a full printable HTML document.
 */
export const buildDocumentHtml = (template, variables) => {
  const header = renderTemplate(template.headerHtml || '', variables);
  const body = renderTemplate(template.bodyHtml || '', variables);
  const footer = renderTemplate(template.footerHtml || '', variables);
  const css = template.customCss || '';
  const logo = template.logoUrl
    ? `<img src="${template.logoUrl}" alt="Logo" style="max-height:60px;margin-bottom:12px;" />`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${template.name || 'Document'}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #161210;
      margin: 0;
      padding: 0;
    }
    .doc-page {
      max-width: 210mm;
      margin: 0 auto;
      padding: 16mm 14mm;
    }
    .doc-header { border-bottom: 2px solid #8F1F1F; padding-bottom: 12px; margin-bottom: 20px; }
    .doc-footer {
      border-top: 1px solid #ccc;
      margin-top: 32px;
      padding-top: 12px;
      font-size: 9pt;
      color: #666;
    }
    h1 { font-size: 18pt; color: #8F1F1F; margin: 0 0 8px; }
    h2 { font-size: 13pt; margin: 16px 0 8px; color: #333; }
    h3 { font-size: 11pt; margin: 12px 0 6px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 10pt; }
    th { background: #f5f5f5; font-weight: 600; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .section { margin-bottom: 16px; }
    .muted { color: #666; font-size: 9pt; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .doc-page { padding: 10mm; }
      .no-print { display: none !important; }
    }
    ${css}
  </style>
</head>
<body>
  <div class="doc-page">
    <div class="doc-header">${logo}${header}</div>
    <div class="doc-body">${body}</div>
    <div class="doc-footer">${footer}</div>
  </div>
</body>
</html>`;
};

export default {
  TEMPLATE_VARIABLES,
  buildTemplateVariables,
  renderTemplate,
  buildDocumentHtml,
};

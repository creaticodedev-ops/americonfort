/** Shared helpers for pre-filling Contract / Invoice editors from document payloads. */

export const isBlank = (value) => {
  if (value === undefined || value === null) return true
  const s = String(value).trim()
  return !s || s === '—' || s === '-' || s === 'N/A'
}

export const pickValue = (...candidates) => {
  for (const value of candidates) {
    if (!isBlank(value)) return value
  }
  return ''
}

export const parseMoney = (value) => {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const cleaned = String(value).replace(/[^\d.,-]/g, '').replace(/,/g, '')
  if (!cleaned) return ''
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : ''
}

export const toDateInput = (value) => {
  if (isBlank(value)) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    const s = String(value)
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
    return ''
  }
  return d.toISOString().slice(0, 10)
}

export const toDateTimeLocal = (value) => {
  if (isBlank(value)) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    const s = String(value)
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return s.slice(0, 16)
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return `${s.slice(0, 10)}T00:00`
    return ''
  }
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Resolve a field from structured → booking → variables (snake + camel) → doc root.
 */
export const resolveDocField = (doc, {
  structuredKeys = [],
  bookingKeys = [],
  variableKeys = [],
  docKeys = [],
  transform,
} = {}) => {
  const s = doc?.sourceData?.structured || {}
  const v = doc?.sourceData?.variables || {}
  const b = doc?.booking || {}
  const candidates = []

  for (const key of structuredKeys) candidates.push(s[key])
  for (const key of bookingKeys) candidates.push(b[key])
  for (const key of variableKeys) candidates.push(v[key])
  for (const key of docKeys) candidates.push(doc?.[key])

  const raw = pickValue(...candidates)
  if (transform) return transform(raw)
  return raw
}

export const initContractForm = (doc) => {
  const s = doc?.sourceData?.structured || {}
  const v = doc?.sourceData?.variables || {}
  const b = doc?.booking || {}
  const car = b.car || {}
  const sd = s.secondDriver || b.secondDriver || {}
  const snap = doc?.templateSnapshot || {}
  const breakdown = b.priceBreakdown || {}

  const text = (structuredKey, bookingKey, ...varKeys) => resolveDocField(doc, {
    structuredKeys: [structuredKey],
    bookingKeys: bookingKey ? [bookingKey] : [],
    variableKeys: varKeys,
    docKeys: [structuredKey],
  })

  return {
    reservationId: text('reservationId', 'reservationId', 'reservation_id', 'reservationId'),
    customerName: pickValue(s.customerName, doc.customerName, b.customerName, v.customer_name, v.customerName),
    customerEmail: pickValue(s.customerEmail, doc.customerEmail, b.customerEmail, v.customer_email, v.customerEmail),
    customerPhone: pickValue(s.customerPhone, doc.customerPhone, b.customerPhone, v.customer_phone, v.customerPhone),
    customerAddress: pickValue(s.customerAddress, b.customerAddress, v.customer_address, v.customerAddress),
    nationality: pickValue(s.nationality, b.nationality, v.customer_nationality, v.customerNationality),
    dateOfBirth: toDateInput(pickValue(s.dateOfBirth, b.dateOfBirth, v.customer_dob, v.dateOfBirth)),
    placeOfBirth: pickValue(s.placeOfBirth, b.placeOfBirth, v.customer_birth_place, v.placeOfBirth),
    driverLicenseNumber: pickValue(s.driverLicenseNumber, b.driverLicenseNumber, v.driver_license, v.driverLicenseNumber),
    driverLicenseExpiry: toDateInput(pickValue(s.driverLicenseExpiry, b.driverLicenseExpiry, v.driver_license_expiry)),
    driverLicenseIssuedOn: toDateInput(pickValue(s.driverLicenseIssuedOn, b.driverLicenseIssuedOn, v.driver_license_issued_on)),
    passportNumber: pickValue(s.passportNumber, b.passportNumber, v.passport_number, v.passportNumber),
    identityDocumentNumber: pickValue(
      s.identityDocumentNumber,
      b.identityDocumentNumber,
      b.passportNumber,
      v.identity_document,
      v.identityDocumentNumber,
    ),
    identityIssuedOn: toDateInput(pickValue(s.identityIssuedOn, b.identityIssuedOn, v.identity_issued_on)),
    pickupDate: toDateTimeLocal(pickValue(s.pickupDate, b.pickupDate)),
    returnDate: toDateTimeLocal(pickValue(s.returnDate, b.returnDate)),
    pickupLocation: pickValue(s.pickupLocation, b.pickupLocation, v.pickup_location),
    returnLocation: pickValue(s.returnLocation, b.returnLocation, v.return_location),
    deliveredBy: pickValue(s.deliveredBy, b.deliveredBy, v.delivered_by),
    receivedBy: pickValue(s.receivedBy, b.receivedBy, v.received_by),
    fuelLevelStart: pickValue(s.fuelLevelStart, b.fuelLevelStart, v.fuel_level_start),
    kmDepart: pickValue(s.kmDepart, b.kmDepart, car.mileage, parseMoney(v.km_depart)),
    kmRetour: pickValue(s.kmRetour, b.kmRetour, parseMoney(v.km_retour)),
    rentalDays: pickValue(s.rentalDays, breakdown.days, parseMoney(v.rental_days)),
    pricePerDay: pickValue(s.pricePerDay, breakdown.pricePerDay, car.pricePerDay, parseMoney(v.price_per_day)),
    rentalPrice: pickValue(s.rentalPrice, breakdown.rentalPrice, b.price, parseMoney(v.rental_price)),
    pickupFee: pickValue(s.pickupFee, breakdown.pickupDeliveryFee, parseMoney(v.pickup_fee), 0),
    dropoffFee: pickValue(s.dropoffFee, breakdown.dropoffDeliveryFee, parseMoney(v.dropoff_fee), 0),
    discountTotal: pickValue(s.discountTotal, breakdown.discountTotal, parseMoney(v.discount_total), 0),
    price: pickValue(s.price, b.price, parseMoney(v.total_price), 0),
    franchiseAmount: pickValue(s.franchiseAmount, b.franchiseAmount, car.securityDeposit, parseMoney(v.franchise_amount), 0),
    currency: pickValue(s.currency, v.currency, 'MAD'),
    paymentStatus: pickValue(s.paymentStatus, b.paymentStatus, v.payment_status),
    bookingStatus: pickValue(s.bookingStatus, b.status, v.booking_status),
    bookingMethod: pickValue(
      s.bookingMethod,
      b.channel === 'walk_in' ? 'Walk-in' : '',
      v.booking_method,
      'Online',
    ),
    notes: pickValue(s.notes, b.notes, v.notes === '—' ? '' : v.notes),
    vehicleBrand: pickValue(s.vehicleBrand, car.brand, v.car_brand, v.carBrand),
    vehicleModel: pickValue(s.vehicleModel, car.model, v.car_model, v.carModel),
    vehicleYear: pickValue(s.vehicleYear, car.year, v.car_year, v.carYear),
    vehiclePlate: pickValue(s.vehiclePlate, car.licensePlate, car.registrationNumber, v.car_registration),
    vehicleCategory: pickValue(s.vehicleCategory, car.category, v.car_category),
    secondDriverEnabled: Boolean(sd.enabled),
    secondDriverFullName: pickValue(sd.fullName, v.second_driver_name),
    secondDriverDob: toDateInput(pickValue(sd.dateOfBirth, v.second_driver_dob)),
    secondDriverNationality: pickValue(sd.nationality, v.second_driver_nationality),
    secondDriverLicense: pickValue(sd.driverLicenseNumber, v.second_driver_license),
    secondDriverLicenseExpiry: toDateInput(pickValue(sd.driverLicenseExpiry, v.second_driver_license_expiry)),
    secondDriverPassport: pickValue(sd.passportNumber, v.second_driver_passport),
    secondDriverPhone: pickValue(sd.phone, v.second_driver_phone),
    agencyName: pickValue(s.agencyName, v.agency_name),
    agencyPhone: pickValue(s.agencyPhone, v.agency_phone),
    agencyEmail: pickValue(s.agencyEmail, v.agency_email),
    agencyAddress: pickValue(s.agencyAddress, v.agency_address),
    agencyTaxId: pickValue(s.agencyTaxId, v.agency_tax_id),
    customerSignatureUrl: pickValue(s.customerSignatureUrl, b.completion?.signatureUrl),
    secondDriverSignatureUrl: pickValue(s.secondDriverSignatureUrl, b.completion?.secondDriverSignatureUrl),
    companySignatureUrl: pickValue(snap.companySignatureUrl, s.companySignatureUrl),
    logoUrl: pickValue(snap.logoUrl, s.logoUrl),
    includeCompanyStamp: doc.includeCompanyStamp !== false && s.includeCompanyStamp !== false,
  }
}

export const buildContractPatch = (form) => ({
  reservationId: form.reservationId,
  customerName: form.customerName,
  customerEmail: form.customerEmail,
  customerPhone: form.customerPhone,
  customerAddress: form.customerAddress,
  nationality: form.nationality,
  dateOfBirth: form.dateOfBirth || '',
  placeOfBirth: form.placeOfBirth,
  driverLicenseNumber: form.driverLicenseNumber,
  driverLicenseExpiry: form.driverLicenseExpiry || '',
  driverLicenseIssuedOn: form.driverLicenseIssuedOn || '',
  passportNumber: form.passportNumber,
  identityDocumentNumber: form.identityDocumentNumber,
  identityIssuedOn: form.identityIssuedOn || '',
  pickupDate: form.pickupDate || null,
  returnDate: form.returnDate || null,
  pickupLocation: form.pickupLocation,
  returnLocation: form.returnLocation,
  deliveredBy: form.deliveredBy,
  receivedBy: form.receivedBy,
  fuelLevelStart: form.fuelLevelStart,
  kmDepart: form.kmDepart === '' ? '' : form.kmDepart,
  kmRetour: form.kmRetour === '' ? '' : form.kmRetour,
  rentalDays: form.rentalDays === '' ? '' : Number(form.rentalDays),
  pricePerDay: form.pricePerDay === '' ? '' : Number(form.pricePerDay),
  rentalPrice: form.rentalPrice === '' ? 0 : Number(form.rentalPrice),
  pickupFee: form.pickupFee === '' ? 0 : Number(form.pickupFee),
  dropoffFee: form.dropoffFee === '' ? 0 : Number(form.dropoffFee),
  discountTotal: form.discountTotal === '' ? 0 : Number(form.discountTotal),
  price: form.price === '' ? 0 : Number(form.price),
  franchiseAmount: form.franchiseAmount === '' ? 0 : Number(form.franchiseAmount),
  currency: form.currency,
  paymentStatus: form.paymentStatus,
  bookingStatus: form.bookingStatus,
  bookingMethod: form.bookingMethod,
  notes: form.notes,
  vehicleBrand: form.vehicleBrand,
  vehicleModel: form.vehicleModel,
  vehicleYear: form.vehicleYear,
  vehiclePlate: form.vehiclePlate,
  vehicleCategory: form.vehicleCategory,
  secondDriverEnabled: form.secondDriverEnabled,
  secondDriverFullName: form.secondDriverFullName,
  secondDriverDob: form.secondDriverDob,
  secondDriverNationality: form.secondDriverNationality,
  secondDriverLicense: form.secondDriverLicense,
  secondDriverLicenseExpiry: form.secondDriverLicenseExpiry,
  secondDriverPassport: form.secondDriverPassport,
  secondDriverPhone: form.secondDriverPhone,
  agencyName: form.agencyName,
  agencyPhone: form.agencyPhone,
  agencyEmail: form.agencyEmail,
  agencyAddress: form.agencyAddress,
  agencyTaxId: form.agencyTaxId,
  customerSignatureUrl: form.customerSignatureUrl,
  secondDriverSignatureUrl: form.secondDriverSignatureUrl,
  companySignatureUrl: form.companySignatureUrl,
  logoUrl: form.logoUrl,
  includeCompanyStamp: form.includeCompanyStamp,
})

export const initInvoiceForm = (doc) => {
  const s = doc?.sourceData?.structured || {}
  const v = doc?.sourceData?.variables || {}
  const b = doc?.booking || {}
  const car = b.car || {}
  const snap = doc?.templateSnapshot || {}
  const items = (Array.isArray(doc.items) && doc.items.length
    ? doc.items
    : (Array.isArray(s.items) && s.items.length ? s.items : [{ description: '', quantity: 1, unitPrice: '', taxRate: 0 }])
  ).map((item) => ({
    description: item.description || '',
    quantity: item.quantity ?? 1,
    unitPrice: item.unitPrice ?? '',
    taxRate: item.taxRate ?? 0,
  }))

  return {
    invoiceDate: toDateInput(pickValue(doc.invoiceDate, s.invoiceDate, b.pickupDate)) || new Date().toISOString().slice(0, 10),
    dueDate: toDateInput(pickValue(doc.dueDate, s.dueDate, b.returnDate)),
    customerName: pickValue(doc.customerName, s.customerName, b.customerName, v.customer_name),
    customerEmail: pickValue(doc.customerEmail, s.customerEmail, b.customerEmail, v.customer_email),
    customerPhone: pickValue(doc.customerPhone, s.customerPhone, b.customerPhone, v.customer_phone),
    customerAddress: pickValue(doc.customerAddress, s.customerAddress, b.customerAddress, v.customer_address),
    customerTaxId: pickValue(doc.customerTaxId, s.customerTaxId),
    customerNationality: pickValue(s.customerNationality, b.nationality, v.customer_nationality),
    customerDob: toDateInput(pickValue(s.customerDob, b.dateOfBirth, v.customer_dob)),
    vehicleBrand: pickValue(doc.vehicleBrand, s.vehicleBrand, car.brand, v.car_brand),
    vehicleModel: pickValue(doc.vehicleModel, s.vehicleModel, car.model, v.car_model),
    vehicleYear: pickValue(doc.vehicleYear, s.vehicleYear, car.year, v.car_year),
    vehiclePlate: pickValue(doc.vehiclePlate, s.vehiclePlate, car.licensePlate, v.car_registration),
    vehicleType: pickValue(doc.vehicleType, s.vehicleType, car.category, v.car_category),
    pickupDate: toDateTimeLocal(pickValue(s.pickupDate, b.pickupDate)),
    returnDate: toDateTimeLocal(pickValue(s.returnDate, b.returnDate)),
    pickupLocation: pickValue(s.pickupLocation, b.pickupLocation, v.pickup_location),
    returnLocation: pickValue(s.returnLocation, b.returnLocation, v.return_location),
    rentalDays: pickValue(s.rentalDays, b.priceBreakdown?.days, parseMoney(v.rental_days)),
    pricePerDay: pickValue(s.pricePerDay, b.priceBreakdown?.pricePerDay, parseMoney(v.price_per_day)),
    pickupFee: pickValue(s.pickupFee, b.priceBreakdown?.pickupDeliveryFee, 0),
    dropoffFee: pickValue(s.dropoffFee, b.priceBreakdown?.dropoffDeliveryFee, 0),
    franchiseAmount: pickValue(s.franchiseAmount, b.franchiseAmount, parseMoney(v.franchise_amount), 0),
    items,
    discountAmount: String(pickValue(doc.discountAmount, s.discountAmount, 0)),
    notes: pickValue(doc.notes, s.notes, b.notes, v.notes === '—' ? '' : v.notes),
    paymentStatus: pickValue(doc.paymentStatus, s.paymentStatus, b.paymentStatus, 'pending'),
    paymentMethod: pickValue(doc.paymentMethod, s.paymentMethod, 'cash'),
    paymentReference: pickValue(doc.paymentReference, s.paymentReference),
    currency: pickValue(doc.currency, s.currency, v.currency, 'MAD'),
    agencyName: pickValue(s.agencyName, v.agency_name),
    agencyPhone: pickValue(s.agencyPhone, v.agency_phone),
    agencyEmail: pickValue(s.agencyEmail, v.agency_email),
    agencyAddress: pickValue(s.agencyAddress, v.agency_address),
    agencyTaxId: pickValue(s.agencyTaxId, v.agency_tax_id),
    customerSignatureUrl: pickValue(s.customerSignatureUrl, b.completion?.signatureUrl),
    companySignatureUrl: pickValue(snap.companySignatureUrl),
    logoUrl: pickValue(snap.logoUrl),
    includeCompanyStamp: doc.includeCompanyStamp !== false,
  }
}

export const buildInvoicePatch = (form) => {
  const items = (form.items || [])
    .filter((item) => item.description || item.quantity || item.unitPrice)
    .map((item) => ({
      description: item.description,
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.unitPrice || 0),
      taxRate: Number(item.taxRate || 0),
    }))
  return {
    invoiceDate: form.invoiceDate || '',
    dueDate: form.dueDate || '',
    customerName: form.customerName,
    customerEmail: form.customerEmail,
    customerPhone: form.customerPhone,
    customerAddress: form.customerAddress,
    customerTaxId: form.customerTaxId,
    customerNationality: form.customerNationality,
    customerDob: form.customerDob || '',
    vehicleBrand: form.vehicleBrand,
    vehicleModel: form.vehicleModel,
    vehicleYear: form.vehicleYear,
    vehiclePlate: form.vehiclePlate,
    vehicleType: form.vehicleType,
    pickupDate: form.pickupDate || null,
    returnDate: form.returnDate || null,
    pickupLocation: form.pickupLocation,
    returnLocation: form.returnLocation,
    rentalDays: form.rentalDays === '' ? '' : Number(form.rentalDays),
    pricePerDay: form.pricePerDay === '' ? '' : Number(form.pricePerDay),
    pickupFee: form.pickupFee === '' ? 0 : Number(form.pickupFee),
    dropoffFee: form.dropoffFee === '' ? 0 : Number(form.dropoffFee),
    franchiseAmount: form.franchiseAmount === '' ? 0 : Number(form.franchiseAmount),
    items,
    discountAmount: Number(form.discountAmount || 0),
    notes: form.notes,
    paymentStatus: form.paymentStatus,
    paymentMethod: form.paymentMethod,
    paymentReference: form.paymentReference,
    currency: form.currency,
    agencyName: form.agencyName,
    agencyPhone: form.agencyPhone,
    agencyEmail: form.agencyEmail,
    agencyAddress: form.agencyAddress,
    agencyTaxId: form.agencyTaxId,
    customerSignatureUrl: form.customerSignatureUrl,
    companySignatureUrl: form.companySignatureUrl,
    logoUrl: form.logoUrl,
    includeCompanyStamp: form.includeCompanyStamp,
  }
}

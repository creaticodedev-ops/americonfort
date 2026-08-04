/**
 * Persist customer contract fields from the completion form onto a Booking document.
 */
export const applyCompletionDetailsToBooking = (booking, body = {}) => {
  const {
    customerName,
    customerEmail,
    customerPhone,
    dateOfBirth,
    nationality,
    customerAddress,
    placeOfBirth,
    identityDocumentNumber,
    identityIssuedOn,
    driverLicenseNumber,
    driverLicenseExpiry,
    driverLicenseIssuedOn,
    passportNumber,
    secondDriver,
  } = body;

  if (customerName !== undefined) booking.customerName = String(customerName).trim();
  if (customerEmail !== undefined) booking.customerEmail = String(customerEmail).trim().toLowerCase();
  if (customerPhone !== undefined) booking.customerPhone = String(customerPhone).trim();
  if (dateOfBirth !== undefined) booking.dateOfBirth = String(dateOfBirth).trim();
  if (nationality !== undefined) booking.nationality = String(nationality).trim();
  if (customerAddress !== undefined) booking.customerAddress = String(customerAddress).trim();
  if (placeOfBirth !== undefined) booking.placeOfBirth = String(placeOfBirth).trim();
  if (identityDocumentNumber !== undefined) booking.identityDocumentNumber = String(identityDocumentNumber).trim();
  if (identityIssuedOn !== undefined) booking.identityIssuedOn = String(identityIssuedOn).trim();
  if (driverLicenseNumber !== undefined) booking.driverLicenseNumber = String(driverLicenseNumber).trim();
  if (driverLicenseExpiry !== undefined) booking.driverLicenseExpiry = String(driverLicenseExpiry).trim();
  if (driverLicenseIssuedOn !== undefined) booking.driverLicenseIssuedOn = String(driverLicenseIssuedOn).trim();
  if (passportNumber !== undefined) booking.passportNumber = String(passportNumber).trim();

  if (secondDriver !== undefined && typeof secondDriver === 'object') {
    const prev = booking.secondDriver || {};
    booking.secondDriver = {
      enabled: Boolean(secondDriver.enabled),
      fullName: secondDriver.fullName?.trim() || '',
      dateOfBirth: secondDriver.dateOfBirth?.trim() || '',
      nationality: secondDriver.nationality?.trim() || '',
      driverLicenseNumber: secondDriver.driverLicenseNumber?.trim() || '',
      driverLicenseExpiry: secondDriver.driverLicenseExpiry?.trim() || '',
      passportNumber: secondDriver.passportNumber?.trim() || '',
      phone: secondDriver.phone?.trim() || '',
    };
    if (!booking.secondDriver.enabled) {
      booking.completion = booking.completion || {};
      booking.completion.secondDriverSignatureUrl = '';
      booking.completion.secondDriverSignatureSignedAt = null;
    }
  }

  return booking;
};

/** Required fields before signature / contract generation */
export const validateCompletionDetails = (booking) => {
  const missing = [];
  const req = (field, label) => {
    const v = booking[field];
    if (v === undefined || v === null || String(v).trim() === '') missing.push(label);
  };

  req('customerName', 'customer name');
  req('customerEmail', 'customer email');
  req('customerPhone', 'customer phone');
  req('customerAddress', 'address');
  req('dateOfBirth', 'date of birth');
  req('nationality', 'nationality');
  req('placeOfBirth', 'place of birth');
  req('identityDocumentNumber', 'identity document number');
  req('identityIssuedOn', 'identity issued date');
  req('driverLicenseNumber', 'driver license number');
  req('driverLicenseExpiry', 'driver license expiry');
  req('driverLicenseIssuedOn', 'driver license issued date');

  const sd = booking.secondDriver;
  if (sd?.enabled) {
    if (!sd.fullName?.trim()) missing.push('second driver name');
    if (!sd.dateOfBirth?.trim()) missing.push('second driver date of birth');
    if (!sd.driverLicenseNumber?.trim()) missing.push('second driver license');
  }

  if (missing.length) {
    const err = new Error(`Please complete: ${missing.join(', ')}`);
    err.code = 'VALIDATION';
    throw err;
  }
};

export default applyCompletionDetailsToBooking;

/**
 * Permanent customer document archive on bookings.
 * Synced from online completion uploads and walk-in / admin uploads.
 */
export const syncCompletionDocumentsToArchive = (booking) => {
  const c = booking.completion || {};
  if (!c.drivingLicenseUrl && !c.identityDocumentUrl) return booking;

  if (!booking.customerDocuments) {
    booking.customerDocuments = {
      combinedDocumentUrl: '',
      drivingLicenseUrl: '',
      identityType: '',
      identityDocumentUrl: '',
      passportUrl: '',
      uploadedAt: null,
      source: '',
    };
  }

  const archive = booking.customerDocuments;
  if (c.drivingLicenseUrl) archive.drivingLicenseUrl = c.drivingLicenseUrl;
  if (c.identityDocumentUrl) {
    archive.identityDocumentUrl = c.identityDocumentUrl;
    archive.identityType = c.identityType || archive.identityType;
    if (c.identityType === 'passport') {
      archive.passportUrl = c.identityDocumentUrl;
    }
  }
  archive.uploadedAt = archive.uploadedAt || new Date();
  if (!archive.source) archive.source = 'online';

  booking.markModified('customerDocuments');
  return booking;
};

export const applyWalkInCombinedDocument = (booking, { url, uploadedBy, clientDocumentId = null }) => {
  if (!booking.customerDocuments) {
    booking.customerDocuments = {
      combinedDocumentUrl: '',
      drivingLicenseUrl: '',
      identityType: '',
      identityDocumentUrl: '',
      passportUrl: '',
      uploadedAt: null,
      source: 'walk_in',
    };
  }
  booking.customerDocuments.combinedDocumentUrl = url;
  booking.customerDocuments.uploadedAt = new Date();
  booking.customerDocuments.source = 'walk_in';
  if (uploadedBy) booking.customerDocuments.uploadedBy = uploadedBy;
  if (clientDocumentId) booking.clientDocument = clientDocumentId;
  booking.markModified('customerDocuments');
  return booking;
};

export const applyAdminDocumentUpload = (booking, { docType, identityType, url, uploadedBy }) => {
  if (!booking.customerDocuments) {
    booking.customerDocuments = {
      combinedDocumentUrl: '',
      drivingLicenseUrl: '',
      identityType: '',
      identityDocumentUrl: '',
      passportUrl: '',
      uploadedAt: null,
      source: 'admin',
    };
  }

  const archive = booking.customerDocuments;

  if (docType === 'combined') {
    archive.combinedDocumentUrl = url;
    archive.uploadedAt = new Date();
    archive.source = booking.channel === 'walk_in' ? 'walk_in' : 'admin';
    if (uploadedBy) archive.uploadedBy = uploadedBy;
    booking.markModified('customerDocuments');
    return booking;
  }

  if (docType === 'driving_license') {
    archive.drivingLicenseUrl = url;
  } else if (docType === 'identity') {
    archive.identityDocumentUrl = url;
    archive.identityType = identityType || 'national_id';
    if (identityType === 'passport') archive.passportUrl = url;
  } else if (docType === 'passport') {
    archive.passportUrl = url;
    if (!archive.identityDocumentUrl) {
      archive.identityDocumentUrl = url;
      archive.identityType = 'passport';
    }
  }

  archive.uploadedAt = new Date();
  archive.source = booking.channel === 'walk_in' ? 'walk_in' : 'admin';
  if (uploadedBy) archive.uploadedBy = uploadedBy;

  // Mirror into completion for consistency when staff uploads offline
  if (!booking.completion) booking.completion = {};
  if (docType === 'driving_license') booking.completion.drivingLicenseUrl = url;
  if (docType === 'identity' || docType === 'passport') {
    booking.completion.identityDocumentUrl = url;
    booking.completion.identityType = identityType || (docType === 'passport' ? 'passport' : 'national_id');
  }

  booking.markModified('customerDocuments');
  booking.markModified('completion');
  return booking;
};

export const getDocumentUrls = (booking) => {
  const archive = booking.customerDocuments || {};
  const completion = booking.completion || {};
  // Canonical fields first; legacy aliases kept for older walk-in / online uploads.
  const combined =
    archive.combinedDocumentUrl
    || archive.combinedUrl
    || archive.combinedDocument
    || archive.documentUrl
    || '';
  const license =
    archive.drivingLicenseUrl
    || archive.drivingLicenceUrl
    || archive.licenseUrl
    || completion.drivingLicenseUrl
    || completion.drivingLicenceUrl
    || '';
  const identity =
    archive.identityDocumentUrl
    || archive.identityUrl
    || archive.nationalIdUrl
    || completion.identityDocumentUrl
    || completion.identityUrl
    || '';
  const identityType =
    archive.identityType
    || archive.identityDocumentType
    || completion.identityType
    || '';
  const passport =
    archive.passportUrl
    || (identityType === 'passport' ? identity : '')
    || completion.passportUrl
    || '';
  return {
    combinedDocumentUrl: combined,
    drivingLicenseUrl: license,
    identityDocumentUrl: identity,
    identityType,
    passportUrl: passport,
  };
};

export default {
  syncCompletionDocumentsToArchive,
  applyWalkInCombinedDocument,
  applyAdminDocumentUpload,
  getDocumentUrls,
};

import Samsar from '../models/Samsar.js';
import PartnerCompany from '../models/PartnerCompany.js';
import Chauffeur from '../models/Chauffeur.js';
import { createOwnedCrud } from '../utils/ownedCrud.js';

const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const samsarSanitize = (body) => {
  const fullName = String(body.fullName || '').trim();
  if (!fullName) return { error: 'Full name is required' };
  const commissionType = ['percent', 'fixed', 'none'].includes(body.commissionType)
    ? body.commissionType
    : 'percent';
  return {
    data: {
      fullName,
      phone: String(body.phone || '').trim(),
      email: String(body.email || '').trim().toLowerCase(),
      address: String(body.address || '').trim(),
      commissionType,
      commissionValue: Math.max(0, num(body.commissionValue)),
      notes: String(body.notes || '').slice(0, 2000),
      status: body.status === 'inactive' ? 'inactive' : 'active',
    },
  };
};

export const samsarCrud = createOwnedCrud({
  Model: Samsar,
  entityName: 'Samsar',
  searchFields: ['fullName', 'phone', 'email'],
  sortAllowed: { createdAt: true, fullName: true, status: true },
  auditPrefix: 'samsar',
  sanitizeCreate: samsarSanitize,
  sanitizeUpdate: (body) => samsarSanitize({ ...body }),
});

const partnerSanitize = (body) => {
  const companyName = String(body.companyName || '').trim();
  if (!companyName) return { error: 'Company name is required' };
  return {
    data: {
      companyName,
      legalName: String(body.legalName || '').trim(),
      contactPerson: String(body.contactPerson || '').trim(),
      phone: String(body.phone || '').trim(),
      email: String(body.email || '').trim().toLowerCase(),
      address: String(body.address || '').trim(),
      city: String(body.city || '').trim(),
      country: String(body.country || 'Morocco').trim(),
      taxId: String(body.taxId || '').trim(),
      registrationNumber: String(body.registrationNumber || '').trim(),
      notes: String(body.notes || '').slice(0, 2000),
      status: body.status === 'inactive' ? 'inactive' : 'active',
    },
  };
};

export const partnerCrud = createOwnedCrud({
  Model: PartnerCompany,
  entityName: 'PartnerCompany',
  searchFields: ['companyName', 'legalName', 'contactPerson', 'email', 'phone'],
  sortAllowed: { createdAt: true, companyName: true, status: true },
  defaultSort: { createdAt: -1 },
  auditPrefix: 'partner',
  sanitizeCreate: partnerSanitize,
  sanitizeUpdate: (body) => partnerSanitize({ ...body }),
});

const chauffeurSanitize = (body) => {
  const fullName = String(body.fullName || '').trim();
  if (!fullName) return { error: 'Full name is required' };
  let licenseExpiry = null;
  if (body.licenseExpiry) {
    const d = new Date(body.licenseExpiry);
    if (!Number.isNaN(d.getTime())) licenseExpiry = d;
  }
  return {
    data: {
      fullName,
      phone: String(body.phone || '').trim(),
      email: String(body.email || '').trim().toLowerCase(),
      address: String(body.address || '').trim(),
      licenseNumber: String(body.licenseNumber || '').trim(),
      licenseExpiry,
      licenseCategory: String(body.licenseCategory || '').trim(),
      notes: String(body.notes || '').slice(0, 2000),
      status: body.status === 'inactive' ? 'inactive' : 'active',
      documents: {
        licenseUrl: String(body.documents?.licenseUrl || body.licenseUrl || '').trim(),
        identityUrl: String(body.documents?.identityUrl || body.identityUrl || '').trim(),
      },
    },
  };
};

export const chauffeurCrud = createOwnedCrud({
  Model: Chauffeur,
  entityName: 'Chauffeur',
  searchFields: ['fullName', 'phone', 'email', 'licenseNumber'],
  sortAllowed: { createdAt: true, fullName: true, status: true, licenseExpiry: true },
  auditPrefix: 'chauffeur',
  sanitizeCreate: chauffeurSanitize,
  sanitizeUpdate: (body) => chauffeurSanitize({ ...body }),
});

export default { samsarCrud, partnerCrud, chauffeurCrud };

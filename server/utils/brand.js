/** Official product / agency brand when env is unset */
export const BRAND_NAME = 'Americonfort';

/** Default legal / contact profile for Americonfort invoices (overridable via env / agency). */
export const DEFAULT_AGENCY_PROFILE = Object.freeze({
  name: 'AMERI CONFORT CAR RENTAL',
  address: 'RDC MAGASIN 78, LOTISSEMENT KHADIJA 2, DEROUA, BERRECHID',
  phone: '+212 6 70 55 10 55',
  email: 'americonfort@gmail.com',
  ice: '003555324000071',
  if: '66078987',
  rc: '20415',
});

export const defaultAgencyName = () => {
  const fromEnv = process.env.AGENCY_NAME?.trim();
  return fromEnv || DEFAULT_AGENCY_PROFILE.name || BRAND_NAME;
};

const digitsOnly = (value) => String(value || '').replace(/\D/g, '');

/** Company phone for invoices — never confuse with WhatsApp / customer numbers. */
const resolveCompanyPhone = (...candidates) => {
  const expected = digitsOnly(DEFAULT_AGENCY_PROFILE.phone); // 212670551055
  for (const candidate of candidates) {
    const raw = String(candidate || '').trim();
    if (!raw) continue;
    const digits = digitsOnly(raw);
    if (digits.includes('670551055') || digits === expected || digits === expected.slice(3)) {
      return DEFAULT_AGENCY_PROFILE.phone;
    }
  }
  return DEFAULT_AGENCY_PROFILE.phone;
};

export const resolveAgencyProfile = (agency = {}, owner = null) => {
  const ice = String(
    agency.ice
    || agency.ICE
    || process.env.AGENCY_ICE
    || DEFAULT_AGENCY_PROFILE.ice,
  ).trim();
  const taxIf = String(
    agency.if
    || agency.IF
    || agency.taxIf
    || process.env.AGENCY_IF
    || DEFAULT_AGENCY_PROFILE.if,
  ).trim();
  const rc = String(
    agency.rc
    || agency.RC
    || process.env.AGENCY_RC
    || DEFAULT_AGENCY_PROFILE.rc,
  ).trim();
  const taxIdRaw = String(
    agency.taxId
    || process.env.AGENCY_TAX_ID
    || '',
  ).trim();
  const taxIdCombined = taxIdRaw || [
    ice ? `ICE: ${ice}` : '',
    taxIf ? `IF: ${taxIf}` : '',
    rc ? `RC: ${rc}` : '',
  ].filter(Boolean).join(' — ');

  return {
    name: agency.name || owner?.agencyName || defaultAgencyName(),
    address: agency.address || process.env.AGENCY_ADDRESS || DEFAULT_AGENCY_PROFILE.address,
    phone: resolveCompanyPhone(
      agency.invoicePhone,
      agency.businessPhone,
      process.env.AGENCY_INVOICE_PHONE,
      process.env.AGENCY_PHONE,
      agency.phone,
    ),
    email: agency.email || owner?.email || process.env.AGENCY_EMAIL || DEFAULT_AGENCY_PROFILE.email,
    ice,
    if: taxIf,
    rc,
    taxId: taxIdCombined,
  };
};

export default {
  BRAND_NAME,
  DEFAULT_AGENCY_PROFILE,
  defaultAgencyName,
  resolveAgencyProfile,
};

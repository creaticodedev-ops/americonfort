/**
 * Owner-scoped document preferences (contracts / invoices).
 * Defaults preserve current behaviour (stamp shown).
 */

export const DOCUMENT_SETTINGS_DEFAULTS = {
  contracts: {
    showAgencyStamp: true,
  },
  invoices: {
    showAgencyStamp: true,
  },
};

export const resolveDocumentSettings = (ownerOrSettings) => {
  const raw =
    ownerOrSettings?.documentSettings && typeof ownerOrSettings.documentSettings === 'object'
      ? ownerOrSettings.documentSettings
      : ownerOrSettings && typeof ownerOrSettings === 'object' && !ownerOrSettings._id
        ? ownerOrSettings
        : {};

  return {
    contracts: {
      showAgencyStamp:
        raw?.contracts?.showAgencyStamp !== undefined
          ? Boolean(raw.contracts.showAgencyStamp)
          : DOCUMENT_SETTINGS_DEFAULTS.contracts.showAgencyStamp,
    },
    invoices: {
      showAgencyStamp:
        raw?.invoices?.showAgencyStamp !== undefined
          ? Boolean(raw.invoices.showAgencyStamp)
          : DOCUMENT_SETTINGS_DEFAULTS.invoices.showAgencyStamp,
    },
  };
};

export const sanitizeDocumentSettingsInput = (input = {}) => {
  const errors = [];
  const current = resolveDocumentSettings(input);

  const next = {
    contracts: {
      showAgencyStamp: current.contracts.showAgencyStamp,
    },
    invoices: {
      showAgencyStamp: current.invoices.showAgencyStamp,
    },
  };

  if (input?.contracts && typeof input.contracts === 'object') {
    if (input.contracts.showAgencyStamp !== undefined) {
      if (typeof input.contracts.showAgencyStamp !== 'boolean') {
        errors.push('contracts.showAgencyStamp must be a boolean');
      } else {
        next.contracts.showAgencyStamp = input.contracts.showAgencyStamp;
      }
    }
  }

  if (input?.invoices && typeof input.invoices === 'object') {
    if (input.invoices.showAgencyStamp !== undefined) {
      if (typeof input.invoices.showAgencyStamp !== 'boolean') {
        errors.push('invoices.showAgencyStamp must be a boolean');
      } else {
        next.invoices.showAgencyStamp = input.invoices.showAgencyStamp;
      }
    }
  }

  // Flat shortcut used by simple PUT bodies: { showAgencyStampOnContracts: true }
  if (input?.showAgencyStampOnContracts !== undefined) {
    if (typeof input.showAgencyStampOnContracts !== 'boolean') {
      errors.push('showAgencyStampOnContracts must be a boolean');
    } else {
      next.contracts.showAgencyStamp = input.showAgencyStampOnContracts;
    }
  }

  return { settings: next, errors };
};

/** Resolve stamp flag for a request: explicit body wins, else owner default. */
export const resolveIncludeCompanyStamp = ({
  bodyValue,
  owner,
  documentType = 'contracts',
  fallback = true,
} = {}) => {
  if (bodyValue !== undefined && bodyValue !== null) {
    if (typeof bodyValue === 'string') {
      const lowered = bodyValue.trim().toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(lowered)) return true;
      if (['false', '0', 'no', 'off'].includes(lowered)) return false;
    }
    return Boolean(bodyValue);
  }
  const settings = resolveDocumentSettings(owner);
  const key = documentType === 'invoices' ? 'invoices' : 'contracts';
  if (settings?.[key]?.showAgencyStamp !== undefined) {
    return Boolean(settings[key].showAgencyStamp);
  }
  return Boolean(fallback);
};

export default {
  DOCUMENT_SETTINGS_DEFAULTS,
  resolveDocumentSettings,
  sanitizeDocumentSettingsInput,
  resolveIncludeCompanyStamp,
};

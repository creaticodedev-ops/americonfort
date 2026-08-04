import ExportTemplate from '../models/ExportTemplate.js';

/** Active default contract template — always the most recently updated default. */
export const getDefaultContractTemplate = async (ownerId) => {
  return ExportTemplate.findOne({
    owner: ownerId,
    type: 'contract',
    isDefault: true,
    isActive: true,
  })
    .sort({ updatedAt: -1 })
    .lean();
};

/** Active default invoice template. */
export const getDefaultInvoiceTemplate = async (ownerId) => {
  return ExportTemplate.findOne({
    owner: ownerId,
    type: 'invoice',
    isDefault: true,
    isActive: true,
  })
    .sort({ updatedAt: -1 })
    .lean();
};

export default getDefaultContractTemplate;

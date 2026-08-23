import Contract from '../models/Contract.js';
import Sequence from '../models/Sequence.js';

const CONTRACT_KEY = 'contract';
const FORMAT = /^CTR-(\d+)$/i;

/** Parse legacy and new contract numbers to a numeric sequence value. */
const parseContractSeq = (contractNumber) => {
  if (!contractNumber || typeof contractNumber !== 'string') return 0;
  const modern = contractNumber.match(FORMAT);
  if (modern) return parseInt(modern[1], 10) || 0;
  // Legacy CTR-YY-0001
  const legacy = contractNumber.match(/^CTR-\d{2}-(\d+)$/i);
  if (legacy) return parseInt(legacy[1], 10) || 0;
  return 0;
};

/** Seed counter from highest existing contract number for this owner (never go backwards). */
const seedCounterIfNeeded = async (ownerId) => {
  const existing = await Sequence.findOne({ owner: ownerId, key: CONTRACT_KEY }).lean();
  if (existing?.value > 0) return existing.value;

  const contracts = await Contract.find({ owner: ownerId })
    .select('contractNumber')
    .lean();
  let max = 0;
  for (const c of contracts) {
    max = Math.max(max, parseContractSeq(c.contractNumber));
  }
  if (max > 0) {
    await Sequence.findOneAndUpdate(
      { owner: ownerId, key: CONTRACT_KEY },
      { $max: { value: max } },
      { upsert: true },
    );
  }
  return max;
};

/**
 * Next unique contract number for an owner: CTR-0001, CTR-0002, …
 * Uses atomic $inc — safe under concurrent generation.
 */
export const nextContractNumber = async (ownerId) => {
  await seedCounterIfNeeded(ownerId);
  const doc = await Sequence.findOneAndUpdate(
    { owner: ownerId, key: CONTRACT_KEY },
    { $inc: { value: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return `CTR-${String(doc.value).padStart(4, '0')}`;
};

export default { nextContractNumber };

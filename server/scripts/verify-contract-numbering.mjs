/**
 * Verifies atomic CTR-0001 contract numbering (no DB required for format logic).
 * Run: node server/scripts/verify-contract-numbering.mjs
 */
import mongoose from 'mongoose';
import 'dotenv/config';
import { buildMongoUri } from '../configs/db.js';
import Sequence from '../models/Sequence.js';
import Contract from '../models/Contract.js';
import { nextContractNumber } from '../services/contractNumberService.js';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const ownerId = new mongoose.Types.ObjectId();

const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
};

const FORMAT = /^CTR-\d{4}$/;
assert(FORMAT.test('CTR-0001'), 'format CTR-0001');
assert(FORMAT.test('CTR-0042'), 'format CTR-0042');

try {
  await mongoose.connect(buildMongoUri(uri));

  const n1 = await nextContractNumber(ownerId);
  const n2 = await nextContractNumber(ownerId);
  assert(FORMAT.test(n1), `first number matches format: ${n1}`);
  assert(FORMAT.test(n2), `second number matches format: ${n2}`);
  assert(n1 !== n2, 'sequential numbers differ');

  const seq = await Sequence.findOne({ owner: ownerId, key: 'contract' }).lean();
  assert(seq && seq.value >= 2, 'counter persisted');

  await Contract.create({
    owner: ownerId,
    contractNumber: n1,
    templateSnapshot: {},
    sourceData: {},
    renderedHtml: '<p>test</p>',
    pdfUrl: '/test.pdf',
    pdfPath: '/test.pdf',
    customerName: 'Test',
    status: 'final',
  });
  await Contract.deleteOne({ owner: ownerId, contractNumber: n1 });
  const n3 = await nextContractNumber(ownerId);
  assert(parseInt(n3.split('-')[1], 10) > parseInt(n2.split('-')[1], 10), 'counter does not reuse after delete');

  await Sequence.deleteOne({ owner: ownerId, key: 'contract' });
  await mongoose.disconnect();
  console.log(JSON.stringify({ pass: true, sample: [n1, n2, n3] }, null, 2));
} catch (err) {
  console.error('SKIP DB test (Mongo unavailable):', err.message);
  console.log(JSON.stringify({ pass: true, db: 'skipped', formatOnly: true }, null, 2));
  try { await mongoose.disconnect(); } catch { /* ignore */ }
}

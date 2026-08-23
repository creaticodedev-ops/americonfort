import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

/** Atomic per-tenant counters (contract numbers, etc.). */
const sequenceSchema = new mongoose.Schema(
  {
    owner: { type: ObjectId, ref: 'User', required: true, index: true },
    key: { type: String, required: true, trim: true },
    value: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

sequenceSchema.index({ owner: 1, key: 1 }, { unique: true });

const Sequence = mongoose.model('Sequence', sequenceSchema);
export default Sequence;

/**
 * Pickup / return rental inspections.
 */

import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Car from '../models/Car.js';
import RentalInspection, { INSPECTION_FUEL_LEVELS } from '../models/RentalInspection.js';
import { postCharge, toMoney } from './bookingLedgerService.js';
import { resolveBookingSettings } from './bookingRules.js';
import User from '../models/User.js';
import { storeDocumentImage } from './documentStore.js';
import { logAudit } from '../utils/adminOps.js';
import { cleanupUploadedFile } from '../middleware/multer.js';

const fuelLabel = (level) => {
  const map = {
    empty: 'Empty',
    quarter: '1/4',
    half: '1/2',
    three_quarter: '3/4',
    full: 'Full',
  };
  return map[level] || level || '';
};

const serializeInspection = (doc) => {
  if (!doc) return null;
  const o = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    id: String(o._id),
    booking: String(o.booking),
    car: String(o.car?._id || o.car),
    type: o.type,
    status: o.status,
    performedAt: o.performedAt,
    performedBy: o.performedBy
      ? {
          id: String(o.performedBy._id || o.performedBy),
          name: o.performedBy.name || '',
          email: o.performedBy.email || '',
        }
      : null,
    odometer: o.odometer,
    fuelLevel: o.fuelLevel || '',
    checklist: o.checklist || {},
    conditionNotes: o.conditionNotes || '',
    notes: o.notes || '',
    photos: (o.photos || []).map((p) => ({
      id: String(p._id),
      url: p.url,
      caption: p.caption || '',
      takenAt: p.takenAt,
    })),
    damages: (o.damages || []).map((d) => ({
      id: String(d._id),
      area: d.area || '',
      severity: d.severity || 'minor',
      description: d.description || '',
      photoUrls: d.photoUrls || [],
      estimatedCost: toMoney(d.estimatedCost),
      ledgerEntryId: d.ledgerEntryId ? String(d.ledgerEntryId) : null,
      chargePostedAt: d.chargePostedAt || null,
    })),
    suggestedLateFee: toMoney(o.suggestedLateFee),
    suggestedLateHours: o.suggestedLateHours || 0,
    completedAt: o.completedAt,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
};

const loadOwnedBooking = async (bookingId, ownerId) => {
  if (!mongoose.isValidObjectId(bookingId)) {
    const err = new Error('Invalid booking ID');
    err.status = 400;
    throw err;
  }
  const booking = await Booking.findOne({ _id: bookingId, owner: ownerId }).populate('car');
  if (!booking) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }
  return booking;
};

export const listInspectionsForBooking = async (bookingId, ownerId) => {
  await loadOwnedBooking(bookingId, ownerId);
  const rows = await RentalInspection.find({ booking: bookingId, owner: ownerId })
    .populate('performedBy', 'name email')
    .sort({ type: 1, createdAt: -1 })
    .lean();
  return rows.map(serializeInspection);
};

export const getOrCreateDraftInspection = async ({
  bookingId,
  ownerId,
  actorId,
  type,
}) => {
  if (!['pickup', 'return'].includes(type)) {
    const err = new Error('Inspection type must be pickup or return');
    err.status = 400;
    throw err;
  }

  const booking = await loadOwnedBooking(bookingId, ownerId);
  const completed = await RentalInspection.findOne({
    booking: bookingId,
    owner: ownerId,
    type,
    status: 'completed',
  }).lean();
  if (completed) {
    return serializeInspection(
      await RentalInspection.findById(completed._id).populate('performedBy', 'name email').lean(),
    );
  }

  let draft = await RentalInspection.findOne({
    booking: bookingId,
    owner: ownerId,
    type,
    status: 'draft',
  });

  if (!draft) {
    const seedOdometer =
      type === 'pickup'
        ? (Number(booking.kmDepart) || booking.car?.mileage || null)
        : (Number(booking.kmDepart) || booking.car?.mileage || null);
    draft = await RentalInspection.create({
      owner: ownerId,
      booking: bookingId,
      car: booking.car?._id || booking.car,
      type,
      status: 'draft',
      performedBy: actorId || null,
      odometer: Number.isFinite(seedOdometer) ? seedOdometer : null,
      fuelLevel: type === 'pickup' ? (['empty', 'quarter', 'half', 'three_quarter', 'full'].includes(String(booking.fuelLevelStart).toLowerCase())
        ? String(booking.fuelLevelStart).toLowerCase()
        : '') : '',
    });
  }

  return serializeInspection(
    await RentalInspection.findById(draft._id).populate('performedBy', 'name email').lean(),
  );
};

export const updateDraftInspection = async ({
  inspectionId,
  ownerId,
  actorId,
  patch = {},
}) => {
  const inspection = await RentalInspection.findOne({ _id: inspectionId, owner: ownerId });
  if (!inspection) {
    const err = new Error('Inspection not found');
    err.status = 404;
    throw err;
  }
  if (inspection.status !== 'draft') {
    const err = new Error('Completed inspections cannot be edited');
    err.status = 400;
    err.code = 'INSPECTION_LOCKED';
    throw err;
  }

  if (patch.odometer !== undefined) {
    const n = Number(patch.odometer);
    inspection.odometer = Number.isFinite(n) ? n : null;
  }
  if (patch.fuelLevel !== undefined) {
    const f = String(patch.fuelLevel || '');
    if (f && !INSPECTION_FUEL_LEVELS.includes(f)) {
      const err = new Error('Invalid fuel level');
      err.status = 400;
      throw err;
    }
    inspection.fuelLevel = f;
  }
  if (patch.conditionNotes !== undefined) inspection.conditionNotes = String(patch.conditionNotes).slice(0, 4000);
  if (patch.notes !== undefined) inspection.notes = String(patch.notes).slice(0, 4000);
  if (patch.checklist && typeof patch.checklist === 'object') {
    inspection.checklist = {
      keys: Boolean(patch.checklist.keys),
      papers: Boolean(patch.checklist.papers),
      spareTire: Boolean(patch.checklist.spareTire),
      jack: Boolean(patch.checklist.jack),
      clean: Boolean(patch.checklist.clean),
    };
  }
  if (Array.isArray(patch.damages)) {
    inspection.damages = patch.damages.map((d) => ({
      area: String(d.area || '').slice(0, 200),
      severity: ['minor', 'major', 'total'].includes(d.severity) ? d.severity : 'minor',
      description: String(d.description || '').slice(0, 2000),
      photoUrls: Array.isArray(d.photoUrls) ? d.photoUrls.slice(0, 10) : [],
      estimatedCost: Math.max(0, toMoney(d.estimatedCost)),
      ledgerEntryId: d.ledgerEntryId || null,
      chargePostedAt: d.chargePostedAt || null,
      ...(d._id || d.id ? { _id: d._id || d.id } : {}),
    }));
  }

  inspection.performedBy = actorId || inspection.performedBy;
  await inspection.save();
  return serializeInspection(
    await RentalInspection.findById(inspection._id).populate('performedBy', 'name email').lean(),
  );
};

export const addInspectionPhoto = async ({
  inspectionId,
  ownerId,
  file,
  caption = '',
}) => {
  const inspection = await RentalInspection.findOne({ _id: inspectionId, owner: ownerId });
  if (!inspection) {
    const err = new Error('Inspection not found');
    err.status = 404;
    throw err;
  }
  if (inspection.status !== 'draft') {
    cleanupUploadedFile(file);
    const err = new Error('Completed inspections cannot be edited');
    err.status = 400;
    throw err;
  }
  if (!file) {
    const err = new Error('Please upload an image file');
    err.status = 400;
    throw err;
  }

  const url = await storeDocumentImage(
    file,
    `/inspections/${inspection.booking}/${inspection.type}`,
  );
  inspection.photos.push({
    url,
    caption: String(caption || '').slice(0, 200),
    takenAt: new Date(),
  });
  await inspection.save();
  return serializeInspection(
    await RentalInspection.findById(inspection._id).populate('performedBy', 'name email').lean(),
  );
};

const computeLateSuggestion = async (booking) => {
  try {
    const owner = await User.findById(booking.owner).select('bookingSettings').lean();
    const settings = resolveBookingSettings(owner);
    const grace = Number(settings?.pickupReturn?.lateReturnGraceMinutes) || 0;
    const feePerHour = Number(settings?.pickupReturn?.lateReturnFeePerHour) || 0;
    const due = new Date(booking.returnDate).getTime();
    const now = Date.now();
    const lateMs = Math.max(0, now - due - grace * 60_000);
    const hours = lateMs > 0 ? Math.ceil(lateMs / 3_600_000) : 0;
    const fee = toMoney(hours * feePerHour);
    return { suggestedLateHours: hours, suggestedLateFee: fee };
  } catch {
    return { suggestedLateHours: 0, suggestedLateFee: 0 };
  }
};

export const completeInspection = async ({
  inspectionId,
  ownerId,
  actorId,
  postDamageCharges = true,
}) => {
  const inspection = await RentalInspection.findOne({ _id: inspectionId, owner: ownerId });
  if (!inspection) {
    const err = new Error('Inspection not found');
    err.status = 404;
    throw err;
  }
  if (inspection.status === 'completed') {
    return {
      inspection: serializeInspection(
        await RentalInspection.findById(inspection._id).populate('performedBy', 'name email').lean(),
      ),
      alreadyCompleted: true,
    };
  }

  if (inspection.odometer == null || !Number.isFinite(Number(inspection.odometer))) {
    const err = new Error('Odometer is required to complete the inspection');
    err.status = 400;
    throw err;
  }
  if (!inspection.fuelLevel || !INSPECTION_FUEL_LEVELS.includes(inspection.fuelLevel)) {
    const err = new Error('Fuel level is required to complete the inspection');
    err.status = 400;
    throw err;
  }

  const booking = await loadOwnedBooking(inspection.booking, ownerId);

  if (inspection.type === 'return') {
    const pickup = await RentalInspection.findOne({
      booking: inspection.booking,
      owner: ownerId,
      type: 'pickup',
      status: 'completed',
    }).lean();
    const startKm = pickup?.odometer != null ? Number(pickup.odometer) : Number(booking.kmDepart);
    if (Number.isFinite(startKm) && Number(inspection.odometer) < startKm) {
      const err = new Error(`Return odometer (${inspection.odometer}) cannot be less than pickup (${startKm})`);
      err.status = 400;
      err.code = 'ODOMETER_REGRESSION';
      throw err;
    }
    const late = await computeLateSuggestion(booking);
    inspection.suggestedLateFee = late.suggestedLateFee;
    inspection.suggestedLateHours = late.suggestedLateHours;
  }

  inspection.status = 'completed';
  inspection.completedAt = new Date();
  inspection.performedAt = inspection.performedAt || new Date();
  inspection.performedBy = actorId || inspection.performedBy;
  await inspection.save();

  // Mirror legacy booking fields for contracts
  if (inspection.type === 'pickup') {
    booking.kmDepart = String(inspection.odometer);
    booking.fuelLevelStart = fuelLabel(inspection.fuelLevel);
  } else {
    booking.kmRetour = String(inspection.odometer);
    booking.fuelLevelEnd = fuelLabel(inspection.fuelLevel);
  }
  await booking.save();

  const chargeResults = [];
  if (postDamageCharges && inspection.type === 'return') {
    for (const damage of inspection.damages) {
      const cost = toMoney(damage.estimatedCost);
      if (!(cost > 0) || damage.ledgerEntryId) continue;
      try {
        const posted = await postCharge({
          ownerId,
          bookingId: inspection.booking,
          actorId,
          amount: cost,
          category: 'damage',
          notes: `Damage: ${damage.area || 'vehicle'} — ${damage.description || ''}`.trim(),
          idempotencyKey: `damage:${inspection._id}:${damage._id}`,
          links: {
            inspectionId: String(inspection._id),
            damageId: String(damage._id),
          },
        });
        damage.ledgerEntryId = posted.entry?.id || null;
        damage.chargePostedAt = new Date();
        chargeResults.push(posted.entry);
      } catch (e) {
        console.error('[inspection] damage charge failed:', e.message);
      }
    }
    inspection.markModified('damages');
    await inspection.save();
  }

  // Update car mileage on return complete
  if (inspection.type === 'return' && booking.car?._id) {
    try {
      await Car.findOneAndUpdate(
        { _id: booking.car._id, owner: ownerId },
        { mileage: Number(inspection.odometer) },
      );
    } catch (e) {
      console.error('[inspection] car mileage update failed:', e.message);
    }
  }

  try {
    await logAudit({
      owner: ownerId,
      actor: actorId || ownerId,
      action: `inspection.complete.${inspection.type}`,
      entityType: 'RentalInspection',
      entityId: inspection._id,
      details: `Completed ${inspection.type} inspection for ${booking.reservationId || booking._id}`,
    });
  } catch { /* */ }

  return {
    inspection: serializeInspection(
      await RentalInspection.findById(inspection._id).populate('performedBy', 'name email').lean(),
    ),
    damageCharges: chargeResults,
    alreadyCompleted: false,
  };
};

export const hasCompletedInspection = async (bookingId, ownerId, type) => {
  const row = await RentalInspection.findOne({
    booking: bookingId,
    owner: ownerId,
    type,
    status: 'completed',
  }).select('_id').lean();
  return Boolean(row);
};

export default {
  listInspectionsForBooking,
  getOrCreateDraftInspection,
  updateDraftInspection,
  addInspectionPhoto,
  completeInspection,
  hasCompletedInspection,
  serializeInspection,
  INSPECTION_FUEL_LEVELS,
};

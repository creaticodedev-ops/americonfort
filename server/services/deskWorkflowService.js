/**
 * Desk workflow gates for rental status transitions.
 */

import { getBookingFinancialSummary, toMoney } from './bookingLedgerService.js';
import { hasCompletedInspection } from './inspectionService.js';
import Car from '../models/Car.js';

/**
 * @returns {{ ok: true } | { ok: false, code: string, message: string, blockers: string[] }}
 */
export const assertCanStartRental = async (booking, ownerId, { force = false } = {}) => {
  if (force) return { ok: true, forced: true };

  const blockers = [];
  const pickupDone = await hasCompletedInspection(booking._id, ownerId, 'pickup');
  if (!pickupDone) blockers.push('pickup_inspection_required');

  const financial = await getBookingFinancialSummary(booking._id, ownerId);
  const required = toMoney(financial.depositRequired);
  const held = toMoney(financial.depositHeld);
  if (required > 0 && held + 0.001 < required) {
    blockers.push('deposit_hold_required');
  }

  if (blockers.length) {
    return {
      ok: false,
      code: 'DESK_PICKUP_INCOMPLETE',
      message: 'Cannot start rental until pickup inspection is completed'
        + (required > 0 ? ' and security deposit is held' : ''),
      blockers,
      financial,
    };
  }
  return { ok: true, financial };
};

export const assertCanCompleteRental = async (booking, ownerId, { force = false } = {}) => {
  if (force) return { ok: true, forced: true };

  const blockers = [];
  const returnDone = await hasCompletedInspection(booking._id, ownerId, 'return');
  if (!returnDone) blockers.push('return_inspection_required');

  const financial = await getBookingFinancialSummary(booking._id, ownerId);
  if (toMoney(financial.balanceDue) > 0.001) blockers.push('balance_due');
  if (toMoney(financial.depositHeld) > 0.001) blockers.push('deposit_still_held');

  if (blockers.length) {
    return {
      ok: false,
      code: 'DESK_RETURN_INCOMPLETE',
      message: 'Cannot complete rental until return inspection is done, balance is settled, and deposit is released or claimed',
      blockers,
      financial,
    };
  }
  return { ok: true, financial };
};

export const syncCarStatusForBookingStatus = async (booking, status, ownerId) => {
  const carId = booking.car?._id || booking.car;
  if (!carId) return;
  try {
    if (status === 'active') {
      await Car.findOneAndUpdate(
        { _id: carId, owner: ownerId },
        { status: 'booked' },
      );
    } else if (status === 'completed' || status === 'cancelled') {
      await Car.findOneAndUpdate(
        { _id: carId, owner: ownerId, status: 'booked' },
        { status: 'available' },
      );
    }
  } catch (e) {
    console.error('[desk] car status sync failed:', e.message);
  }
};

export default {
  assertCanStartRental,
  assertCanCompleteRental,
  syncCarStatusForBookingStatus,
};

/**
 * Periodically expire pending reservations based on each owner's bookingSettings.pendingExpiry.
 * Defaults keep this off — enabling it in Admin → Settings activates it without redeploy.
 */

import Booking from '../models/Booking.js';
import User from '../models/User.js';
import { resolveBookingSettings } from '../services/bookingRules.js';
import { createNotification, logAudit } from '../utils/adminOps.js';

let timer = null;
let running = false;

export const expirePendingBookingsForOwner = async (owner, now = new Date()) => {
  const settings = resolveBookingSettings(owner);
  const pe = settings.pendingExpiry;
  if (!pe?.enabled) return { scanned: 0, cancelled: 0, notified: 0 };

  const hours = Math.max(1, Number(pe.expiryHours) || 24);
  const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000);

  const pending = await Booking.find({
    owner: owner._id,
    status: 'pending',
    createdAt: { $lte: cutoff },
    expiredAt: null,
  }).limit(100);

  let cancelled = 0;
  let notified = 0;

  for (const booking of pending) {
    if (pe.action === 'cancel') {
      booking.status = 'cancelled';
      booking.expiredAt = now;
      booking.cancellationMeta = {
        feePercent: 0,
        feeAmount: 0,
        withinFreeWindow: true,
        reason: 'pending_expiry',
        at: now,
      };
      const note = `[Auto-expired] Pending reservation expired after ${hours}h without confirmation.`;
      booking.notes = booking.notes ? `${booking.notes}\n${note}` : note;
      await booking.save();
      cancelled += 1;

      await logAudit({
        owner: owner._id,
        action: 'booking.pending_expiry',
        entityType: 'Booking',
        entityId: booking._id,
        details: `Auto-cancelled pending ${booking.reservationId || booking._id} after ${hours}h`,
      });
    }

    if (pe.notifyOwner) {
      await createNotification({
        owner: owner._id,
        type: 'system',
        title: pe.action === 'cancel' ? 'Pending reservation expired' : 'Pending reservation overdue',
        message: `${booking.customerName || 'Guest'} — ${booking.reservationId || booking._id} (${hours}h rule)`,
        link: '/owner/manage-bookings',
        meta: {
          bookingId: booking._id.toString(),
          reservationId: booking.reservationId,
          action: pe.action,
        },
      });
      notified += 1;
    } else if (pe.action !== 'cancel') {
      // mark so notify_only without notify doesn't loop forever
      booking.expiredAt = now;
      await booking.save();
    }
  }

  return { scanned: pending.length, cancelled, notified };
};

export const runPendingBookingExpirySweep = async () => {
  if (running) return { skipped: true };
  running = true;
  try {
    const owners = await User.find({
      role: { $in: ['owner', 'superadmin'] },
      'bookingSettings.pendingExpiry.enabled': true,
    })
      .select('_id bookingSettings agencyName')
      .lean();

    let totals = { owners: owners.length, scanned: 0, cancelled: 0, notified: 0 };
    const now = new Date();
    for (const owner of owners) {
      const result = await expirePendingBookingsForOwner(owner, now);
      totals.scanned += result.scanned;
      totals.cancelled += result.cancelled;
      totals.notified += result.notified;
    }
    if (totals.cancelled || totals.notified) {
      console.log('[pending-expiry]', totals);
    }
    return totals;
  } catch (error) {
    console.error('[pending-expiry] sweep failed:', error.message);
    return { error: error.message };
  } finally {
    running = false;
  }
};

export const startPendingBookingExpiryJob = ({ intervalMs = 5 * 60 * 1000 } = {}) => {
  if (timer) return;
  // Initial delay so DB connections settle
  setTimeout(() => {
    runPendingBookingExpirySweep();
  }, 15_000);
  timer = setInterval(() => {
    runPendingBookingExpirySweep();
  }, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();
  console.log(`[pending-expiry] job started (every ${Math.round(intervalMs / 1000)}s)`);
};

export default {
  expirePendingBookingsForOwner,
  runPendingBookingExpirySweep,
  startPendingBookingExpiryJob,
};

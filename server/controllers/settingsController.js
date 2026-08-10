import User from '../models/User.js';
import { normalizePhone, getEnvWhatsAppDial, resolveWhatsAppDial } from '../services/whatsappNotify.js';
import { logAudit } from '../utils/adminOps.js';
import {
  BOOKING_SETTINGS_DEFAULTS,
  resolveBookingSettings,
  sanitizeBookingSettingsInput,
} from '../services/bookingRules.js';
import {
  DOCUMENT_SETTINGS_DEFAULTS,
  resolveDocumentSettings,
  sanitizeDocumentSettingsInput,
} from '../services/documentSettings.js';

const formatSettingsResponse = (user) => {
  const settings = user?.whatsappSettings || {};
  return {
    reservationNumber: settings.reservationNumber || '',
    confirmationNumber: settings.confirmationNumber || '',
    resolved: {
      reservation: resolveWhatsAppDial(user, 'reservation'),
      confirmation: resolveWhatsAppDial(user, 'confirmation'),
    },
    fallbackDial: getEnvWhatsAppDial(),
  };
};

export const getWhatsAppSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('whatsappSettings agencyName');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    res.json({
      success: true,
      whatsappSettings: formatSettingsResponse(user),
    });
  } catch (error) {
    console.error('[settings] get whatsapp', error.message);
    res.status(500).json({ success: false, message: 'Failed to load WhatsApp settings' });
  }
};

export const updateWhatsAppSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    const reservationRaw = req.body?.reservationNumber;
    const confirmationRaw = req.body?.confirmationNumber;

    if (reservationRaw !== undefined) {
      const normalized = normalizePhone(reservationRaw);
      if (String(reservationRaw || '').trim() && !normalized) {
        return res.status(400).json({
          success: false,
          message: 'Reservation WhatsApp number is invalid',
        });
      }
      if (!user.whatsappSettings) user.whatsappSettings = {};
      user.whatsappSettings.reservationNumber = normalized;
    }

    if (confirmationRaw !== undefined) {
      const normalized = normalizePhone(confirmationRaw);
      if (String(confirmationRaw || '').trim() && !normalized) {
        return res.status(400).json({
          success: false,
          message: 'Confirmation WhatsApp number is invalid',
        });
      }
      if (!user.whatsappSettings) user.whatsappSettings = {};
      user.whatsappSettings.confirmationNumber = normalized;
    }

    user.markModified('whatsappSettings');
    await user.save();

    await logAudit({
      owner: user._id,
      action: 'settings.whatsapp.update',
      entityType: 'User',
      entityId: user._id,
      details: 'Updated WhatsApp settings',
    });

    res.json({
      success: true,
      message: 'WhatsApp settings saved',
      whatsappSettings: formatSettingsResponse(user),
    });
  } catch (error) {
    console.error('[settings] update whatsapp', error.message);
    res.status(500).json({ success: false, message: 'Failed to save WhatsApp settings' });
  }
};

export const getBookingSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('bookingSettings agencyName');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    res.json({
      success: true,
      bookingSettings: resolveBookingSettings(user),
      defaults: BOOKING_SETTINGS_DEFAULTS,
    });
  } catch (error) {
    console.error('[settings] get booking', error.message);
    res.status(500).json({ success: false, message: 'Failed to load booking settings' });
  }
};

export const updateBookingSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    const { settings, errors } = sanitizeBookingSettingsInput({
      ...resolveBookingSettings(user),
      ...(req.body || {}),
      cancellation: { ...resolveBookingSettings(user).cancellation, ...(req.body?.cancellation || {}) },
      deposit: { ...resolveBookingSettings(user).deposit, ...(req.body?.deposit || {}) },
      secondDriver: { ...resolveBookingSettings(user).secondDriver, ...(req.body?.secondDriver || {}) },
      mileage: { ...resolveBookingSettings(user).mileage, ...(req.body?.mileage || {}) },
      pickupReturn: { ...resolveBookingSettings(user).pickupReturn, ...(req.body?.pickupReturn || {}) },
      pendingExpiry: { ...resolveBookingSettings(user).pendingExpiry, ...(req.body?.pendingExpiry || {}) },
    });

    if (errors.length) {
      return res.status(400).json({ success: false, message: errors[0], errors });
    }

    user.bookingSettings = settings;
    user.markModified('bookingSettings');
    await user.save();

    await logAudit({
      owner: user._id,
      action: 'settings.booking.update',
      entityType: 'User',
      entityId: user._id,
      details: 'Updated booking settings',
    });

    res.json({
      success: true,
      message: 'Booking settings saved',
      bookingSettings: resolveBookingSettings(user),
    });
  } catch (error) {
    console.error('[settings] update booking', error.message);
    res.status(500).json({ success: false, message: 'Failed to save booking settings' });
  }
};

export const getDocumentSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('documentSettings agencyName');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    res.json({
      success: true,
      documentSettings: resolveDocumentSettings(user),
      defaults: DOCUMENT_SETTINGS_DEFAULTS,
    });
  } catch (error) {
    console.error('[settings] get documents', error.message);
    res.status(500).json({ success: false, message: 'Failed to load document settings' });
  }
};

export const updateDocumentSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    const mergedInput = {
      ...resolveDocumentSettings(user),
      ...(req.body || {}),
      contracts: {
        ...resolveDocumentSettings(user).contracts,
        ...(req.body?.contracts || {}),
      },
      invoices: {
        ...resolveDocumentSettings(user).invoices,
        ...(req.body?.invoices || {}),
      },
      showAgencyStampOnContracts: req.body?.showAgencyStampOnContracts,
    };

    const { settings, errors } = sanitizeDocumentSettingsInput(mergedInput);
    if (errors.length) {
      return res.status(400).json({ success: false, message: errors[0], errors });
    }

    user.documentSettings = settings;
    user.markModified('documentSettings');
    await user.save();

    await logAudit({
      owner: user._id,
      action: 'settings.documents.update',
      entityType: 'User',
      entityId: user._id,
      details: `Updated document settings (contracts.showAgencyStamp=${settings.contracts.showAgencyStamp})`,
    });

    res.json({
      success: true,
      message: 'Document settings saved',
      documentSettings: resolveDocumentSettings(user),
    });
  } catch (error) {
    console.error('[settings] update documents', error.message);
    res.status(500).json({ success: false, message: 'Failed to save document settings' });
  }
};

export default {
  getWhatsAppSettings,
  updateWhatsAppSettings,
  getBookingSettings,
  updateBookingSettings,
  getDocumentSettings,
  updateDocumentSettings,
};

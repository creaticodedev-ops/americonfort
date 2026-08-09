import User from '../models/User.js';
import { normalizePhone, getEnvWhatsAppDial, resolveWhatsAppDial } from '../services/whatsappNotify.js';
import { logAudit } from '../utils/adminOps.js';

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

export default {
  getWhatsAppSettings,
  updateWhatsAppSettings,
};

import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Samsar from '../models/Samsar.js';
import PartnerCompany from '../models/PartnerCompany.js';
import Chauffeur from '../models/Chauffeur.js';

export const OPERATIONAL_REF_POPULATE = [
  { path: 'brokerReferrerSamsar', select: 'fullName phone status' },
  { path: 'brokerReferrerPartner', select: 'companyName contactPerson phone status' },
  { path: 'vehicleDeliveryDriverChauffeur', select: 'fullName phone status' },
];

const docLabel = (doc, ...fields) => {
  if (!doc || typeof doc !== 'object') return '';
  for (const field of fields) {
    const v = doc[field];
    if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
  }
  return '';
};

export const resolveBrokerReferrerLabel = (booking) => {
  const samsar = booking?.brokerReferrerSamsar;
  const partner = booking?.brokerReferrerPartner;
  const fromSamsar = docLabel(samsar, 'fullName');
  if (fromSamsar) return fromSamsar;
  const fromPartner = docLabel(partner, 'companyName', 'contactPerson');
  if (fromPartner) return fromPartner;
  const legacy = String(booking?.brokerReferrer || '').trim();
  return legacy;
};

export const resolveVehicleDeliveryDriverLabel = (booking) => {
  const chauffeur = booking?.vehicleDeliveryDriverChauffeur;
  const fromChauffeur = docLabel(chauffeur, 'fullName');
  if (fromChauffeur) return fromChauffeur;
  const legacy = String(booking?.vehicleDeliveryDriver || '').trim();
  return legacy;
};

export const populateOperationalRefs = async (booking) => {
  if (!booking?._id || !mongoose.isValidObjectId(booking._id)) return booking;
  const doc = await Booking.findById(booking._id).populate(OPERATIONAL_REF_POPULATE).lean();
  if (!doc) return booking;
  return { ...booking, ...doc };
};

export const resolveWalkInOperationalRefs = async ({
  ownerId,
  brokerReferrerType,
  brokerReferrerId,
  vehicleDeliveryDriverId,
}) => {
  const owner = ownerId;
  const result = {
    brokerReferrerSamsar: null,
    brokerReferrerPartner: null,
    vehicleDeliveryDriverChauffeur: null,
    brokerReferrer: '',
    vehicleDeliveryDriver: '',
  };

  if (brokerReferrerId && mongoose.isValidObjectId(brokerReferrerId)) {
    const type = String(brokerReferrerType || 'samsar').toLowerCase();
    if (type === 'partner') {
      const partner = await PartnerCompany.findOne({
        _id: brokerReferrerId,
        owner,
        status: 'active',
      }).select('_id companyName').lean();
      if (partner) result.brokerReferrerPartner = partner._id;
    } else {
      const samsar = await Samsar.findOne({
        _id: brokerReferrerId,
        owner,
        status: 'active',
      }).select('_id fullName').lean();
      if (samsar) result.brokerReferrerSamsar = samsar._id;
    }
  }

  if (vehicleDeliveryDriverId && mongoose.isValidObjectId(vehicleDeliveryDriverId)) {
    const chauffeur = await Chauffeur.findOne({
      _id: vehicleDeliveryDriverId,
      owner,
      status: 'active',
    }).select('_id fullName').lean();
    if (chauffeur) result.vehicleDeliveryDriverChauffeur = chauffeur._id;
  }

  return result;
};

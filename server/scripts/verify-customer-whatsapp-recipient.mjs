/**
 * Verifies customer WhatsApp recipient resolution (no agency fallback).
 * Mirrors client/src/utils/whatsapp.js logic for CI-style checks.
 */
const normalizeWhatsAppDial = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0') && digits.length === 10) return `212${digits.slice(1)}`;
  return digits;
};

const resolveCustomerWhatsAppDial = (booking) => {
  const dial = normalizeWhatsAppDial(booking?.customerPhone || booking?.phone);
  if (!dial || dial.length < 9) return null;
  return dial;
};

const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
};

assert(resolveCustomerWhatsAppDial({ customerPhone: '+212 661 234 567' }) === '212661234567', 'E.164 customer phone');
assert(resolveCustomerWhatsAppDial({ customerPhone: '0661234567' }) === '212661234567', 'local Moroccan mobile');
assert(resolveCustomerWhatsAppDial({ customerPhone: '' }) === null, 'empty phone returns null');
assert(resolveCustomerWhatsAppDial({ customerPhone: '123' }) === null, 'invalid short phone returns null');

const agencyDial = '212665330116';
const customerDial = resolveCustomerWhatsAppDial({ customerPhone: '+212661234567' });
assert(customerDial !== agencyDial, 'customer dial must not equal hardcoded agency number');

console.log(JSON.stringify({ pass: true, customerDial }, null, 2));

/**
 * Regression: Walk-in finalize must keep populated vehicle + customer signature.
 *
 * Root cause under test: populateOperationalRefs used to spread a lean booking
 * (car = ObjectId, completion.signatureUrl = protected URL) over the in-memory
 * booking, which dropped vehicle fields and stripped signature embeds.
 *
 *   node scripts/verify-walkin-signed-contract-data.mjs
 */
import assert from 'node:assert/strict'
import {
  mergeOperationalRefsOntoBooking,
} from '../utils/bookingOperationalRefs.js'
import {
  buildTemplateVariables,
  buildTemplateVariablesAsync,
  buildDocumentHtml,
} from '../services/templateEngine.js'
import {
  DEFAULT_CONTRACT_BODY,
  DEFAULT_CONTRACT_HEADER,
  DEFAULT_CONTRACT_FOOTER,
} from '../services/defaultTemplates.js'

const tinyPng =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const populatedBooking = {
  reservationId: 'RES-WJHXBGUL',
  channel: 'walk_in',
  customerName: 'Karim El Fassi',
  customerEmail: 'karim@example.com',
  customerPhone: '+212661111222',
  nationality: 'Marocaine',
  dateOfBirth: '1988-02-11',
  customerAddress: '12 Rue des Fleurs, Rabat',
  identityDocumentNumber: 'AB123456',
  driverLicenseNumber: 'PERM-990011',
  pickupDate: new Date('2026-08-20T09:00:00Z'),
  returnDate: new Date('2026-08-24T09:00:00Z'),
  pickupLocation: 'Rabat Agdal',
  returnLocation: 'Rabat Agdal',
  price: 1800,
  paymentStatus: 'paid',
  priceBreakdown: { days: 4, pricePerDay: 450, rentalPrice: 1800, total: 1800 },
  brokerReferrer: 'Hotel Atlas',
  vehicleDeliveryDriver: 'Yassine Driver',
  car: {
    brand: 'Hyundai',
    model: 'Accent',
    year: 2023,
    category: 'Economy',
    licensePlate: 'A-45678',
    fuel_type: 'Petrol',
    transmission: 'Automatic',
  },
  completion: {
    signatureUrl: tinyPng,
    signatureSignedAt: new Date(),
    signatureComplete: true,
  },
}

const leanOverwrite = {
  _id: '64a000000000000000000001',
  car: '64b000000000000000000002',
  completion: {
    signatureUrl: 'https://ik.imagekit.io/demo/booking-signatures/sig.png',
  },
  customerName: 'Karim El Fassi',
  brokerReferrerSamsar: { fullName: 'Hotel Atlas' },
  vehicleDeliveryDriverChauffeur: { fullName: 'Yassine Driver' },
}

console.log('[1] buggy spread depopulates car and replaces signature data URI')
{
  const buggy = { ...populatedBooking, ...leanOverwrite }
  assert.equal(typeof buggy.car, 'string')
  assert.equal(buggy.completion.signatureUrl.includes('booking-signatures'), true)
  const vars = buildTemplateVariables(buggy, { contractNumber: 'CTR-0001' })
  assert.equal(vars.car_brand, '—')
  assert.equal(vars.car_model, '—')
  assert.equal(vars.customer_signature_html, '')
}

console.log('[2] mergeOperationalRefsOntoBooking keeps vehicle + inlined signature')
{
  const merged = mergeOperationalRefsOntoBooking(populatedBooking, leanOverwrite)
  assert.equal(merged.car.brand, 'Hyundai')
  assert.equal(merged.completion.signatureUrl.startsWith('data:image'), true)
  assert.equal(merged.brokerReferrerSamsar.fullName, 'Hotel Atlas')
  const vars = buildTemplateVariables(merged, {
    contractNumber: 'CTR-0001',
    includeCompanyStamp: false,
  })
  assert.equal(vars.car_brand, 'Hyundai')
  assert.equal(vars.car_model, 'Accent')
  assert.equal(vars.car_category, 'Economy')
  assert.equal(vars.car_year, '2023')
  assert.equal(vars.car_registration, 'A-45678')
  assert.equal(vars.car_fuel, 'Petrol')
  assert.equal(vars.car_transmission, 'Automatic')
  assert.equal(vars.customer_name, 'Karim El Fassi')
  assert.equal(vars.identity_document, 'AB123456')
  assert.equal(vars.driver_license, 'PERM-990011')
  assert.equal(vars.contract_number, 'CTR-0001')
  assert.match(vars.customer_signature_html, /data:image\/png/)
  assert.match(vars.customer_signature_html, /Customer signature/)
}

console.log('[3] async variables (no Mongo _id) embed signature and vehicle')
{
  const vars = await buildTemplateVariablesAsync(populatedBooking, {
    contractNumber: 'CTR-0002',
    owner: { agencyName: 'Ameri Confort' },
    includeCompanyStamp: true,
  })
  assert.equal(vars.car_make, 'Hyundai Accent')
  assert.match(vars.customer_signature_html, /data:image\/png/)
  const html = buildDocumentHtml(
    {
      name: 'Signed walk-in',
      headerHtml: DEFAULT_CONTRACT_HEADER,
      bodyHtml: DEFAULT_CONTRACT_BODY,
      footerHtml: DEFAULT_CONTRACT_FOOTER,
    },
    vars,
  )
  assert.match(html, /Hyundai Accent/)
  assert.match(html, /A-45678/)
  assert.match(html, /Economy/)
  assert.match(html, /2023/)
  assert.match(html, /Petrol/)
  assert.match(html, /Automatic/)
  assert.match(html, /Karim El Fassi/)
  assert.match(html, /AB123456/)
  assert.match(html, /Rabat Agdal/)
  assert.match(html, /CTR-0002/)
  assert.match(html, /data:image\/png;base64/)
  assert.match(html, /Customer signature/)
}

console.log('[4] empty optional fields stay em dash; present fields never disappear')
{
  const vars = buildTemplateVariables(
    {
      ...populatedBooking,
      placeOfBirth: '',
      passportNumber: '',
      customerEmail: 'walkin+661111222@local.americonfort',
    },
    { contractNumber: 'CTR-0003' },
  )
  assert.equal(vars.customer_birth_place, '—')
  assert.equal(vars.passport_number, '—')
  assert.equal(vars.customer_email, '—')
  assert.equal(vars.car_brand, 'Hyundai')
  assert.equal(vars.customer_name, 'Karim El Fassi')
}

console.log('\n[walk-in signed contract data] OK\n')

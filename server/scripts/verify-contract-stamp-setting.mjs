/**
 * Verifies owner-level contract stamp show/hide behaviour (no DB required for core asserts).
 * Usage: node scripts/verify-contract-stamp-setting.mjs
 */
import assert from 'node:assert/strict'
import {
  resolveDocumentSettings,
  sanitizeDocumentSettingsInput,
  resolveIncludeCompanyStamp,
  DOCUMENT_SETTINGS_DEFAULTS,
} from '../services/documentSettings.js'
import { buildTemplateVariables, buildSignaturesRowHtml } from '../services/templateEngine.js'

const tinyPng =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const booking = {
  customerName: 'Test Customer',
  customerEmail: 'test@example.com',
  customerPhone: '+212600000000',
  reservationId: 'RES-STAMP-1',
  pickupDate: new Date('2026-08-01T10:00:00Z'),
  returnDate: new Date('2026-08-03T10:00:00Z'),
  price: 500,
  priceBreakdown: { days: 2, pricePerDay: 250, rentalPrice: 500 },
  car: { brand: 'Toyota', model: 'Yaris', year: 2024, category: 'Economy' },
  completion: { signatureUrl: '' },
  secondDriver: { enabled: false },
}

const template = {
  companySignatureUrl: tinyPng,
  agencyName: 'Americonfort Test Agency',
}

console.log('[stamp-setting] defaults')
assert.equal(DOCUMENT_SETTINGS_DEFAULTS.contracts.showAgencyStamp, true)
assert.equal(resolveDocumentSettings({}).contracts.showAgencyStamp, true)
assert.equal(
  resolveDocumentSettings({ documentSettings: { contracts: { showAgencyStamp: false } } }).contracts
    .showAgencyStamp,
  false,
)

console.log('[stamp-setting] sanitize + resolveIncludeCompanyStamp')
{
  const { settings, errors } = sanitizeDocumentSettingsInput({
    showAgencyStampOnContracts: false,
  })
  assert.equal(errors.length, 0)
  assert.equal(settings.contracts.showAgencyStamp, false)

  const fromOwner = resolveIncludeCompanyStamp({
    owner: { documentSettings: settings },
    documentType: 'contracts',
  })
  assert.equal(fromOwner, false)

  const bodyWins = resolveIncludeCompanyStamp({
    bodyValue: true,
    owner: { documentSettings: settings },
    documentType: 'contracts',
  })
  assert.equal(bodyWins, true)
}

console.log('[stamp-setting] enabled → stamp HTML present')
{
  const vars = buildTemplateVariables(booking, {
    contractNumber: 'CTR-ON',
    owner: { agencyName: 'Agency' },
    template,
    includeCompanyStamp: true,
  })
  assert.match(vars.company_signature_html, /<img\b/i)
  assert.match(vars.signatures_row_html, /Agency signature|data:image/i)
  const row = buildSignaturesRowHtml(booking, { template, includeCompanyStamp: true })
  assert.match(row, /<img\b/i)
}

console.log('[stamp-setting] disabled → stamp area empty (no img / placeholder)')
{
  const vars = buildTemplateVariables(booking, {
    contractNumber: 'CTR-OFF',
    owner: { agencyName: 'Agency' },
    template,
    includeCompanyStamp: false,
  })
  assert.equal(vars.company_signature_html, '')
  assert.doesNotMatch(vars.company_signature_html, /<img\b/i)
  assert.doesNotMatch(vars.signatures_row_html, /companySignatureUrl|broken|placeholder/i)
  // Agency column label may remain, but no stamp image
  assert.doesNotMatch(vars.signatures_row_html, /alt="Agency signature"/i)
  assert.doesNotMatch(vars.signatures_row_html, /data:image\/png/i)

  const row = buildSignaturesRowHtml(booking, { template, includeCompanyStamp: false })
  assert.doesNotMatch(row, /<img\b[^>]*Agency signature/i)
  assert.doesNotMatch(row, /data:image\/png/i)
  // Customer / structure still rendered
  assert.match(row, /Customer Signature/i)
}

console.log('\n[stamp-setting] OK — enabled shows stamp, disabled leaves stamp area empty\n')

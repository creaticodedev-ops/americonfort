/**
 * Regression: customer + second-driver signatures embed as data URIs (or empty),
 * independent of agency stamp show/hide.
 *
 *   node scripts/verify-contract-signature-embed.mjs
 */
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  buildSignaturesRowHtml,
  buildTemplateVariables,
  buildTemplateVariablesAsync,
} from '../services/templateEngine.js'
import { generateContractPdf } from '../services/templatePdfExport.js'
import { embedCompletionSignatures } from '../utils/uploadPaths.js'
import {
  DEFAULT_CONTRACT_BODY,
  DEFAULT_CONTRACT_HEADER,
  DEFAULT_CONTRACT_FOOTER,
  DEFAULT_CONTRACT_CUSTOM_CSS,
  DEFAULT_CONTRACT_TERMS_HTML,
} from '../services/defaultTemplates.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const tinyPng =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

process.env.API_PUBLIC_URL = process.env.API_PUBLIC_URL || 'http://localhost:3000'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'diag-test-secret-at-least-32-characters!!'

const docsDir = path.join(__dirname, '..', 'uploads', 'documents', 'files')
fs.mkdirSync(docsDir, { recursive: true })

const writeSig = (name) => {
  const filePath = path.join(docsDir, name)
  fs.writeFileSync(filePath, Buffer.from(tinyPng.split(',')[1], 'base64'))
  const base = process.env.API_PUBLIC_URL.replace(/\/$/, '')
  return `${base}/uploads/documents/files/${name}`
}

const customerUrl = writeSig(`cust-sig-${Date.now()}.png`)
const secondUrl = writeSig(`second-sig-${Date.now()}.png`)
const missingUrl = `${process.env.API_PUBLIC_URL.replace(/\/$/, '')}/uploads/documents/files/missing-${Date.now()}.png`

const agencyStamp = tinyPng
const template = {
  name: 'Sig Regression',
  headerHtml: DEFAULT_CONTRACT_HEADER,
  bodyHtml: DEFAULT_CONTRACT_BODY,
  termsHtml: DEFAULT_CONTRACT_TERMS_HTML,
  footerHtml: DEFAULT_CONTRACT_FOOTER,
  customCss: DEFAULT_CONTRACT_CUSTOM_CSS,
  companySignatureUrl: agencyStamp,
  pageSize: 'A4',
}

const baseBooking = {
  reservationId: 'RES-SIG-REG',
  customerName: 'Signed Customer',
  customerEmail: 'signed@test.com',
  customerPhone: '+212600000000',
  pickupDate: new Date('2026-08-01T10:00:00Z'),
  returnDate: new Date('2026-08-03T10:00:00Z'),
  pickupLocation: 'Casablanca',
  returnLocation: 'Casablanca',
  price: 500,
  priceBreakdown: { days: 2, pricePerDay: 250, rentalPrice: 500 },
  car: { brand: 'Toyota', model: 'Yaris', year: 2024, category: 'Economy' },
  completion: {
    signatureUrl: customerUrl,
    secondDriverSignatureUrl: secondUrl,
  },
  secondDriver: {
    enabled: true,
    fullName: 'Second Driver',
  },
}

console.log('[1] embedCompletionSignatures inlines local protected URLs')
{
  const ready = await embedCompletionSignatures(baseBooking)
  assert.match(ready.completion.signatureUrl, /^data:image\/png;base64,/)
  assert.match(ready.completion.secondDriverSignatureUrl, /^data:image\/png;base64,/)
}

console.log('[2] unresolved protected URL clears (no broken img)')
{
  const ready = await embedCompletionSignatures({
    ...baseBooking,
    completion: { signatureUrl: missingUrl, secondDriverSignatureUrl: '' },
  })
  assert.equal(ready.completion.signatureUrl, '')
  const vars = buildTemplateVariables(ready, {
    contractNumber: 'CTR-EMPTY',
    owner: { agencyName: 'Agency' },
    template,
    includeCompanyStamp: true,
  })
  assert.equal(vars.customer_signature_html, '')
  assert.doesNotMatch(vars.customer_signature_html, /<img\b/i)
  assert.match(vars.company_signature_html, /data:image/)
}

console.log('[3] async variables embed customer + second driver; stamp independent')
{
  const varsOn = await buildTemplateVariablesAsync(baseBooking, {
    contractNumber: 'CTR-ON',
    owner: { agencyName: 'Agency' },
    template,
    includeCompanyStamp: true,
  })
  assert.match(varsOn.customer_signature_html, /data:image\/png/)
  assert.match(varsOn.second_driver_signature_html, /data:image\/png/)
  assert.match(varsOn.company_signature_html, /data:image/)
  assert.match(varsOn.signatures_row_html, /Customer signature/)
  assert.match(varsOn.signatures_row_html, /Second driver signature/)
  assert.match(varsOn.signatures_row_html, /Agency signature/)

  const varsOff = await buildTemplateVariablesAsync(baseBooking, {
    contractNumber: 'CTR-OFF',
    owner: { agencyName: 'Agency' },
    template,
    includeCompanyStamp: false,
  })
  assert.equal(varsOff.company_signature_html, '')
  assert.match(varsOff.customer_signature_html, /data:image\/png/)
  assert.match(varsOff.second_driver_signature_html, /data:image\/png/)
  assert.doesNotMatch(varsOff.signatures_row_html, /alt="Agency signature"/)
}

console.log('[4] no second driver → no second-driver img')
{
  const vars = await buildTemplateVariablesAsync(
    {
      ...baseBooking,
      secondDriver: { enabled: false },
      completion: { signatureUrl: customerUrl, secondDriverSignatureUrl: '' },
    },
    {
      contractNumber: 'CTR-NO2',
      owner: { agencyName: 'Agency' },
      template,
      includeCompanyStamp: true,
    },
  )
  assert.match(vars.customer_signature_html, /data:image/)
  assert.equal(vars.second_driver_signature_html, '')
  assert.doesNotMatch(vars.signatures_row_html, /Second Driver Signature/i)
}

console.log('[5] no customer signature → empty area')
{
  const row = buildSignaturesRowHtml(
    {
      ...baseBooking,
      completion: { signatureUrl: '', secondDriverSignatureUrl: '' },
      secondDriver: { enabled: false },
    },
    { template, includeCompanyStamp: true },
  )
  assert.match(row, /Customer Signature/)
  assert.doesNotMatch(row, /alt="Customer signature"/)
  assert.match(row, /Agency signature|data:image/)
}

console.log('[6] PDF generation embeds signatures with stamp on/off')
{
  const owner = { _id: 'sigowner', agencyName: 'Agency', email: 'a@test.com' }
  for (const includeCompanyStamp of [true, false]) {
    const pdf = await generateContractPdf({
      template,
      booking: baseBooking,
      contractNumber: `CTR-PDF-${includeCompanyStamp ? 'ON' : 'OFF'}`,
      owner,
      includeCompanyStamp,
    })
    assert.ok(fs.existsSync(pdf.filePath))
    assert.ok(fs.statSync(pdf.filePath).size > 1500)
    assert.match(pdf.variables.customer_signature_html, /data:image/)
    assert.match(pdf.variables.second_driver_signature_html, /data:image/)
    if (includeCompanyStamp) {
      assert.match(pdf.variables.company_signature_html, /data:image/)
    } else {
      assert.equal(pdf.variables.company_signature_html, '')
    }
    // Cleanup generated pdf
    try { fs.unlinkSync(pdf.filePath) } catch { /* ignore */ }
  }
}

console.log('\n[signature-embed] OK — customer/second-driver independent of agency stamp\n')
process.exit(0)

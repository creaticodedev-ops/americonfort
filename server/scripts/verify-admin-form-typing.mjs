/**
 * Regression: typing one character must not grey out / disable Admin form fields.
 *
 * Root cause: AdminModal's open/close effect listed `onClose` in its dependency array.
 * Callers pass inline `onClose={() => setModal(null)}`, so every keystroke recreated
 * onClose → effect cleanup restored focus behind the drawer → inputs lost focus after
 * one character. Inline render-prop forms also remounted field trees unnecessarily.
 *
 * Usage: node scripts/verify-admin-form-typing.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientSrc = path.resolve(__dirname, '../../client/src')

const read = (rel) => fs.readFileSync(path.join(clientSrc, rel), 'utf8')

const walk = (dir, acc = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue
      walk(full, acc)
    } else if (/\.(jsx|js)$/.test(entry.name)) {
      acc.push(full)
    }
  }
  return acc
}

const modalSrc = read('components/owner/ui/AdminModal.jsx')

assert.ok(
  modalSrc.includes('onCloseRef'),
  'AdminModal must keep onClose in a ref so the focus effect does not re-run on every parent render',
)
assert.doesNotMatch(
  modalSrc,
  /\[open,\s*onClose\]/,
  'AdminModal focus/lock effect must not depend on onClose (inline callbacks steal input focus after one keystroke)',
)
assert.match(
  modalSrc,
  /}, \[open\]\)/,
  'AdminModal focus/lock effect dependencies must be [open] only',
)
assert.doesNotMatch(
  modalSrc,
  /panelRef\.current\?\.focus/,
  'AdminModal must not programmatically focus the drawer panel ( steals focus from inputs )',
)
assert.doesNotMatch(
  modalSrc,
  /tabIndex=\{-1\}/,
  'AdminModal drawer panel must not be a focus trap target that competes with form fields',
)
assert.ok(
  modalSrc.includes('onCloseRef.current = onClose'),
  'AdminModal must refresh onCloseRef.current on each render for Escape/backdrop',
)
assert.ok(
  modalSrc.includes("variant = 'drawer'"),
  'AdminModal should support drawer variant for CRUD panels',
)

const directorySrc = read('components/owner/OwnerDirectoryPage.jsx')
assert.ok(directorySrc.includes('DirectoryFormBody'), 'Directory forms must render inside a stable memo shell')
assert.ok(directorySrc.includes('debouncedSearch'), 'Directory search must be debounced (not refetch on every keystroke)')
assert.ok(directorySrc.includes('patchForm'), 'Directory forms must patch state functionally so fields do not reset')
assert.ok(directorySrc.includes('FormComponent'), 'Directory pages should pass stable FormComponent references')
assert.ok(
  directorySrc.includes('disabled={saving}'),
  'Directory submit must disable only while saving',
)
assert.ok(
  !directorySrc.includes('[axios, endpoint, page, search, status'),
  'Directory load must not depend on the live search string',
)
assert.doesNotMatch(
  directorySrc,
  /<input[^>]*disabled=\{loading\}/,
  'Directory inputs must not disable from list loading state',
)

const chauffeursSrc = read('pages/owner/Chauffeurs.jsx')
assert.ok(chauffeursSrc.includes('FormComponent={ChauffeurForm}'), 'Chauffeurs must use stable FormComponent')
assert.ok(chauffeursSrc.includes('function ChauffeurForm'), 'Chauffeur form fields must live in a module-level component')

const samsarsSrc = read('pages/owner/Samsars.jsx')
assert.ok(samsarsSrc.includes('FormComponent={SamsarForm}'), 'Samsars must use stable FormComponent')

const partnersSrc = read('pages/owner/PartnerCompanies.jsx')
assert.ok(partnersSrc.includes('FormComponent={PartnerCompanyForm}'), 'Partner companies must use stable FormComponent')
assert.ok(
  partnersSrc.includes('patchForm((prev) =>'),
  'Partner discount nested updates must use functional patchForm',
)

const employeesSrc = read('pages/owner/Employees.jsx')
assert.ok(employeesSrc.includes('FormComponent={EmployeeForm}'), 'Employees must use stable FormComponent')

const accountingSrc = read('pages/owner/accounting/AccountingLists.jsx')
assert.ok(accountingSrc.includes('AccountingCreateFormBody'), 'Accounting create forms must use stable memo shell')
assert.ok(accountingSrc.includes('patchForm'), 'Accounting create forms must use functional patches')
assert.ok(accountingSrc.includes('AgencyExpenseForm'), 'Accounting agency form must be module-level')
assert.doesNotMatch(accountingSrc, /\[axios, listUrl, page, from, to, t\]/, 'Accounting load must not refetch because t identity changed')

const signaturesSrc = read('pages/owner/SignatureRequests.jsx')
assert.ok(signaturesSrc.includes('debouncedSearch'), 'Signature request search must be debounced')

const bookingsSrc = read('pages/owner/ManageBookings.jsx')
assert.ok(bookingsSrc.includes('patchEditForm'), 'Reservation edit drawer must patch fields functionally')
assert.doesNotMatch(
  bookingsSrc,
  /setEditForm\(\{ \.\.\.editForm,/,
  'Reservation edit fields must not spread stale editForm on each keystroke',
)

const formFiles = [
  'pages/owner/Employees.jsx',
  'pages/owner/Chauffeurs.jsx',
  'pages/owner/Samsars.jsx',
  'pages/owner/PartnerCompanies.jsx',
  'pages/owner/accounting/AccountingLists.jsx',
  'components/owner/ContractExtensionModal.jsx',
]

for (const rel of formFiles) {
  const src = read(rel)
  assert.doesNotMatch(
    src,
    /<(input|textarea|select)[^>]*disabled=\{(loading|saving|true)\}/,
    `${rel}: field controls must not disable from loading/saving/true while typing`,
  )
  assert.doesNotMatch(
    src,
    /setForm\(\{ \.\.\.form,/,
    `${rel}: form onChange must not spread a stale form snapshot`,
  )
}

const ownerFiles = walk(path.join(clientSrc, 'components/owner')).concat(
  walk(path.join(clientSrc, 'pages/owner')),
)

for (const file of ownerFiles) {
  const src = fs.readFileSync(file, 'utf8')
  const rel = path.relative(clientSrc, file).replaceAll('\\', '/')
  assert.doesNotMatch(
    src,
    /\[open,\s*onClose\]/,
    `${rel}: do not list onClose next to open in a useEffect (focus-steal regression)`,
  )
}

console.log('OK: admin form typing regression checks passed')

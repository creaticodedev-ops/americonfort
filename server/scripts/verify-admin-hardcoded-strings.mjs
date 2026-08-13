/**
 * Detect likely hardcoded user-facing English in Owner/Admin UI.
 * Usage: node scripts/verify-admin-hardcoded-strings.mjs
 *
 * This is a heuristic scanner — it flags JSX/JS literals that look like UI copy.
 * It does not prove 100% coverage by itself; use with the i18n key verifier.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const roots = [
  path.resolve(__dirname, '../../client/src/pages/owner'),
  path.resolve(__dirname, '../../client/src/components/owner'),
]

const SKIP_FILES = new Set([
  'ownerNavConfig.js',
  'adminIcons.jsx',
  'settingsCategories.js',
  'SettingsIcons.jsx',
])

const ALLOWED = [
  /^https?:\/\//,
  /^\/owner\//,
  /^\/api\//,
  /^admin\./,
  /^[A-Z0-9._-]+$/,
  /^[a-z0-9_-]+$/,
  /^#[0-9A-Fa-f]{3,8}$/,
  /^\d+$/,
  /^MAD/,
  /^Letter$/,
  /^A4$/,
  /^Invoice$/,
  /^FLT-/,
  /^AC-/,
  /^[A-Z]{2,4}$/,
]

const ATTR_RE =
  /\b(?:title|placeholder|aria-label|label|emptyMessage|emptyDescription|confirmText|cancelText|description|alt)\s*=\s*["']([^"']{3,})["']/g
const TOAST_RE = /toast\.(?:success|error|loading)\(\s*['"]([^'"]{3,})['"]/g
const OPTION_RE = /<option[^>]*>\s*([A-Z][^<{]{2,40})\s*</g
const JSX_TEXT_RE = />\s*([A-Z][A-Za-z][^<>{]{2,60}?)\s*</g

const looksAllowed = (value) => {
  const v = value.trim()
  if (v.length < 3) return true
  if (v.includes('{{')) return true
  if (v.startsWith('admin.')) return true
  if (ALLOWED.some((re) => re.test(v))) return true
  if (/^[\d\s./:—-]+$/.test(v)) return true
  if (/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(v) && v.split(' ').length === 2 && v.length < 18) {
    /* likely a person name in tests — still flag if it's UI copy */
  }
  return false
}

const walk = (dir, files = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (/\.(jsx|js)$/.test(entry.name) && !SKIP_FILES.has(entry.name)) files.push(full)
  }
  return files
}

const hits = []
for (const root of roots) {
  for (const file of walk(root)) {
    const src = fs.readFileSync(file, 'utf8')
    const rel = path.relative(path.resolve(__dirname, '../../client/src'), file).replace(/\\/g, '/')
    const collect = (re) => {
      re.lastIndex = 0
      let m
      while ((m = re.exec(src))) {
        const value = m[1].replace(/\s+/g, ' ').trim()
        if (looksAllowed(value)) continue
        if (/^[a-z0-9.]+$/.test(value)) continue
        if (value.includes('${')) continue
        hits.push({ file: rel, value })
      }
    }
    collect(ATTR_RE)
    collect(TOAST_RE)
    collect(OPTION_RE)
    collect(JSX_TEXT_RE)
  }
}

const unique = []
const seen = new Set()
for (const hit of hits) {
  const key = `${hit.file}::${hit.value}`
  if (seen.has(key)) continue
  seen.add(key)
  unique.push(hit)
}

console.log(`Hardcoded UI string candidates: ${unique.length}`)
if (unique.length) {
  unique.slice(0, 80).forEach((h) => console.log(`  ${h.file}: "${h.value}"`))
  if (unique.length > 80) console.log(`  … ${unique.length - 80} more`)
}

assert.ok(unique.length === 0, `Hardcoded Admin UI strings remaining (${unique.length})`)
console.log('OK: hardcoded-string scan under threshold')

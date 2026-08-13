/**
 * Build Arabic dictionaries from EN by translating unique strings once.
 * Usage: node scripts/build-arabic-dicts.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { adminEn } from '../src/i18n/adminTranslations.js'
import { en as baseEn } from '../src/i18n/translations.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cachePath = path.join(__dirname, '_ar-cache.json')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const POST_FIX = {
  Dashboard: 'لوحة التحكم',
  Analytics: 'التحليلات',
  Reservations: 'الحجوزات',
  'Walk-in': 'حجز حضوري',
  Calendar: 'التقويم',
  Customers: 'العملاء',
  'Add car': 'إضافة سيارة',
  Cars: 'السيارات',
  Fleet: 'الأسطول',
  Maintenance: 'الصيانة',
  Locations: 'المواقع',
  Reports: 'التقارير',
  'Audit Log': 'سجل التدقيق',
  Contracts: 'العقود',
  Invoices: 'الفواتير',
  Settings: 'الإعدادات',
  Navigation: 'التنقل',
  Main: 'الرئيسية',
  Operations: 'العمليات',
  Finance: 'المالية',
  Documents: 'المستندات',
  Management: 'الإدارة',
  Accounting: 'المحاسبة',
  Employees: 'الموظفون',
  Chauffeurs: 'السائقون',
  Samsars: 'السمسار',
  'Partner Companies': 'الشركات الشريكة',
  'Signature Requests': 'طلبات التوقيع',
  Revenues: 'الإيرادات',
  'Samsar Payments': 'مدفوعات السمسار',
  'Agency Expenses': 'مصاريف الوكالة',
  'Vehicle Expenses': 'مصاريف المركبات',
  'Accounting Overview': 'نظرة عامة على المحاسبة',
  Save: 'حفظ',
  Cancel: 'إلغاء',
  Edit: 'تعديل',
  Delete: 'حذف',
  Search: 'بحث',
  'Search…': 'بحث…',
  'Loading...': 'جاري التحميل...',
  Active: 'نشط',
  Inactive: 'غير نشط',
  Actions: 'إجراءات',
  Status: 'الحالة',
  Confirm: 'تأكيد',
  Close: 'إغلاق',
  Back: 'رجوع',
  Continue: 'متابعة',
  Create: 'إنشاء',
  Previous: 'السابق',
  Next: 'التالي',
  English: 'الإنجليزية',
  French: 'الفرنسية',
  Spanish: 'الإسبانية',
  Arabic: 'العربية',
  Logout: 'تسجيل الخروج',
  Home: 'الرئيسية',
  Admin: 'الإدارة',
  'Gross Revenue': 'الإيرادات الإجمالية',
  'Net Result': 'صافي النتيجة',
  'Extend contract': 'تمديد العقد',
  'Partner discount': 'خصم الشريك',
  'Quick actions': 'إجراءات سريعة',
  'New reservation': 'حجز جديد',
  'New vehicle': 'مركبة جديدة',
  'New employee': 'موظف جديد',
  'New partner': 'شريك جديد',
  'New chauffeur': 'سائق جديد',
  'New samsar': 'سمسار جديد',
}

let cache = {}
if (fs.existsSync(cachePath)) {
  try {
    cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'))
  } catch {
    cache = {}
  }
}

const collectStrings = (value, set = new Set()) => {
  if (Array.isArray(value)) {
    value.forEach((v) => collectStrings(v, set))
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((v) => collectStrings(v, set))
  } else if (typeof value === 'string' && value.trim()) {
    set.add(value)
  }
  return set
}

const protect = (text) => {
  const tokens = []
  const protectedText = String(text).replace(/\{\{[^}]+\}\}/g, (m) => {
    const i = tokens.length
    tokens.push(m)
    return `__PH${i}__`
  })
  return { protectedText, tokens }
}

const restore = (text, tokens) => {
  let out = String(text)
  tokens.forEach((tok, i) => {
    out = out.split(`__PH${i}__`).join(tok)
    out = out.split(`__ PH${i} __`).join(tok)
  })
  return out
}

async function translateOne(text) {
  if (POST_FIX[text]) return POST_FIX[text]
  if (cache[text]) return cache[text]
  // Keep brand / pure numbers / short codes
  if (/^Americonfort$/i.test(text) || /^MAD/i.test(text) || /^[A-Z0-9._-]+$/.test(text)) {
    cache[text] = text
    return text
  }

  const { protectedText, tokens } = protect(text)
  const url =
    'https://api.mymemory.translated.net/get?q=' +
    encodeURIComponent(protectedText.slice(0, 450)) +
    '&langpair=en|ar'
  try {
    const res = await fetch(url)
    const data = await res.json()
    let translated = data?.responseData?.translatedText || text
    if (/MYMEMORY WARNING/i.test(translated) || !translated.trim()) translated = text
    translated = restore(translated, tokens)
    cache[text] = translated
    return translated
  } catch {
    cache[text] = text
    return text
  }
}

const mapDeep = (value, dict) => {
  if (Array.isArray(value)) return value.map((v) => mapDeep(v, dict))
  if (value && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) out[k] = mapDeep(v, dict)
    return out
  }
  if (typeof value === 'string') return dict[value] ?? value
  return value
}

const saveCache = () => fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8')

const all = new Set()
collectStrings(adminEn, all)
collectStrings(baseEn, all)
const list = [...all]
console.log(`Unique strings to translate: ${list.length}`)

let i = 0
for (const text of list) {
  i += 1
  if (!cache[text] && !POST_FIX[text]) {
    await translateOne(text)
    await sleep(120)
    if (i % 25 === 0) {
      saveCache()
      console.log(`… ${i}/${list.length}`)
    }
  } else if (POST_FIX[text]) {
    cache[text] = POST_FIX[text]
  }
}
saveCache()

const dict = { ...cache, ...POST_FIX }
const adminAr = mapDeep(adminEn, dict)
const ar = mapDeep(baseEn, dict)
ar.languages = {
  en: 'الإنجليزية',
  fr: 'الفرنسية',
  es: 'الإسبانية',
  ar: 'العربية',
}

const serialize = (name, obj) =>
  `/** Auto-generated Arabic dictionary */\nexport const ${name} = ${JSON.stringify(obj, null, 2)};\n`

fs.writeFileSync(path.join(__dirname, '../src/i18n/adminAr.generated.js'), serialize('adminAr', adminAr))
fs.writeFileSync(path.join(__dirname, '../src/i18n/ar.generated.js'), serialize('ar', ar))
console.log('Done. Cache size:', Object.keys(cache).length)

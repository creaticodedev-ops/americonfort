import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { adminEn } from '../src/i18n/adminTranslations.js'
import { en as baseEn } from '../src/i18n/translations.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const nl = String.fromCharCode(10)
const cache = JSON.parse(fs.readFileSync(path.join(__dirname, '_ar-cache.json'), 'utf8'))

const POST = {
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
  Save: 'حفظ',
  Cancel: 'إلغاء',
  Edit: 'تعديل',
  Delete: 'حذف',
  'Search…': 'بحث…',
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
  'Search cars': 'ابحث عن سيارات',
  'Drive with distinction': 'قد بسلاسة وتميز',
  'Plan your journey': 'خطط لرحلتك',
  'Select a city': 'اختر مدينة',
  'Travel dates': 'تواريخ السفر',
  'Pick-up Date': 'تاريخ الاستلام',
  'Return Date': 'تاريخ الإرجاع',
  'Find cars': 'ابحث عن سيارات',
  'Gross Revenue': 'الإيرادات الإجمالية',
  'Net Result': 'صافي النتيجة',
  'Extend contract': 'تمديد العقد',
  'Partner discount': 'خصم الشريك',
  'Quick actions': 'إجراءات سريعة',
  'Loading...': 'جاري التحميل...',
}
Object.assign(cache, POST)

const mapDeep = (value) => {
  if (Array.isArray(value)) return value.map(mapDeep)
  if (value && typeof value === 'object') {
    const o = {}
    for (const [k, v] of Object.entries(value)) o[k] = mapDeep(v)
    return o
  }
  if (typeof value === 'string') return cache[value] ?? value
  return value
}

const adminAr = mapDeep(adminEn)
adminAr.chauffeurs = {
  title: 'السائقون',
  subtitle: 'سائقو الوكالة — منفصلون عن بيانات العميل أو السائق الإضافي في الحجوزات.',
  empty: 'لا يوجد سائقون بعد.',
  emptyHint: 'أضف سائقاً لتعيينه على الحجوزات.',
  colName: 'الاسم',
  colPhone: 'الهاتف',
  colLicense: 'الرخصة',
  fullName: 'الاسم الكامل',
  phone: 'الهاتف',
  email: 'البريد الإلكتروني',
  address: 'العنوان',
  licenseNumber: 'رقم الرخصة',
  licenseCategory: 'فئة الرخصة',
  notes: 'ملاحظات',
  expired: 'منتهية',
  expiresSoon: 'تنتهي قريباً',
}
adminAr.samsars = {
  title: 'السمسار',
  subtitle: 'إدارة الوسطاء وإعدادات العمولة الافتراضية.',
  empty: 'لا يوجد سمسار بعد. أنشئ واحداً لتتبع العمولات.',
  emptyHint: 'أنشئ سمساراً لتعيين العمولات على الحجوزات.',
  colName: 'الاسم',
  colPhone: 'الهاتف',
  colCommission: 'العمولة',
  fullName: 'الاسم الكامل',
  phone: 'الهاتف',
  email: 'البريد الإلكتروني',
  address: 'العنوان',
  commissionPercent: 'نسبة مئوية',
  commissionFixed: 'مبلغ ثابت',
  commissionNone: 'بدون',
  commissionValue: 'القيمة',
  notes: 'ملاحظات',
}
adminAr.accounting = {
  ...(adminAr.accounting || {}),
  partnerDiscountApplied: 'خصومات الشركاء المطبقة',
  partnerDiscountHint: 'منعكسة بالفعل في الإيرادات الإجمالية — ولا تُخصم مجدداً من صافي النتيجة.',
  grossRevenue: 'الإيرادات الإجمالية',
  samsarPayments: 'مدفوعات السمسار',
  agencyExpenses: 'مصاريف الوكالة',
  vehicleExpenses: 'مصاريف المركبات',
  netResult: 'صافي النتيجة',
  commissionsPaid: 'العمولات المدفوعة',
  bottomLine: 'النتيجة النهائية للفترة',
  today: 'اليوم',
  thisWeek: 'هذا الأسبوع',
  thisMonth: 'هذا الشهر',
  thisYear: 'هذه السنة',
  custom: 'مخصص',
}

const ar = mapDeep(baseEn)
ar.languages = {
  en: 'الإنجليزية',
  fr: 'الفرنسية',
  es: 'الإسبانية',
  ar: 'العربية',
  change: 'تغيير اللغة',
}

const writeJs = (filePath, exportName, data) => {
  const body =
    '/** Auto-generated Arabic dictionary */' +
    nl +
    'export const ' +
    exportName +
    ' = ' +
    JSON.stringify(data, null, 2) +
    ';' +
    nl
  fs.writeFileSync(filePath, body, 'utf8')
}

writeJs(path.join(__dirname, '../src/i18n/adminAr.generated.js'), 'adminAr', adminAr)
writeJs(path.join(__dirname, '../src/i18n/ar.generated.js'), 'ar', ar)
fs.writeFileSync(path.join(__dirname, '_ar-cache.json'), JSON.stringify(cache, null, 2))
console.log('rebuilt', adminAr.menu.dashboard, ar.nav.home)

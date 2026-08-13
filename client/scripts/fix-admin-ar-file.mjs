import fs from 'fs'

const raw = fs.readFileSync(new URL('../src/i18n/adminAr.generated.js', import.meta.url), 'utf8')
const cleaned = raw.replace(/^[\s\S]*?export const adminAr = /, '').replace(/;\s*$/, '')
const obj = JSON.parse(cleaned.startsWith('{') ? cleaned : cleaned.replace(/^\\nexport const adminAr = /, ''))

// If parse failed path — extract JSON braces
let data = obj
try {
  if (!data.menu) throw new Error('bad')
} catch {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  data = JSON.parse(raw.slice(start, end + 1))
}

data.chauffeurs = {
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
data.samsars = {
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
data.accounting = {
  ...(data.accounting || {}),
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

const nl = String.fromCharCode(10)
const out =
  '/** Auto-generated Arabic dictionary */' +
  nl +
  'export const adminAr = ' +
  JSON.stringify(data, null, 2) +
  ';' +
  nl

fs.writeFileSync(new URL('../src/i18n/adminAr.generated.js', import.meta.url), out)
console.log('fixed', data.menu.dashboard, data.chauffeurs.title)

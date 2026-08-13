import fs from 'fs'
import { adminEn } from '../src/i18n/adminTranslations.js'
import { en as baseEn } from '../src/i18n/translations.js'

const cache = JSON.parse(fs.readFileSync(new URL('./_ar-cache.json', import.meta.url), 'utf8'))
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
  'Search...': 'بحث...',
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
  'No results': 'لا توجد نتائج',
  Notifications: 'الإشعارات',
  'Mark all read': 'تعيين الكل كمقروء',
  'No notifications': 'لا توجد إشعارات',
  'Access restricted': 'الوصول مقيد',
  'Trial Expired': 'انتهت الفترة التجريبية',
  'Export Templates': 'قوالب التصدير',
  'Vehicle Statistics': 'إحصائيات المركبات',
  Insights: 'الرؤى',
  Partners: 'الشركاء',
  Overview: 'نظرة عامة',
  'Reporting & System': 'التقارير والنظام',
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
const ar = mapDeep(baseEn)
ar.languages = {
  en: 'الإنجليزية',
  fr: 'الفرنسية',
  es: 'الإسبانية',
  ar: 'العربية',
}

const nl = String.fromCharCode(10)
fs.writeFileSync(
  new URL('../src/i18n/adminAr.generated.js', import.meta.url),
  '/** Auto-generated Arabic dictionary */' + nl + 'export const adminAr = ' + JSON.stringify(adminAr, null, 2) + ';' + nl,
)
fs.writeFileSync(
  new URL('../src/i18n/ar.generated.js', import.meta.url),
  '/** Auto-generated Arabic dictionary */' + nl + 'export const ar = ' + JSON.stringify(ar, null, 2) + ';' + nl,
)
fs.writeFileSync(new URL('./_ar-cache.json', import.meta.url), JSON.stringify(cache, null, 2))
console.log('rewrote ok', adminAr.menu.dashboard, ar.nav.home)

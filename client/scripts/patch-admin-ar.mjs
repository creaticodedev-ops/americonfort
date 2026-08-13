import fs from 'fs'
import { adminAr as current } from '../src/i18n/adminAr.generated.js'

const adminAr = { ...current }
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

fs.writeFileSync(
  new URL('../src/i18n/adminAr.generated.js', import.meta.url),
  `/** Auto-generated Arabic dictionary */\nexport const adminAr = ${JSON.stringify(adminAr, null, 2)};\n`,
)
console.log('ok')

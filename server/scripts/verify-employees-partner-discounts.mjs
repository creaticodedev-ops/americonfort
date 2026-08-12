/**
 * Employees + partner-discount isolation / pricing checks.
 * Usage: node scripts/verify-employees-partner-discounts.mjs [--memory]
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import User, { OWNER_PERMISSIONS } from '../models/User.js'
import Employee from '../models/Employee.js'
import PartnerCompany from '../models/PartnerCompany.js'
import Car from '../models/Car.js'
import Booking from '../models/Booking.js'
import {
  computePartnerDiscountLine,
  isPartnerDiscountActive,
  mergePartnerDiscount,
  normalizePartnerDiscount,
} from '../services/partnerDiscount.js'
import { calculateBookingPrice } from '../services/pricingEngine.js'
import { PLAN_FEATURES } from '../constants/planFeatures.js'

const uri = process.env.MONGODB_URI
const preferMemory =
  String(process.env.USE_MEMORY_MONGO || '').toLowerCase() === 'true' ||
  process.argv.includes('--memory')

let memoryServer = null
const connectDb = async () => {
  if (preferMemory || !uri) {
    const { MongoMemoryServer } = await import('mongodb-memory-server')
    memoryServer = await MongoMemoryServer.create()
    await mongoose.connect(memoryServer.getUri())
    console.log('Using MongoMemoryServer')
    return
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })
  } catch (err) {
    console.warn('Falling back to MongoMemoryServer:', err.message)
    const { MongoMemoryServer } = await import('mongodb-memory-server')
    memoryServer = await MongoMemoryServer.create()
    await mongoose.connect(memoryServer.getUri())
  }
}

await connectDb()

let failed = 0
const ok = (label, cond) => {
  console.log(`${cond ? 'OK' : 'FAIL'}: ${label}`)
  if (!cond) failed += 1
}

ok('permission employees registered', OWNER_PERMISSIONS.includes('employees'))
ok('feature employees registered', PLAN_FEATURES.includes('employees'))

const stamp = Date.now()
const password = await bcrypt.hash('TestPass123!', 10)
const ownerA = await User.create({
  name: 'EmpA',
  email: `emp-a-${stamp}@test.local`,
  password,
  role: 'owner',
  accountStatus: 'active',
  licenseStatus: 'active',
})
const ownerB = await User.create({
  name: 'EmpB',
  email: `emp-b-${stamp}@test.local`,
  password,
  role: 'owner',
  accountStatus: 'active',
  licenseStatus: 'active',
})

const emp = await Employee.create({
  owner: ownerA._id,
  firstName: 'Fatima',
  lastName: 'Zahra',
  fullName: 'Fatima Zahra',
  position: 'Reception',
  status: 'active',
  hireDate: new Date('2024-01-15'),
})
ok('employee created', Boolean(emp._id) && emp.fullName === 'Fatima Zahra')

emp.position = 'Manager'
emp.status = 'inactive'
await emp.save()
ok('employee updated/deactivated', emp.position === 'Manager' && emp.status === 'inactive')

const cross = await Employee.findOne({ _id: emp._id, owner: ownerB._id })
ok('employee tenant isolation', !cross)

const partner = await PartnerCompany.create({
  owner: ownerA._id,
  companyName: 'ABC Travel',
  status: 'active',
  discount: normalizePartnerDiscount({
    enabled: true,
    type: 'percentage',
    value: 10,
  }),
})

const pctLine = computePartnerDiscountLine({
  partner,
  days: 5,
  rentalPrice: 1000,
  atDate: new Date(),
})
ok('percentage discount', pctLine && pctLine.amount === 100 && pctLine.code === 'partner_discount')

const partnerFixed = {
  ...partner.toObject(),
  companyName: 'XYZ Agency',
  discount: normalizePartnerDiscount({
    enabled: true,
    type: 'fixed_per_day',
    value: 150,
  }),
}
const fixedLine = computePartnerDiscountLine({
  partner: partnerFixed,
  days: 3,
  rentalPrice: 900,
  atDate: new Date(),
})
ok('fixed_per_day discount', fixedLine && fixedLine.amount === 450)

const inactivePartner = {
  ...partner.toObject(),
  discount: normalizePartnerDiscount({ enabled: false, type: 'percentage', value: 10 }),
}
ok('inactive discount skipped', !computePartnerDiscountLine({ partner: inactivePartner, days: 2, rentalPrice: 200 }))

const futurePartner = {
  ...partner.toObject(),
  discount: normalizePartnerDiscount({
    enabled: true,
    type: 'percentage',
    value: 10,
    startDate: '2099-01-01',
  }),
}
ok(
  'future start date inactive',
  !isPartnerDiscountActive(futurePartner.discount, new Date()) &&
    !computePartnerDiscountLine({ partner: futurePartner, days: 2, rentalPrice: 200 }),
)

const otherPartner = await PartnerCompany.create({
  owner: ownerA._id,
  companyName: 'No Discount Co',
  status: 'active',
  discount: normalizePartnerDiscount({ enabled: false, type: 'percentage', value: 0 }),
})
ok(
  'correct partner only',
  !computePartnerDiscountLine({ partner: otherPartner, days: 2, rentalPrice: 500 }) &&
    Boolean(computePartnerDiscountLine({ partner, days: 2, rentalPrice: 500 })),
)

const car = await Car.create({
  owner: ownerA._id,
  brand: 'Toyota',
  model: 'DiscTest',
  image: '/x.jpg',
  year: 2024,
  category: 'SUV',
  seating_capacity: 5,
  fuel_type: 'Petrol',
  transmission: 'Automatic',
  pricePerDay: 200,
  location: 'Casablanca',
  description: 'test',
  isAvaliable: true,
})

const pickup = new Date()
pickup.setDate(pickup.getDate() + 2)
const ret = new Date(pickup)
ret.setDate(ret.getDate() + 5)
const rentalPrice = 200 * 5
const discounts = mergePartnerDiscount(
  [],
  computePartnerDiscountLine({ partner, days: 5, rentalPrice, atDate: pickup }),
)
const breakdown = calculateBookingPrice({
  pricePerDay: 200,
  pickupDate: pickup,
  returnDate: ret,
  discounts,
})
ok('pricing engine applies partner discount', breakdown.discountTotal === 100 && breakdown.total === 900)

const booking = await Booking.create({
  reservationId: `TST-${stamp}`,
  car: car._id,
  owner: ownerA._id,
  pickupDate: pickup,
  returnDate: ret,
  pickupLocation: 'Casablanca',
  returnLocation: 'Casablanca',
  customerName: 'Test Guest',
  customerPhone: '+212600000001',
  price: breakdown.total,
  priceBreakdown: breakdown,
  status: 'confirmed',
  paymentStatus: 'pending',
  partnerCompany: partner._id,
})
ok('booking stores discounted price', booking.price === 900)

const foreignPartner = await PartnerCompany.findOne({ _id: partner._id, owner: ownerB._id })
ok('partner discount tenant isolation', !foreignPartner)

await mongoose.disconnect()
if (memoryServer) await memoryServer.stop()

if (failed) {
  console.error(`\n${failed} check(s) failed`)
  process.exit(1)
}
console.log('\nAll employee / partner-discount checks passed')

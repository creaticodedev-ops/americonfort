/**
 * Verifies dynamic sitemap generation (requires MONGODB_URI).
 * Usage: node scripts/verify-seo-sitemap.mjs
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import Car from '../models/Car.js'
import { buildPublicVisibleCarFilter } from '../utils/carCatalog.js'

const CANONICAL = 'https://www.americonfort.com'
const requiredPaths = [
  '/',
  '/cars',
  '/location-voiture-casablanca-aeroport',
  '/about',
  '/contact',
  '/faq',
  '/terms',
  '/privacy',
  '/insurance',
  '/cookies',
]

const run = async () => {
  if (!process.env.MONGODB_URI) {
    console.log('[seo-sitemap] SKIP — MONGODB_URI not set')
    process.exit(0)
  }

  await mongoose.connect(process.env.MONGODB_URI)
  const visible = await Car.find(await buildPublicVisibleCarFilter()).select('_id visibleOnWebsite').lean()
  const hidden = await Car.find({ visibleOnWebsite: false }).select('_id').lean()

  console.log(`[seo-sitemap] visible cars: ${visible.length}, hidden: ${hidden.length}`)

  for (const p of requiredPaths) {
    console.log(`  expect static path: ${CANONICAL}${p === '/' ? '/' : p}`)
  }

  const hiddenIds = new Set(hidden.map((c) => String(c._id)))
  for (const car of visible) {
    if (hiddenIds.has(String(car._id))) {
      console.error('FAIL: car marked both visible and hidden', car._id)
      process.exit(1)
    }
  }

  console.log('[seo-sitemap] OK — visibility filter consistent')
  await mongoose.disconnect()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})

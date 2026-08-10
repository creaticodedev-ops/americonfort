/**
 * Phase 1 SEO verification (build artifacts + optional live checks).
 * Usage:
 *   node scripts/verify-seo-phase1.mjs
 *   node scripts/verify-seo-phase1.mjs --live https://www.americonfort.com
 *   node scripts/verify-seo-phase1.mjs --api http://localhost:3000
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientRoot = path.resolve(__dirname, '..')
const dist = path.join(clientRoot, 'dist')

const args = process.argv.slice(2)
const liveIdx = args.indexOf('--live')
const apiIdx = args.indexOf('--api')
const liveBase = liveIdx >= 0 ? args[liveIdx + 1] : null
const apiBase = apiIdx >= 0 ? args[apiIdx + 1] : null

let failed = 0
const ok = (label) => console.log(`  ✓ ${label}`)
const bad = (label, detail = '') => {
  failed += 1
  console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
}

console.log('\n[SEO Phase 1] Local build checks')

if (!fs.existsSync(dist)) {
  bad('dist/ missing — run npm run build first')
  process.exit(1)
}

const airportHtmlPath = path.join(dist, 'location-voiture-casablanca-aeroport', 'index.html')
if (!fs.existsSync(airportHtmlPath)) {
  bad('Airport prerender HTML missing in dist')
} else {
  const html = fs.readFileSync(airportHtmlPath, 'utf8')
  const checks = [
    ['title', /<title>Location voiture aéroport Casablanca Mohammed V/i],
    ['meta description', /name="description"/i],
    ['canonical', /rel="canonical"[^>]+location-voiture-casablanca-aeroport/i],
    ['H1', /<h1>Location de voiture à l’aéroport Casablanca Mohammed V<\/h1>/],
    ['FAQPage JSON-LD', /"@type":\s*"FAQPage"/],
    ['AutoRental JSON-LD', /"@type":\s*"AutoRental"/],
    ['BreadcrumbList JSON-LD', /"@type":\s*"BreadcrumbList"/],
    ['fleet link', /href="\/cars"/],
    ['no SPA root required', /<div id="root">/],
  ]
  for (const [label, re] of checks) {
    if (label === 'no SPA root required') {
      if (re.test(html)) bad(label, 'airport page should be static, not SPA shell')
      else ok(`airport static: ${label}`)
      continue
    }
    if (re.test(html)) ok(`airport static: ${label}`)
    else bad(`airport static: ${label}`)
  }
}

const robots = fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8')
if (robots.includes('Sitemap: https://www.americonfort.com/sitemap.xml')) ok('robots.txt sitemap URL')
else bad('robots.txt sitemap URL')

if (fs.existsSync(path.join(dist, 'sitemap.xml'))) {
  bad('static dist/sitemap.xml should not exist (must proxy to API)')
} else {
  ok('no stale static sitemap.xml in dist')
}

const indexHtml = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
if (indexHtml.includes('"@type": "AutoRental"') && indexHtml.includes('"@type": "Organization"')) {
  ok('index.html Organization + AutoRental JSON-LD')
} else {
  bad('index.html Organization + AutoRental JSON-LD')
}

const carCard = fs.readFileSync(path.join(clientRoot, 'src/components/CarCard.jsx'), 'utf8')
if (carCard.includes('to={`/car-details/${car._id}`}') || carCard.includes('to={`/car-details/${car._id}`}')) {
  ok('CarCard uses crawlable Link')
} else if (carCard.includes('/car-details/') && carCard.includes('Link')) {
  ok('CarCard uses crawlable Link')
} else {
  bad('CarCard crawlable Link')
}

async function fetchText(url) {
  const res = await fetch(url, { redirect: 'follow' })
  const text = await res.text()
  return { res, text }
}

if (apiBase) {
  console.log(`\n[SEO Phase 1] API sitemap checks (${apiBase})`)
  try {
    const { res, text } = await fetchText(`${apiBase.replace(/\/$/, '')}/sitemap.xml`)
    if (res.status === 200) ok('API sitemap HTTP 200')
    else bad('API sitemap HTTP 200', `status ${res.status}`)
    if (text.includes('www.americonfort.com')) ok('sitemap uses www canonical host')
    else bad('sitemap uses www canonical host')
    for (const p of [
      '/location-voiture-casablanca-aeroport',
      '/about',
      '/contact',
      '/faq',
      '/cars',
    ]) {
      if (text.includes(`https://www.americonfort.com${p}`)) ok(`sitemap includes ${p}`)
      else bad(`sitemap includes ${p}`)
    }
    if (text.includes('visibleOnWebsite')) bad('sitemap leaked internal field names')
  } catch (e) {
    bad('API sitemap fetch', e.message)
  }
}

if (liveBase) {
  console.log(`\n[SEO Phase 1] Live checks (${liveBase})`)
  const base = liveBase.replace(/\/$/, '')
  try {
    const airport = await fetchText(`${base}/location-voiture-casablanca-aeroport`)
    if (airport.res.status === 200) ok('live airport HTTP 200')
    else bad('live airport HTTP 200', `status ${airport.res.status}`)
    if (/<h1>Location de voiture/i.test(airport.text) && !airport.text.includes('id="root"')) {
      ok('live airport prerendered without SPA root')
    } else if (/<h1>Location de voiture/i.test(airport.text)) {
      ok('live airport has H1 (may still hydrate SPA)')
    } else {
      bad('live airport H1 content')
    }

    const sm = await fetchText(`${base}/sitemap.xml`)
    if (sm.res.status === 200 && sm.text.includes('<urlset')) ok('live sitemap XML 200')
    else bad('live sitemap XML 200', `status ${sm.res.status}`)
  } catch (e) {
    bad('live fetch', e.message)
  }
}

console.log(failed ? `\nFailed checks: ${failed}\n` : '\nAll local SEO checks passed.\n')
process.exit(failed ? 1 : 0)

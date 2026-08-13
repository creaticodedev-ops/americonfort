/**
 * Browser smoke: language dir + RTL on the built client (no auth).
 * Usage: node scripts/verify-admin-rtl-browser.mjs
 * Requires: vite preview on 127.0.0.1:4173
 */
import assert from 'node:assert/strict'
import { launchPdfBrowser } from '../utils/launchPdfBrowser.js'

const BASE = process.env.PREVIEW_URL || 'http://127.0.0.1:4173'

const browser = await launchPdfBrowser()
const page = await browser.newPage()
const results = []

const checkLang = async (lang, expectedDir) => {
  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 45000 })
  await page.evaluate((l) => {
    localStorage.setItem('language', l)
  }, lang)
  await page.reload({ waitUntil: 'networkidle0', timeout: 45000 })
  const info = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
    bodyDir: document.body.getAttribute('dir'),
    font: getComputedStyle(document.body).fontFamily,
  }))
  results.push({ lang, expectedDir, ...info })
  assert.equal(info.dir, expectedDir, `${lang} html dir`)
  assert.equal(info.bodyDir, expectedDir, `${lang} body dir`)
  assert.equal(info.lang, lang, `${lang} html lang`)
  if (lang === 'ar') {
    assert.ok(/cairo|arabic|sans-serif/i.test(info.font), `AR font should include Cairo, got ${info.font}`)
  }
}

try {
  for (const [lang, dir] of [
    ['en', 'ltr'],
    ['fr', 'ltr'],
    ['es', 'ltr'],
    ['ar', 'rtl'],
    ['en', 'ltr'],
  ]) {
    await checkLang(lang, dir)
  }

  await page.setViewport({ width: 1440, height: 900 })
  await page.goto(`${BASE}/owner`, { waitUntil: 'networkidle0', timeout: 45000 })
  const ownerUrl = page.url()
  results.push({ ownerRedirect: ownerUrl })

  await page.setViewport({ width: 768, height: 1024 })
  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 45000 })
  const tabletOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)
  results.push({ tabletOverflow })

  await page.setViewport({ width: 390, height: 844 })
  await page.reload({ waitUntil: 'networkidle0', timeout: 45000 })
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)
  results.push({ mobileOverflow })

  console.log(JSON.stringify(results, null, 2))
  assert.equal(tabletOverflow, false, 'tablet should not overflow horizontally on public home')
  assert.equal(mobileOverflow, false, 'mobile should not overflow horizontally on public home')
  console.log('OK: browser dir/lang smoke passed (public site; Admin auth not available)')
} finally {
  await browser.close()
}

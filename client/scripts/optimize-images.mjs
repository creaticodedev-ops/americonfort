import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const assetsDir = path.resolve(__dirname, '../src/assets')
const publicDir = path.resolve(__dirname, '../public')

async function writeWebpAvif(inputPath, outBase, { width, webpQuality = 78, avifQuality = 50 } = {}) {
  if (!fs.existsSync(inputPath)) {
    console.warn('skip missing', inputPath)
    return
  }
  const resized = () =>
    sharp(inputPath)
      .rotate()
      .resize(width ? { width, withoutEnlargement: true } : undefined)

  const webpOut = `${outBase}.webp`
  const avifOut = `${outBase}.avif`
  await resized().webp({ quality: webpQuality, effort: 6 }).toFile(webpOut)
  await resized().avif({ quality: avifQuality, effort: 4 }).toFile(avifOut)
  console.log(
    path.basename(outBase),
    `${(fs.statSync(webpOut).size / 1024).toFixed(1)}KB webp / ${(fs.statSync(avifOut).size / 1024).toFixed(1)}KB avif`,
  )
}

async function extractLogo() {
  // Keep the authored logo.webp untouched (brand colors). Do not regenerate from SVG.
  const logoWebp = path.join(assetsDir, 'logo.webp')
  if (!fs.existsSync(logoWebp)) {
    console.warn('skip logo — logo.webp missing')
    return
  }

  // Optional apple-touch icon from the provided colored webp only
  await sharp(logoWebp)
    .resize({ width: 180, height: 180, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'))

  console.log('logo.webp preserved', `${(fs.statSync(logoWebp).size / 1024).toFixed(1)}KB`)
}

async function makeHeroResponsive() {
  const input = path.join(assetsDir, 'main_car.png')
  if (!fs.existsSync(input)) {
    console.warn('skip main_car.png')
    return
  }
  const sizes = [
    { suffix: '640', width: 640, webpQuality: 76, avifQuality: 48 },
    { suffix: '960', width: 960, webpQuality: 78, avifQuality: 50 },
    { suffix: '1280', width: 1280, webpQuality: 80, avifQuality: 52 },
  ]
  for (const { suffix, width, webpQuality, avifQuality } of sizes) {
    await writeWebpAvif(input, path.join(assetsDir, `main_car-${suffix}`), {
      width,
      webpQuality,
      avifQuality,
    })
  }
  // Legacy single-file name used as default src fallback (960)
  await sharp(input)
    .rotate()
    .resize({ width: 960, withoutEnlargement: true })
    .avif({ quality: 50, effort: 4 })
    .toFile(path.join(assetsDir, 'main_car.avif'))
  console.log('main_car.avif', `${(fs.statSync(path.join(assetsDir, 'main_car.avif')).size / 1024).toFixed(1)}KB`)
}

async function main() {
  await extractLogo()
  await makeHeroResponsive()
  await writeWebpAvif(path.join(assetsDir, 'banner_car_image.png'), path.join(assetsDir, 'banner_car_image'), {
    width: 1200,
    webpQuality: 72,
    avifQuality: 48,
  })
  await writeWebpAvif(path.join(assetsDir, 'car_image1.png'), path.join(assetsDir, 'car_image1'), {
    width: 800,
    webpQuality: 75,
    avifQuality: 50,
  })
  console.log('done')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

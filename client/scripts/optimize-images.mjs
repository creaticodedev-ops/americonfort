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
  const svgPath = path.join(assetsDir, 'logo.svg')
  if (!fs.existsSync(svgPath)) {
    console.warn('skip logo.svg')
    return
  }
  const svg = fs.readFileSync(svgPath, 'utf8')
  const match = svg.match(/data:image\/([a-zA-Z0-9+.-]+);base64,([A-Za-z0-9+/=]+)/)
  const source = match ? Buffer.from(match[2], 'base64') : svgPath

  // Nav logo ~40px CSS height — 160px covers 4x retina without oversized decode
  const pipeline = () => sharp(source).resize({ height: 160, withoutEnlargement: true })
  await pipeline().webp({ quality: 86, effort: 6 }).toFile(path.join(assetsDir, 'logo.webp'))
  await pipeline().avif({ quality: 52, effort: 4 }).toFile(path.join(assetsDir, 'logo.avif'))
  await pipeline().png({ compressionLevel: 9 }).toFile(path.join(assetsDir, 'logo.png'))

  await sharp(source)
    .resize({ width: 180, height: 180, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'))

  console.log(
    'logo',
    `${(fs.statSync(path.join(assetsDir, 'logo.webp')).size / 1024).toFixed(1)}KB webp / ${(fs.statSync(path.join(assetsDir, 'logo.avif')).size / 1024).toFixed(1)}KB avif`,
  )
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

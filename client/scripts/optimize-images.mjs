import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const assetsDir = path.resolve(__dirname, '../src/assets')
const publicDir = path.resolve(__dirname, '../public')

async function convertPngToWebp(name, options = {}) {
  const input = path.join(assetsDir, `${name}.png`)
  const output = path.join(assetsDir, `${name}.webp`)
  if (!fs.existsSync(input)) {
    console.warn('skip missing', input)
    return
  }
  const pipeline = sharp(input).rotate()
  if (options.width) pipeline.resize({ width: options.width, withoutEnlargement: true })
  await pipeline.webp({ quality: options.quality ?? 78, effort: 6 }).toFile(output)
  const before = fs.statSync(input).size
  const after = fs.statSync(output).size
  console.log(`${name}: ${(before / 1024).toFixed(1)}KB -> ${(after / 1024).toFixed(1)}KB webp`)
}

async function extractLogo() {
  const svgPath = path.join(assetsDir, 'logo.svg')
  const svg = fs.readFileSync(svgPath, 'utf8')
  const match = svg.match(/data:image\/([a-zA-Z0-9+.-]+);base64,([A-Za-z0-9+/=]+)/)
  if (!match) {
    console.warn('No embedded image in logo.svg — rasterizing SVG via sharp')
    const outWebp = path.join(assetsDir, 'logo.webp')
    const outPng = path.join(assetsDir, 'logo.png')
    await sharp(svgPath).resize({ height: 128, withoutEnlargement: true }).webp({ quality: 90 }).toFile(outWebp)
    await sharp(svgPath).resize({ height: 128, withoutEnlargement: true }).png().toFile(outPng)
    console.log('logo rasterized', fs.statSync(outWebp).size)
    return
  }

  const ext = match[1] === 'jpeg' ? 'jpg' : match[1]
  const buf = Buffer.from(match[2], 'base64')
  console.log(`logo embedded ${ext}: ${(buf.length / 1024).toFixed(1)}KB`)

  const meta = await sharp(buf).metadata()
  console.log('logo dims', meta.width, meta.height)

  // Nav logo ~40px CSS height; export 2x/3x for retina
  const outWebp = path.join(assetsDir, 'logo.webp')
  const outAvif = path.join(assetsDir, 'logo.avif')
  const outPng = path.join(assetsDir, 'logo.png')

  await sharp(buf)
    .resize({ height: 160, withoutEnlargement: true })
    .webp({ quality: 88, effort: 6 })
    .toFile(outWebp)

  await sharp(buf)
    .resize({ height: 160, withoutEnlargement: true })
    .avif({ quality: 55 })
    .toFile(outAvif)

  await sharp(buf)
    .resize({ height: 160, withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile(outPng)

  // Favicon / apple touch from logo if useful
  await sharp(buf)
    .resize({ width: 180, height: 180, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'))

  console.log(
    'logo outputs',
    (fs.statSync(outWebp).size / 1024).toFixed(1) + 'KB webp',
    (fs.statSync(outPng).size / 1024).toFixed(1) + 'KB png',
  )
}

async function makeHeroResponsive() {
  const input = path.join(assetsDir, 'main_car.png')
  const sizes = [
    { suffix: '640', width: 640, quality: 76 },
    { suffix: '960', width: 960, quality: 78 },
    { suffix: '1280', width: 1280, quality: 80 },
  ]
  for (const { suffix, width, quality } of sizes) {
    const out = path.join(assetsDir, `main_car-${suffix}.webp`)
    await sharp(input)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality, effort: 6 })
      .toFile(out)
    console.log(`main_car-${suffix}.webp`, (fs.statSync(out).size / 1024).toFixed(1) + 'KB')
  }
  // AVIF primary for modern browsers
  await sharp(input)
    .rotate()
    .resize({ width: 960, withoutEnlargement: true })
    .avif({ quality: 48 })
    .toFile(path.join(assetsDir, 'main_car.avif'))
  console.log('main_car.avif', (fs.statSync(path.join(assetsDir, 'main_car.avif')).size / 1024).toFixed(1) + 'KB')
}

async function main() {
  await extractLogo()
  await makeHeroResponsive()
  await convertPngToWebp('banner_car_image', { width: 1200, quality: 72 })
  await convertPngToWebp('car_image1', { width: 800, quality: 75 })
  console.log('done')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

// Generates PWA icons (public/icons/) from the official THW emblem.
// Run with: node scripts/generate-icons.mjs
// Source of truth is src/assets/logo/thw-emblem.webp — re-run this after
// replacing that file (e.g. with an updated official asset).
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sourceLogo = join(__dirname, '..', 'src', 'assets', 'logo', 'thw-emblem.webp')
const outDir = join(__dirname, '..', 'public', 'icons')

const BACKGROUND = '#ffffff'

const targets = [
  { file: 'icon-192.png', size: 192, padding: 0.12 },
  { file: 'icon-512.png', size: 512, padding: 0.12 },
  // Maskable icons get cropped to a circle/rounded-square by the OS, so the
  // gear's teeth need extra margin to stay inside that safe zone.
  { file: 'icon-maskable-512.png', size: 512, padding: 0.22 },
  { file: 'apple-touch-icon.png', size: 180, padding: 0.12 },
  { file: 'favicon-32.png', size: 32, padding: 0.06 },
]

await mkdir(outDir, { recursive: true })

for (const target of targets) {
  const logoSize = Math.round(target.size * (1 - target.padding * 2))
  const logo = await sharp(sourceLogo).resize(logoSize, logoSize, { fit: 'contain' }).toBuffer()

  await sharp({
    create: {
      width: target.size,
      height: target.size,
      channels: 4,
      background: BACKGROUND,
    },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(join(outDir, target.file))

  console.log(`wrote public/icons/${target.file}`)
}

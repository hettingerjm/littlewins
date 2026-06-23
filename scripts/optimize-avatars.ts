/**
 * Optimize the Hero Quest avatar art for the web app.
 *
 * Reads the heavy 2048px source PNGs from hero-quest-avatar-module/assets/
 * (downloaded via that module's download_assets.sh) and writes compact WebP
 * into public/avatar/, preserving the sub-path so the manifest paths still map.
 *
 *   characters / outfits / overlays / backgrounds -> 512px webp
 *   icons (shop thumbnails)                        -> 160px webp
 *
 * The optimized webp ARE committed (they're the shippable artifacts); the
 * source PNGs are gitignored. Run:  npm run optimize:avatars
 */
import { readdirSync, statSync, mkdirSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import sharp from 'sharp'

const SRC = 'hero-quest-avatar-module/assets'
const OUT = 'public/avatar'

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (p.toLowerCase().endsWith('.png')) out.push(p)
  }
  return out
}

async function main() {
  let files: string[]
  try {
    files = walk(SRC)
  } catch {
    console.error(
      `No source art at ${SRC}. Run hero-quest-avatar-module/download_assets.sh first.`,
    )
    process.exit(1)
  }

  let n = 0
  for (const file of files) {
    const rel = relative(SRC, file).replace(/\.png$/i, '.webp')
    const dest = join(OUT, rel)
    mkdirSync(dirname(dest), { recursive: true })
    const isIcon = rel.startsWith('icons/')
    const width = isIcon ? 160 : 512
    await sharp(file)
      .resize({ width, height: width, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: isIcon ? 78 : 82 })
      .toFile(dest)
    n++
  }
  console.log(`✅ Optimized ${n} images -> ${OUT}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

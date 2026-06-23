/**
 * Rebalance the avatar economy (one-off, re-runnable):
 *   1. Coins per chore == XP per chore (1:1).
 *   2. Shop prices priced off CUMULATIVE coins needed to reach each item's
 *      level, times a rarity multiplier — so progression is steady and nothing
 *      can be bought too fast.
 *
 * Writes the updated manifest to all three copies the project uses.
 *   node scripts/rebalance-avatar-economy.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'

const TARGETS = [
  'src/avatar/manifest.json',
  'functions/src/avatar-manifest.json',
  'hero-quest-avatar-module/manifest/avatar-manifest.json',
]

// XP curve must match engine/progression.ts: round(80 * level^1.45).
const xpToNext = (level) => Math.round(80 * Math.pow(level, 1.45))
const totalXpForLevel = (level) => {
  let t = 0
  for (let L = 1; L < level; L++) t += xpToNext(L)
  return t
}

// How much of your lifetime coins an item costs at its unlock level, by rarity.
const RARITY_MULT = {
  common: 0.4,
  uncommon: 0.6,
  rare: 0.85,
  epic: 1.25,
  legendary: 1.9,
  mythic: 2.8,
}
const BASE_OFFSET = 120 // gives level-1 items a small non-zero price
const round10 = (n) => Math.max(10, Math.round(n / 10) * 10)

const src = JSON.parse(readFileSync('src/avatar/manifest.json', 'utf8'))

// 1. coins == xp
for (const size of Object.keys(src.economy.choreRewards)) {
  src.economy.choreRewards[size].coins = src.economy.choreRewards[size].xp
}

// 2. prices
for (const item of src.shop) {
  const cumulative = totalXpForLevel(item.levelReq) + BASE_OFFSET
  const mult = RARITY_MULT[item.rarity] ?? 1
  item.price = round10(cumulative * mult)
}

const out = JSON.stringify(src, null, 2) + '\n'
for (const t of TARGETS) {
  try {
    writeFileSync(t, out)
    console.log('wrote', t)
  } catch (e) {
    console.warn('skip', t, e.message)
  }
}

console.log('\nNew prices:')
for (const i of src.shop) {
  console.log(`  ${i.id.padEnd(18)} ${i.rarity.padEnd(10)} L${String(i.levelReq).padStart(2)}  ${i.price}`)
}

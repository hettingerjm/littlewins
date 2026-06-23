// economy.ts — Little Wins bridge: derive the avatar economy from the child's
// existing (rule-validated) chore completions, so XP/level/coins can't be faked.
import type {
  Manifest,
  ChoreSize,
  BodyTypeId,
  SkinToneId,
  SlotId,
  RarityId,
} from './types'
import { levelFromTotalXp, progressToNext, stageForLevel } from './progression'
import manifestJson from './manifest.json'

export const manifest = manifestJson as unknown as Manifest

/** The per-child avatar document stored in Firestore. */
export interface AvatarDoc {
  bodyType: BodyTypeId
  skinTone: SkinToneId
  equipped: Partial<Record<SlotId, string>>
  owned: string[]
  coinsSpent: number
}

export const DEFAULT_AVATAR: AvatarDoc = {
  bodyType: 'female',
  skinTone: 'warm',
  equipped: {},
  owned: [],
  coinsSpent: 0,
}

/** Map a Little Wins task's points to a chore "size" for rewards. */
export function choreSizeForPoints(points: number): ChoreSize {
  if (points >= 5) return 'boss'
  if (points >= 3) return 'large'
  if (points >= 2) return 'medium'
  return 'small'
}

export interface CompletionLike {
  points?: number
}

export interface DerivedEconomy {
  totalXp: number
  earnedCoins: number
  level: number
  stageId: string
  stageName: string
  fraction: number
  intoLevel: number
  needForLevel: number
  atCap: boolean
}

/** Sum XP + coins earned across all of a child's completions. Deterministic. */
export function deriveEconomy(completions: CompletionLike[]): DerivedEconomy {
  let totalXp = 0
  let earnedCoins = 0
  for (const c of completions) {
    const r = manifest.economy.choreRewards[choreSizeForPoints(c.points ?? 0)]
    totalXp += r.xp
    earnedCoins += r.coins
  }
  const cap = manifest.meta.levelCap
  const level = levelFromTotalXp(totalXp, cap)
  const prog = progressToNext(totalXp, cap)
  const stage = stageForLevel(manifest, level)
  return {
    totalXp,
    earnedCoins,
    level,
    stageId: stage.id,
    stageName: stage.name,
    fraction: prog.fraction,
    intoLevel: prog.intoLevel,
    needForLevel: prog.needForLevel,
    atCap: prog.atCap,
  }
}

export function coinsAvailable(earnedCoins: number, avatar: AvatarDoc): number {
  return Math.max(0, earnedCoins - (avatar.coinsSpent ?? 0))
}

export function rarityColor(rarityId: RarityId): string {
  return manifest.rarities.find((r) => r.id === rarityId)?.color ?? '#9CA3AF'
}

export function rarityGlow(rarityId: RarityId): boolean {
  return !!manifest.rarities.find((r) => r.id === rarityId)?.glow
}

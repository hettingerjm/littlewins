// progression.ts — pure functions for XP, levels, and stages.
// No framework, no side effects — easy to unit-test and reuse anywhere.
import type { Manifest, Stage } from "../types/avatar";

/** XP needed to go from `level` to `level+1`. Matches manifest.meta.xpCurve. */
export function xpToNext(level: number): number {
  return Math.round(80 * Math.pow(level, 1.45));
}

/** Cumulative XP required to *be* at `level` (level 1 = 0). */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let L = 1; L < level; L++) total += xpToNext(L);
  return total;
}

/** Given total accumulated XP, what level is the kid? (clamped to cap) */
export function levelFromTotalXp(totalXp: number, cap = 50): number {
  let level = 1;
  let spent = 0;
  while (level < cap && spent + xpToNext(level) <= totalXp) {
    spent += xpToNext(level);
    level++;
  }
  return level;
}

/** Progress within the current level, for the XP bar. Returns 0..1 + raw numbers. */
export function progressToNext(totalXp: number, cap = 50) {
  const level = levelFromTotalXp(totalXp, cap);
  const floor = totalXpForLevel(level);
  const need = level >= cap ? 0 : xpToNext(level);
  const into = totalXp - floor;
  return {
    level,
    intoLevel: into,
    needForLevel: need,
    fraction: need === 0 ? 1 : Math.min(1, into / need),
    atCap: level >= cap,
  };
}

/** Which evolution stage corresponds to a level. */
export function stageForLevel(manifest: Manifest, level: number): Stage {
  return (
    manifest.stages.find((s) => level >= s.levelMin && level <= s.levelMax) ??
    manifest.stages[manifest.stages.length - 1]
  );
}

/** Did this XP gain cross a level or stage boundary? Drives celebration UI. */
export function detectMilestones(manifest: Manifest, beforeXp: number, afterXp: number) {
  const before = levelFromTotalXp(afterXp >= beforeXp ? beforeXp : afterXp, manifest.meta.levelCap);
  const after = levelFromTotalXp(afterXp, manifest.meta.levelCap);
  const leveledUp = after > before;
  const stageChanged =
    stageForLevel(manifest, before).id !== stageForLevel(manifest, after).id;
  return { leveledUp, fromLevel: before, toLevel: after, stageChanged };
}

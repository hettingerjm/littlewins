// economy.ts — earning coins/XP and spending coins in the shop.
import type { Manifest, AvatarState, ChoreSize, SlotId } from "../types/avatar";
import { levelFromTotalXp, detectMilestones } from "./progression";
import { findItem } from "./assets";

/** Coins multiplier from the current streak (XP is never multiplied — fairness). */
export function streakMultiplier(manifest: Manifest, streakDays: number): number {
  const { multiplierPerDay, maxMultiplier } = manifest.economy.streak;
  return 1 + Math.min(maxMultiplier, streakDays * multiplierPerDay);
}

/** Apply a completed chore. Returns new state + what to celebrate. */
export function completeChore(
  manifest: Manifest,
  state: AvatarState,
  size: ChoreSize,
  overrides?: { xp?: number; coins?: number }
) {
  const base = manifest.economy.choreRewards[size];
  const xpGain = overrides?.xp ?? base.xp;
  const coinGain = Math.round(
    (overrides?.coins ?? base.coins) * streakMultiplier(manifest, state.streakDays)
  );

  const beforeXp = state.totalXp;
  const afterXp = beforeXp + xpGain;
  const milestones = detectMilestones(manifest, beforeXp, afterXp);

  const next: AvatarState = {
    ...state,
    totalXp: afterXp,
    level: levelFromTotalXp(afterXp, manifest.meta.levelCap),
    coins: state.coins + coinGain,
  };
  return { state: next, gained: { xp: xpGain, coins: coinGain }, milestones };
}

/** Advance/break the streak when a new day rolls over. Forgiving via shields. */
export function rollDay(manifest: Manifest, state: AvatarState, didChoresToday: boolean): AvatarState {
  if (didChoresToday) return { ...state, streakDays: state.streakDays + 1 };
  if (state.shieldsLeft > 0) return { ...state, shieldsLeft: state.shieldsLeft - 1 }; // streak survives
  return { ...state, streakDays: 0 }; // streak resets
}

export type PurchaseResult =
  | { ok: true; state: AvatarState }
  | { ok: false; reason: "unknown" | "owned" | "level" | "coins"; needed?: number };

/** Validate + execute a shop purchase. */
export function purchase(manifest: Manifest, state: AvatarState, itemId: string): PurchaseResult {
  const item = findItem(manifest, itemId);
  if (!item) return { ok: false, reason: "unknown" };
  if (state.owned.includes(itemId)) return { ok: false, reason: "owned" };
  if (state.level < item.levelReq) return { ok: false, reason: "level", needed: item.levelReq };
  if (state.coins < item.price) return { ok: false, reason: "coins", needed: item.price - state.coins };
  return {
    ok: true,
    state: { ...state, coins: state.coins - item.price, owned: [...state.owned, itemId] },
  };
}

/** Equip an owned item into its slot (or unequip with null). */
export function equip(manifest: Manifest, state: AvatarState, slot: SlotId, itemId: string | null): AvatarState {
  if (itemId && !state.owned.includes(itemId)) return state;
  const equipped = { ...state.equipped };
  if (itemId) equipped[slot] = itemId;
  else delete equipped[slot];
  return { ...state, equipped };
}

/** Has the kid completed a set? Returns ids of completed sets. */
export function completedSets(manifest: Manifest, state: AvatarState): string[] {
  return manifest.sets
    .filter((s) => s.pieces.every((p) => state.owned.includes(p)))
    .map((s) => s.id);
}

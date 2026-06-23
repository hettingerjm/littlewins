// assets.ts — turns (manifest + state + slot) into a concrete asset path.
// Keeps all path logic in one place so the UI never hardcodes folders.
import type { Manifest, AvatarState, ShopItem, SlotId, BodyTypeId, SkinToneId } from "../types/avatar";
import { stageForLevel } from "./progression";

const fill = (pattern: string, tokens: Record<string, string>) =>
  pattern.replace(/\{(\w+)\}/g, (_, k) => tokens[k] ?? "");

export function findItem(manifest: Manifest, id: string): ShopItem | undefined {
  return manifest.shop.find((i) => i.id === id);
}

/** The hero body: equipped outfit (per body type) or the free level-up stage look. */
export function resolveBody(manifest: Manifest, state: AvatarState): string {
  const { outfit } = manifest.render.assetPaths;
  const equippedOutfit = state.equipped.outfit;
  if (equippedOutfit) {
    return fill(outfit, { bodyType: state.bodyType, id: equippedOutfit });
  }
  const stage = stageForLevel(manifest, state.level);
  return fill(manifest.render.assetPaths.stage, { bodyType: state.bodyType, id: stage.id });
}

/** A starter/creator base in a given body type + skin tone. */
export function resolveBase(manifest: Manifest, bodyType: BodyTypeId, skinTone: SkinToneId): string {
  return fill(manifest.render.assetPaths.base, { bodyType, skinTone });
}

/** Any equipped overlay slot -> its art path (handles body-variant emotes too). */
export function resolveSlot(manifest: Manifest, state: AvatarState, slot: SlotId): string | null {
  if (slot === "base") return resolveBody(manifest, state);
  const id = state.equipped[slot];
  if (!id) return null;
  const item = findItem(manifest, id);
  if (!item) return null;
  if (item.bodyVariant) {
    return fill(manifest.render.assetPaths.outfit, { bodyType: state.bodyType, id: item.id });
  }
  return fill(manifest.render.assetPaths.overlay, { category: item.category, id: item.id });
}

/** Shop thumbnail for an item. */
export function resolveIcon(manifest: Manifest, item: ShopItem): string {
  return fill(manifest.render.assetPaths.icon, { id: item.id });
}

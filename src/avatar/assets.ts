// assets.ts — resolve (manifest + state + slot) into a web URL.
// The optimized art lives in public/avatar/ as .webp, mirroring the manifest's
// "assets/...png" sub-paths. We map "assets/foo/bar.png" -> "/avatar/foo/bar.webp".
import type { Manifest, AvatarState, ShopItem, SlotId, BodyTypeId, SkinToneId } from './types'
import { stageForLevel } from './progression'

const HOST = '/avatar/'

const fill = (pattern: string, tokens: Record<string, string>) =>
  pattern.replace(/\{(\w+)\}/g, (_, k) => tokens[k] ?? '')

/** Manifest asset path ("assets/...png") -> hosted webp URL ("/avatar/...webp"). */
function toUrl(assetPath: string): string {
  return HOST + assetPath.replace(/^assets\//, '').replace(/\.png$/i, '.webp')
}

export function findItem(manifest: Manifest, id: string): ShopItem | undefined {
  return manifest.shop.find((i) => i.id === id)
}

/** The hero body: equipped outfit (per body type) or the free level-up stage look. */
export function resolveBody(manifest: Manifest, state: AvatarState): string {
  const equippedOutfit = state.equipped.outfit
  if (equippedOutfit) {
    return toUrl(fill(manifest.render.assetPaths.outfit, { bodyType: state.bodyType, id: equippedOutfit }))
  }
  const stage = stageForLevel(manifest, state.level)
  return toUrl(fill(manifest.render.assetPaths.stage, { bodyType: state.bodyType, id: stage.id }))
}

/** A starter/creator base in a given body type + skin tone. */
export function resolveBase(manifest: Manifest, bodyType: BodyTypeId, skinTone: SkinToneId): string {
  return toUrl(fill(manifest.render.assetPaths.base, { bodyType, skinTone }))
}

/** Any equipped overlay slot -> its art URL (handles body-variant emotes too). */
export function resolveSlot(manifest: Manifest, state: AvatarState, slot: SlotId): string | null {
  if (slot === 'base') return resolveBody(manifest, state)
  const id = state.equipped[slot]
  if (!id) return null
  const item = findItem(manifest, id)
  if (!item) return null
  if (item.bodyVariant) {
    return toUrl(fill(manifest.render.assetPaths.outfit, { bodyType: state.bodyType, id: item.id }))
  }
  return toUrl(fill(manifest.render.assetPaths.overlay, { category: item.category, id: item.id }))
}

/** Shop thumbnail for an item. */
export function resolveIcon(manifest: Manifest, item: ShopItem): string {
  return toUrl(fill(manifest.render.assetPaths.icon, { id: item.id }))
}

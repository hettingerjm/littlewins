// assets.ts — resolve (manifest + state + slot) into a web URL.
// The optimized art lives in public/avatar/ as .webp, mirroring the manifest's
// "assets/...png" sub-paths. We map "assets/foo/bar.png" -> "/avatar/foo/bar.webp".
import type { Manifest, AvatarState, ShopItem, SlotId, BodyTypeId, SkinToneId } from './types'

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

/**
 * Per-body-type art for a body-variant item. Outfits live under
 * outfits/{bodyType}/, while emotes live under avatars/{bodyType}/ (the same
 * folder as the bodies), so route by category.
 */
function resolveBodyVariantArt(manifest: Manifest, bodyType: BodyTypeId, item: ShopItem): string {
  const pattern =
    item.category === 'emote' ? manifest.render.assetPaths.stage : manifest.render.assetPaths.outfit
  return toUrl(fill(pattern, { bodyType, id: item.id }))
}

/** The hero body: equipped outfit (per body type) or the skin-toned base look. */
export function resolveBody(manifest: Manifest, state: AvatarState): string {
  const equippedOutfit = state.equipped.outfit
  if (equippedOutfit) {
    return toUrl(fill(manifest.render.assetPaths.outfit, { bodyType: state.bodyType, id: equippedOutfit }))
  }
  // No outfit: show the chosen body type + skin tone (the level-up "stage" art
  // only exists in one skin tone, so skin tone selection is honored here).
  return resolveBase(manifest, state.bodyType, state.skinTone)
}

/** A base body in a given body type + skin tone. */
export function resolveBase(manifest: Manifest, bodyType: BodyTypeId, skinTone: SkinToneId): string {
  return toUrl(fill(manifest.render.assetPaths.base, { bodyType, skinTone }))
}

/** Any equipped overlay slot -> its art URL (handles body-variant items too). */
export function resolveSlot(manifest: Manifest, state: AvatarState, slot: SlotId): string | null {
  if (slot === 'base') return resolveBody(manifest, state)
  const id = state.equipped[slot]
  if (!id) return null
  const item = findItem(manifest, id)
  if (!item) return null
  if (item.bodyVariant) {
    return resolveBodyVariantArt(manifest, state.bodyType, item)
  }
  return toUrl(fill(manifest.render.assetPaths.overlay, { category: item.category, id: item.id }))
}

/** Shop thumbnail. Body-variant items show the correct gender's art. */
export function resolveIcon(manifest: Manifest, item: ShopItem, bodyType: BodyTypeId): string {
  if (item.bodyVariant) {
    return resolveBodyVariantArt(manifest, bodyType, item)
  }
  return toUrl(fill(manifest.render.assetPaths.icon, { id: item.id }))
}

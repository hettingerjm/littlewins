// avatar.ts — types that mirror manifest/avatar-manifest.json (v2)
// Stack-flexible: works in React, React Native, or plain TS.

export type CurrencyId = "xp" | "coins";
export type RarityId = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";
export type SlotId =
  | "base" | "outfit" | "background" | "aura"
  | "weapon" | "headgear" | "pet" | "frame" | "emote";
export type ItemCategory = Exclude<SlotId, "base">;
export type ChoreSize = "small" | "medium" | "large" | "boss";
export type BodyTypeId = "male" | "female";
export type SkinToneId = "fair" | "warm" | "tan" | "deep";

export interface LevelRow { level: number; xpToNext: number; totalXpAtLevel: number; }

export interface Stage {
  id: string; name: string; levelMin: number; levelMax: number;
  gear: string; blurb: string;
}
export interface Rarity { id: RarityId; name: string; color: string; glow: boolean; }
export interface BodyType { id: BodyTypeId; name: string; desc: string; }
export interface SkinTone { id: SkinToneId; name: string; desc: string; }

export interface ShopItem {
  id: string; name: string; category: ItemCategory; rarity: RarityId;
  price: number; levelReq: number; bodyVariant: boolean; setId?: string; desc: string;
}
export interface ItemSet {
  id: string; name: string; pieces: string[]; bonus: { type: string; note: string };
}

export interface RenderSlot {
  id: SlotId; mode: "fullSkin" | "overlay"; z: number; anchor: string; bodyVariant: boolean;
}
export interface Manifest {
  meta: {
    version: string; title: string; style: string;
    currencies: Record<CurrencyId, string>;
    levelCap: number; xpCurve: string; notes: string;
  };
  defaults: {
    startingCoins: number; startingLevel: number;
    startingBodyType: BodyTypeId; startingSkinTone: SkinToneId;
  };
  bodyTypes: BodyType[];
  skinTones: SkinTone[];
  economy: {
    choreRewards: Record<ChoreSize, { xp: number; coins: number }>;
    streak: { multiplierPerDay: number; maxMultiplier: number; shieldsPerWeek: number };
  };
  levels: LevelRow[];
  stages: Stage[];
  rarities: Rarity[];
  render: {
    canvas: { width: number; height: number };
    assetPaths: { stage: string; base: string; outfit: string; overlay: string; icon: string };
    slots: RenderSlot[];
    anchors: Record<string, { x: number; y: number }>;
  };
  shop: ShopItem[];
  sets: ItemSet[];
}

// The per-kid save state the app persists.
export interface AvatarState {
  name: string;
  bodyType: BodyTypeId;
  skinTone: SkinToneId;
  level: number;
  totalXp: number;
  coins: number;
  equipped: Partial<Record<SlotId, string>>; // slot -> item id
  owned: string[];
  streakDays: number;
  shieldsLeft: number;
}

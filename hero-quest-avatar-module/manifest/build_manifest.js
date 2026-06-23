/**
 * build_manifest.js  (v2 — two body types + skin tones)
 * Emits BOTH:
 *   - manifest/avatar-manifest.json        (the app's source of truth)
 *   - manifest/generation-prompts.json     (reproducible Higgsfield recipe)
 * so data + art recipe never drift apart.
 * Run: node manifest/build_manifest.js
 */
const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// STYLE (research-backed): stylized cel-shaded 3D, widest 8-15 appeal.
// ---------------------------------------------------------------------------
const STYLE =
  "Stylized cel-shaded 3D art, Fortnite-meets-Zelda-Wind-Waker, bold readable shapes, " +
  "vibrant saturated colors, soft studio lighting, heroic slightly-stylized proportions " +
  "(NOT overly chibi, not babyish), modest clothing, wholesome and age-appropriate for kids 8-15, " +
  "non-violent cartoon fantasy, clean silhouette, collectible game-art look.";
const NEGATIVE = "no gore, no realistic weapons, no scary or dark imagery, no sexualization, no brand logos";

// ---------------------------------------------------------------------------
// BODY TYPES + SKIN TONES  (the inclusive customization axes)
// ---------------------------------------------------------------------------
const bodyTypes = [
  { id: "male",   name: "Hero",    desc: "a boy hero with short tidy hair" },
  { id: "female", name: "Heroine", desc: "a girl hero with a ponytail" },
];
const skinTones = [
  { id: "fair", name: "Fair", desc: "fair skin tone" },
  { id: "warm", name: "Warm", desc: "warm medium skin tone" },
  { id: "tan",  name: "Tan",  desc: "tan/olive skin tone" },
  { id: "deep", name: "Deep", desc: "deep skin tone" },
];

// ---------------------------------------------------------------------------
// PROGRESSION CURVE  (tunable) — fast early, meaningful later.
// ---------------------------------------------------------------------------
const LEVEL_CAP = 50;
const xpToNext = (L) => Math.round(80 * Math.pow(L, 1.45));
const levels = [];
let cumulative = 0;
for (let L = 1; L <= LEVEL_CAP; L++) {
  const need = L < LEVEL_CAP ? xpToNext(L) : 0;
  levels.push({ level: L, xpToNext: need, totalXpAtLevel: cumulative });
  cumulative += need;
}

// ---------------------------------------------------------------------------
// EVOLUTION STAGES  (free, guaranteed look upgrades). gear = prompt descriptor.
// ---------------------------------------------------------------------------
const stages = [
  { id: "stage1_rookie",     name: "Rookie",     levelMin: 1,  levelMax: 4,  gear: "plain tan tunic, tiny wooden stick, small and eager",                        blurb: "Just starting the journey." },
  { id: "stage2_apprentice", name: "Apprentice", levelMin: 5,  levelMax: 9,  gear: "leather vest, short cloth cape, wooden shortsword",                          blurb: "Earned your first gear." },
  { id: "stage3_adventurer", name: "Adventurer", levelMin: 10, levelMax: 19, gear: "light steel chest armor, blue cloak, glowing toy-like sword, confident",      blurb: "A real hero now." },
  { id: "stage4_champion",   name: "Champion",   levelMin: 20, levelMax: 34, gear: "ornate golden armor, flowing red cape, bright magic sword, heroic stance",    blurb: "Undeniable power." },
  { id: "stage5_legend",     name: "Legend",     levelMin: 35, levelMax: 49, gear: "glowing radiant armor, energy aura, small angelic wings, magic blade, majestic", blurb: "Glowing armor and wings." },
  { id: "stage6_ascended",   name: "Ascended",   levelMin: 50, levelMax: 50, gear: "maxed-out radiant legendary form, brilliant halo of light, prismatic armor",  blurb: "Maxed out." },
];

// ---------------------------------------------------------------------------
const rarities = [
  { id: "common",    name: "Common",    color: "#9CA3AF", glow: false },
  { id: "uncommon",  name: "Uncommon",  color: "#22C55E", glow: false },
  { id: "rare",      name: "Rare",      color: "#3B82F6", glow: false },
  { id: "epic",      name: "Epic",      color: "#A855F7", glow: true  },
  { id: "legendary", name: "Legendary", color: "#F59E0B", glow: true  },
  { id: "mythic",    name: "Mythic",    color: "#EF4444", glow: true  },
];

// ---------------------------------------------------------------------------
const economy = {
  choreRewards: {
    small:  { xp: 10,  coins: 5  },
    medium: { xp: 25,  coins: 12 },
    large:  { xp: 50,  coins: 25 },
    boss:   { xp: 100, coins: 60 },
  },
  streak: { multiplierPerDay: 0.05, maxMultiplier: 0.50, shieldsPerWeek: 1 },
};

// ---------------------------------------------------------------------------
// RENDER  — slots + z-order + anchors. assetPaths drive path resolution.
//   bodyVariant slots (base/outfit) resolve a per-bodyType file.
//   overlay slots are shared across body types.
// ---------------------------------------------------------------------------
const render = {
  canvas: { width: 1024, height: 1024 },
  assetPaths: {
    stage:   "assets/avatars/{bodyType}/{id}.png",
    base:    "assets/avatars/{bodyType}/base_{skinTone}.png",
    outfit:  "assets/outfits/{bodyType}/{id}.png",
    overlay: "assets/{category}/{id}.png",
    icon:    "assets/icons/{id}.png",
  },
  slots: [
    { id: "base",       mode: "fullSkin", z: 0,  anchor: "center",     bodyVariant: true  },
    { id: "outfit",     mode: "fullSkin", z: 1,  anchor: "center",     bodyVariant: true  },
    { id: "background", mode: "overlay",  z: -1, anchor: "fullscreen", bodyVariant: false },
    { id: "aura",       mode: "overlay",  z: 2,  anchor: "center",     bodyVariant: false },
    { id: "weapon",     mode: "overlay",  z: 3,  anchor: "hand",       bodyVariant: false },
    { id: "headgear",   mode: "overlay",  z: 4,  anchor: "head",       bodyVariant: false },
    { id: "pet",        mode: "overlay",  z: 5,  anchor: "side",       bodyVariant: false },
    { id: "frame",      mode: "overlay",  z: 6,  anchor: "card",       bodyVariant: false },
    { id: "emote",      mode: "overlay",  z: 7,  anchor: "center",     bodyVariant: false },
  ],
  anchors: {
    center:     { x: 512, y: 512 },
    head:       { x: 512, y: 270 },
    hand:       { x: 700, y: 620 },
    side:       { x: 820, y: 760 },
    fullscreen: { x: 512, y: 512 },
    card:       { x: 512, y: 512 },
  },
};

// ---------------------------------------------------------------------------
// SHOP — items carry a prompt descriptor. bodyVariant=true => per-body render.
// ---------------------------------------------------------------------------
const shop = [
  // Outfits (full skins, per body type)
  { id: "outfit_ranger",    name: "Forest Ranger",  category: "outfit",   rarity: "uncommon",  price: 250,   levelReq: 5,  bodyVariant: true,  desc: "Forest Ranger: green hooded cloak, leather bracers" },
  { id: "outfit_knight",    name: "Royal Knight",   category: "outfit",   rarity: "rare",      price: 600,   levelReq: 10, bodyVariant: true,  desc: "Royal Knight: polished blue-and-silver plate armor, tabard" },
  { id: "outfit_mage",      name: "Star Mage",      category: "outfit",   rarity: "epic",      price: 1800,  levelReq: 15, bodyVariant: true,  setId: "cosmic", desc: "Star Mage: deep purple robe with star patterns" },
  { id: "outfit_dragon",    name: "Dragonlord",     category: "outfit",   rarity: "legendary", price: 6500,  levelReq: 25, bodyVariant: true,  desc: "Dragonlord: dark scaled armor with glowing red accents, small friendly shoulder spikes" },
  { id: "outfit_celestial", name: "Celestial Hero", category: "outfit",   rarity: "mythic",    price: 16000, levelReq: 40, bodyVariant: true,  setId: "cosmic", desc: "Celestial Hero: white-and-gold radiant armor, soft light wings" },
  // Headgear (overlay, shared)
  { id: "head_cap",    name: "Explorer Cap", category: "headgear", rarity: "common",    price: 80,   levelReq: 1,  bodyVariant: false, desc: "green explorer cap" },
  { id: "head_horns",  name: "Battle Horns", category: "headgear", rarity: "rare",      price: 450,  levelReq: 8,  bodyVariant: false, desc: "stylized cartoon battle-horns headband" },
  { id: "head_crown",  name: "Golden Crown", category: "headgear", rarity: "epic",      price: 2200, levelReq: 18, bodyVariant: false, desc: "golden jeweled crown" },
  { id: "head_halo",   name: "Star Halo",    category: "headgear", rarity: "legendary", price: 5500, levelReq: 30, bodyVariant: false, setId: "cosmic", desc: "glowing golden star halo ring" },
  // Weapons (overlay, held)
  { id: "wpn_bow",        name: "Oak Bow",      category: "weapon", rarity: "uncommon",  price: 200,  levelReq: 4,  bodyVariant: false, desc: "carved oak bow" },
  { id: "wpn_staff",      name: "Crystal Staff",category: "weapon", rarity: "rare",      price: 700,  levelReq: 12, bodyVariant: false, desc: "crystal-topped wizard staff, glowing" },
  { id: "wpn_flameblade", name: "Flame Blade",  category: "weapon", rarity: "epic",      price: 2400, levelReq: 20, bodyVariant: false, desc: "cartoon sword wreathed in friendly orange flames" },
  { id: "wpn_starsword",  name: "Starcaller",   category: "weapon", rarity: "legendary", price: 7000, levelReq: 32, bodyVariant: false, setId: "cosmic", desc: "glowing blue star-energy sword" },
  // Pets (overlay)
  { id: "pet_fox",     name: "Ember Fox",     category: "pet", rarity: "rare",      price: 800,  levelReq: 7,  bodyVariant: false, desc: "cute ember fox with glowing tail, sitting" },
  { id: "pet_owl",     name: "Snowy Owl",     category: "pet", rarity: "rare",      price: 800,  levelReq: 7,  bodyVariant: false, desc: "snowy owl with big friendly eyes" },
  { id: "pet_dragon",  name: "Baby Dragon",   category: "pet", rarity: "epic",      price: 2600, levelReq: 16, bodyVariant: false, desc: "chubby friendly baby dragon" },
  { id: "pet_phoenix", name: "Phoenix Chick", category: "pet", rarity: "legendary", price: 8000, levelReq: 28, bodyVariant: false, desc: "glowing phoenix chick with soft fire feathers" },
  // Auras (overlay)
  { id: "aura_sparkle", name: "Sparkle Aura", category: "aura", rarity: "uncommon", price: 300,   levelReq: 6,  bodyVariant: false, desc: "ring of gold sparkles, no character" },
  { id: "aura_flame",   name: "Flame Aura",   category: "aura", rarity: "epic",     price: 2000,  levelReq: 14, bodyVariant: false, desc: "friendly orange flame aura ring, no character" },
  { id: "aura_cosmic",  name: "Cosmic Aura",  category: "aura", rarity: "mythic",   price: 15000, levelReq: 38, bodyVariant: false, setId: "cosmic", desc: "swirling purple-and-blue cosmic energy ring with stars, no character" },
  // Backgrounds (overlay, behind)
  { id: "bg_meadow", name: "Sunny Meadow", category: "background", rarity: "common", price: 120,  levelReq: 1,  bodyVariant: false, desc: "sunny green meadow with flowers and blue sky, scene only no character" },
  { id: "bg_castle", name: "Castle Hall",  category: "background", rarity: "rare",   price: 500,  levelReq: 9,  bodyVariant: false, desc: "warm stone castle great hall with banners, scene only no character" },
  { id: "bg_galaxy", name: "Galaxy",       category: "background", rarity: "epic",   price: 2200, levelReq: 17, bodyVariant: false, setId: "cosmic", desc: "vibrant galaxy with nebula and stars, scene only no character" },
  // Frames (overlay, UI)
  { id: "frame_bronze", name: "Bronze Frame", category: "frame", rarity: "common",    price: 100,  levelReq: 1,  bodyVariant: false, desc: "square UI card frame, bronze rounded border, empty transparent center" },
  { id: "frame_silver", name: "Silver Frame", category: "frame", rarity: "rare",      price: 600,  levelReq: 10, bodyVariant: false, desc: "square UI card frame, polished silver ornate border, empty transparent center" },
  { id: "frame_gold",   name: "Gold Frame",   category: "frame", rarity: "legendary", price: 6000, levelReq: 26, bodyVariant: false, desc: "square UI card frame, glowing gold ornate border with small gems, empty transparent center" },
  // Emotes (overlay, per body type since it's the hero posing)
  { id: "emote_cheer", name: "Victory Cheer", category: "emote", rarity: "uncommon", price: 350, levelReq: 5,  bodyVariant: true, desc: "happy two-arms-up victory cheer pose" },
  { id: "emote_flex",  name: "Power Flex",    category: "emote", rarity: "rare",     price: 750, levelReq: 13, bodyVariant: true, desc: "confident strong flex pose" },
];

const sets = [
  { id: "cosmic", name: "Cosmic Set",
    pieces: ["outfit_mage", "head_halo", "wpn_starsword", "aura_cosmic", "bg_galaxy", "outfit_celestial"],
    bonus: { type: "aura", note: "Unlocks an exclusive animated 'Cosmic Champion' nameplate + 10% coin bonus." } },
];

const defaults = {
  startingCoins: 100,
  startingLevel: 1,
  startingBodyType: "male",
  startingSkinTone: "warm",
};

// ---------------------------------------------------------------------------
// MANIFEST
// ---------------------------------------------------------------------------
const manifest = {
  meta: {
    version: "2.0.0",
    title: "Hero Quest Avatar Module",
    style: "Stylized cel-shaded 3D (Fortnite / Wind Waker lane)",
    currencies: { xp: "XP", coins: "Coins" },
    levelCap: LEVEL_CAP,
    xpCurve: "round(80 * level^1.45)",
    notes: "Cosmetic-only economy. No real money. Coins are earned by completing real chores.",
  },
  defaults, bodyTypes, skinTones, economy, levels, stages, rarities, render, shop, sets,
};

fs.writeFileSync(path.join(__dirname, "avatar-manifest.json"), JSON.stringify(manifest, null, 2));

// ---------------------------------------------------------------------------
// GENERATION PROMPTS  (every asset, both body types where relevant)
// ---------------------------------------------------------------------------
const p = (s) => `${STYLE} ${s}`;
const gp = {
  _readme: "Reproducible art recipe. Generate each body type's base_warm FIRST as the master; pass its media_id as `reference` for that body type's stages, skin-tone bases, outfits, and emotes so the character stays consistent. Overlays (headgear/weapon/pet/aura/background/frame) are body-agnostic; run each through Higgsfield autosprite (remove_bg=ultra) for transparent PNGs.",
  style: { token: STYLE, negative: NEGATIVE, defaultModel: "nano_banana_pro", consistencyModel: "nano_banana_2", spriteTool: "autosprite (remove_bg=ultra)",
    altStyles: { pixel: "16-bit pixel-art RPG sprite, crisp pixels, limited palette", anime: "clean cel-shaded anime, bright flat colors, bold outlines", claymation: "soft clay/3D toy look, rounded matte surfaces" } },
  sheets: {
    evolution_male:   { model: "nano_banana_pro", aspect_ratio: "16:9", resolution: "2k", prompt: p("Progression sheet: the SAME boy hero shown 5x left-to-right leveling up Rookie->Legend, labeled, full-body, soft gradient background.") },
    evolution_female: { model: "nano_banana_pro", aspect_ratio: "16:9", resolution: "2k", prompt: p("Progression sheet: the SAME girl hero (ponytail) shown 5x left-to-right leveling up Rookie->Legend, labeled, full-body, soft gradient background.") },
    outfits_showcase: { model: "nano_banana_pro", aspect_ratio: "16:9", resolution: "2k", prompt: p("Outfit showcase: top row boy hero, bottom row girl hero, each in the 5 outfits (Ranger, Knight, Mage, Dragonlord, Celestial), labeled.") },
    base_lineup:      { model: "nano_banana_pro", aspect_ratio: "16:9", resolution: "2k", prompt: p("Avatar-creator lineup: top row boy hero, bottom row girl hero, each in 4 skin tones (Fair, Warm, Tan, Deep), plain clothing, identical neutral pose.") },
    shop_items:       { model: "nano_banana_pro", aspect_ratio: "1:1",  resolution: "2k", prompt: p("4x4 icon grid of shop items (caps, crown, halo, horns, bow, staff, flame sword, star sword, fox, dragon, owl, phoenix, sparkle aura, flame aura, galaxy, gold frame) on soft neutral tiles.") },
  },
  avatars: {},
  items: {},
};

// Per body type: master base, skin-tone bases, evolution stages
for (const b of bodyTypes) {
  const masterId = `${b.id}/base_warm`;
  gp.avatars[masterId] = { model: "nano_banana_pro", aspect_ratio: "1:1", resolution: "2k", removeBackground: true,
    prompt: p(`Full-body neutral starter hero: ${b.desc}, ${skinTones.find(s=>s.id==="warm").desc}, plain undershirt and simple pants, no gear, neutral friendly expression, centered, transparent background. THIS IS THE MASTER for body type '${b.id}' — reuse as reference for all '${b.id}' assets.`) };
  for (const s of skinTones) {
    if (s.id === "warm") continue;
    gp.avatars[`${b.id}/base_${s.id}`] = { reference: masterId, removeBackground: true,
      prompt: p(`Same hero as reference (${b.desc}), ${s.desc} variant, plain clothing, transparent background.`) };
  }
  for (const st of stages) {
    gp.avatars[`${b.id}/${st.id}`] = { reference: masterId, removeBackground: true,
      prompt: p(`Same hero as reference (${b.desc}), ${st.name.toUpperCase()}: ${st.gear}, full-body, transparent background.`) };
  }
}

// Items: outfits/emotes per body type (reference that body's master); overlays shared
for (const it of shop) {
  if (it.bodyVariant) {
    for (const b of bodyTypes) {
      gp.items[`${b.id}/${it.id}`] = { reference: `${b.id}/base_warm`, removeBackground: true,
        prompt: p(`Same hero as reference (${b.desc}) ${it.category === "emote" ? "doing a " + it.desc : "wearing " + it.desc}, full-body, transparent background.`) };
    }
  } else {
    gp.items[it.id] = { removeBackground: it.category !== "background",
      aspect_ratio: it.category === "background" ? "1:1" : undefined,
      prompt: p(`Single ${it.category} item: ${it.desc}${it.category === "background" ? "" : ", transparent background, centered"}.`) };
  }
}

fs.writeFileSync(path.join(__dirname, "generation-prompts.json"), JSON.stringify(gp, null, 2));

console.log("Levels:", levels.length, "| Shop items:", shop.length, "| Stages:", stages.length, "| Body types:", bodyTypes.length);
console.log("Total XP to cap:", cumulative);
console.log("Avatar prompts:", Object.keys(gp.avatars).length, "| Item prompts:", Object.keys(gp.items).length);
const indiv = Object.keys(gp.avatars).length + Object.keys(gp.items).length;
console.log("Individual game-ready assets to generate:", indiv, "(+", Object.keys(gp.sheets).length, "reference sheets)");

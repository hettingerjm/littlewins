# Hero Quest — Avatar Module Design

A level-up avatar layer for a kids' chores app (ages 8–15). Kids do real chores → their
hero **levels up, gets stronger, unlocks cooler gear**, and earns coins to **shop** for
cosmetics. Designed to be genuinely motivating *without* dark patterns.

---

## 1. The core loop
Do a chore → earn **XP + Coins** → XP fills the bar → bar fills → **level up** (often a
visible gear/power upgrade) → at milestones the hero **transforms** → spend Coins in the
**Shop** to personalize → chase **rarities** and complete **sets**. Repeat.

Every chore should produce a small, visible payoff in under a second (bar nudges, coins
tick up, occasional confetti). Big payoffs (transformations, new shop tiers) are spaced
out to stay aspirational.

## 2. Two currencies (deliberate split)
- **XP → Levels.** Cannot be spent. Pure, guaranteed progress. Leveling *always* improves
  the hero's free "stage" look, so a kid who never shops still visibly grows stronger.
- **Coins → Shop.** Spendable. The *expression* layer — outfits, pets, auras, frames.
  Cosmetic only. **No real money, ever** — coins are earned by doing real chores.

This separation removes the "should I level or buy?" confusion and makes both rewarding.

## 3. Progression curve
`xpToNext(level) = round(80 × level^1.45)` — fast early, meaningful later (tunable).

| Milestone | Reaches | ~Days @ 250 XP/day | Feel |
|-----------|---------|--------------------|------|
| Lv 5  → **Apprentice** | 1,289 XP | ~5 days  | First transformation in week 1 |
| Lv 10 → **Adventurer** | 8,099 XP | ~1 month | Strong monthly goal |
| Lv 20 → **Champion**   | 47,240 XP | a few months | Long-term |
| Lv 35 → **Legend**     | 191,214 XP | months | Aspirational |
| Lv 50 → **Ascended**   | 463,101 XP | the grind | Prestige cap |

## 4. Evolution stages (free, guaranteed)
Six looks the hero grows into automatically as it levels — the power fantasy, no purchase
required: **Rookie → Apprentice → Adventurer → Champion → Legend → Ascended.** Each adds
visible gear (stick → sword → armor → cape → aura → wings).

## 5. The Shop (earned, cosmetic, mix-and-match)
Eight item categories. Two render modes keep AI-generated art feasible:

- **Full-skin** (`outfit`): a complete body render that swaps the whole hero.
- **Overlay** (`headgear, weapon, pet, aura, background, frame, emote`): transparent PNGs
  stacked on the hero at named anchor points — so kids can freely combine them.

**Rarity ladder** (color language kids already know):
Common · Uncommon · Rare · Epic · Legendary · Mythic. Higher rarity = higher price + a
level gate, so the best gear is *earned*, not bought on day one.

**Price ladder** (coins): Common 80–150 · Rare 300–800 · Epic 1,800–2,600 ·
Legendary 5,500–8,000 · Mythic 15,000+. At ~125 coins/day that's "a few days" for a Rare
up to "a long-term flex" for a Mythic.

**Sets** (e.g. the *Cosmic Set*): collect all pieces for a bonus nameplate + coin boost —
drives completion.

## 6. Engagement levers (ethical by design)
- **Visible micro-progress** on every chore.
- **Milestone transformations** as the big "wow" moments.
- **Rarity + sets** for aspiration and collecting.
- **Forgiving streaks**: +5%/day coin bonus (caps at +50%); **one missed day is shielded**
  so a slip doesn't punish. Teaches consistency, not anxiety.
- **Identity/ownership**: name the hero, pick a **body type** (Hero / Heroine) and one of
  **4 inclusive skin tones** (Fair, Warm, Tan, Deep) in an avatar-creator screen. The chosen
  body type carries through every stage and outfit so the hero always looks like *theirs*.
- **Family layer (optional)**: a shared family board / co-op quest. Frame it as each kid's
  *personal best* + a shared goal, not a ranked leaderboard, so no one is demotivated.

### Lines we don't cross (parent-built app)
- No real-money purchases or loot boxes you pay for.
- No daily-login bait — rewards come from *finishing chores*, not opening the app.
- No FOMO countdown timers that punish.
- All art wholesome, modest, non-violent cartoon-fantasy, age-appropriate.

## 7. Asset architecture
Style: **stylized cel-shaded 3D** (Fortnite / Wind Waker lane — chosen for the widest 8–15
appeal). Two **body types** (male/female) and four skin tones.

- `assets/avatars/{male|female}/` — 4 skin-tone bases + 6 evolution stages per body type.
- `assets/outfits/{male|female}/` — outfit skins, rendered per body type.
- `assets/{headgear,weapon,pet,aura,background,frame}/` — body-agnostic overlays (shared).
- `assets/icons/` — shop thumbnails (shared).

Paths are resolved from `render.assetPaths` in the manifest by `engine/assets.ts`, so the
UI never hardcodes a folder. **55 individual assets** total; every one has a prompt in
`manifest/generation-prompts.json`. Generate each body type's `base_warm` first and reuse
it as the reference so the hero stays consistent across all its gear and stages.

## 8. What ships in this package
- `README.md` — quickstart + status.
- `manifest/avatar-manifest.json` — levels, stages, rarities, economy, render slots, full shop.
- `manifest/generation-prompts.json` — exact Higgsfield prompt for every asset.
- `manifest/build_manifest.js` — regenerates the manifest; tune numbers here.
- `manifest/MEDIA_JOBS.json` — every asset → its Higgsfield job IDs (`gen` + transparent `clean`).
- `download_assets.sh` — one command: pulls all 55 assets into `assets/` + fills the 28 icons.
- `GENERATE.md` — how to (re)generate art from the recipe. `FINISHING.md` — the asset handoff (alpha, icons, animation).
- `types/avatar.ts` — TypeScript contract.
- `engine/progression.ts`, `engine/economy.ts`, `engine/assets.ts` — pure, testable logic.
- `engine/README.md` — 5-step integration guide.
- `examples/AvatarCard.tsx` — reference render component.

## 9. Asset status
All **55 assets are generated** (both body types, consistent hero across stages/outfits) and
the **52 non-background assets are background-removed** (transparent). They live on Higgsfield;
run `download_assets.sh` to file them locally. Job IDs are in `manifest/MEDIA_JOBS.json`.

## 10. Animation (important)
Do **not** autosprite the character bodies for idle — accessories are pinned to fixed
anchors on a static body, so per-frame body motion detaches them. Animate instead via a
code-driven idle on the whole composed stack (body + gear move together) plus event juice
(level-up bounce, purchase sparkle); autosprite only independent effects (auras, pets).
Skeletal rigging (Spine/Rive) is the upgrade path for true animated gear. See `FINISHING.md` §4.

## 11. Tuning knobs (one place each)
- XP curve / level cap → `build_manifest.js` (`xpToNext`, `LEVEL_CAP`).
- Chore payouts & streaks → `economy` block in `build_manifest.js`.
- Prices / rarity / level gates → `shop` array.
- Art style → `style.token` in `generation-prompts.json` (pixel/anime/claymation presets included).

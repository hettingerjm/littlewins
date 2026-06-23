# Avatar Module — Integration Guide (for Claude Code)

This module is **data-first**: `manifest/avatar-manifest.json` is the single source of
truth. The TS in `engine/` and `types/` is framework-agnostic. The art is reproducible
from `manifest/generation-prompts.json`.

## Wire-up in 5 steps

1. **Drop in the files.** Copy `manifest/`, `types/`, `engine/` into your project.
   Host `assets/` somewhere your app can load images from.

2. **Persist per-kid state.** Store an `AvatarState` (see `types/avatar.ts`) for each
   child alongside their existing profile. Initialize from `manifest.defaults`.

3. **Hook chores → rewards.** Your chores app already knows when a chore is completed.
   Tag each chore with a size (`small | medium | large | boss`) and call:
   ```ts
   import manifest from "./manifest/avatar-manifest.json";
   import { completeChore } from "./engine/economy";
   const { state, gained, milestones } = completeChore(manifest, prevState, chore.size);
   // persist `state`; if milestones.leveledUp / stageChanged -> play a celebration
   ```

4. **Render the avatar.** Use `examples/AvatarCard.tsx` as a starting point. It composes
   `base/outfit + overlays (background, aura, weapon, headgear, pet, frame)` by z-order.

5. **Build the shop screen.** List `manifest.shop`, color by `manifest.rarities`, gate by
   `levelReq`, and on tap call `purchase(manifest, state, itemId)` then `equip(...)`.

## Generating the art (Higgsfield)

- Generate `base_default` FIRST (master character).
- Pass its `media_id` as the `reference` for every avatar/outfit prompt so the character
  stays consistent as it "levels up."
- For overlays (headgear, weapon, pet, aura, frame) generate the item, then run
  **`autosprite` (remove_bg=ultra)** to get a transparent, anchored, game-ready PNG.
- Want a different look? Swap `style.token` for one of `style.altStyles` (pixel / anime /
  claymation) and regenerate — the manifest and code don't change.

## Design principles baked in (don't break these)
- **Cosmetic-only, earned-only.** No real-money purchases. Coins come from real chores.
- **XP ≠ Coins.** XP guarantees free look upgrades (fair progress); coins are for flex.
- **Forgiving streaks.** One missed day is shielded — consistency, not anxiety.
- **No engagement-bait.** Rewards are tied to finishing chores, never to opening the app.

See `DESIGN.md` for the full rationale, economy tables, and tuning knobs.

# Finishing the assets (handoff for Claude Code)

All 55 assets are generated on Higgsfield. `manifest/MEDIA_JOBS.json` maps every
`asset_path` to its job IDs. From here it's scriptable — no manual clicking.

## 1. Fetch + file
For each entry, download the result of `clean` (if present) else `gen`, and save it to
the `path` key. Filenames already match the manifest, so the app renders immediately.

## 2. Transparency (alpha)
- **Overlays** (headgear, weapon, pet, aura, frame): already cleaned — use `clean`.
- **Backgrounds**: stay opaque (`opaque: true`) — use `gen`.
- **Characters** (bases, stages, outfits, emotes): DONE — transparent versions exist;
  use each entry's `clean` id. All 52 non-background assets now have a `clean` (alpha) job.

## 3. Icons (skip 28 generations)
The manifest expects `assets/icons/{id}.png` thumbnails. Cheapest path: point the icon at
the full-res asset, downscaled in the UI. Only generate dedicated crops if you want tight
item close-ups.

## 4. Animation — IMPORTANT: do NOT autosprite the bodies

The avatar uses **fixed anchor points** (headgear→head pixel, weapon→hand pixel) on a
**static** body. If you autosprite a stage/outfit into an idle loop, the head/hands move
frame-to-frame but the pinned accessories stay put and **detach**. Per-frame sprite
animation and fixed-anchor overlays are incompatible.

**Recommended approach (cheap, keeps everything attached):**
1. **Code-driven idle on the composed stack.** Compose base + all overlays statically,
   then apply one gentle transform to the *whole group* (a subtle scale/translate sine, or
   a 2–4% breathing scale). Body + cap + sword move as one unit and stay connected. Zero credits.
   ```jsx
   // wrap the whole AvatarCard art layer:
   <div style={{ animation: "idle 3.2s ease-in-out infinite" }}>{/* base + overlays */}</div>
   // @keyframes idle { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-6px) scale(1.015)} }
   ```
2. **Event juice in code.** Level-up = bounce + confetti; purchase = sparkle; XP tick = bar fill.
3. **Autosprite ONLY independent effects** — `aura_*` (centered, nothing to attach) and
   optionally `pet_*` (sits beside the hero). These can be sprite sheets with no alignment risk.
   `autosprite(kind:"idle", remove_bg:"ultra")` on the effect's `gen` id, ~2 credits each.

**If you later want true per-frame character animation with attached gear:** that needs
**skeletal rigging** (Spine / Rive / DragonBones) with accessories bound to bones — a
separate pipeline, not autosprite. Out of scope for v2.

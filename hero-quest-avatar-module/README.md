# Hero Quest Avatar Module (v2)

A drop-in level-up avatar + shop layer for a kids' chores app (ages 8-15).
Two body types (Hero / Heroine), four skin tones, stylized cel-shaded 3D art.
All 55 assets generated on Higgsfield.

- **Plan:** `DESIGN.md`
- **Integration:** `engine/README.md`
- **Art batch recipe:** `manifest/generation-prompts.json` · **Asset finishing/handoff:** `FINISHING.md`
- **Generated asset job IDs:** `manifest/MEDIA_JOBS.json` (every asset -> Higgsfield gen/clean job)
- **Source of truth:** `manifest/avatar-manifest.json` (rebuild: `node manifest/build_manifest.js`)
- **Logic:** `engine/progression.ts`, `engine/economy.ts`, `engine/assets.ts`
- **Render:** `examples/AvatarCard.tsx`

## Quickstart — get the art into the folders
Run once locally (needs `curl`; works anywhere except this sandbox, which is CDN-blocked):
```
bash download_assets.sh
```
Downloads all 55 assets into `assets/` (transparent versions where made, backgrounds opaque)
and auto-populates the 28 shop icons. Then wire in per `engine/README.md`.

## Status
- ✅ Plan, economy, progression, types, engine, render component
- ✅ 55 assets generated (2 masters + 32 characters + 21 overlays)
- ✅ All 52 non-background assets background-removed (transparent `clean` IDs in MEDIA_JOBS.json)
- ▶️ Run `bash download_assets.sh` to pull all 55 assets + icons into place
- ⬜ Optional: code-driven idle (see FINISHING.md §4 — do NOT autosprite bodies); icon crops

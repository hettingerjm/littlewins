# Generating the art (batch guide)

The package ships with the full recipe in `manifest/generation-prompts.json`.
**55 individual game-ready assets** + 5 reference sheets. Suggested order:

1. **Masters (2):** `male/base_warm`, `female/base_warm`. Save each `media_id`.
2. **Per body type, using its master as `reference`:**
   - 3 skin-tone bases (fair/tan/deep)
   - 6 evolution stages (rookie → ascended)
   - 5 outfit skins + 2 emote poses
3. **Shared overlays (body-agnostic):** headgear (4), weapons (4), pets (4), auras (3),
   backgrounds (3), frames (3). Run each through Higgsfield **`autosprite` (remove_bg=ultra)**
   for clean transparent PNGs (backgrounds stay opaque).
4. Drop files into the matching `assets/...` folder. Each folder's `README.txt` lists the
   exact filenames it expects.

Filenames already match the manifest, so once the PNGs are in place the app renders them
with zero code changes.

### Want a different look?
Swap `style.token` in `generation-prompts.json` for one of `style.altStyles`
(pixel / anime / claymation) and regenerate — manifest and code don't change.

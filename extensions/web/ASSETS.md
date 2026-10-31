# Assets & Licenses

Robot-Game uses only open-source, permissively licensed assets. This file records every
third-party asset and tool and its license. Nothing copyrighted (e.g. commercial game
sprites, ripped music/MIDI/NSF) is shipped.

## Art / Tiles

### Tileset in use: Kenney "Sci-Fi RTS" (CC0)
- Source: https://kenney.nl/assets/sci-fi-rts
- License: Creative Commons CC0 1.0 Universal (public domain, no attribution required)
- Status: **in use.** The pack is unzipped under `public/assets/kenney/`. The game loads the
  XML sprite atlas `Spritesheet/scifiRTS_spritesheet.png` + `.xml` via Phaser `load.atlasXML`
  in `src/render/BootScene.ts`. The pack's own `License.txt` is kept alongside the art.
- Frame mapping: `src/render/textures.ts` (`KenneyFrame`) maps each render role to an atlas
  frame — floor/wall/door use `scifiTile_*` frames (wall and door are tinted in
  `WorldScene.tintForTile` so the three read distinctly from the same terrain set); the player
  and the three hostiles use distinct `scifiUnit_*` vehicle frames. 64px art is scaled to the
  32px grid at draw time.

### Placeholder art (generated fallback)
If the Kenney atlas fails to load, the game falls back to original tiles/sprites generated at
runtime in `src/render/textures.ts` via Phaser `Graphics.generateTexture` (plain colored 32×32
shapes for floor/wall/door/player/hostile). These placeholders are original and carry no
license restriction, keeping the game playable with no art files present.

#### Swapping in different art
1. Drop the new CC0 pack under `public/assets/kenney/` (or a sibling folder).
2. Point `loadKenneyAtlas` in `src/render/textures.ts` at the new sheet/atlas.
3. Update the `KenneyFrame` role→frame map (and tints) to the new frame names.
4. Record any additional packs used here.

## Audio
- Chiptune music and SFX are **generated at runtime** via the Web Audio API in `src/audio/`
  (original compositions, no copyrighted source), using a hand-rolled PSG voice set
  (`synth.ts`: square/pulse leads, triangle bass, noise percussion):
  - `theme.ts` — the **original** theme as note patterns, with calmer `EXPLORATION_THEME` and
    intenser `COMBAT_THEME` variants sharing one harmony so they cross-fade cleanly. Inspired
    by the *style* of late-1980s Sunsoft NES soundtracks only; **no** Blaster Master (or other
    commercial) audio, MIDI, or NSF data is included or referenced in code.
  - `sfx.ts` — generated 8-bit effects (move, hit, damage, defeat, pickup, level-up).
  - `AudioManager.ts` — resumes the context on first user gesture (autoplay policy), swaps
    music context on combat, persists separate music/SFX volume + mute, and no-ops gracefully
    when Web Audio is unavailable. See Requirement 14.

## Tools / Libraries
- Phaser 3 — MIT License — https://phaser.io
- Vite, TypeScript, Vitest, ESLint, Prettier — their respective OSS licenses (MIT/Apache).

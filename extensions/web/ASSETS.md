# Assets & Licenses

Robot-Game uses only open-source, permissively licensed assets. This file records every
third-party asset and tool and its license. Nothing copyrighted (e.g. commercial game
sprites, ripped music/MIDI/NSF) is shipped.

## Art / Tiles

### Custom "neon robot" art (original, in use)
All in-game art is **original**, authored for this project in the imadestuff.com neon-on-dark
robot style (palette: pink `#ff92d0`, blue `#8be9fd`, purple `#bd93f9`, green `#50fa7b`,
orange `#ffb86c`, dark `#0d0d1a`; see `art-library/ROBOT-CREATION-GUIDE.md` in the blog repo).
It carries no third-party license restriction.

- **Location:** `public/assets/art/` as individual SVGs, loaded via Phaser `load.svg` in
  `src/render/textures.ts` (`loadArt`). SVGs rasterize crisply at the requested size.
- **Player bots** (`art/players/`): four chassis — `dome`, `spindle`, `tread`, `barrel` —
  copied from the blog's robot SVG library (the same robots used across imadestuff.com).
  Shown on the pick-your-bot screen (`SelectBotScene`).
- **Enemies** (`art/enemies/`): five original hostile bots — `sentry`, `drone`, `program`,
  `crawler`, `hunter` — in an aggressive red/orange variant of the palette.
- **Tiles** (`art/tiles/`): 3 floors, 4 walls, 3 doors. Each room picks one floor/wall/door
  style deterministically (walls are uniform within a room). 64×64 SVGs.
- **Mineable junk** (`art/junk/`): 10 variants — scrap, circuit, cell, crystal, hull, bolts,
  gear, ore, plating, canister.
- **Items** (`art/items/`): mining laser, weapon upgrade, loot, heal station, recipe chip,
  **key card** (color-tinted access card), **ship component** (recovered system module),
  **install point** (the socket marker on an install room), and **projectile** (the ranged-fire
  bolt). The key card / component / install-point / projectile art was added for v3
  ("Restore the Ship").
- **Themed props** (`art/props/`): room-signature furniture (control stations, telescopes,
  viewports, server racks, reactor cores, bunks, docking clamps, comms antennas, cargo stacks)
  plus generic crate/console/tank/pipe art.
- **Regenerating:** the enemies, tiles, junk, and items are produced by
  `scripts/make_art.py` (run with Python; edit it to tweak the art). Player bots are copied
  from the blog's `robots/` partials.

### Placeholder art (generated fallback)
If an SVG fails to load, the game falls back to tiny original shapes generated at runtime in
`src/render/textures.ts` via Phaser `Graphics.generateTexture`, keeping the game playable with
no art files present.

## Audio
- Chiptune music and SFX are **generated at runtime** via the Web Audio API in `src/audio/`
  (original compositions, no copyrighted source), using a hand-rolled PSG voice set
  (`synth.ts`: square/pulse leads, triangle bass, noise percussion):
  - `theme.ts` — the **original** themes as note patterns: `EXPLORATION_THEME` and
    `COMBAT_THEME` share one harmony so they cross-fade cleanly, plus v3's `TITLE_THEME`,
    `BOSS_THEME`, and a distinct `MAJOR_BOSS_THEME` (all reuse the same hand-rolled
    bass/arp/lead voices). Inspired by the *style* of late-1980s Sunsoft NES soundtracks only;
    **no** Blaster Master (or other commercial) audio, MIDI, or NSF data is included or
    referenced in code.
  - `sfx.ts` — generated 8-bit effects (move, hit, damage, defeat, pickup, level-up, and v3's
    dash, ranged fire, telegraph tell, unlock, install, purchase, and boss-defeat).
  - `AudioManager.ts` — resumes the context on first user gesture (autoplay policy), swaps the
    music context between `title` / `exploration` / `combat` / `boss` / `majorBoss` with clean
    transitions, persists separate music/SFX volume + mute, and no-ops gracefully when Web Audio
    is unavailable. See Requirement 14.

## Tools / Libraries
- Phaser 3 — MIT License — https://phaser.io
- Vite, TypeScript, Vitest, ESLint, Prettier — their respective OSS licenses (MIT/Apache).

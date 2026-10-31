import './style.css';
import Phaser from 'phaser';
import { installDebugAgentHook } from './agent/debugHook';
import { BootScene } from './render/BootScene';
import { HudScene } from './render/HudScene';
import { WORLD_SCENE, WorldScene } from './render/WorldScene';

/**
 * Entry point. Boots the Phaser game with the Boot and World scenes. Boot generates the
 * placeholder textures (see ASSETS.md) and hands off to World, which draws the solved room
 * graph, moves the player on a tile grid through Core commands, and applies the scroll
 * transition and fog of war.
 */
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#06070d',
  width: 800,
  height: 600,
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, WorldScene, HudScene],
};

const game = new Phaser.Game(config);

// Dev-only debug handles so tooling and an external AI can reach the live game.
if (import.meta.env.DEV) {
  (window as unknown as { __PHASER_GAME__: Phaser.Game }).__PHASER_GAME__ = game;
  installDebugAgentHook(game, () => {
    const scene = game.scene.getScene(WORLD_SCENE) as WorldScene | null;
    return scene?.state ?? null;
  });
}

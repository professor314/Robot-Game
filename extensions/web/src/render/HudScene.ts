import Phaser from 'phaser';
import { Commands } from '../core/commands';
import { GameEvent } from '../core/events';
import { RECIPES } from '../data/recipes';
import { WorldScene } from './WorldScene';

/** Scene key for the HUD overlay. */
export const HUD_SCENE = 'Hud';

/** Max lines kept in the scrolling event log. */
const LOG_LINES = 6;

/** Which key activates each usable skill (mirrors the WorldScene keybinds). */
const SKILL_KEYS: Record<string, string> = {
  overclock: 'Q',
  repair: 'Z',
};

/** The controls shown in the on-screen controls box. */
const CONTROLS: [string, string][] = [
  ['Move', 'WASD / Arrows'],
  ['Attack', 'Space / F'],
  ['Dash', 'Shift'],
  ['Ranged', 'R'],
  ['Use repair cell', 'B'],
  ['Interact / install', 'E'],
  ['Overclock / Repair', 'Q / Z'],
  ['Inventory / Craft', 'I / C'],
  ['Map / Logs', 'T / L'],
  ['Vendor', 'V'],
  ['Save / Load / Mute', 'O / P / M'],
];

/**
 * A transparent overlay scene drawing the HUD on top of the world: integrity bar, stats, room
 * name, a scrolling event log, a persistent controls box (bottom-left), and a toggleable
 * inventory panel (I). It is driven by the Core event stream plus a per-frame stats read, so
 * all game rules stay in Core_Logic.
 */
export class HudScene extends Phaser.Scene {
  private world!: WorldScene;
  private barFill!: Phaser.GameObjects.Rectangle;
  private statusText!: Phaser.GameObjects.Text;
  private roomText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;
  private objectivePlate!: Phaser.GameObjects.Rectangle;
  private logText!: Phaser.GameObjects.Text;
  private controlsBox!: Phaser.GameObjects.Container;
  private inventoryBox!: Phaser.GameObjects.Container;
  private inventoryBg!: Phaser.GameObjects.Rectangle;
  private inventoryText!: Phaser.GameObjects.Text;
  private inventoryOpen = false;
  /** Scroll offset (px) and clip geometry for the inventory list. */
  private inventoryScroll = 0;
  private inventoryViewH = 320;
  private readonly INV_PAD_TOP = 26;
  private readonly INV_PAD_BOTTOM = 10;
  private craftBox!: Phaser.GameObjects.Container;
  private craftText!: Phaser.GameObjects.Text;
  private craftOpen = false;
  private readonly logLines: string[] = [];

  constructor() {
    super(HUD_SCENE);
  }

  init(data: { world: WorldScene }): void {
    this.world = data.world;
  }

  create(): void {
    const style = { fontFamily: 'monospace', fontSize: '14px', color: '#c8d0e0' };

    // Integrity bar + stats (top-left).
    this.add.text(10, 8, 'INTEGRITY', { ...style, fontSize: '11px', color: '#8892a6' });
    this.add.rectangle(10, 24, 180, 14, 0x20222e).setOrigin(0, 0);
    this.barFill = this.add.rectangle(11, 25, 178, 12, 0x3fd1c7).setOrigin(0, 0);
    this.statusText = this.add.text(10, 44, '', style);
    this.roomText = this.add.text(10, 64, '', { ...style, color: '#bdeaf6' });
    // Objective tracker (top-centre). Backed by a translucent plate and nudged down from the
    // very top edge so it stays fully visible in the fullscreen/embedded views (where the top
    // row of pixels can sit flush against the frame).
    this.objectivePlate = this.add.rectangle(this.scale.width / 2, 6, 520, 44, 0x0c0c16, 0.6)
      .setOrigin(0.5, 0)
      .setStrokeStyle(1, 0x2a2a4a);
    this.objectiveText = this.add.text(this.scale.width / 2, 14, '', {
      ...style,
      fontSize: '13px',
      color: '#ffe08a',
      align: 'center',
    }).setOrigin(0.5, 0);

    // Event log (anchored above the controls box, bottom-left).
    this.logText = this.add.text(10, 0, '', {
      ...style,
      fontSize: '12px',
      color: '#9aa4bd',
      lineSpacing: 2,
    });

    this.buildControlsBox();
    this.buildInventoryBox();
    this.buildCraftBox();

    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });

    // The HUD owns its own panels (inventory, crafting) and the number-key craft shortcuts.
    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (ev.code === 'KeyI') this.toggleInventory();
      else if (ev.code === 'KeyC') this.toggleCraft();
      else if (this.craftOpen && /^Digit[1-9]$/.test(ev.code)) {
        this.craftByIndex(Number(ev.code.slice(5)) - 1);
      }
    });

    this.world.state.events.on((e) => this.onGameEvent(e));
    this.refresh();
  }

  update(): void {
    this.refresh();
  }

  /** A boxed panel with a titled border. */
  private panel(w: number, h: number, title: string): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0);
    const bg = this.add.rectangle(0, 0, w, h, 0x0c0c16, 0.88).setOrigin(0, 0).setStrokeStyle(1, 0x44475a);
    const t = this.add.text(8, 6, title, {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#8be9fd',
    });
    c.add([bg, t]);
    return c;
  }

  /** Width of the on-screen controls box (wide enough for the longest key hint). */
  private static readonly CONTROLS_W = 230;

  private buildControlsBox(): void {
    const w = HudScene.CONTROLS_W;
    this.controlsBox = this.panel(w, 24 + CONTROLS.length * 16 + 8, 'CONTROLS');
    CONTROLS.forEach(([action, key], i) => {
      const y = 24 + i * 16;
      this.controlsBox.add(
        this.add.text(8, y, action, { fontFamily: 'monospace', fontSize: '11px', color: '#c8d0e0' }),
      );
      this.controlsBox.add(
        this.add.text(w - 8, y, key, {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#50fa7b',
        }).setOrigin(1, 0),
      );
    });
  }

  private static readonly INV_W = 280;

  private buildInventoryBox(): void {
    const w = HudScene.INV_W;
    this.inventoryBox = this.add.container(0, 0);
    this.inventoryBg = this.add
      .rectangle(0, 0, w, 360, 0x0c0c16, 0.9)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x44475a);
    const title = this.add.text(8, 6, 'INVENTORY  (I close · scroll / ↑↓)', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#8be9fd',
    });
    this.inventoryBox.add([this.inventoryBg, title]);
    this.inventoryBox.setVisible(false);

    // The scrolling list is a separate top-level text (not a container child), positioned in
    // absolute scene coords so a geometry mask can clip it to the panel's content area.
    this.inventoryText = this.add.text(10, this.INV_PAD_TOP, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#c8d0e0',
      lineSpacing: 3,
      wordWrap: { width: HudScene.INV_W - 24 },
    });
    this.inventoryText.setVisible(false);
    const maskShape = this.make.graphics({}, false);
    this.inventoryText.setMask(maskShape.createGeometryMask());
    this.inventoryMaskShape = maskShape;

    // Scrolling input (only while the inventory is open).
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      if (this.inventoryOpen) this.scrollInventory(dy > 0 ? 24 : -24);
    });
    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (!this.inventoryOpen) return;
      if (ev.code === 'ArrowDown') { ev.preventDefault(); this.scrollInventory(24); }
      else if (ev.code === 'ArrowUp') { ev.preventDefault(); this.scrollInventory(-24); }
    });
  }

  private inventoryMaskShape!: Phaser.GameObjects.Graphics;

  /** Scroll the inventory list by `delta` px, clamped to the content bounds. */
  private scrollInventory(delta: number): void {
    const maxScroll = Math.max(0, this.inventoryText.height - (this.inventoryViewH - this.INV_PAD_TOP - this.INV_PAD_BOTTOM));
    this.inventoryScroll = Phaser.Math.Clamp(this.inventoryScroll + delta, 0, maxScroll);
    this.positionInventoryText();
  }

  /** Place the list text at the current scroll offset, relative to the panel. */
  private positionInventoryText(): void {
    this.inventoryText.setY(this.inventoryBox.y + this.INV_PAD_TOP - this.inventoryScroll);
    this.inventoryText.setX(this.inventoryBox.x + 10);
  }

  private toggleInventory(): void {
    this.inventoryOpen = !this.inventoryOpen;
    this.inventoryBox.setVisible(this.inventoryOpen);
    this.inventoryText.setVisible(this.inventoryOpen);
    if (this.inventoryOpen) {
      this.inventoryScroll = 0;
      this.layoutInventory();
      this.refreshInventory();
    }
  }

  /** Size the inventory panel to the space above the controls box and refresh the clip mask. */
  private layoutInventory(): void {
    const controlsH = 24 + CONTROLS.length * 16 + 8;
    const top = 100;
    const bottom = this.scale.height - controlsH - 20; // keep clear of the controls box
    this.inventoryViewH = Math.max(160, bottom - top);
    this.inventoryBox.setPosition(10, top);
    this.inventoryBg.setSize(HudScene.INV_W, this.inventoryViewH);
    // Mask covers the content area (below the title, above the panel bottom).
    const mx = 10 + 2;
    const my = top + this.INV_PAD_TOP - 2;
    const mw = HudScene.INV_W - 4;
    const mh = this.inventoryViewH - this.INV_PAD_TOP - this.INV_PAD_BOTTOM;
    this.inventoryMaskShape.clear().fillStyle(0xffffff).fillRect(mx, my, mw, mh);
    this.positionInventoryText();
  }

  /** Render the inventory contents: gear, skills, professions, and salvaged materials. */
  private refreshInventory(): void {
    const prog = this.world.state.progression;
    const lines: string[] = [];
    lines.push(`Weapon: Mk.${prog.weaponLevel + 1}${this.world.state.rangedUnlocked ? ' (ranged)' : ''}`);
    lines.push(`Mining laser: ${this.world.state.miningLaserEquipped ? `Mk.${prog.miningLevel + 1}` : 'none'}`);
    lines.push(`Shielding: ${this.world.state.player.stats.shielding}   Credits: ${prog.credits}`);
    const cells = prog.countOf('repair cell');
    lines.push(`Repair cells: ${cells}  (press B to use)`);
    const keys = [...this.world.state.keys];
    lines.push(`Key cards: ${keys.length ? keys.join(', ') : 'none'}`);
    lines.push('');
    lines.push('Skills (press the key to use):');
    for (const s of prog.skills) {
      const key = SKILL_KEYS[s.id] ?? '?';
      const ready = s.remainingMs <= 0 ? 'ready' : `cooldown ${Math.ceil(s.remainingMs / 1000)}s`;
      lines.push(`  [${key}] ${s.name} — ${ready}`);
    }
    lines.push('');
    const unlocked = prog.professions.filter((p) => p.unlocked);
    if (unlocked.length > 0) {
      lines.push('Professions (automatic, passive):');
      for (const p of unlocked) lines.push(`  ${p.name} — ${p.description}`);
    } else {
      lines.push('Professions: locked');
      lines.push('  (auto-unlock at level 3 once a');
      lines.push('   weapon/chassis upgrade is installed)');
    }
    lines.push('');
    lines.push('Materials:');
    const entries = [...prog.inventory.entries()]
      .filter(([k, n]) => n > 0 && k !== 'repair cell')
      .sort();
    if (entries.length === 0) lines.push('  (none)');
    for (const [name, n] of entries) lines.push(`  ${name} ×${n}`);
    this.inventoryText.setText(lines.join('\n'));
    // Re-clamp scroll to the (possibly changed) content height and reposition.
    const maxScroll = Math.max(0, this.inventoryText.height - (this.inventoryViewH - this.INV_PAD_TOP - this.INV_PAD_BOTTOM));
    this.inventoryScroll = Phaser.Math.Clamp(this.inventoryScroll, 0, maxScroll);
    this.positionInventoryText();
  }

  private buildCraftBox(): void {
    this.craftBox = this.panel(320, 300, 'CRAFTING  (C to close · press number to craft)');
    this.craftText = this.add.text(10, 26, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#c8d0e0',
      lineSpacing: 4,
    });
    this.craftBox.add(this.craftText);
    this.craftBox.setVisible(false);
  }

  private toggleCraft(): void {
    this.craftOpen = !this.craftOpen;
    this.craftBox.setVisible(this.craftOpen);
    if (this.craftOpen) this.refreshCraft();
  }

  /** Known recipes shown in the craft panel, in a stable order. */
  private knownRecipeList() {
    const known = this.world.state.progression.knownRecipes;
    return RECIPES.filter((r) => known.has(r.id));
  }

  /** Render the crafting panel: known recipes, their cost, and whether they're affordable. */
  private refreshCraft(): void {
    const prog = this.world.state.progression;
    const list = this.knownRecipeList();
    const lines: string[] = [];
    if (list.length === 0) {
      lines.push('No recipes discovered yet.');
      lines.push('Find recipe chips in rooms.');
    }
    list.forEach((r, i) => {
      const cost = r.cost.map(([m, q]) => `${q} ${m}`).join(', ');
      const ok = prog.hasMaterials(r.cost) ? '' : '  [need materials]';
      lines.push(`${i + 1}. ${r.name}${ok}`);
      lines.push(`   ${r.description}`);
      lines.push(`   cost: ${cost}`);
    });
    this.craftText.setText(lines.join('\n'));
  }

  /** Craft the Nth known recipe (from a number-key press). */
  private craftByIndex(index: number): void {
    const list = this.knownRecipeList();
    const recipe = list[index];
    if (!recipe) return;
    this.world.state.apply(Commands.craft(recipe.id));
    this.refreshCraft();
  }

  /** Reposition viewport-anchored HUD elements. */
  private layout(): void {
    const h = this.scale.height;
    const controlsH = 24 + CONTROLS.length * 16 + 8;
    this.controlsBox.setPosition(10, h - controlsH - 10);
    // Log sits just above the controls box.
    this.logText.setY(h - controlsH - 10 - LOG_LINES * 16 - 12);
    // Inventory panel (left) and crafting panel (centered-ish).
    this.craftBox.setPosition(Math.max(260, this.scale.width / 2 - 160), 100);
    this.objectiveText.setX(this.scale.width / 2);
    this.objectivePlate.setX(this.scale.width / 2);
    // Keep the inventory panel fitted to the available height (and clear of controls).
    if (this.inventoryOpen) this.layoutInventory();
  }

  private refresh(): void {
    const p = this.world.state.player;
    const prog = this.world.state.progression;
    const frac = Math.max(0, p.stats.integrity / p.stats.maxIntegrity);
    this.barFill.width = 178 * frac;
    this.barFill.fillColor = frac > 0.5 ? 0x3fd1c7 : frac > 0.25 ? 0xe0b43f : 0xd8453f;

    const wpn = prog.weaponLevel > 0 ? `   WPN Mk.${prog.weaponLevel + 1}` : '';
    this.statusText.setText(
      `LV ${prog.level}   XP ${prog.totalXp}   CR ${prog.credits}${wpn}` +
        (p.defeated ? '   [OFFLINE]' : ''),
    );
    this.roomText.setText(this.world.state.currentRoom.key);
    this.objectiveText.setText(this.objectiveLine());
    // Keep the backing plate sized to the objective text (it grows for the 2-line form).
    this.objectivePlate.setSize(
      Math.max(300, this.objectiveText.width + 24),
      this.objectiveText.height + 12,
    );
    if (this.inventoryOpen) this.refreshInventory();
    if (this.craftOpen) this.refreshCraft();
  }

  /** The top-centre objective line reflecting restoration progress and the current goal. */
  private objectiveLine(): string {
    const story = this.world.state.story;
    const installed = story.installed.size;
    const total = this.world.state.missions.total;
    if (story.phase === 'finalBoss') return `SHIP RESTORED (${total}/${total}) — defeat the Station Core at the Docking Port`;
    if (story.phase === 'departed' || story.phase === 'freeRoam') return 'Ship restored. Free roam.';
    const next = this.world.state.missions.active()[0];
    const goal = next ? next.objective : '';
    return `RESTORE THE SHIP: ${installed}/${total} installed` + (goal ? `\n${goal}` : '');
  }

  private onGameEvent(e: GameEvent): void {
    switch (e.type) {
      case 'attacked':
        this.pushLog(`${this.shortId(e.attackerId)} hits ${this.shortId(e.targetId)} for ${e.damage}`);
        break;
      case 'defeated':
        this.pushLog(`${this.shortId(e.entityId)} defeated`);
        break;
      case 'reward':
        this.pushLog(`+${e.xp} XP, +${e.credits} CR`);
        break;
      case 'leveledUp':
        this.pushLog(`LEVEL UP → ${e.level}`);
        break;
      case 'respawned':
        this.pushLog(`${this.shortId(e.entityId)} back online`);
        break;
      case 'roomEntered':
        if (e.firstVisit) this.pushLog(`entered ${e.roomKey}`);
        break;
      case 'log':
        this.pushLog(e.message);
        break;
      default:
        break;
    }
  }

  /** Trim the "hostile:"/"patrol:" prefix / "player" id down to a readable label. */
  private shortId(id: string): string {
    if (id === 'player') return 'you';
    return id.replace(/^hostile:/, '').replace(/^patrol:.*$/, 'Patrol Drone');
  }

  private pushLog(line: string): void {
    this.logLines.push(line);
    while (this.logLines.length > LOG_LINES) this.logLines.shift();
    this.logText.setText(this.logLines.join('\n'));
  }
}

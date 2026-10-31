import Phaser from 'phaser';
import { Commands } from '../core/commands';
import { GameEvent } from '../core/events';
import { RECIPES } from '../data/recipes';
import { WorldScene } from './WorldScene';

/** Scene key for the HUD overlay. */
export const HUD_SCENE = 'Hud';

/** Max lines kept in the scrolling event log. */
const LOG_LINES = 6;

/** The controls shown in the on-screen controls box. */
const CONTROLS: [string, string][] = [
  ['Move', 'WASD / Arrows'],
  ['Attack', 'Space / F'],
  ['Dash', 'Shift'],
  ['Ranged', 'R'],
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
  private logText!: Phaser.GameObjects.Text;
  private controlsBox!: Phaser.GameObjects.Container;
  private inventoryBox!: Phaser.GameObjects.Container;
  private inventoryText!: Phaser.GameObjects.Text;
  private inventoryOpen = false;
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
    // Objective tracker (top-centre).
    this.objectiveText = this.add.text(this.scale.width / 2, 10, '', {
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

  private buildControlsBox(): void {
    this.controlsBox = this.panel(180, 24 + CONTROLS.length * 16 + 8, 'CONTROLS');
    CONTROLS.forEach(([action, key], i) => {
      const y = 24 + i * 16;
      this.controlsBox.add(
        this.add.text(8, y, action, { fontFamily: 'monospace', fontSize: '11px', color: '#c8d0e0' }),
      );
      this.controlsBox.add(
        this.add.text(172, y, key, {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#50fa7b',
        }).setOrigin(1, 0),
      );
    });
  }

  private buildInventoryBox(): void {
    this.inventoryBox = this.panel(260, 360, 'INVENTORY  (I to close)');
    this.inventoryText = this.add.text(10, 26, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#c8d0e0',
      lineSpacing: 3,
    });
    this.inventoryBox.add(this.inventoryText);
    this.inventoryBox.setVisible(false);
  }

  private toggleInventory(): void {
    this.inventoryOpen = !this.inventoryOpen;
    this.inventoryBox.setVisible(this.inventoryOpen);
    if (this.inventoryOpen) this.refreshInventory();
  }

  /** Render the inventory contents: gear, skills, professions, and salvaged materials. */
  private refreshInventory(): void {
    const prog = this.world.state.progression;
    const lines: string[] = [];
    lines.push(`Weapon: Mk.${prog.weaponLevel + 1}${this.world.state.rangedUnlocked ? ' (ranged)' : ''}`);
    lines.push(`Mining laser: ${this.world.state.miningLaserEquipped ? `Mk.${prog.miningLevel + 1}` : 'none'}`);
    lines.push(`Shielding: ${this.world.state.player.stats.shielding}   Credits: ${prog.credits}`);
    const keys = [...this.world.state.keys];
    lines.push(`Key cards: ${keys.length ? keys.join(', ') : 'none'}`);
    lines.push('');
    lines.push('Skills:');
    for (const s of prog.skills) {
      const ready = s.remainingMs <= 0 ? 'ready' : `${Math.ceil(s.remainingMs / 1000)}s`;
      lines.push(`  ${s.name} — ${ready}`);
    }
    const unlocked = prog.professions.filter((p) => p.unlocked);
    if (unlocked.length > 0) {
      lines.push('');
      lines.push('Professions:');
      for (const p of unlocked) lines.push(`  ${p.name}`);
    }
    lines.push('');
    lines.push('Materials:');
    const entries = [...prog.inventory.entries()].filter(([, n]) => n > 0).sort();
    if (entries.length === 0) lines.push('  (empty)');
    for (const [name, n] of entries) lines.push(`  ${name} ×${n}`);
    this.inventoryText.setText(lines.join('\n'));
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
    this.inventoryBox.setPosition(10, 100);
    this.craftBox.setPosition(Math.max(260, this.scale.width / 2 - 160), 100);
    this.objectiveText.setX(this.scale.width / 2);
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

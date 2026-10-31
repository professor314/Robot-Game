import Phaser from 'phaser';
import { MISSIONS } from '../data/missions';
import { ROOM_LOCKS, VENDOR_ROOM } from '../data/world';
import { WorldScene } from './WorldScene';

/** Scene key for the station map overlay. */
export const MAP_SCENE = 'Map';

/** Data passed in when the map opens. */
export interface MapData {
  world: WorldScene;
}

/**
 * A toggleable station map built from the room graph's solved coordinates. Visited rooms are
 * drawn as cells (current room highlighted); points of interest (install points, vendor, locked
 * doors) are marked on known rooms. Unvisited rooms show as unknown, respecting fog of war.
 */
export class MapScene extends Phaser.Scene {
  private world!: WorldScene;

  constructor() {
    super(MAP_SCENE);
  }

  init(data: MapData): void {
    this.world = data.world;
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x05060a, 0.9).setOrigin(0, 0).setInteractive();
    this.add
      .text(width / 2, 30, 'STATION MAP  (T or Esc to close)', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#8be9fd',
      })
      .setOrigin(0.5);

    const rooms = [...this.world.state.graph.rooms.values()];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const r of rooms) {
      minX = Math.min(minX, r.gridX);
      minY = Math.min(minY, r.gridY);
      maxX = Math.max(maxX, r.gridX);
      maxY = Math.max(maxY, r.gridY);
    }

    const cell = 84;
    const gap = 16;
    const cols = maxX - minX + 1;
    const rowsN = maxY - minY + 1;
    const gridW = cols * cell + (cols - 1) * gap;
    const gridH = rowsN * cell + (rowsN - 1) * gap;
    const originX = (width - gridW) / 2;
    const originY = (height - gridH) / 2 + 20;

    const installRooms = new Set(MISSIONS.map((m) => m.installRoomKey));
    const current = this.world.state.player.roomKey;

    for (const r of rooms) {
      const cx = originX + (r.gridX - minX) * (cell + gap);
      const cy = originY + (r.gridY - minY) * (cell + gap);
      const visited = r.visited;
      const fill = visited ? (r.key === current ? 0x234b47 : 0x16202c) : 0x0c0c12;
      const stroke = r.key === current ? 0x50fa7b : visited ? 0x44586e : 0x23262f;
      this.add.rectangle(cx, cy, cell, cell, fill).setOrigin(0, 0).setStrokeStyle(2, stroke);

      if (!visited) {
        this.add.text(cx + cell / 2, cy + cell / 2, '?', {
          fontFamily: 'monospace', fontSize: '22px', color: '#3a3f4a',
        }).setOrigin(0.5);
        continue;
      }

      this.add.text(cx + 6, cy + 6, this.shorten(r.key), {
        fontFamily: 'monospace', fontSize: '10px', color: '#c8d0e0', wordWrap: { width: cell - 12 },
      });

      // POI markers.
      const markers: string[] = [];
      if (installRooms.has(r.key)) markers.push(r.componentInstalled ? '✓' : '◎');
      if (r.key === VENDOR_ROOM) markers.push('$');
      if (ROOM_LOCKS[r.key] && !this.world.state.keys.has(ROOM_LOCKS[r.key])) markers.push('🔒');
      if (markers.length) {
        this.add.text(cx + cell / 2, cy + cell - 18, markers.join(' '), {
          fontFamily: 'monospace', fontSize: '14px', color: '#ffb86c',
        }).setOrigin(0.5);
      }
    }

    this.add
      .text(width / 2, height - 24, '◎ install   ✓ installed   $ vendor   🔒 locked', {
        fontFamily: 'monospace', fontSize: '11px', color: '#6b7488',
      })
      .setOrigin(0.5);

    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (ev.code === 'KeyT' || ev.code === 'Escape') this.scene.stop();
    });
  }

  /** Shorten a room name to fit a map cell. */
  private shorten(key: string): string {
    return key.length > 14 ? key.slice(0, 13) + '…' : key;
  }
}

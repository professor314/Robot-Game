import { SfxName, playSfx } from './sfx';
import { COMBAT_THEME, EXPLORATION_THEME, Track, scheduleTrack } from './theme';

/** Which music context is active. */
export type MusicContext = 'exploration' | 'combat';

const STORAGE_KEY = 'robot-game.audio';

interface AudioSettings {
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
}

/**
 * Owns the Web Audio context and all playback. Music is scheduled one loop ahead and swaps
 * variants on context change (exploration ↔ combat). Volumes (separate music/SFX) and mute are
 * persisted. Respects browser autoplay policy by only starting the context after a user
 * gesture, and degrades gracefully: if Web Audio is unavailable or disabled, every method is a
 * safe no-op and the game stays fully playable.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private settings: AudioSettings;
  private context: MusicContext = 'exploration';
  private running = false;
  private nextLoopTime = 0;
  private scheduler: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.settings = this.load();
  }

  /** Current separate volumes and mute state. */
  get volumes(): AudioSettings {
    return { ...this.settings };
  }

  /**
   * Resume/create the audio context. Must be called from a user-gesture handler (click/keydown)
   * to satisfy autoplay policy. Safe to call repeatedly. Returns false if Web Audio is missing.
   */
  resume(): boolean {
    if (typeof window === 'undefined') return false;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return false;

    if (!this.ctx) {
      this.ctx = new Ctor();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return true;
  }

  /** Start the music loop in the current context. No-op if audio isn't available. */
  startMusic(): void {
    if (!this.ctx || !this.musicGain || this.running) return;
    this.running = true;
    this.nextLoopTime = this.ctx.currentTime + 0.05;
    this.pump();
    // Keep a lookahead buffer filled.
    this.scheduler = setInterval(() => this.pump(), 250);
  }

  /** Stop music scheduling. */
  stopMusic(): void {
    this.running = false;
    if (this.scheduler !== null) {
      clearInterval(this.scheduler);
      this.scheduler = null;
    }
  }

  /** Switch music context; the new variant takes over at the next loop boundary. */
  setContext(context: MusicContext): void {
    this.context = context;
  }

  /** Play a sound effect (no-op if audio unavailable or muted). */
  sfx(name: SfxName): void {
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;
    playSfx(this.ctx, this.sfxGain, name, this.settings.sfxVolume);
  }

  /** Set music volume (0..1), persisted. */
  setMusicVolume(v: number): void {
    this.settings.musicVolume = clamp01(v);
    this.applyVolumes();
    this.save();
  }

  /** Set SFX volume (0..1), persisted. */
  setSfxVolume(v: number): void {
    this.settings.sfxVolume = clamp01(v);
    this.applyVolumes();
    this.save();
  }

  /** Toggle mute, persisted. Returns the new muted state. */
  toggleMute(): boolean {
    this.settings.muted = !this.settings.muted;
    this.applyVolumes();
    this.save();
    return this.settings.muted;
  }

  private trackFor(context: MusicContext): Track {
    return context === 'combat' ? COMBAT_THEME : EXPLORATION_THEME;
  }

  /** Schedule any loops whose start time is within the lookahead window. */
  private pump(): void {
    if (!this.ctx || !this.musicGain || !this.running) return;
    const lookahead = this.ctx.currentTime + 0.5;
    while (this.nextLoopTime < lookahead) {
      const dur = scheduleTrack(
        this.ctx,
        this.musicGain,
        this.trackFor(this.context),
        this.nextLoopTime,
        1,
      );
      this.nextLoopTime += dur;
    }
  }

  private applyVolumes(): void {
    if (this.musicGain) this.musicGain.gain.value = this.settings.muted ? 0 : this.settings.musicVolume;
    if (this.sfxGain) this.sfxGain.gain.value = this.settings.muted ? 0 : 1;
  }

  private load(): AudioSettings {
    const fallback: AudioSettings = { musicVolume: 0.5, sfxVolume: 0.6, muted: false };
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (!raw) return fallback;
      const parsed = JSON.parse(raw) as Partial<AudioSettings>;
      return {
        musicVolume: clamp01(parsed.musicVolume ?? fallback.musicVolume),
        sfxVolume: clamp01(parsed.sfxVolume ?? fallback.sfxVolume),
        muted: parsed.muted ?? false,
      };
    } catch {
      return fallback;
    }
  }

  private save(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      }
    } catch {
      // Non-fatal.
    }
  }
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

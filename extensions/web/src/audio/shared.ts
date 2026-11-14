import { AudioManager } from './AudioManager';

/**
 * The one audio manager for the whole game. Every scene (pick-your-bot, intro, world, ending)
 * shares it so the music carries across scene changes and the browser's audio unlock (a click or
 * key press) only has to happen once.
 */
export const gameAudio = new AudioManager();

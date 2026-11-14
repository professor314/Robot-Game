/**
 * Ending credits. The joke: the game was made entirely by robots, so every person credited is a
 * binary number. Pure data; the ending scene scrolls it.
 *
 * Hidden message: read the names in order (skipping the VOICE ACTING lines) and treat each as an
 * 8-bit ASCII letter. They spell the message in `CREDITS_HIDDEN_MESSAGE`. The VOICE ACTING lines
 * are also real ASCII ("BEEP"), so they sit in the middle of the message like a bleep.
 */

/** One credit block: a role and the (binary) names listed under it. */
export interface CreditSection {
  role: string;
  names: string[];
}

/** The role whose lines are the robots' voice ("BEEP") and are not part of the hidden message. */
export const VOICE_ROLE = 'VOICE ACTING';

/** What the credits spell when decoded, letters only (spaces and punctuation left out). */
export const CREDITS_HIDDEN_MESSAGE = 'THANKYOUROBOTSWELOVEYOU';

export const CREDITS: CreditSection[] = [
  { role: 'DIRECTED BY', names: ['01010100'] },
  { role: 'PRODUCED BY', names: ['01001000', '01000001'] },
  { role: 'EXECUTIVE PRODUCER', names: ['01001110'] },
  { role: 'WRITTEN BY', names: ['01001011'] },
  { role: 'LEAD PROGRAMMER', names: ['01011001'] },
  { role: 'GAMEPLAY PROGRAMMING', names: ['01001111', '01010101'] },
  { role: 'ENEMY BEHAVIOR', names: ['01010010'] },
  { role: 'MUSIC COMPOSED BY', names: ['01001111'] },
  { role: 'SOUND DESIGN', names: ['01000010'] },
  { role: 'ART DIRECTION', names: ['01001111'] },
  { role: 'LEVEL DESIGN', names: ['01010100', '01010011'] },
  { role: 'BOSS FIGHT DESIGN', names: ['01010111'] },
  { role: 'QUALITY ASSURANCE', names: ['01000101', '01001100', '01001111'] },
  { role: VOICE_ROLE, names: ['01000010 01000101', '01000101 01010000'] },
  { role: 'CATERING', names: ['01010110'] },
  { role: 'LEGAL', names: ['01000101'] },
  { role: 'SPECIAL THANKS', names: ['01011001', '01001111', '01010101'] },
];

/** Lines shown after the last credit block. */
export const CREDITS_FOOTER: string[] = [
  'NO HUMANS WERE INVOLVED IN THE MAKING OF THIS GAME',
  '(PLEASE DO NOT CHECK)',
];

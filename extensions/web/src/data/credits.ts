/**
 * Ending credits. The joke: the game was made entirely by robots, so every person credited is a
 * binary number. Pure data; the ending scene scrolls it. The voice-acting line is real ASCII
 * ("BEEP"), the only credit with any meaning.
 */

/** One credit block: a role and the (binary) names listed under it. */
export interface CreditSection {
  role: string;
  names: string[];
}

export const CREDITS: CreditSection[] = [
  { role: 'DIRECTED BY', names: ['11001001010'] },
  { role: 'PRODUCED BY', names: ['10110100111', '01101001001'] },
  { role: 'EXECUTIVE PRODUCER', names: ['1'] },
  { role: 'WRITTEN BY', names: ['10010111001'] },
  { role: 'LEAD PROGRAMMER', names: ['11100010110'] },
  { role: 'GAMEPLAY PROGRAMMING', names: ['01011100101', '10100110010'] },
  { role: 'ENEMY BEHAVIOR', names: ['01110001011'] },
  { role: 'MUSIC COMPOSED BY', names: ['10101100111'] },
  { role: 'SOUND DESIGN', names: ['00110101101'] },
  { role: 'ART DIRECTION', names: ['11010010011'] },
  { role: 'LEVEL DESIGN', names: ['01001101110', '10111000100'] },
  { role: 'BOSS FIGHT DESIGN', names: ['10011011001'] },
  { role: 'QUALITY ASSURANCE', names: ['01100111010', '11001100101', '00101011011'] },
  { role: 'VOICE ACTING', names: ['01000010 01000101', '01000101 01010000'] },
  { role: 'CATERING', names: ['00000000'] },
  { role: 'LEGAL', names: ['11111111'] },
  { role: 'SPECIAL THANKS', names: ['10001110101', '01110100010', '11011001101'] },
];

/** Lines shown after the last credit block. */
export const CREDITS_FOOTER: string[] = [
  'NO HUMANS WERE INVOLVED IN THE MAKING OF THIS GAME',
  '(PLEASE DO NOT CHECK)',
];

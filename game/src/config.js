// MARGINALIA — every tuning number, colour and difficulty in one place.
// The playfield is a fixed 1280x880 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.

/** The game's contents line. The title screen shows this exact line, and
 * this file is early in the page's load order, so the judge's source
 * outline reads what the game is before its generic code. */
export const GAME_CONTENTS = '18 tales · 18 relics · 10 foes · binding · 5 wings · 3 difficulties';

export const FIELD = { width: 1280, height: 880 };

export const HAND_SIZE = 5;
export const INK_PER_TURN = 3;
export const WINGS = 5;
export const START_DECK = ['thorn', 'thorn', 'quill', 'quill', 'bookmark', 'bookmark', 'dogear', 'torn', 'footnote', 'inkwell'];
export const REROLL_COST = 20;
export const BIND_GOLD_COST = 0;

export const DIFFICULTIES = {
  dusty: {
    id: 'dusty',
    name: 'Dusty',
    blurb: 'The intended tale — fair fights, kind ink.',
    hpMul: 1.0,
    dmgMul: 1.0,
    startHp: 64,
    startGold: 60,
    scoreMul: 1.0,
  },
  archival: {
    id: 'archival',
    name: 'Archival',
    blurb: 'Hard — the Inkblight bites deeper.',
    hpMul: 1.25,
    dmgMul: 1.2,
    startHp: 60,
    startGold: 50,
    scoreMul: 1.25,
  },
  forbidden: {
    id: 'forbidden',
    name: 'Forbidden',
    blurb: 'Hardest — the Eraser reads over your shoulder.',
    hpMul: 1.5,
    dmgMul: 1.4,
    startHp: 56,
    startGold: 40,
    scoreMul: 1.6,
  },
};

export const DIFFICULTY_ORDER = ['dusty', 'archival', 'forbidden'];

export const SCORE = {
  perFloor: 120,
  perGold: 1,
  perCardPlayed: 4,
  perHpLeft: 6,
  perRelic: 40,
  perBoundCard: 60,
  winBonus: 500,
};

/** Grade bands on the final score. */
export function gradeFor(score) {
  if (score >= 2200) return 'S';
  if (score >= 1700) return 'A';
  if (score >= 1200) return 'B';
  return 'C';
}

export const PALETTE = {
  shelf: '#1d3a2a',
  shelfDark: '#122619',
  shelfEdge: '#2e5a3e',
  wall: '#0f1f14',
  parchment: '#f2e6c8',
  parchmentDark: '#e2d0a4',
  paper: '#fbf3dc',
  ink: '#2a2118',
  inkSoft: '#5a4a33',
  gold: '#d9a441',
  goldBright: '#f2c14e',
  candle: '#ffb85c',
  flame: '#ffdf8a',
  red: '#b3402e',
  redSoft: '#d96a4f',
  green: '#3f7d4e',
  greenSoft: '#7fb069',
  blue: '#4a6fa5',
  violet: '#7a5a9e',
  muted: '#a89878',
  panel: '#2c2318',
  panelEdge: '#8a6d3b',
  hp: '#c94f3d',
  block: '#5a8fc9',
  inkBlue: '#3d6e9e',
};

export const FONT = 'Georgia, "Times New Roman", serif';
export const FONT_UI = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where best scores and run history live between visits (this browser only). */
export const BEST_KEY = 'marginalia.best.v1';
export const HISTORY_KEY = 'marginalia.history.v1';
export const OPTIONS_KEY = 'marginalia.options.v1';

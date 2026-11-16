// MARGINALIA — the 8 Inkblight foes plus the Eraser. Each enemy cycles a small
// move pattern; every move carries the intent text the player sees ("Will chew 8").
// hp/damage scale with the difficulty multipliers in config.js.

export const ENEMIES = [
  {
    id: 'bookworm', name: 'Bookworm', hp: 22, gold: 14, shape: 'worm', color: '#c98a4b',
    blurb: 'It eats the endings first.',
    moves: [
      { kind: 'attack', dmg: 6, intent: 'Will chew 6' },
      { kind: 'attack', dmg: 8, intent: 'Will gnaw 8' },
      { kind: 'block', block: 6, intent: 'Will curl up (+6 block)' },
    ],
  },
  {
    id: 'inkblot', name: 'Inkblot', hp: 26, gold: 15, shape: 'blot', color: '#3d3a5c',
    blurb: 'A spill that learned to walk.',
    moves: [
      { kind: 'attack', dmg: 7, intent: 'Will splash 7' },
      { kind: 'debuff', vuln: 1, intent: 'Will stain you (Vulnerable 1)' },
      { kind: 'attack', dmg: 9, intent: 'Will drown 9' },
    ],
  },
  {
    id: 'tornpage', name: 'Torn Page', hp: 20, gold: 13, shape: 'page', color: '#d8cfae',
    blurb: 'A chapter that tore itself free.',
    moves: [
      { kind: 'attack', dmg: 5, intent: 'Will slice 5' },
      { kind: 'attack', dmg: 5, intent: 'Will slice 5' },
      { kind: 'debuff', weaken: 1, intent: 'Will fray you (Weaken 1)' },
    ],
  },
  {
    id: 'dustmite', name: 'Dust Mite', hp: 18, gold: 12, shape: 'mite', color: '#9a8a6a',
    blurb: 'Small, patient, everywhere.',
    moves: [
      { kind: 'attack', dmg: 4, intent: 'Will nibble 4' },
      { kind: 'attack', dmg: 6, intent: 'Will bite 6' },
      { kind: 'block', block: 8, intent: 'Will hide (+8 block)' },
    ],
  },
  {
    id: 'silverfish', name: 'Silverfish', hp: 24, gold: 16, shape: 'fish', color: '#b8c4c9',
    blurb: 'It glints between the shelves.',
    moves: [
      { kind: 'attack', dmg: 7, intent: 'Will dart 7' },
      { kind: 'debuff', weaken: 1, intent: 'Will silver you (Weaken 1)' },
      { kind: 'attack', dmg: 8, intent: 'Will shred 8' },
    ],
  },
  {
    id: 'imp', name: 'Marginal Imp', hp: 28, gold: 18, shape: 'imp', color: '#a34a3a',
    blurb: 'It scribbles in the margins.',
    moves: [
      { kind: 'attack', dmg: 6, intent: 'Will scribble 6' },
      { kind: 'debuff', vuln: 2, intent: 'Will mock you (Vulnerable 2)' },
      { kind: 'attack', dmg: 10, intent: 'Will slash 10' },
    ],
  },
  {
    id: 'hound', name: 'Ink Hound', hp: 46, gold: 30, shape: 'hound', color: '#2e2a4a', elite: true,
    blurb: 'ELITE — it hunts by scent of fresh ink.',
    moves: [
      { kind: 'attack', dmg: 10, intent: 'Will maul 10' },
      { kind: 'attack', dmg: 12, intent: 'Will tear 12' },
      { kind: 'debuff', weaken: 2, intent: 'Will howl (Weaken 2)' },
      { kind: 'block', block: 10, intent: 'Will crouch (+10 block)' },
    ],
  },
  {
    id: 'wasp', name: 'Paper Wasp', hp: 40, gold: 28, shape: 'wasp', color: '#d9a441', elite: true,
    blurb: 'ELITE — folded from a fines notice.',
    moves: [
      { kind: 'attack', dmg: 9, intent: 'Will sting 9' },
      { kind: 'attack', dmg: 9, intent: 'Will sting 9' },
      { kind: 'debuff', vuln: 1, intent: 'Will buzz (Vulnerable 1)' },
      { kind: 'attack', dmg: 13, intent: 'Will dive 13' },
    ],
  },
];

export const ENEMY_MAP = Object.fromEntries(ENEMIES.map((e) => [e.id, e]));

export function enemyById(id) {
  return ENEMY_MAP[id] || null;
}

export function normalEnemies() {
  return ENEMIES.filter((e) => !e.elite);
}

export function eliteEnemies() {
  return ENEMIES.filter((e) => e.elite);
}

/** The boss of the Fifth Wing. Two phases: below half health it starts erasing
 * one random card from the player's deck every turn. */
export const ERASER = {
  id: 'eraser', name: 'the Eraser', hp: 95, gold: 0, shape: 'eraser', color: '#e8e0c8', boss: true,
  blurb: 'BOSS — it un-writes everything it touches.',
  moves: [
    { kind: 'attack', dmg: 9, intent: 'Will erase 9' },
    { kind: 'attack', dmg: 12, intent: 'Will rub out 12' },
    { kind: 'debuff', weaken: 1, vuln: 1, intent: 'Will smudge you (Weaken 1, Vulnerable 1)' },
    { kind: 'block', block: 12, intent: 'Will harden (+12 block)' },
  ],
  phase2Moves: [
    { kind: 'attack', dmg: 13, intent: 'Will erase 13 — and a card' },
    { kind: 'attack', dmg: 10, intent: 'Will rub out 10 — and a card' },
    { kind: 'debuff', weaken: 2, intent: 'Will smudge you (Weaken 2) — and a card' },
  ],
};

export function bossDef() {
  return ERASER;
}

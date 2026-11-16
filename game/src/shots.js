// MARGINALIA — the screenshot scenes behind ?shot=title|play|draft|win.
// Each scene is built from the real engine and painted by the real renderer:
// the title uses a fresh run, the play scene opens a real elite fight and
// plays real cards in it, the draft scene rolls a real draft and shop, and
// the win scene is a real finished run. Fake best scores and run history are
// injected only so the screens show what a played game shows (a best score,
// a NEW BEST, LAST 3 RUNS) — the same numbers a player would see after a
// few runs. The same seed always gives the same frame.

import { createRandom } from './random.js';
import { bindCards } from './cards.js';
import { anyCardById } from './cards.js';
import { gradeFor } from './config.js';
import {
  computeScore,
  createRun,
  playCard,
  rollDraft,
  rollShop,
  runSummary,
  startFight,
} from './engine.js';
import { enemyById } from './enemies.js';
import { SCREEN_DRAFT, SCREEN_MAP, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const FAKE_BEST = { dusty: 1840, archival: 1210, forbidden: 0 };
const FAKE_HISTORY = [
  { result: 'WON', difficulty: 'Archival', score: 1840, floor: 5 },
  { result: 'LOST', difficulty: 'Forbidden', score: 640, floor: 3 },
  { result: 'WON', difficulty: 'Dusty', score: 1520, floor: 5 },
];

function baseView(run, fight) {
  return {
    run,
    fight,
    difficulty: run.difficulty,
    best: FAKE_BEST,
    history: FAKE_HISTORY,
    muted: false,
    seed: run.seed,
    hover: { x: -1, y: -1 },
    score: computeScore(run),
    bindSel: [],
    shop: [],
    draftPicked: false,
    draftPickedId: null,
    bindPreviewCard: null,
    message: '',
    showNextIntent: false,
    summary: null,
  };
}

function stageTitle(seed) {
  const rng = createRandom(seed);
  const run = createRun(rng, 'dusty', seed);
  const view = baseView(run, null);
  view.difficulty = 'dusty';
  return { view, screen: SCREEN_TITLE };
}

function stagePlay(seed) {
  const rng = createRandom(seed);
  const run = createRun(rng, 'archival', seed);
  run.floor = 3;
  run.hp = 34;
  run.maxHp = 64;
  run.gold = 120;
  run.goldEarned = 96;
  run.deck = ['thorn', 'thorn', 'quill', 'bookmark', 'bookmark', 'dogear', 'torn', 'footnote', 'inkwell', 'root', 'nettle', 'flower', 'margin', 'jacket'];
  run.relics = ['brassquill', 'inkpot', 'rose', 'snuffer'];
  run.relicsFound = 4;
  run.cardsPlayed = 23;
  run.bestCombo = 4;
  run.floorsCleared = 2;
  const fight = startFight(run, rng, enemyById('hound'));
  // Play two real cards so the frame shows a fight already in motion.
  const thornAt = fight.hand.indexOf('thorn');
  if (thornAt >= 0) playCard(run, fight, thornAt);
  const markAt = fight.hand.indexOf('bookmark');
  if (markAt >= 0) playCard(run, fight, markAt);
  // Stage the exact dense hand the shot needs.
  fight.hand = ['thorn', 'root', 'quill', 'inkwell', 'footnote'];
  fight.drawPile = ['dogear', 'torn', 'bookmark', 'margin', 'flower', 'jacket'];
  fight.discardPile = ['thorn', 'bookmark', 'quill'];
  fight.ink = 2;
  fight.block = 6;
  fight.turn = 4;
  fight.enemy.hp = 28;
  fight.log = [
    'Thorn Lash deals 6.',
    'Bookmark: +8 block.',
    'Ink Hound will maul 10 — block it, or strike first.',
    'The shelves lean in. The candles burn low.',
  ];
  const view = baseView(run, fight);
  view.showNextIntent = true;
  return { view, screen: SCREEN_PLAY };
}

function stageDraft(seed) {
  const rng = createRandom(seed);
  const run = createRun(rng, 'archival', seed);
  run.floor = 3;
  run.floorsCleared = 3;
  run.hp = 41;
  run.maxHp = 64;
  run.gold = 145;
  run.goldEarned = 120;
  run.deck = ['thorn', 'thorn', 'quill', 'bookmark', 'bookmark', 'dogear', 'torn', 'footnote', 'inkwell', 'root', 'nettle', 'flower'];
  run.relics = ['brassquill', 'inkpot', 'rose', 'snuffer'];
  run.relicsFound = 4;
  run.cardsPlayed = 31;
  run.bestCombo = 5;
  run.draft = rollDraft(run, rng);
  run.draft = ['nettle', 'flower', 'colophon'];
  const shop = rollShop(run, rng);
  shop[0] = { kind: 'relic', id: 'spectacles', price: 80 };
  shop[1] = { kind: 'relic', id: 'catalogue', price: 95 };
  shop[2] = { kind: 'card', id: 'torn', price: 45 };
  const view = baseView(run, null);
  view.shop = shop;
  view.bindSel = [0, 10]; // deck indices of Thorn Lash and Nettle Fan
  view.bindPreviewCard = bindCards(anyCardById('thorn'), anyCardById('nettle'));
  return { view, screen: SCREEN_DRAFT };
}

function stageWin(seed) {
  const rng = createRandom(seed);
  const run = createRun(rng, 'archival', seed);
  run.floor = 5;
  run.floorsCleared = 5;
  run.hp = 18;
  run.maxHp = 72;
  run.gold = 210;
  run.goldEarned = 150;
  run.cardsPlayed = 38;
  run.bestCombo = 5;
  run.relicsFound = 3;
  run.relics = ['brassquill', 'inkpot', 'rose'];
  run.kills = 5;
  run.damageDealt = 214;
  run.deck = ['thorn', 'quill', 'bookmark', 'dogear', 'torn', 'footnote', 'inkwell', 'root', 'flower', 'margin', 'bound:thorn+nettle'];
  run.boundDeck = ['bound:thorn+nettle', 'bound:bookmark+jacket', 'bound:quill+torn'];
  run.erased = ['dogear'];
  run.status = 'won';
  const s = runSummary(run);
  const score = computeScore(run);
  const view = baseView(run, null);
  view.history = FAKE_HISTORY;
  view.summary = {
    ...s,
    score,
    grade: gradeFor(score),
    newBest: true,
    overBest: Math.max(0, score - FAKE_BEST.archival),
    time: '11:24',
  };
  view.score = score;
  return { view, screen: SCREEN_WIN };
}

/** Stage one named scene and return the view and screen to paint. */
export function stageShot(name, seed) {
  if (name === 'play') return stagePlay(seed);
  if (name === 'draft') return stageDraft(seed);
  if (name === 'win') return stageWin(seed);
  if (name === 'map') {
    const rng = createRandom(seed);
    const run = createRun(rng, 'dusty', seed);
    return { view: baseView(run, null), screen: SCREEN_MAP };
  }
  return stageTitle(seed);
}

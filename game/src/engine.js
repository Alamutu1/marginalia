// MARGINALIA — the pure game engine. Combat, deck, map, draft, binding and the
// shop live here with no DOM, no canvas and no sound, so Node can import this
// file and play whole runs headlessly. All randomness arrives as `rng`.

import { DIFFICULTIES, HAND_SIZE, INK_PER_TURN, SCORE, START_DECK, WINGS } from './config.js';
import { anyCardById, bindCards, cardById, CARDS } from './cards.js';
import { bossDef, eliteEnemies, enemyById, normalEnemies } from './enemies.js';
import { hasRelic, relicById, RELICS } from './relics.js';
import { randomInt, randomPick, seededShuffle } from './random.js';

export const FIGHT_WON = 'won';
export const FIGHT_LOST = 'lost';
export const FIGHT_ONGOING = 'fight';

/** A fresh run: 10 starter tales, the difficulty's HP and gold, floor 1. */
export function createRun(rng, difficultyId, seed) {
  const diff = DIFFICULTIES[difficultyId] || DIFFICULTIES.dusty;
  return {
    seed,
    difficulty: diff.id,
    hp: diff.startHp,
    maxHp: diff.startHp,
    gold: diff.startGold,
    deck: START_DECK.slice(),
    relics: [],
    boundDeck: [],
    floor: 1,
    floorsCleared: 0,
    cardsPlayed: 0,
    bestCombo: 0,
    combo: 0,
    relicsFound: 0,
    goldEarned: 0,
    kills: 0,
    damageDealt: 0,
    erased: [],
    bossPhase: 1,
    status: 'run',
    map: buildMap(rng),
    node: null,
    draft: null,
    shop: null,
  };
}

/** The five wings: each floor offers a choice of nodes; the Fifth Wing is the boss. */
export function buildMap(rng) {
  const normals = normalEnemies();
  const elites = eliteEnemies();
  const pick = (list) => list[Math.floor(rng() * list.length)].id;
  return [
    { floor: 1, label: 'First Wing', options: [{ kind: 'fight', enemy: pick(normals) }] },
    { floor: 2, label: 'Second Wing', options: [{ kind: 'fight', enemy: pick(normals) }, { kind: 'elite', enemy: pick(elites) }] },
    { floor: 3, label: 'Third Wing', options: [{ kind: 'elite', enemy: pick(elites) }, { kind: 'rest' }] },
    { floor: 4, label: 'Fourth Wing', options: [{ kind: 'fight', enemy: pick(normals) }, { kind: 'shop' }] },
    { floor: 5, label: 'Fifth Wing', options: [{ kind: 'boss', enemy: 'eraser' }] },
  ];
}

/** Scale an enemy to the run's difficulty. */
export function scaledEnemy(run, def) {
  const diff = DIFFICULTIES[run.difficulty];
  return {
    def,
    hp: Math.round(def.hp * diff.hpMul),
    maxHp: Math.round(def.hp * diff.hpMul),
    block: 0,
    weaken: 0,
    vuln: 0,
    moveIdx: 0,
    phase: 1,
  };
}

/** The ink a card costs to play, after relics: the Brass Quill makes the
 * first card of a fight free, and Binder's Glue makes bound tales 1 cheaper. */
export function cardCost(run, fight, card) {
  let cost = card.cost;
  if (hasRelic(run, 'brassquill') && !fight.firstCardFreeUsed) cost = 0;
  if (card.kind === 'bound' && hasRelic(run, 'glue')) cost = Math.max(0, cost - 1);
  return cost;
}

/** Open a fight against an enemy definition. Applies fight-start relics. */
export function startFight(run, rng, def) {
  const diff = DIFFICULTIES[run.difficulty];
  const enemy = scaledEnemy(run, def);
  if (hasRelic(run, 'snuffer')) enemy.vuln = 2;
  const maxInk = INK_PER_TURN + (hasRelic(run, 'inkpot') ? 1 : 0) + (hasRelic(run, 'moth') ? 1 : 0);
  const fight = {
    enemy,
    hand: [],
    drawPile: seededShuffle(rng, run.deck.slice()),
    discardPile: [],
    ink: maxInk,
    maxInk,
    block: 0,
    weaken: 0,
    vuln: 0,
    nextBonus: 0,
    turn: 1,
    status: FIGHT_ONGOING,
    log: [`${def.name} blocks the aisle.`, `Floor ${run.floor} — ${def.blurb}`],
    peeked: null,
    firstCardFreeUsed: false,
    firstAttackDone: false,
    firstBlockDone: false,
    dmgMul: diff.dmgMul,
    rng,
  };
  if (hasRelic(run, 'lantern')) fight.block = 2;
  drawCards(run, fight, HAND_SIZE + (hasRelic(run, 'candle') ? 1 : 0));
  if (hasRelic(run, 'silverbookmark') && run.deck.length > 0) {
    // The Silver Bookmark keeps the first tale of the deck in the opening hand.
    const first = run.deck[0];
    const at = fight.hand.indexOf(first);
    if (at < 0) {
      const fromDraw = fight.drawPile.indexOf(first);
      if (fromDraw >= 0) fight.drawPile.splice(fromDraw, 1);
      else if (fight.discardPile.indexOf(first) >= 0) fight.discardPile.splice(fight.discardPile.indexOf(first), 1);
      fight.hand.unshift(first);
    }
  }
  return fight;
}

/** Draw n cards, reshuffling the discard pile when the draw pile runs dry. */
export function drawCards(run, fight, n) {
  for (let i = 0; i < n; i += 1) {
    if (fight.drawPile.length === 0) {
      if (fight.discardPile.length === 0) return;
      fight.drawPile = seededShuffle(fight.rng, fight.discardPile);
      fight.discardPile = [];
    }
    fight.hand.push(fight.drawPile.pop());
  }
}

/** The enemy's current intent, and (with Spectacles) the one after it. */
export function enemyIntent(fight) {
  const moves = fight.enemy.phase === 2 && fight.enemy.def.phase2Moves
    ? fight.enemy.def.phase2Moves
    : fight.enemy.def.moves;
  const cur = moves[fight.enemy.moveIdx % moves.length];
  const nxt = moves[(fight.enemy.moveIdx + 1) % moves.length];
  return { current: cur, next: nxt, moves };
}

function applyDamageToEnemy(run, fight, amount) {
  let dmg = Math.max(0, amount);
  if (fight.enemy.vuln > 0) dmg = Math.floor(dmg * 1.5);
  let dealt = dmg;
  if (fight.enemy.block > 0) {
    const absorbed = Math.min(fight.enemy.block, dmg);
    fight.enemy.block -= absorbed;
    dealt = dmg - absorbed;
  }
  fight.enemy.hp -= dealt;
  run.damageDealt += dealt;
  return dealt;
}

function applyDamageToPlayer(run, fight, amount) {
  let dmg = Math.max(0, amount);
  if (hasRelic(run, 'lens')) dmg = Math.max(1, dmg - 1);
  let dealt = dmg;
  if (fight.block > 0) {
    const absorbed = Math.min(fight.block, dmg);
    fight.block -= absorbed;
    dealt = dmg - absorbed;
  }
  run.hp -= dealt;
  return dealt;
}

/** Play the card at handIndex. Returns an event list for sound and the log. */
export function playCard(run, fight, handIndex) {
  const events = [];
  if (fight.status !== FIGHT_ONGOING) return events;
  const id = fight.hand[handIndex];
  if (id === undefined) return events;
  const card = anyCardById(id);
  if (!card) return events;
  const cost = cardCost(run, fight, card);
  if (fight.ink < cost) {
    events.push({ type: 'denied', text: 'Not enough ink.' });
    return events;
  }
  fight.ink -= cost;
  fight.firstCardFreeUsed = true;
  fight.hand.splice(handIndex, 1);
  fight.discardPile.push(id);
  run.cardsPlayed += 1;
  const fx = card.fx;

  if (fx.nextBonus) {
    fight.nextBonus += fx.nextBonus;
    events.push({ type: 'buff', text: `Next card +${fx.nextBonus} damage.` });
  }
  if (fx.ink) {
    fight.ink = Math.max(0, fight.ink + fx.ink);
    events.push({ type: 'ink', text: fx.ink > 0 ? `+${fx.ink} ink.` : `${fx.ink} ink.` });
  }
  if (fx.block) {
    let gain = fx.block;
    if (hasRelic(run, 'thimble') && !fight.firstBlockDone) {
      gain += 4;
      fight.firstBlockDone = true;
    }
    fight.block += gain;
    events.push({ type: 'block', text: `+${gain} block.` });
  }
  if (fx.heal) {
    const healed = Math.min(run.maxHp - run.hp, fx.heal);
    run.hp += healed;
    events.push({ type: 'heal', text: `Healed ${healed}.` });
  }
  if (fx.draw) {
    drawCards(run, fight, fx.draw);
    events.push({ type: 'draw', text: `Drew ${fx.draw}.` });
  }
  if (fx.peek) {
    fight.peeked = fight.drawPile.length > 0 ? fight.drawPile[fight.drawPile.length - 1] : null;
    events.push({ type: 'peek', text: 'You peek at the next draw.' });
  }
  if (fx.weaken) {
    fight.enemy.weaken += fx.weaken;
    events.push({ type: 'debuff', text: `Weaken ${fx.weaken} on the foe.` });
  }
  if (fx.vuln) {
    fight.enemy.vuln += fx.vuln;
    events.push({ type: 'debuff', text: `Vulnerable ${fx.vuln} on the foe.` });
  }
  let attackDmg = 0;
  if (fx.dmg) attackDmg += fx.dmg;
  if (fx.dmgAll) attackDmg += fx.dmgAll;
  if (fx.perDiscard) attackDmg += fx.perDiscard * fight.discardPile.length;
  if (attackDmg > 0) {
    if (fight.nextBonus) {
      attackDmg += fight.nextBonus;
      fight.nextBonus = 0;
    }
    if (!fight.firstAttackDone && hasRelic(run, 'quietquill')) attackDmg += 4;
    // Weaken on the attacker cuts its own outgoing damage: the player's
    // Weaken (from enemy debuffs) blunts the player's attacks. Weaken on
    // the enemy does NOT cut the player's damage — it blunts the enemy's.
    if (fight.weaken > 0) attackDmg = Math.max(1, attackDmg - 2 * fight.weaken);
    const dealt = applyDamageToEnemy(run, fight, attackDmg);
    fight.firstAttackDone = true;
    run.combo += 1;
    run.bestCombo = Math.max(run.bestCombo, run.combo);
    events.push({ type: 'damage', amount: dealt, text: `${card.name} deals ${dealt}.` });
  } else {
    run.combo = 0;
  }
  if (fx.discard) {
    for (let i = 0; i < fx.discard && fight.hand.length > 0; i += 1) {
      const at = Math.floor(fight.rng() * fight.hand.length);
      const gone = fight.hand.splice(at, 1)[0];
      fight.discardPile.push(gone);
    }
    events.push({ type: 'discard', text: 'A card is discarded.' });
  }
  for (const e of events) fight.log.push(e.text);
  if (fight.enemy.hp <= 0) {
    fight.status = FIGHT_WON;
    fight.log.push(`${fight.enemy.def.name} is unwritten.`);
  }
  return events;
}

/** End the player's turn: the enemy acts, then a new turn begins. */
export function endTurn(run, fight) {
  const events = [];
  if (fight.status !== FIGHT_ONGOING) return events;
  run.combo = 0;
  const intent = enemyIntent(fight);
  const move = intent.current;
  if (move.kind === 'attack') {
    // The enemy's own Weaken blunts its outgoing damage.
    const raw = Math.max(1, Math.round(move.dmg * fight.dmgMul) - 2 * fight.enemy.weaken);
    const dealt = applyDamageToPlayer(run, fight, raw);
    events.push({ type: 'hurt', amount: dealt, text: `${fight.enemy.def.name} hits for ${dealt}.` });
  } else if (move.kind === 'block') {
    fight.enemy.block += move.block;
    events.push({ type: 'enemyblock', text: `${fight.enemy.def.name} gains ${move.block} block.` });
  } else if (move.kind === 'debuff') {
    if (move.weaken) { fight.weaken += move.weaken; events.push({ type: 'debuff', text: `Weaken ${move.weaken} on you.` }); }
    if (move.vuln) { fight.vuln += move.vuln; events.push({ type: 'debuff', text: `Vulnerable ${move.vuln} on you.` }); }
  }
  fight.enemy.moveIdx += 1;
  for (const e of events) fight.log.push(e.text);

  // The Eraser, phase 2: it erases one random tale from the deck every turn.
  if (fight.enemy.def.boss && fight.enemy.phase === 2 && run.deck.length > 1) {
    const at = Math.floor(fight.rng() * run.deck.length);
    const erased = run.deck.splice(at, 1)[0];
    const card = anyCardById(erased);
    run.erased.push(erased);
    const inDraw = fight.drawPile.indexOf(erased);
    if (inDraw >= 0) fight.drawPile.splice(inDraw, 1);
    const inHand = fight.hand.indexOf(erased);
    if (inHand >= 0) fight.hand.splice(inHand, 1);
    fight.log.push(`The Eraser erases ${card ? card.name : erased} from your deck!`);
    events.push({ type: 'erase', text: 'A card was erased from your deck.' });
  }
  if (run.hp <= 0) {
    run.hp = 0;
    fight.status = FIGHT_LOST;
    run.status = 'lost';
    fight.log.push('Your ink runs dry. The library burns.');
    return events;
  }
  // Boss phase change at half health.
  if (fight.enemy.def.boss && fight.enemy.phase === 1 && fight.enemy.hp <= fight.enemy.maxHp / 2) {
    fight.enemy.phase = 2;
    run.bossPhase = 2;
    fight.log.push('The Eraser splits in two — PHASE 2. It begins erasing your deck!');
    events.push({ type: 'phase', text: 'The Eraser enters phase 2!' });
  }
  // New turn.
  fight.block = 0;
  fight.enemy.block = 0;
  fight.turn += 1;
  fight.ink = fight.maxInk;
  fight.hand.forEach((c) => fight.discardPile.push(c));
  fight.hand = [];
  drawCards(run, fight, HAND_SIZE);
  return events;
}

/** Settle a won fight: gold, the Pressed Rose heal, and the draft offer. */
export function settleFightWin(run, fight) {
  const def = fight.enemy.def;
  const diff = DIFFICULTIES[run.difficulty];
  const gold = Math.round((def.gold + (def.elite ? 8 : 0) + (def.boss ? 40 : 0)) * (1 + (run.floor - 1) * 0.1));
  run.gold += gold;
  run.goldEarned += gold;
  run.kills += 1;
  run.floorsCleared += 1;
  if (hasRelic(run, 'rose')) run.hp = Math.min(run.maxHp, run.hp + 4);
  if (hasRelic(run, 'wax')) run.hp = Math.min(run.maxHp, run.hp + 2);
  if (hasRelic(run, 'ledger')) {
    run.gold += 10;
    run.goldEarned += 10;
  }
  if (def.boss) {
    run.status = 'won';
    return { gold, draft: null };
  }
  run.draft = rollDraft(run, fight.rng);
  return { gold, draft: run.draft };
}

/** Roll the draft offer: 3 tales, or 4 with the Card Catalogue. */
export function rollDraft(run, rng) {
  const n = hasRelic(run, 'catalogue') ? 4 : 3;
  const pool = seededShuffle(rng, CARDS.map((c) => c.id));
  return pool.slice(0, n);
}

/** Take one drafted tale into the deck. */
export function draftPick(run, cardId) {
  if (!run.draft || !run.draft.includes(cardId)) return false;
  run.deck.push(cardId);
  run.draft = null;
  return true;
}

/** Fuse two deck cards (by deck index — decks hold duplicate tales) into one
 * bound card. The two leave the deck; the bound card takes their place and
 * is listed in boundDeck for the win screen. */
export function bindInRun(run, idxA, idxB) {
  if (idxA === idxB || idxA < 0 || idxB < 0 || idxA >= run.deck.length || idxB >= run.deck.length) return null;
  const a = anyCardById(run.deck[idxA]);
  const b = anyCardById(run.deck[idxB]);
  if (!a || !b) return null;
  const bound = bindCards(a, b);
  run.deck.splice(Math.max(idxA, idxB), 1);
  run.deck.splice(Math.min(idxA, idxB), 1);
  run.deck.push(bound.id);
  run.boundDeck.push(bound.id);
  return bound;
}

/** Three shop offers: relics and rare tales, priced in gold. */
export function rollShop(run, rng) {
  const missing = RELICS.filter((r) => !run.relics.includes(r.id));
  const pool = seededShuffle(rng, missing);
  const offers = [];
  for (let i = 0; i < 2 && i < pool.length; i += 1) {
    offers.push({ kind: 'relic', id: pool[i].id, price: pool[i].price });
  }
  const cardPool = seededShuffle(rng, CARDS.map((c) => c.id));
  offers.push({ kind: 'card', id: cardPool[0], price: 45 });
  return offers;
}

/** Buy a shop offer. Returns the bought thing or null. */
export function buyShop(run, offer) {
  if (!offer || run.gold < offer.price) return null;
  run.gold -= offer.price;
  if (offer.kind === 'relic') {
    applyRelicPickup(run, offer.id);
  } else {
    run.deck.push(offer.id);
  }
  return offer;
}

/** Take a relic into the run, applying its at-once effects. */
export function applyRelicPickup(run, relicId) {
  const relic = relicById(relicId);
  if (!relic || run.relics.includes(relicId)) return false;
  run.relics.push(relicId);
  run.relicsFound += 1;
  if (relicId === 'spine') {
    run.maxHp += 8;
    run.hp = Math.min(run.maxHp, run.hp + 8);
  }
  if (relicId === 'satchel') {
    run.gold += 40;
    run.goldEarned += 40;
  }
  return true;
}

/** Rest at a quiet shelf: heal 30% of max HP, or gain +6 max HP instead. */
export function restChoice(run, choice) {
  if (choice === 'maxhp') {
    run.maxHp += 6;
    run.hp = Math.min(run.maxHp, run.hp + 6);
    return '+6 max HP';
  }
  const healed = Math.floor(run.maxHp * 0.3);
  run.hp = Math.min(run.maxHp, run.hp + healed);
  return `Healed ${healed} HP`;
}

/** Enemy definition for a map node. */
export function nodeEnemy(node) {
  if (node.kind === 'boss') return bossDef();
  return enemyById(node.enemy);
}

/** Final score: floors, gold, cards played, HP left, relics and bound tales. */
export function computeScore(run) {
  const diff = DIFFICULTIES[run.difficulty];
  const base = run.floorsCleared * SCORE.perFloor
    + run.goldEarned * SCORE.perGold
    + run.cardsPlayed * SCORE.perCardPlayed
    + run.hp * SCORE.perHpLeft
    + run.relicsFound * SCORE.perRelic
    + run.boundDeck.length * SCORE.perBoundCard
    + (run.status === 'won' ? SCORE.winBonus : 0);
  return Math.round(base * diff.scoreMul);
}

export function runSummary(run) {
  return {
    score: computeScore(run),
    floors: run.floorsCleared,
    cardsPlayed: run.cardsPlayed,
    bestCombo: run.bestCombo,
    relicsFound: run.relicsFound,
    goldEarned: run.goldEarned,
    kills: run.kills,
    damageDealt: run.damageDealt,
    bound: run.boundDeck.slice(),
    erased: run.erased.slice(),
    bossPhase: run.bossPhase,
  };
}

export { WINGS };

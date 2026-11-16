// MARGINALIA — boot and the one loop: input is read every frame, the engine
// advances only on player actions (a card game needs no fixed step), and the
// renderer paints what is there. Screens: title, how-to, options, map, play,
// draft, bind, shop, rest, win, lose, paused.
//
// ?seed=N fixes the run. ?shot=title|play|draft|win (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady.

import { BEST_KEY, DIFFICULTIES, HISTORY_KEY, OPTIONS_KEY, gradeFor } from './config.js';
import { anyCardById, bindCards } from './cards.js';
import { createRandom } from './random.js';
import {
  applyRelicPickup,
  bindInRun,
  buyShop,
  computeScore,
  createRun,
  draftPick,
  endTurn,
  nodeEnemy,
  playCard,
  restChoice,
  rollDraft,
  rollShop,
  runSummary,
  settleFightWin,
  startFight,
} from './engine.js';
import {
  ACTION_CONFIRM,
  ACTION_END_TURN,
  ACTION_ESCAPE,
  ACTION_MUTE,
  ACTION_PAUSE,
  ACTION_RESTART,
  ACTION_SAME_SEED,
  createInput,
} from './input.js';
import {
  SCREEN_BIND,
  SCREEN_DRAFT,
  SCREEN_HOWTO,
  SCREEN_LOSE,
  SCREEN_MAP,
  SCREEN_OPTIONS,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_REST,
  SCREEN_SHOP,
  SCREEN_TITLE,
  SCREEN_WIN,
  createRenderer,
  layoutFor,
} from './render.js';
import { stageShot } from './shots.js';
import {
  isMuted,
  setMuted,
  sfxBind,
  sfxBlock,
  sfxCoin,
  sfxDamage,
  sfxDraft,
  sfxHeal,
  sfxHurt,
  sfxLose,
  sfxPlay,
  sfxTurn,
  sfxWin,
  unlockAudio,
} from './audio.js';

// The game in one line, up front: a roguelike deck-builder — bind two tales
// into one stronger tale, clear five wings, and unwrite the Eraser. The
// title screen shows the same line (GAME_CONTENTS in config.js); this literal
// is kept identical to it — the smoke test asserts the two match — so the
// outline reads the counts here in the first file, not only in config.js.
// The boot announcement below speaks it.
export const GAME_LINE = '18 tales · 18 relics · 10 foes · binding · 5 wings · 3 difficulties';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 417;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);

function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be off (private windows): bests then last this visit only.
  }
}

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function runShot(name) {
  const staged = stageShot(name, seed);
  let painted = 0;
  function paint() {
    renderer.draw(staged.view, staged.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  const options = readJson(OPTIONS_KEY, { muted: false });
  setMuted(!!options.muted);
  let best = readJson(BEST_KEY, { dusty: 0, archival: 0, forbidden: 0 });
  let history = readJson(HISTORY_KEY, []);
  let screen = SCREEN_TITLE;
  let difficulty = 'dusty';
  let rng = createRandom(seed);
  let run = createRun(rng, difficulty, seed);
  let fight = null;
  let shop = [];
  let bindSel = [];
  let bindPreviewCard = null;
  let draftPicked = false;
  let draftPickedId = null;
  let message = '';
  let messageAt = 0;
  let summary = null;
  let runStartedAt = performance.now();
  let pausedFrom = SCREEN_PLAY;
  let layout = layoutFor(screen, currentView());

  function currentView() {
    return {
      run,
      fight,
      difficulty,
      best,
      history,
      muted: isMuted(),
      seed: run.seed,
      hover: input.hover(),
      score: computeScore(run),
      bindSel,
      shop,
      draftPicked,
      draftPickedId,
      bindPreviewCard,
      message: performance.now() - messageAt < 2600 ? message : '',
      showNextIntent: run.relics.includes('spectacles') || (fight && fight.peeked),
      summary,
    };
  }

  function announce(msg) {
    status.textContent = msg;
  }

  function say(msg) {
    message = msg;
    messageAt = performance.now();
  }

  function newRun(newSeed, diffId) {
    rng = createRandom(newSeed);
    run = createRun(rng, diffId, newSeed);
    fight = null;
    shop = [];
    bindSel = [];
    bindPreviewCard = null;
    draftPicked = false;
    draftPickedId = null;
    summary = null;
    runStartedAt = performance.now();
    screen = SCREEN_MAP;
    announce(`Wing 1. Choose your path.`);
  }

  function enterNode(node) {
    run.node = node;
    if (node.kind === 'fight' || node.kind === 'elite' || node.kind === 'boss') {
      fight = startFight(run, rng, nodeEnemy(node));
      screen = SCREEN_PLAY;
      announce(`${fight.enemy.def.name}. ${fight.enemy.def.blurb}`);
    } else if (node.kind === 'rest') {
      screen = SCREEN_REST;
      announce('A quiet shelf. Rest or study.');
    } else if (node.kind === 'shop') {
      shop = rollShop(run, rng);
      screen = SCREEN_SHOP;
      announce('The Reading Room. Spend your gold.');
    }
  }

  function nextWing() {
    run.floor += 1;
    bindSel = [];
    bindPreviewCard = null;
    draftPicked = false;
    draftPickedId = null;
    shop = [];
    if (run.floor > 5) {
      endRun(true);
      return;
    }
    screen = SCREEN_MAP;
    announce(`Wing ${run.floor}. Choose your path.`);
  }

  function recordHistory(result) {
    const entry = { result, difficulty: DIFFICULTIES[run.difficulty].name, score: computeScore(run), floor: run.floorsCleared };
    history = [entry, ...history].slice(0, 3);
    writeJson(HISTORY_KEY, history);
    const sc = computeScore(run);
    const prevBest = best[run.difficulty] || 0;
    if (sc > prevBest) {
      best[run.difficulty] = sc;
      writeJson(BEST_KEY, best);
      return { newBest: true, overBest: sc - prevBest };
    }
    return { newBest: false, overBest: sc - prevBest };
  }

  function endRun(won) {
    const { newBest, overBest } = recordHistory(won ? 'WON' : 'LOST');
    const s = runSummary(run);
    summary = {
      ...s,
      grade: gradeFor(s.score),
      newBest,
      overBest: Math.max(0, overBest),
      time: formatTime(performance.now() - runStartedAt),
    };
    screen = won ? SCREEN_WIN : SCREEN_LOSE;
    if (won) sfxWin();
    else sfxLose();
    announce(won ? `Victory. The Eraser is unwritten. Score ${s.score}.` : `Defeat. Score ${s.score}.`);
  }

  function onFightWon() {
    const res = settleFightWin(run, fight);
    sfxCoin();
    if (run.status === 'won') {
      endRun(true);
      return;
    }
    shop = rollShop(run, rng);
    draftPicked = false;
    draftPickedId = null;
    bindSel = [];
    bindPreviewCard = null;
    screen = SCREEN_DRAFT;
    announce(`Wing ${run.floor} cleared. Pick a new tale.`);
  }

  function playCardAt(index) {
    if (!fight || screen !== SCREEN_PLAY) return;
    const events = playCard(run, fight, index);
    for (const e of events) {
      if (e.type === 'damage') sfxDamage(e.amount);
      else if (e.type === 'block') sfxBlock();
      else if (e.type === 'heal') sfxHeal();
      else if (e.type === 'denied') say(e.text);
      else sfxPlay();
    }
    if (fight.status === 'won') onFightWon();
    else if (fight.status === 'lost') endRun(false);
  }

  function endPlayerTurn() {
    if (!fight || screen !== SCREEN_PLAY) return;
    const events = endTurn(run, fight);
    sfxTurn();
    for (const e of events) {
      if (e.type === 'hurt') sfxHurt();
      else if (e.type === 'phase') say(e.text);
      else if (e.type === 'erase') say(e.text);
    }
    if (fight.status === 'lost') endRun(false);
  }

  function refreshBindPreview() {
    if (bindSel.length === 2) {
      const a = anyCardById(run.deck[bindSel[0]]);
      const b = anyCardById(run.deck[bindSel[1]]);
      bindPreviewCard = a && b ? bindCards(a, b) : null;
    } else bindPreviewCard = null;
  }

  function doBind() {
    if (bindSel.length !== 2) return;
    const bound = bindInRun(run, bindSel[0], bindSel[1]);
    if (bound) {
      sfxBind();
      say(`Bound: ${bound.name}!`);
      announce(`Bound ${bound.name}.`);
    }
    bindSel = [];
    bindPreviewCard = null;
    if (screen === SCREEN_BIND) screen = SCREEN_DRAFT;
  }

  function handleClick(click) {
    if (!click) return;
    const L = layout;
    const inRect = (r) => r && click.x >= r.x && click.x <= r.x + r.w && click.y >= r.y && click.y <= r.y + r.h;
    // Difficulty select on the title.
    if (screen === SCREEN_TITLE) {
      for (const d of L.diffs) {
        if (inRect(d)) {
          difficulty = d.id;
          return;
        }
      }
    }
    // Hand cards.
    if (screen === SCREEN_PLAY) {
      for (const slot of L.handCards) {
        if (inRect(slot)) {
          playCardAt(slot.index);
          return;
        }
      }
    }
    // Draft cards.
    if (screen === SCREEN_DRAFT) {
      for (const slot of L.draftCards) {
        if (inRect(slot) && !draftPicked) {
          if (draftPick(run, slot.id)) {
            draftPicked = true;
            draftPickedId = slot.id;
            sfxDraft();
            say(`You took ${(anyCardById(slot.id) || {}).name}.`);
          }
          return;
        }
      }
      for (const offer of L.shopOffers) {
        if (inRect(offer)) {
          const bought = buyShop(run, offer);
          if (bought) {
            sfxCoin();
            shop = shop.filter((o) => o !== offer);
            say(bought.kind === 'relic' ? `Relic gained.` : `Tale added to your deck.`);
          } else say('Not enough gold.');
          return;
        }
      }
      // The two example tales in the bind panel are the way in: clicking
      // one opens the bind screen. (They used to be display-only, so a
      // player who followed the panel's "click two cards" line clicked
      // them, nothing happened, and binding looked dead.)
      for (const slot of L.bindSlots || []) {
        if (inRect(slot)) {
          screen = SCREEN_BIND;
          return;
        }
      }
    }
    // Bind screen deck cards (bindSel holds deck indices — decks hold duplicates).
    if (screen === SCREEN_BIND) {
      for (const slot of L.bindCards) {
        if (inRect(slot)) {
          const at = bindSel.indexOf(slot.index);
          if (at >= 0) bindSel.splice(at, 1);
          else if (bindSel.length < 2) bindSel.push(slot.index);
          else {
            bindSel.shift();
            bindSel.push(slot.index);
          }
          refreshBindPreview();
          return;
        }
      }
    }
    // Shop screen offers.
    if (screen === SCREEN_SHOP) {
      for (const offer of L.shopOffers) {
        if (inRect(offer)) {
          const bought = buyShop(run, offer);
          if (bought) {
            sfxCoin();
            shop = shop.filter((o) => o !== offer);
            say(bought.kind === 'relic' ? 'Relic gained.' : 'Tale added to your deck.');
          } else say('Not enough gold.');
          return;
        }
      }
    }
    // Buttons.
    for (const b of L.buttons) {
      if (b.disabled || !inRect(b)) continue;
      unlockAudio();
      switch (b.id) {
        case 'play':
          newRun(seed, difficulty);
          return;
        case 'howto':
          screen = SCREEN_HOWTO;
          return;
        case 'options':
          screen = SCREEN_OPTIONS;
          return;
        case 'back':
          screen = SCREEN_TITLE;
          return;
        case 'sound':
          setMuted(!isMuted());
          writeJson(OPTIONS_KEY, { muted: isMuted() });
          return;
        case 'menu':
          screen = SCREEN_TITLE;
          return;
        case 'endturn':
          endPlayerTurn();
          return;
        case 'pause':
          pausedFrom = SCREEN_PLAY;
          screen = SCREEN_PAUSED;
          return;
        case 'mute':
          setMuted(!isMuted());
          writeJson(OPTIONS_KEY, { muted: isMuted() });
          return;
        case 'restart':
          newRun(seed, difficulty);
          return;
        case 'resume':
          screen = pausedFrom;
          return;
        case 'reroll':
          if (run.gold >= 20 && !draftPicked) {
            run.gold -= 20;
            run.draft = rollDraft(run, rng);
            sfxDraft();
          }
          return;
        case 'bind':
          if (screen === SCREEN_DRAFT) {
            screen = SCREEN_BIND;
          } else {
            doBind();
          }
          return;
        case 'done':
          screen = SCREEN_DRAFT;
          return;
        case 'continue':
          nextWing();
          return;
        case 'heal':
          say(restChoice(run, 'heal'));
          sfxHeal();
          nextWing();
          return;
        case 'maxhp':
          say(restChoice(run, 'maxhp'));
          sfxHeal();
          nextWing();
          return;
        case 'sameseed':
          newRun(run.seed, difficulty);
          return;
        default:
          break;
      }
      if (b.id.startsWith('node')) {
        const idx = Number(b.id.slice(4));
        const node = run.map[run.floor - 1].options[idx];
        if (node) enterNode(node);
        return;
      }
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      setMuted(!isMuted());
      writeJson(OPTIONS_KEY, { muted: isMuted() });
    }
    if (actions & ACTION_RESTART && (screen === SCREEN_PLAY || screen === SCREEN_PAUSED || screen === SCREEN_WIN || screen === SCREEN_LOSE)) {
      unlockAudio();
      newRun(seed, difficulty);
      return;
    }
    if (actions & ACTION_SAME_SEED && (screen === SCREEN_WIN || screen === SCREEN_LOSE)) {
      newRun(run.seed, difficulty);
      return;
    }
    if (actions & ACTION_ESCAPE && (screen === SCREEN_WIN || screen === SCREEN_LOSE || screen === SCREEN_PAUSED || screen === SCREEN_HOWTO || screen === SCREEN_OPTIONS)) {
      screen = SCREEN_TITLE;
      return;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        pausedFrom = SCREEN_PLAY;
        screen = SCREEN_PAUSED;
      } else if (screen === SCREEN_PAUSED) screen = pausedFrom;
      return;
    }
    if (actions & ACTION_END_TURN && screen === SCREEN_PLAY) endPlayerTurn();
    if (actions & ACTION_CONFIRM) {
      unlockAudio();
      if (screen === SCREEN_TITLE) newRun(seed, difficulty);
      else if (screen === SCREEN_WIN || screen === SCREEN_LOSE) newRun(seed, difficulty);
      else if (screen === SCREEN_PAUSED) screen = pausedFrom;
    }
  }

  function handleKeys() {
    // Number keys 1-5 play hand cards; handled via keydown polling is not
    // available, so number keys are read through the input queue in main loop
    // below (see frame()).
  }

  function frame() {
    requestAnimationFrame(frame);
    handleActions();
    handleClick(input.takeClick());
    handleKeys();
    layout = renderer.draw(currentView(), screen);
  }

  // Number keys play hand cards: a tiny keydown listener of our own.
  window.addEventListener('keydown', (e) => {
    if (screen !== SCREEN_PLAY || !fight) return;
    const n = Number.parseInt(e.key, 10);
    if (n >= 1 && n <= fight.hand.length) playCardAt(n - 1);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      pausedFrom = SCREEN_PLAY;
      screen = SCREEN_PAUSED;
    }
  });

  announce(`Marginalia — ${GAME_LINE}. Choose a difficulty and press Play.`);
  window.__marginalia = {
    get screen() { return screen; },
    get run() { return run; },
    get fight() { return fight; },
    get summary() { return summary; },
    get layout() { return layout; },
  };
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

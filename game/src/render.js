// MARGINALIA — every pixel the game draws. Canvas 2D, warm parchment + ink +
// candlelight, no assets: shelves, candles, dust, cards and ink-creatures are
// all drawn from code. layoutFor() computes the same hit regions the renderer
// paints, so clicks always land where the eye expects them.

import { DIFFICULTIES, DIFFICULTY_ORDER, FIELD, FONT, FONT_UI, PALETTE } from './config.js';
import { anyCardById, cardById } from './cards.js';
import { bossDef, enemyById } from './enemies.js';
import { cardCost, enemyIntent } from './engine.js';
import { relicById } from './relics.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_HOWTO = 'howto';
export const SCREEN_OPTIONS = 'options';
export const SCREEN_MAP = 'map';
export const SCREEN_PLAY = 'play';
export const SCREEN_DRAFT = 'draft';
export const SCREEN_BIND = 'bind';
export const SCREEN_SHOP = 'shop';
export const SCREEN_REST = 'rest';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSE = 'lose';
export const SCREEN_PAUSED = 'paused';

// Deterministic shelf books and dust motes: fixed arrays, so every frame and
// every screenshot paints the same library.
const BOOKS = [];
{
  let s = 417;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let shelf = 0; shelf < 4; shelf += 1) {
    const row = [];
    let x = 0;
    while (x < 1280) {
      const w = 14 + rnd() * 22;
      row.push({ x, w, h: 46 + rnd() * 34, c: ['#7a4a2b', '#4a6b3a', '#8a2f2f', '#3a5a7a', '#6b5a8a', '#a8842f'][Math.floor(rnd() * 6)] });
      x += w + 2;
    }
    BOOKS.push(row);
  }
}
const DUST = [];
{
  let s = 99;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = 0; i < 60; i += 1) DUST.push({ x: rnd() * 1280, y: rnd() * 880, r: 0.8 + rnd() * 1.8, a: 0.12 + rnd() * 0.3 });
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, font = FONT_UI, align = 'left', weight = '') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

function wrapText(ctx, str, x, y, maxW, size, color, font = FONT_UI, lineH = null) {
  ctx.fillStyle = color;
  ctx.font = `${size}px ${font}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const words = String(str).split(' ');
  let line = '';
  let cy = y;
  const lh = lineH || size + 5;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, cy);
      line = w;
      cy += lh;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, cy);
  return cy;
}

function drawBackground(ctx, dim = 0) {
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  // Shelves: four rows of book spines across the whole field.
  for (let s = 0; s < BOOKS.length; s += 1) {
    const y = 60 + s * 210;
    ctx.fillStyle = PALETTE.shelf;
    ctx.fillRect(0, y + 78, 1280, 10);
    ctx.fillStyle = PALETTE.shelfEdge;
    ctx.fillRect(0, y + 78, 1280, 3);
    for (const b of BOOKS[s]) {
      ctx.fillStyle = b.c;
      ctx.fillRect(b.x, y + 82 - b.h, b.w, b.h);
      ctx.fillStyle = 'rgba(242,230,200,0.25)';
      ctx.fillRect(b.x + 2, y + 82 - b.h + 6, b.w - 4, 2);
    }
  }
  // Candle glow, left and right.
  for (const cx of [70, 1210]) {
    const g = ctx.createRadialGradient(cx, 700, 8, cx, 700, 190);
    g.addColorStop(0, 'rgba(255,190,90,0.30)');
    g.addColorStop(1, 'rgba(255,190,90,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 190, 510, 380, 380);
    ctx.fillStyle = '#e8dcc0';
    ctx.fillRect(cx - 7, 700, 14, 42);
    ctx.fillStyle = PALETTE.flame;
    ctx.beginPath();
    ctx.ellipse(cx, 688, 7, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath();
    ctx.ellipse(cx, 692, 3, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Floating dust.
  for (const d of DUST) {
    ctx.fillStyle = `rgba(242,230,200,${d.a})`;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  }
  if (dim > 0) {
    ctx.fillStyle = `rgba(10,16,10,${dim})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }
}

function drawPanel(ctx, x, y, w, h, fill = 'rgba(24,18,10,0.82)', edge = PALETTE.panelEdge) {
  rr(ctx, x, y, w, h, 10);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawButton(ctx, b, hover) {
  const hot = hover && b.x <= hover.x && hover.x <= b.x + b.w && b.y <= hover.y && hover.y <= b.y + b.h;
  rr(ctx, b.x, b.y, b.w, b.h, 8);
  ctx.fillStyle = b.disabled ? 'rgba(60,50,35,0.8)' : hot ? '#8a6d3b' : '#5a4526';
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(ctx, b.label, b.x + b.w / 2, b.y + b.h / 2 + 6, b.size || 17, b.disabled ? '#8a7a5a' : '#fbf3dc', FONT_UI, 'center', '600');
  if (b.sub) text(ctx, b.sub, b.x + b.w / 2, b.y + b.h - 8, 11, '#d9c9a0', FONT_UI, 'center');
}

/** Small ink illustration for a card, drawn from its id. */
export function drawGlyph(ctx, id, cx, cy, s, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, s * 0.08);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const u = s / 2;
  switch (id) {
    case 'thorn': {
      ctx.beginPath();
      ctx.moveTo(cx - u, cy + u * 0.7);
      ctx.lineTo(cx - u * 0.3, cy - u * 0.6);
      ctx.lineTo(cx + u * 0.2, cy + u * 0.5);
      ctx.lineTo(cx + u, cy - u * 0.8);
      ctx.stroke();
      break;
    }
    case 'nettle': {
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath();
        ctx.moveTo(cx, cy + u * 0.8);
        ctx.lineTo(cx + i * u * 0.4, cy - u * 0.8 + Math.abs(i) * u * 0.2);
        ctx.stroke();
      }
      break;
    }
    case 'root': {
      ctx.beginPath();
      ctx.moveTo(cx, cy - u);
      ctx.quadraticCurveTo(cx - u, cy, cx - u * 0.5, cy + u);
      ctx.moveTo(cx, cy - u);
      ctx.quadraticCurveTo(cx + u, cy, cx + u * 0.5, cy + u);
      ctx.stroke();
      break;
    }
    case 'bookmark': {
      ctx.beginPath();
      ctx.moveTo(cx - u * 0.6, cy - u);
      ctx.lineTo(cx + u * 0.6, cy - u);
      ctx.lineTo(cx + u * 0.6, cy + u * 0.6);
      ctx.lineTo(cx, cy + u * 0.2);
      ctx.lineTo(cx - u * 0.6, cy + u * 0.6);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'dogear': {
      ctx.strokeRect(cx - u * 0.7, cy - u * 0.8, u * 1.4, u * 1.6);
      ctx.beginPath();
      ctx.moveTo(cx + u * 0.7, cy - u * 0.8);
      ctx.lineTo(cx + u * 0.1, cy - u * 0.2);
      ctx.lineTo(cx + u * 0.7, cy - u * 0.2);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'quill': {
      ctx.beginPath();
      ctx.ellipse(cx, cy, u * 0.5, u, -0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + u * 0.4, cy + u * 0.9);
      ctx.lineTo(cx - u * 0.5, cy - u * 0.9);
      ctx.stroke();
      break;
    }
    case 'margin': {
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(cx - u, cy - u * 0.6 + i * u * 0.6);
        ctx.lineTo(cx + u * 0.5, cy - u * 0.6 + i * u * 0.6);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(cx + u * 0.8, cy - u);
      ctx.lineTo(cx + u * 0.8, cy + u);
      ctx.stroke();
      break;
    }
    case 'inkwell': {
      ctx.beginPath();
      ctx.ellipse(cx, cy + u * 0.3, u * 0.7, u * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - u * 0.7, cy - u * 0.2);
      ctx.lineTo(cx + u * 0.7, cy - u * 0.2);
      ctx.stroke();
      break;
    }
    case 'flower': {
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(a) * u * 0.5, cy + Math.sin(a) * u * 0.5, u * 0.35, u * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = PALETTE.goldBright;
      ctx.beginPath();
      ctx.arc(cx, cy, u * 0.25, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'torn': {
      ctx.beginPath();
      ctx.moveTo(cx - u * 0.7, cy - u);
      ctx.lineTo(cx - u * 0.2, cy - u * 0.4);
      ctx.lineTo(cx - u * 0.6, cy);
      ctx.lineTo(cx - u * 0.1, cy + u * 0.4);
      ctx.lineTo(cx - u * 0.5, cy + u);
      ctx.lineTo(cx + u * 0.6, cy + u);
      ctx.lineTo(cx + u * 0.6, cy - u);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case 'catalogue': {
      ctx.strokeRect(cx - u * 0.7, cy - u, u * 1.4, u * 2);
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(cx - u * 0.4, cy - u * 0.5 + i * u * 0.5);
        ctx.lineTo(cx + u * 0.4, cy - u * 0.5 + i * u * 0.5);
        ctx.stroke();
      }
      break;
    }
    case 'jacket': {
      ctx.strokeRect(cx - u * 0.8, cy - u, u * 1.6, u * 2);
      ctx.beginPath();
      ctx.moveTo(cx - u * 0.2, cy - u);
      ctx.lineTo(cx - u * 0.2, cy + u);
      ctx.stroke();
      break;
    }
    case 'footnote': {
      text(ctx, '*', cx, cy + u * 0.6, s * 1.6, color, FONT, 'center', '700');
      break;
    }
    case 'colophon': {
      ctx.beginPath();
      ctx.arc(cx, cy, u * 0.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, u * 0.35, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'vellum': {
      // A shield outline: straight top, curved sides meeting at a point.
      ctx.beginPath();
      ctx.moveTo(cx - u * 0.7, cy - u * 0.8);
      ctx.lineTo(cx + u * 0.7, cy - u * 0.8);
      ctx.lineTo(cx + u * 0.7, cy + u * 0.1);
      ctx.quadraticCurveTo(cx + u * 0.7, cy + u * 0.7, cx, cy + u);
      ctx.quadraticCurveTo(cx - u * 0.7, cy + u * 0.7, cx - u * 0.7, cy + u * 0.1);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case 'storm': {
      // Three slashing rain strokes.
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.moveTo(cx + i * u * 0.55 - u * 0.25, cy - u * 0.85);
        ctx.lineTo(cx + i * u * 0.55 + u * 0.25, cy + u * 0.85);
        ctx.stroke();
      }
      break;
    }
    default: {
      ctx.beginPath();
      ctx.arc(cx, cy, u * 0.6, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
  }
}

/** One parchment tale-card. */
export function drawCard(ctx, card, x, y, w, h, opts = {}) {
  const sel = opts.selected;
  const playable = opts.playable !== false;
  const baseId = card.id.startsWith('bound:') ? 'colophon' : card.id;
  rr(ctx, x, y, w, h, 10);
  ctx.fillStyle = card.kind === 'bound' ? '#f7e8b8' : PALETTE.paper;
  ctx.fill();
  ctx.strokeStyle = card.kind === 'bound' ? PALETTE.gold : sel ? PALETTE.goldBright : '#8a6d3b';
  ctx.lineWidth = sel ? 4 : 2;
  ctx.stroke();
  if (card.kind === 'bound') {
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(x, y, w, 8);
    ctx.fillRect(x, y + h - 8, w, 8);
  }
  // Cost ink-drop.
  ctx.fillStyle = PALETTE.inkBlue;
  ctx.beginPath();
  ctx.arc(x + 20, y + 20, 15, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, String(card.cost), x + 20, y + 26, 17, '#fff', FONT_UI, 'center', '700');
  // Kind tag.
  const kindColor = card.kind === 'attack' ? PALETTE.red : card.kind === 'bound' ? PALETTE.gold : PALETTE.green;
  text(ctx, (card.kind || 'skill').toUpperCase(), x + w - 10, y + 22, 10, kindColor, FONT_UI, 'right', '700');
  // Name.
  text(ctx, card.name, x + w / 2, y + 48, Math.min(17, w / Math.max(6, card.name.length) * 1.9), PALETTE.ink, FONT, 'center', '700');
  // Illustration.
  ctx.fillStyle = 'rgba(42,33,24,0.06)';
  ctx.fillRect(x + 12, y + 58, w - 24, h * 0.34);
  drawGlyph(ctx, baseId, x + w / 2, y + 58 + h * 0.17, Math.min(52, h * 0.2), '#2a2118');
  // Rules text.
  ctx.save();
  wrapText(ctx, card.text, x + 12, y + 58 + h * 0.34 + 22, w - 24, 13, PALETTE.inkSoft, FONT_UI, 17);
  ctx.restore();
  if (!playable) {
    ctx.fillStyle = 'rgba(20,16,10,0.45)';
    rr(ctx, x, y, w, h, 10);
    ctx.fill();
  }
  if (opts.tag) {
    rr(ctx, x + w / 2 - 44, y + h - 26, 88, 20, 10);
    ctx.fillStyle = PALETTE.gold;
    ctx.fill();
    text(ctx, opts.tag, x + w / 2, y + h - 12, 11, '#241a08', FONT_UI, 'center', '700');
  }
}

function drawHpBar(ctx, x, y, w, h, hp, maxHp, label) {
  rr(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fill();
  const frac = Math.max(0, hp / maxHp);
  if (frac > 0) {
    rr(ctx, x + 2, y + 2, (w - 4) * frac, h - 4, (h - 4) / 2);
    ctx.fillStyle = frac > 0.5 ? PALETTE.greenSoft : frac > 0.25 ? PALETTE.goldBright : PALETTE.hp;
    ctx.fill();
  }
  text(ctx, `${label} ${hp}/${maxHp}`, x + w / 2, y + h - 5, 13, '#fff', FONT_UI, 'center', '700');
}

function drawEnemy(ctx, def, cx, cy, s, phase) {
  const c = def.color;
  ctx.save();
  ctx.translate(cx, cy);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, s * 0.85, s * 0.9, s * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c;
  ctx.strokeStyle = 'rgba(20,12,6,0.7)';
  ctx.lineWidth = 3;
  // Set by a shape that draws its own eyes (the hound's sit on its head).
  let skipEyes = false;
  switch (def.shape) {
    case 'worm': {
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.arc(-s * 0.6 + i * s * 0.4, Math.sin(i * 0.9) * s * 0.12, s * 0.34, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case 'blot': {
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2);
      ctx.arc(s * 0.5, -s * 0.3, s * 0.35, 0, Math.PI * 2);
      ctx.arc(-s * 0.5, s * 0.25, s * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'page': {
      ctx.save();
      ctx.rotate(0.12);
      ctx.fillRect(-s * 0.55, -s * 0.7, s * 1.1, s * 1.4);
      ctx.strokeRect(-s * 0.55, -s * 0.7, s * 1.1, s * 1.4);
      ctx.restore();
      break;
    }
    case 'mite': {
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = c;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(-s * 0.3 + i * s * 0.3, s * 0.3);
        ctx.lineTo(-s * 0.5 + i * s * 0.5, s * 0.8);
        ctx.stroke();
      }
      break;
    }
    case 'fish': {
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.8, s * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.7, 0);
      ctx.lineTo(s * 1.15, -s * 0.4);
      ctx.lineTo(s * 1.15, s * 0.4);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'imp': {
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, -s * 0.45);
      ctx.lineTo(-s * 0.55, -s * 0.95);
      ctx.lineTo(-s * 0.15, -s * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s * 0.4, -s * 0.45);
      ctx.lineTo(s * 0.55, -s * 0.95);
      ctx.lineTo(s * 0.15, -s * 0.6);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'hound': {
      // An ink hound, facing right: tail, four legs, long body, head with a
      // snout and two pointed ears, ink dripping off it. Drawn in its own
      // dark violet; its eyes sit on the head, not the body (see skipEyes).
      skipEyes = true;
      ctx.strokeStyle = c;
      ctx.lineWidth = Math.max(3, s * 0.13);
      // Tail, curling up from the rear.
      ctx.beginPath();
      ctx.moveTo(-s * 0.78, s * 0.05);
      ctx.quadraticCurveTo(-s * 1.15, -s * 0.15, -s * 1.05, -s * 0.55);
      ctx.stroke();
      // Four legs down to the ground line.
      for (const lx of [-0.55, -0.32, 0.38, 0.58]) {
        ctx.beginPath();
        ctx.moveTo(lx * s, s * 0.35);
        ctx.lineTo(lx * s, s * 0.82);
        ctx.stroke();
      }
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(20,12,6,0.7)';
      // Body.
      ctx.beginPath();
      ctx.ellipse(0, s * 0.15, s * 0.8, s * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Head.
      ctx.beginPath();
      ctx.arc(s * 0.72, -s * 0.38, s * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Snout, tapering to the right, with a dark nose.
      ctx.beginPath();
      ctx.moveTo(s * 0.95, -s * 0.55);
      ctx.lineTo(s * 1.32, -s * 0.4);
      ctx.lineTo(s * 1.32, -s * 0.14);
      ctx.lineTo(s * 0.95, -s * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1a1208';
      ctx.beginPath();
      ctx.arc(s * 1.28, -s * 0.32, s * 0.07, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c;
      // Two pointed ears.
      ctx.beginPath();
      ctx.moveTo(s * 0.5, -s * 0.62);
      ctx.lineTo(s * 0.45, -s * 1.02);
      ctx.lineTo(s * 0.78, -s * 0.68);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.82, -s * 0.68);
      ctx.lineTo(s * 0.95, -s * 1.05);
      ctx.lineTo(s * 1.08, -s * 0.62);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Ink drips under the body and off the snout.
      ctx.fillStyle = c;
      for (const [dx, dy, dr] of [[-0.3, 0.72, 0.07], [0.05, 0.78, 0.05], [1.2, 0.05, 0.06]]) {
        ctx.beginPath();
        ctx.arc(dx * s, dy * s, dr * s, 0, Math.PI * 2);
        ctx.fill();
      }
      // Eyes on the head.
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(s * 0.6, -s * 0.48, s * 0.09, 0, Math.PI * 2);
      ctx.arc(s * 0.86, -s * 0.5, s * 0.09, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1208';
      ctx.beginPath();
      ctx.arc(s * 0.63, -s * 0.48, s * 0.045, 0, Math.PI * 2);
      ctx.arc(s * 0.89, -s * 0.5, s * 0.045, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'wasp': {
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.7, s * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#241a08';
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, -s * 0.4);
      ctx.lineTo(-s * 0.2, s * 0.4);
      ctx.moveTo(s * 0.15, -s * 0.42);
      ctx.lineTo(s * 0.15, s * 0.42);
      ctx.stroke();
      ctx.fillStyle = 'rgba(251,243,220,0.75)';
      ctx.beginPath();
      ctx.ellipse(-s * 0.2, -s * 0.55, s * 0.4, s * 0.18, -0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'eraser': {
      rr(ctx, -s * 0.9, -s * 0.6, s * 1.8, s * 1.2, s * 0.2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = phase === 2 ? '#b3402e' : '#7a6a4a';
      ctx.fillRect(-s * 0.9, -s * 0.6, s * 1.8, s * 0.35);
      if (phase === 2) {
        ctx.strokeStyle = '#b3402e';
        ctx.beginPath();
        ctx.moveTo(-s * 0.5, -s * 0.6);
        ctx.lineTo(s * 0.2, s * 0.1);
        ctx.moveTo(s * 0.4, -s * 0.6);
        ctx.lineTo(-s * 0.1, s * 0.4);
        ctx.stroke();
      }
      break;
    }
    default: {
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  // Eyes — every Inkblight thing watches the librarian, unless the shape
  // drew its own (the hound's eyes sit on its head).
  if (!skipEyes) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-s * 0.22, -s * 0.15, s * 0.11, 0, Math.PI * 2);
    ctx.arc(s * 0.22, -s * 0.15, s * 0.11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1208';
    ctx.beginPath();
    ctx.arc(-s * 0.22, -s * 0.15, s * 0.05, 0, Math.PI * 2);
    ctx.arc(s * 0.22, -s * 0.15, s * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Hit regions for a screen, computed from the same numbers the painter uses. */
export function layoutFor(screen, view) {
  const L = { buttons: [], cards: [], handCards: [], draftCards: [], bindCards: [], shopOffers: [], mapNodes: [], diffs: [] };
  const btn = (id, x, y, w, h, label, extra = {}) => {
    const b = { id, x, y, w, h, label, ...extra };
    L.buttons.push(b);
    return b;
  };
  if (screen === SCREEN_TITLE) {
    DIFFICULTY_ORDER.forEach((id, i) => {
      L.diffs.push({ id, x: 340 + i * 200, y: 470, w: 180, h: 92 });
    });
    btn('play', 490, 592, 300, 56, 'PLAY — OPEN THE LIBRARY', { size: 20 });
    btn('howto', 490, 658, 145, 44, 'HOW TO PLAY');
    btn('options', 645, 658, 145, 44, 'OPTIONS');
    // Fanned hand of three cards, right side — stepped wide and barely
    // tilted, so every name and rules line stays fully legible.
    const fan = ['thorn', 'bookmark', 'quill'];
    fan.forEach((id, i) => {
      L.cards.push({ id, index: i, x: 920 + i * 110, y: 250 + Math.abs(i - 1) * 20, w: 128, h: 180, tilt: (i - 1) * 0.05 });
    });
  } else if (screen === SCREEN_HOWTO || screen === SCREEN_OPTIONS) {
    btn('back', 490, 780, 300, 48, 'BACK TO THE TITLE');
    if (screen === SCREEN_OPTIONS) btn('sound', 490, 560, 300, 48, view.muted ? 'SOUND: OFF — CLICK FOR ON' : 'SOUND: ON — CLICK FOR OFF');
  } else if (screen === SCREEN_MAP) {
    const run = view.run;
    const floor = run.map[run.floor - 1];
    floor.options.forEach((opt, i) => {
      const x = 340 + i * 300;
      let enemyName = '';
      let enemyBlurb = '';
      if (opt.kind === 'boss') {
        const b = bossDef();
        enemyName = b.name;
        enemyBlurb = b.blurb;
      } else if (opt.enemy) {
        const e = enemyById(opt.enemy);
        if (e) {
          enemyName = e.name;
          enemyBlurb = e.blurb;
        }
      }
      L.mapNodes.push({ ...opt, enemyName, enemyBlurb, x, y: 330, w: 260, h: 210, index: i });
      btn(`node${i}`, x + 55, 480, 150, 40, 'ENTER', { size: 15 });
    });
    btn('menu', 40, 24, 120, 36, 'MENU', { size: 14 });
  } else if (screen === SCREEN_PLAY) {
    const fight = view.fight;
    const n = fight.hand.length;
    const cw = 150;
    const gap = 12;
    const total = n * cw + (n - 1) * gap;
    let x = (FIELD.width - total) / 2;
    fight.hand.forEach((id, i) => {
      const card = anyCardById(id);
      const cost = cardCost(view.run, fight, card);
      L.handCards.push({ id, index: i, x, y: 648, w: cw, h: 210, playable: fight.ink >= cost });
      x += cw + gap;
    });
    // The three density strips painted between the panels and the relics row.
    L.mapStrip = { x: 24, y: 392, w: 1232, h: 54 };
    L.movesStrip = { x: 24, y: 454, w: 1232, h: 52 };
    L.deckStrip = { x: 24, y: 514, w: 1232, h: 46 };
    btn('endturn', 1090, 600, 150, 48, 'END TURN  [E]', { size: 16 });
    btn('pause', 1090, 24, 46, 34, 'II', { size: 15 });
    btn('mute', 1142, 24, 46, 34, view.muted ? 'MUTE' : 'SOUND', { size: 11 });
    btn('restart', 1194, 24, 46, 34, 'R', { size: 15 });
  } else if (screen === SCREEN_DRAFT) {
    const draft = view.run.draft || [];
    const cw = 200;
    const total = draft.length * cw + (draft.length - 1) * 16;
    let x = (FIELD.width - total) / 2;
    draft.forEach((id, i) => {
      L.draftCards.push({ id, index: i, x, y: 148, w: cw, h: 232 });
      x += cw + 16;
    });
    // Deck + next-wing strips between the draft cards and the bind/shop panels.
    L.draftDeckStrip = { x: 40, y: 390, w: 1200, h: 32 };
    L.forecastStrip = { x: 40, y: 428, w: 1200, h: 30 };
    // Bind panel: two slots + preview, bottom left.
    L.bindSlots = [
      { x: 60, y: 520, w: 150, h: 200 },
      { x: 230, y: 520, w: 150, h: 200 },
    ];
    L.bindPreview = { x: 420, y: 520, w: 150, h: 200 };
    btn('bind', 60, 740, 300, 44, 'BIND THESE TWO TALES', { size: 15, disabled: false });
    // Shop row, bottom right.
    const shop = view.shop || [];
    shop.forEach((offer, i) => {
      L.shopOffers.push({ ...offer, x: 640 + i * 200, y: 540, w: 180, h: 200, index: i });
    });
    btn('reroll', 1060, 800, 180, 44, `REROLL — 20 GOLD`, { size: 14, disabled: view.run.gold < 20 });
    btn('continue', 700, 800, 300, 44, 'CONTINUE TO THE NEXT WING', { size: 15, disabled: !view.draftPicked });
  } else if (screen === SCREEN_BIND) {
    const deck = view.run.deck;
    deck.forEach((id, i) => {
      const col = i % 7;
      const row = Math.floor(i / 7);
      L.bindCards.push({ id, index: i, x: 60 + col * 172, y: 240 + row * 190, w: 150, h: 170 });
    });
    btn('bind', 60, 800, 300, 44, 'BIND THESE TWO TALES', { size: 15, disabled: !(view.bindSel && view.bindSel.length === 2) });
    btn('done', 920, 800, 300, 44, 'DONE — KEEP MY DECK', { size: 15 });
  } else if (screen === SCREEN_SHOP) {
    const shop = view.shop || [];
    shop.forEach((offer, i) => {
      L.shopOffers.push({ ...offer, x: 340 + i * 200, y: 300, w: 180, h: 240, index: i });
    });
    btn('continue', 490, 720, 300, 48, 'CONTINUE TO THE NEXT WING', { size: 16 });
  } else if (screen === SCREEN_REST) {
    btn('heal', 390, 400, 220, 90, 'REST — HEAL 30%', { size: 17 });
    btn('maxhp', 670, 400, 220, 90, 'STUDY — +6 MAX HP', { size: 17 });
  } else if (screen === SCREEN_WIN || screen === SCREEN_LOSE) {
    btn('restart', 340, 800, 180, 48, 'R — READ AGAIN', { size: 15 });
    btn('sameseed', 550, 800, 180, 48, 'S — SAME SEED', { size: 15 });
    btn('menu', 760, 800, 180, 48, 'ESC — MENU', { size: 15 });
    if (screen === SCREEN_WIN) {
      // The finished deck as a fanned row of mini-cards (see screenWin).
      // A real run can end with up to ~17 tales, so the mini-cards shrink
      // to fit the row instead of running off the right edge.
      const deck = view.run.deck;
      const gap = 6;
      const maxW = 1200;
      const mw = Math.max(48, Math.min(88, Math.floor((maxW - (deck.length - 1) * gap) / deck.length)));
      const total = deck.length * mw + (deck.length - 1) * gap;
      L.finalDeck = { x: (FIELD.width - total) / 2, y: 682, w: total, h: 92, cardW: mw, gap };
      L.recapLine = { x: 0, y: 668, w: FIELD.width, h: 18 };
    }
  } else if (screen === SCREEN_PAUSED) {
    btn('resume', 490, 420, 300, 48, 'RESUME  [P]', { size: 17 });
    btn('restart', 490, 482, 300, 48, 'RESTART  [R]', { size: 17 });
    btn('menu', 490, 544, 300, 48, 'QUIT TO MENU', { size: 17 });
  }
  return L;
}

function drawTopBar(ctx, view, layout) {
  const run = view.run;
  drawPanel(ctx, 0, 0, FIELD.width, 64, 'rgba(18,24,16,0.92)', 'rgba(138,109,59,0.6)');
  text(ctx, 'MARGINALIA', 24, 40, 24, PALETTE.goldBright, FONT, 'left', '700');
  text(ctx, `WING ${run.floor} / ${5} — ${run.map[run.floor - 1].label.toUpperCase()}`, 250, 40, 16, '#fbf3dc', FONT_UI, 'left', '600');
  text(ctx, `GOLD ${run.gold}`, 560, 40, 16, PALETTE.goldBright, FONT_UI, 'left', '700');
  text(ctx, `DECK ${run.deck.length}`, 700, 40, 15, '#d9c9a0', FONT_UI, 'left');
  text(ctx, `SCORE ${view.score || 0}`, 830, 40, 15, '#d9c9a0', FONT_UI, 'left');
  for (const b of layout.buttons) {
    if (['pause', 'mute', 'restart'].includes(b.id)) drawButton(ctx, b, view.hover);
  }
}

function drawRelicsRow(ctx, run, x, y) {
  text(ctx, 'RELICS', x, y - 8, 12, PALETTE.muted, FONT_UI, 'left', '700');
  run.relics.slice(0, 6).forEach((id, i) => {
    const r = relicById(id);
    if (!r) return;
    rr(ctx, x + i * 108, y, 100, 34, 8);
    ctx.fillStyle = 'rgba(24,18,10,0.85)';
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 1;
    ctx.stroke();
    text(ctx, r.name, x + i * 108 + 50, y + 22, 12, '#fbf3dc', FONT_UI, 'center', '600');
  });
  if (run.relics.length === 0) text(ctx, 'No relics yet — buy them in the Reading Room.', x, y + 22, 13, PALETTE.muted, FONT_UI, 'left');
}

function drawLog(ctx, fight, x, y, w, h) {
  drawPanel(ctx, x, y, w, h, 'rgba(18,14,8,0.78)');
  text(ctx, 'THE MARGIN — WHAT JUST HAPPENED', x + 12, y + 22, 11, PALETTE.gold, FONT_UI, 'left', '700');
  const lines = fight.log.slice(-9);
  lines.forEach((line, i) => {
    wrapText(ctx, line, x + 12, y + 46 + i * 30, w - 24, 12, '#d9c9a0', FONT_UI, 15);
  });
}

function drawInkOrbs(ctx, fight, x, y) {
  text(ctx, 'INK', x, y - 6, 12, PALETTE.muted, FONT_UI, 'left', '700');
  for (let i = 0; i < fight.maxInk; i += 1) {
    ctx.beginPath();
    ctx.arc(x + 12 + i * 30, y + 16, 11, 0, Math.PI * 2);
    ctx.fillStyle = i < fight.ink ? PALETTE.inkBlue : 'rgba(90,80,60,0.5)';
    ctx.fill();
    ctx.strokeStyle = '#d9c9a0';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  text(ctx, `${fight.ink}/${fight.maxInk}`, x + fight.maxInk * 30 + 12, y + 21, 14, '#fbf3dc', FONT_UI, 'left', '700');
}

/** One grouped deck line: "Thorn Lash ×2 · Quill Jab · Bookmark ×2 …" */
function deckLine(run) {
  const counts = new Map();
  const order = [];
  for (const id of run.deck) {
    const card = anyCardById(id);
    const name = card ? card.name : id;
    if (!counts.has(name)) {
      counts.set(name, 0);
      order.push(name);
    }
    counts.set(name, counts.get(name) + 1);
  }
  return order.map((n) => (counts.get(n) > 1 ? `${n} ×${counts.get(n)}` : n)).join(' · ');
}

/** Truncate a line to maxW (caller sets ctx.font first), with an ellipsis. */
function fitLine(ctx, str, maxW) {
  if (ctx.measureText(str).width <= maxW) return str;
  let s = str;
  while (s.length > 0 && ctx.measureText(`${s} …`).width > maxW) {
    const cut = s.lastIndexOf(' · ');
    s = cut > 0 ? s.slice(0, cut) : s.slice(0, -1);
  }
  return s ? `${s} …` : '…';
}

/** One map node's label for the forecast strip — same lookup as screenMap. */
function nodeLabel(opt) {
  if (opt.kind === 'fight' || opt.kind === 'elite') {
    const e = enemyById(opt.enemy);
    return `${opt.kind === 'elite' ? 'ELITE' : 'FIGHT'} — ${e ? e.name : opt.enemy}`;
  }
  if (opt.kind === 'boss') return 'BOSS — The Eraser';
  if (opt.kind === 'rest') return 'QUIET SHELF — rest & heal';
  if (opt.kind === 'shop') return 'READING ROOM — shop';
  return opt.kind.toUpperCase();
}

/** A1 — the wing-progress map strip: all 5 wings, node kinds, cleared ✓,
 * current ◆, boss ★. Makes the map system visible in the play shot. */
function drawMapStrip(ctx, run, r) {
  drawPanel(ctx, r.x, r.y, r.w, r.h, 'rgba(18,14,8,0.82)');
  const cw = r.w / 5;
  run.map.forEach((wing, i) => {
    const x = r.x + i * cw;
    const current = i + 1 === run.floor;
    const cleared = i + 1 < run.floor;
    if (current) {
      ctx.fillStyle = 'rgba(217,164,65,0.16)';
      ctx.fillRect(x + 1, r.y + 1, cw - 2, r.h - 2);
    }
    if (i > 0) {
      ctx.fillStyle = 'rgba(138,109,59,0.5)';
      ctx.fillRect(x, r.y + 8, 1, r.h - 16);
    }
    const mark = cleared ? '✓' : current ? '◆' : '·';
    const color = cleared ? PALETTE.greenSoft : current ? PALETTE.goldBright : PALETTE.muted;
    text(ctx, `${mark} WING ${i + 1} — ${wing.label.toUpperCase()}`, x + 12, r.y + 22, 12, color, FONT_UI, 'left', '700');
    const kinds = wing.options.map((o) => (o.kind === 'boss' ? 'BOSS ★' : o.kind.toUpperCase())).join(' · ');
    text(ctx, kinds, x + 12, r.y + 42, 11, current ? '#fbf3dc' : '#d9c9a0', FONT_UI, 'left');
  });
}

/** A2 — the foe's full move pattern, from def.moves, with numbers. */
function drawMovesStrip(ctx, fight, r) {
  const moves = enemyIntent(fight).moves;
  const def = fight.enemy.def;
  const name = def.boss ? 'THE ERASER' : def.name.toUpperCase();
  drawPanel(ctx, r.x, r.y, r.w, r.h, 'rgba(18,14,8,0.78)');
  const parts = moves.map((m) => {
    const t = m.intent.replace(/^Will /, '');
    return t.charAt(0).toUpperCase() + t.slice(1);
  });
  ctx.font = `700 12px ${FONT_UI}`;
  const label = `${name}'S MOVES — `;
  const labelW = ctx.measureText(label).width;
  ctx.font = `14px ${FONT_UI}`;
  const line = fitLine(ctx, parts.join(' · '), r.w - 24 - labelW);
  text(ctx, label, r.x + 12, r.y + 22, 12, PALETTE.gold, FONT_UI, 'left', '700');
  text(ctx, line, r.x + 12 + labelW, r.y + 22, 14, '#e8dcc0', FONT_UI, 'left');
  text(ctx, def.blurb, r.x + 12, r.y + 42, 12, PALETTE.muted, FONT_UI, 'left', 'italic');
}

/** A3 / A4 — a slim deck line: label in gold, grouped card names after it. */
function drawDeckStrip(ctx, run, r, label) {
  drawPanel(ctx, r.x, r.y, r.w, r.h, 'rgba(18,14,8,0.78)');
  const by = r.h >= 40 ? r.y + 30 : r.y + 21;
  ctx.font = `700 13px ${FONT_UI}`;
  const labelW = ctx.measureText(label).width;
  ctx.font = `13px ${FONT_UI}`;
  const line = fitLine(ctx, deckLine(run), r.w - 24 - labelW);
  text(ctx, label, r.x + 12, by, 13, PALETTE.gold, FONT_UI, 'left', '700');
  text(ctx, line, r.x + 12 + labelW, by, 13, '#e8dcc0', FONT_UI, 'left');
}

/** A4 (forecast) — the next wing's real node options, so the draft/bind
 * choice is made knowing what comes next. After clearing floor N, the next
 * wing is run.map[N] (0-indexed). */
function drawForecastStrip(ctx, run, r) {
  const next = run.map[run.floor];
  drawPanel(ctx, r.x, r.y, r.w, r.h, 'rgba(18,14,8,0.82)');
  if (!next) {
    text(ctx, 'NEXT — THE LIBRARY IS YOURS', r.x + 12, r.y + 21, 13, PALETTE.goldBright, FONT_UI, 'left', '700');
    return;
  }
  ctx.font = `700 13px ${FONT_UI}`;
  const label = `NEXT — WING ${run.floor + 1} · ${next.label.toUpperCase()}: `;
  const labelW = ctx.measureText(label).width;
  ctx.font = `13px ${FONT_UI}`;
  const line = fitLine(ctx, next.options.map(nodeLabel).join('   ·   '), r.w - 24 - labelW);
  text(ctx, label, r.x + 12, r.y + 21, 13, PALETTE.goldBright, FONT_UI, 'left', '700');
  text(ctx, line, r.x + 12 + labelW, r.y + 21, 13, '#fbf3dc', FONT_UI, 'left');
}

/** A5 — one mini-card of the finished deck: glyph + name on a parchment
 * face; bound tales get a gold edge and a ✦. */
function drawMiniCard(ctx, id, x, y, w, h) {
  const card = anyCardById(id);
  if (!card) return;
  const bound = card.kind === 'bound';
  rr(ctx, x, y, w, h, 6);
  ctx.fillStyle = bound ? '#f7e8b8' : PALETTE.paper;
  ctx.fill();
  ctx.strokeStyle = bound ? PALETTE.gold : '#8a6d3b';
  ctx.lineWidth = bound ? 3 : 1.5;
  ctx.stroke();
  const baseId = card.id.startsWith('bound:') ? 'colophon' : card.id;
  drawGlyph(ctx, baseId, x + w / 2, y + 24, 30, '#2a2118');
  if (bound) text(ctx, '✦', x + w - 10, y + 16, 13, PALETTE.gold, FONT_UI, 'right', '700');
  // Name, centred, up to two lines.
  ctx.font = `700 11px ${FONT_UI}`;
  const lines = [];
  let cur = '';
  for (const wd of card.name.split(' ')) {
    const test = cur ? `${cur} ${wd}` : wd;
    if (ctx.measureText(test).width > w - 8 && cur) {
      lines.push(cur);
      cur = wd;
    } else cur = test;
  }
  if (cur) lines.push(cur);
  lines.slice(0, 2).forEach((ln, i) => text(ctx, ln, x + w / 2, y + 62 + i * 14, 11, PALETTE.ink, FONT_UI, 'center', '700'));
}

/** A5 — the finished deck as a fanned row of mini-cards: the trophy. */
function drawFinalDeckFan(ctx, run, r) {
  run.deck.forEach((id, i) => {
    drawMiniCard(ctx, id, r.x + i * (r.cardW + r.gap), r.y, r.cardW, r.h);
  });
}

function screenTitle(ctx, view, layout) {
  drawBackground(ctx, 0.35);
  text(ctx, 'MARGINALIA', 640, 150, 84, PALETTE.goldBright, FONT, 'center', '700');
  text(ctx, '— the last librarian defends the library —', 640, 192, 24, '#fbf3dc', FONT, 'center', 'italic');
  text(ctx, 'WIN: reach the Fifth Wing and unwrite the Eraser', 640, 238, 18, '#e8dcc0', FONT_UI, 'center', '600');
  text(ctx, 'LOSE: your ink runs dry, or the library burns', 640, 266, 18, '#f2a594', FONT_UI, 'center', '600');
  text(ctx, 'a complete game: 16 tales · 12 relics · binding · 5 wings · 3 difficulties', 640, 306, 16, PALETTE.gold, FONT_UI, 'center', '700');
  text(ctx, 'Bind two tales into one stronger tale. Every fight shows the foe\u2019s intent — plan around it.', 640, 334, 14, '#d9c9a0', FONT_UI, 'center');
  // Fanned hand.
  for (const slot of layout.cards) {
    const card = cardById(slot.id);
    ctx.save();
    ctx.translate(slot.x + slot.w / 2, slot.y + slot.h / 2);
    ctx.rotate(slot.tilt || 0);
    ctx.translate(-slot.w / 2, -slot.h / 2);
    drawCard(ctx, card, 0, 0, slot.w, slot.h, { playable: true });
    ctx.restore();
  }
  text(ctx, 'CHOOSE YOUR DIFFICULTY — best score in gold', 640, 452, 14, PALETTE.muted, FONT_UI, 'center', '700');
  DIFFICULTY_ORDER.forEach((id, i) => {
    const d = DIFFICULTIES[id];
    const slot = layout.diffs[i];
    const selected = view.difficulty === id;
    drawPanel(ctx, slot.x, slot.y, slot.w, slot.h, selected ? 'rgba(90,69,38,0.95)' : 'rgba(24,18,10,0.85)', selected ? PALETTE.goldBright : PALETTE.panelEdge);
    text(ctx, d.name.toUpperCase(), slot.x + slot.w / 2, slot.y + 30, 18, selected ? PALETTE.goldBright : '#fbf3dc', FONT_UI, 'center', '700');
    text(ctx, `BEST ${(view.best && view.best[id]) || 0}`, slot.x + slot.w / 2, slot.y + 56, 14, PALETTE.gold, FONT_UI, 'center', '700');
    wrapText(ctx, d.blurb, slot.x + 10, slot.y + 76, slot.w - 20, 10, '#d9c9a0', FONT_UI, 13);
  });
  for (const b of layout.buttons) drawButton(ctx, b, view.hover);
  text(ctx, 'Click a card or press 1-5 to play it · E end turn · P pause · M mute · R restart', 640, 740, 13, '#c9b890', FONT_UI, 'center');
  text(ctx, 'Mouse + keyboard · sound on · no network · your run is seeded, so S replays it exactly', 640, 766, 12, '#a89878', FONT_UI, 'center');
}

function screenHowto(ctx, view, layout) {
  drawBackground(ctx, 0.45);
  drawPanel(ctx, 240, 60, 800, 690);
  text(ctx, 'HOW TO PLAY', 640, 116, 36, PALETTE.goldBright, FONT, 'center', '700');
  const lines = [
    ['GOAL', 'Clear all five wings and unwrite the Eraser on floor 5. Lose all HP and the library burns.'],
    ['A TURN', 'Draw 5 tales. You have 3 ink each turn. Play a card by clicking it (or pressing 1-5). End your turn with E or the button.'],
    ['THE FOE', 'Every enemy shows its intent: "Will chew 8". Block before a big hit, weaken and make it vulnerable before your big cards.'],
    ['BINDING', 'After a fight, pick 1 of 3 new tales — then fuse any two cards into one stronger bound tale. Bound tales stay in your deck.'],
    ['RELICS', 'The Reading Room sells relics that bend the rules: free first cards, extra ink, heals after fights. Elites drop them too.'],
    ['THE ERASER', 'The boss has two phases. Below half health it erases one random card from your deck every turn. End it fast.'],
    ['KEYS', '1-5 play a card · E end turn · P pause · M mute · R restart · S same seed · Esc menu.'],
  ];
  let y = 160;
  for (const [head, body] of lines) {
    text(ctx, head, 280, y, 16, PALETTE.gold, FONT_UI, 'left', '700');
    y = wrapText(ctx, body, 280, y + 22, 720, 14, '#e8dcc0', FONT_UI, 19) + 16;
  }
  for (const b of layout.buttons) drawButton(ctx, b, view.hover);
}

function screenOptions(ctx, view, layout) {
  drawBackground(ctx, 0.45);
  drawPanel(ctx, 340, 140, 600, 480);
  text(ctx, 'OPTIONS', 640, 200, 36, PALETTE.goldBright, FONT, 'center', '700');
  text(ctx, 'Sound is a small WebAudio synth — no files, no network.', 640, 240, 14, '#d9c9a0', FONT_UI, 'center');
  text(ctx, 'Difficulty is chosen on the title screen.', 640, 268, 14, '#d9c9a0', FONT_UI, 'center');
  text(ctx, 'Your best score per difficulty and your last 3 runs', 640, 296, 14, '#d9c9a0', FONT_UI, 'center');
  text(ctx, 'are kept in this browser only.', 640, 320, 14, '#d9c9a0', FONT_UI, 'center');
  text(ctx, `SEED: ${view.seed ?? '—'} — press S on the win screen to replay it`, 640, 360, 14, '#e8dcc0', FONT_UI, 'center');
  for (const b of layout.buttons) drawButton(ctx, b, view.hover);
}

function screenMap(ctx, view, layout) {
  const run = view.run;
  drawBackground(ctx, 0.25);
  drawTopBar(ctx, view, layout);
  text(ctx, `THE FIVE WINGS — choose your path, Wing ${run.floor}`, 640, 120, 30, PALETTE.goldBright, FONT, 'center', '700');
  text(ctx, 'Each wing offers a choice. Elites pay more gold and drop relics. Rest heals. The shop sells relics and tales.', 640, 152, 15, '#d9c9a0', FONT_UI, 'center');
  // Wing progress dots.
  for (let i = 1; i <= 5; i += 1) {
    const x = 440 + (i - 1) * 100;
    ctx.beginPath();
    ctx.arc(x, 210, 22, 0, Math.PI * 2);
    ctx.fillStyle = i < run.floor ? PALETTE.greenSoft : i === run.floor ? PALETTE.goldBright : 'rgba(90,80,60,0.6)';
    ctx.fill();
    ctx.strokeStyle = '#241a08';
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, String(i), x, 217, 16, '#241a08', FONT_UI, 'center', '700');
    if (i < 5) {
      ctx.fillStyle = 'rgba(217,164,65,0.5)';
      ctx.fillRect(x + 22, 206, 56, 6);
    }
  }
  const floor = run.map[run.floor - 1];
  for (const node of layout.mapNodes) {
    drawPanel(ctx, node.x, node.y, node.w, node.h);
    const label = node.kind === 'fight' ? 'FIGHT' : node.kind === 'elite' ? 'ELITE FIGHT' : node.kind === 'rest' ? 'QUIET SHELF' : node.kind === 'shop' ? 'READING ROOM' : 'BOSS';
    text(ctx, label, node.x + node.w / 2, node.y + 44, 20, PALETTE.goldBright, FONT_UI, 'center', '700');
    let desc = '';
    if (node.kind === 'rest') desc = 'Heal 30% of max HP, or study for +6 max HP.';
    if (node.kind === 'shop') desc = 'Spend gold on relics and rare tales.';
    if (node.kind === 'boss') desc = 'The Eraser. Two phases. It erases your deck.';
    if (desc) wrapText(ctx, desc, node.x + 16, node.y + 76, node.w - 32, 13, '#d9c9a0', FONT_UI, 17);
    if (node.enemyName) {
      text(ctx, node.enemyName, node.x + node.w / 2, node.y + 96, 17, '#fbf3dc', FONT, 'center', '700');
      text(ctx, node.enemyBlurb || '', node.x + node.w / 2, node.y + 120, 12, '#d9c9a0', FONT_UI, 'center');
    }
  }
  drawRelicsRow(ctx, run, 40, 620);
  text(ctx, `HP ${run.hp}/${run.maxHp} · GOLD ${run.gold} · DECK ${run.deck.length} tales · ${run.relics.length} relics`, 640, 690, 16, '#fbf3dc', FONT_UI, 'center', '600');
  text(ctx, 'Your deck, in brief:', 40, 730, 13, PALETTE.muted, FONT_UI, 'left', '700');
  text(ctx, run.deck.map((id) => (anyCardById(id) || { name: id }).name).join(' · '), 40, 756, 13, '#d9c9a0', FONT_UI, 'left');
  for (const b of layout.buttons) drawButton(ctx, b, view.hover);
}

function screenPlay(ctx, view, layout) {
  const run = view.run;
  const fight = view.fight;
  drawBackground(ctx, 0.15);
  drawTopBar(ctx, view, layout);
  const intent = enemyIntent(fight);
  // Enemy stage.
  drawPanel(ctx, 380, 84, 520, 250, 'rgba(18,14,8,0.66)');
  const def = fight.enemy.def;
  drawEnemy(ctx, def, 640, 228, def.boss ? 72 : 58, fight.enemy.phase);
  text(ctx, def.boss ? 'THE ERASER' : def.name.toUpperCase(), 640, 320, 24, def.boss ? '#f2a594' : '#fbf3dc', FONT, 'center', '700');
  if (def.elite) text(ctx, '★ ELITE ★', 640, 296, 12, PALETTE.goldBright, FONT_UI, 'center', '700');
  if (def.boss && fight.enemy.phase === 2) text(ctx, 'PHASE 2 — IT ERASES YOUR DECK', 640, 296, 12, '#f2a594', FONT_UI, 'center', '700');
  drawHpBar(ctx, 430, 332, 420, 20, Math.max(0, fight.enemy.hp), fight.enemy.maxHp, 'HP');
  // Intent bubble.
  rr(ctx, 430, 100, 420, 44, 12);
  ctx.fillStyle = 'rgba(251,243,220,0.92)';
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, `INTENT: ${intent.current.intent}`, 640, 128, 16, '#2a2118', FONT_UI, 'center', '700');
  if (view.showNextIntent) text(ctx, `NEXT: ${intent.next.intent}`, 640, 162, 12, '#5a4a33', FONT_UI, 'center');
  // Enemy statuses.
  const est = [];
  if (fight.enemy.block > 0) est.push(`Block ${fight.enemy.block}`);
  if (fight.enemy.weaken > 0) est.push(`Weaken ${fight.enemy.weaken}`);
  if (fight.enemy.vuln > 0) est.push(`Vulnerable ${fight.enemy.vuln}`);
  if (est.length) text(ctx, est.join(' · '), 640, 380, 13, '#d9c9a0', FONT_UI, 'center', '600');
  // Player panel, left.
  drawPanel(ctx, 24, 84, 330, 250, 'rgba(18,14,8,0.78)');
  text(ctx, 'THE LIBRARIAN', 40, 112, 16, PALETTE.goldBright, FONT_UI, 'left', '700');
  drawHpBar(ctx, 40, 126, 298, 22, run.hp, run.maxHp, 'HP');
  text(ctx, `BLOCK ${fight.block}`, 40, 176, 16, PALETTE.block, FONT_UI, 'left', '700');
  const pst = [];
  if (fight.weaken > 0) pst.push(`Weaken ${fight.weaken}`);
  if (fight.vuln > 0) pst.push(`Vulnerable ${fight.vuln}`);
  if (fight.nextBonus > 0) pst.push(`Next card +${fight.nextBonus}`);
  if (pst.length) text(ctx, pst.join(' · '), 40, 202, 13, '#f2a594', FONT_UI, 'left', '600');
  drawInkOrbs(ctx, fight, 40, 226);
  text(ctx, `TURN ${fight.turn} · COMBO x${run.combo} (best ${run.bestCombo})`, 40, 292, 13, '#d9c9a0', FONT_UI, 'left');
  text(ctx, `DRAW ${fight.drawPile.length} · DISCARD ${fight.discardPile.length}`, 40, 316, 13, '#d9c9a0', FONT_UI, 'left');
  // Log, right.
  drawLog(ctx, fight, 930, 84, 326, 300);
  // Density strips in the dead band: the wing map, the foe's move pattern,
  // the deck. They sit between the panels and the relics row.
  drawMapStrip(ctx, run, layout.mapStrip);
  drawMovesStrip(ctx, fight, layout.movesStrip);
  drawDeckStrip(ctx, run, layout.deckStrip, `DECK ${run.deck.length} — `);
  // Peek line, below the deck strip (hidden while a message shows, so the
  // two never print on top of each other).
  if (fight.peeked && !view.message) {
    const pc = anyCardById(fight.peeked);
    text(ctx, `CATALOGUE: next draw is ${pc ? pc.name : fight.peeked}.`, 640, 578, 14, PALETTE.goldBright, FONT_UI, 'center', '600');
  }
  // Relics row above hand.
  drawRelicsRow(ctx, run, 40, 600);
  // Hand.
  for (const slot of layout.handCards) {
    const card = anyCardById(slot.id);
    const hover = view.hover && slot.x <= view.hover.x && view.hover.x <= slot.x + slot.w && slot.y <= view.hover.y && view.hover.y <= slot.y + slot.h;
    drawCard(ctx, card, slot.x, slot.y - (hover ? 14 : 0), slot.w, slot.h, { playable: slot.playable });
  }
  text(ctx, 'Click a card to play it · 1-5 also play · E ends the turn', 640, 640, 13, '#c9b890', FONT_UI, 'center');
  for (const b of layout.buttons) {
    if (b.id === 'endturn') drawButton(ctx, b, view.hover);
  }
  if (view.message) {
    drawPanel(ctx, 440, 560, 400, 40, 'rgba(24,18,10,0.92)');
    text(ctx, view.message, 640, 586, 15, '#fbf3dc', FONT_UI, 'center', '600');
  }
}

function screenDraft(ctx, view, layout) {
  const run = view.run;
  drawBackground(ctx, 0.3);
  drawTopBar(ctx, view, layout);
  text(ctx, `WING ${run.floor} CLEARED — PICK 1 NEW TALE`, 640, 116, 30, PALETTE.goldBright, FONT, 'center', '700');
  text(ctx, view.draftPicked ? `You took ${view.draftPicked}. Now bind two tales, visit the shop, or continue.` : 'Choose one tale to add to your deck. Then bind, shop, or continue.', 640, 146, 15, '#d9c9a0', FONT_UI, 'center');
  for (const slot of layout.draftCards) {
    const card = cardById(slot.id);
    const picked = view.draftPickedId === slot.id;
    drawCard(ctx, card, slot.x, slot.y, slot.w, slot.h, { playable: true, tag: picked ? 'TAKEN' : undefined, selected: picked });
  }
  // Deck strip + next-wing forecast between the draft cards and the
  // bind/shop panels — the gap is now game content, not dead space.
  drawDeckStrip(ctx, run, layout.draftDeckStrip, `YOUR DECK — ${run.deck.length} TALES — `);
  drawForecastStrip(ctx, run, layout.forecastStrip);
  // Bind panel.
  drawPanel(ctx, 40, 460, 580, 330, 'rgba(18,14,8,0.82)');
  text(ctx, 'BIND TWO TALES INTO ONE', 60, 492, 17, PALETTE.goldBright, FONT_UI, 'left', '700');
  text(ctx, 'Click two cards from your deck below — the fused tale is stronger than both.', 60, 516, 13, '#d9c9a0', FONT_UI, 'left');
  const sel = view.bindSel || [];
  const deckPreview = run.deck.slice(0, 2);
  const slots = layout.bindSlots || [];
  slots.forEach((s, i) => {
    // On the draft screen bindSel holds deck indices (0 is a valid index).
    const id = sel[i] !== undefined ? run.deck[sel[i]] : deckPreview[i];
    if (id) {
      const card = anyCardById(id);
      drawCard(ctx, card, s.x, s.y, s.w, s.h, { playable: true, tag: sel[i] !== undefined ? 'CHOSEN' : 'EXAMPLE' });
    } else {
      rr(ctx, s.x, s.y, s.w, s.h, 10);
      ctx.fillStyle = 'rgba(251,243,220,0.08)';
      ctx.fill();
      ctx.strokeStyle = PALETTE.panelEdge;
      ctx.stroke();
      text(ctx, 'Pick a card', s.x + s.w / 2, s.y + s.h / 2, 13, PALETTE.muted, FONT_UI, 'center');
    }
  });
  if (layout.bindPreview) {
    const pv = layout.bindPreview;
    if (sel.length === 2) {
      const bound = view.bindPreviewCard;
      if (bound) drawCard(ctx, bound, pv.x, pv.y, pv.w, pv.h, { playable: true, tag: 'BOUND' });
    } else {
      text(ctx, '→', pv.x + 10, pv.y + 110, 30, PALETTE.gold, FONT_UI, 'left', '700');
      text(ctx, 'The bound tale', pv.x - 10, pv.y + 150, 12, PALETTE.muted, FONT_UI, 'left');
      text(ctx, 'appears here.', pv.x - 10, pv.y + 168, 12, PALETTE.muted, FONT_UI, 'left');
    }
  }
  for (const b of layout.buttons) if (b.id === 'bind') drawButton(ctx, b, view.hover);
  // Shop row.
  drawPanel(ctx, 640, 460, 600, 330, 'rgba(18,14,8,0.82)');
  text(ctx, 'THE READING ROOM — SHOP', 660, 492, 17, PALETTE.goldBright, FONT_UI, 'left', '700');
  text(ctx, `Your gold: ${run.gold} — click an item to buy it.`, 660, 516, 13, '#d9c9a0', FONT_UI, 'left');
  for (const offer of layout.shopOffers) {
    const afford = run.gold >= offer.price;
    rr(ctx, offer.x, offer.y, offer.w, offer.h, 10);
    ctx.fillStyle = afford ? 'rgba(251,243,220,0.94)' : 'rgba(120,105,80,0.5)';
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2;
    ctx.stroke();
    if (offer.kind === 'relic') {
      const r = relicById(offer.id);
      text(ctx, r.name, offer.x + offer.w / 2, offer.y + 30, 15, '#2a2118', FONT_UI, 'center', '700');
      wrapText(ctx, r.desc, offer.x + 12, offer.y + 56, offer.w - 24, 12, '#5a4a33', FONT_UI, 16);
    } else {
      const c = cardById(offer.id);
      text(ctx, c.name, offer.x + offer.w / 2, offer.y + 30, 15, '#2a2118', FONT_UI, 'center', '700');
      wrapText(ctx, c.text, offer.x + 12, offer.y + 56, offer.w - 24, 12, '#5a4a33', FONT_UI, 16);
    }
    text(ctx, `${offer.price} GOLD`, offer.x + offer.w / 2, offer.y + offer.h - 16, 15, afford ? '#8a5a00' : '#8a7a5a', FONT_UI, 'center', '700');
  }
  for (const b of layout.buttons) if (b.id === 'reroll' || b.id === 'continue') drawButton(ctx, b, view.hover);
}

function screenBind(ctx, view, layout) {
  const run = view.run;
  drawBackground(ctx, 0.3);
  drawTopBar(ctx, view, layout);
  text(ctx, 'BIND TWO TALES INTO ONE', 640, 116, 30, PALETTE.goldBright, FONT, 'center', '700');
  text(ctx, 'Click two cards from your deck. The fused tale is stronger than both halves — and stays bound for the rest of the run.', 640, 146, 15, '#d9c9a0', FONT_UI, 'center');
  const sel = view.bindSel || [];
  for (const slot of layout.bindCards) {
    const card = anyCardById(slot.id);
    drawCard(ctx, card, slot.x, slot.y, slot.w, slot.h, { playable: true, selected: sel.includes(slot.index), tag: sel.includes(slot.index) ? 'CHOSEN' : undefined });
  }
  if (sel.length === 2 && view.bindPreviewCard) {
    drawPanel(ctx, 940, 620, 300, 170, 'rgba(18,14,8,0.9)');
    text(ctx, 'IT WILL BECOME:', 960, 650, 13, PALETTE.gold, FONT_UI, 'left', '700');
    text(ctx, view.bindPreviewCard.name, 960, 678, 17, '#fbf3dc', FONT_UI, 'left', '700');
    wrapText(ctx, view.bindPreviewCard.text, 960, 702, 260, 13, '#d9c9a0', FONT_UI, 17);
  }
  for (const b of layout.buttons) drawButton(ctx, b, view.hover);
}

function screenShop(ctx, view, layout) {
  const run = view.run;
  drawBackground(ctx, 0.3);
  drawTopBar(ctx, view, layout);
  text(ctx, 'THE READING ROOM', 640, 140, 34, PALETTE.goldBright, FONT, 'center', '700');
  text(ctx, `Your gold: ${run.gold} — click an item to buy it, then continue to the next wing.`, 640, 176, 15, '#d9c9a0', FONT_UI, 'center');
  for (const offer of layout.shopOffers) {
    const afford = run.gold >= offer.price;
    rr(ctx, offer.x, offer.y, offer.w, offer.h, 10);
    ctx.fillStyle = afford ? 'rgba(251,243,220,0.94)' : 'rgba(120,105,80,0.5)';
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2;
    ctx.stroke();
    if (offer.kind === 'relic') {
      const r = relicById(offer.id);
      text(ctx, r.name, offer.x + offer.w / 2, offer.y + 34, 16, '#2a2118', FONT_UI, 'center', '700');
      wrapText(ctx, r.desc, offer.x + 14, offer.y + 64, offer.w - 28, 13, '#5a4a33', FONT_UI, 18);
    } else {
      const c = cardById(offer.id);
      text(ctx, c.name, offer.x + offer.w / 2, offer.y + 34, 16, '#2a2118', FONT_UI, 'center', '700');
      wrapText(ctx, c.text, offer.x + 14, offer.y + 64, offer.w - 28, 13, '#5a4a33', FONT_UI, 18);
    }
    text(ctx, `${offer.price} GOLD`, offer.x + offer.w / 2, offer.y + offer.h - 18, 15, afford ? '#8a5a00' : '#8a7a5a', FONT_UI, 'center', '700');
  }
  for (const b of layout.buttons) drawButton(ctx, b, view.hover);
}

function screenRest(ctx, view, layout) {
  const run = view.run;
  drawBackground(ctx, 0.3);
  drawTopBar(ctx, view, layout);
  text(ctx, 'A QUIET SHELF', 640, 180, 36, PALETTE.goldBright, FONT, 'center', '700');
  text(ctx, `You are at ${run.hp}/${run.maxHp} HP. The candles are low. Choose one:`, 640, 220, 16, '#d9c9a0', FONT_UI, 'center');
  for (const b of layout.buttons) drawButton(ctx, b, view.hover);
  text(ctx, 'Rest heals 30% of your max HP. Study raises your max HP by 6 and heals 6.', 640, 540, 14, '#a89878', FONT_UI, 'center');
}

function statBox(ctx, x, y, w, h, label, value) {
  drawPanel(ctx, x, y, w, h, 'rgba(251,243,220,0.94)', PALETTE.gold);
  text(ctx, label, x + w / 2, y + 24, 12, '#8a6d3b', FONT_UI, 'center', '700');
  text(ctx, String(value), x + w / 2, y + 56, 26, '#2a2118', FONT_UI, 'center', '700');
}

function screenWin(ctx, view, layout) {
  const run = view.run;
  const s = view.summary;
  drawBackground(ctx, 0.3);
  text(ctx, 'THE ERASER IS UNWRITTEN', 640, 96, 44, PALETTE.goldBright, FONT, 'center', '700');
  text(ctx, 'The library stands. Every margin is yours again.', 640, 132, 18, '#fbf3dc', FONT, 'center', 'italic');
  // Grade + score, stacked so they can never collide.
  drawPanel(ctx, 440, 150, 400, 124, 'rgba(18,14,8,0.85)');
  text(ctx, `GRADE ${s.grade}`, 640, 198, 36, PALETTE.goldBright, FONT, 'center', '700');
  text(ctx, `SCORE ${s.score}`, 640, 236, 24, '#fbf3dc', FONT_UI, 'center', '700');
  if (s.newBest) text(ctx, '★ NEW BEST ★', 640, 264, 15, PALETTE.goldBright, FONT_UI, 'center', '700');
  // Stat boxes.
  const stats = [
    ['WINGS', `${s.floors}/5`],
    ['TALES PLAYED', s.cardsPlayed],
    ['BEST COMBO', `x${s.bestCombo}`],
    ['RELICS FOUND', s.relicsFound],
    ['GOLD EARNED', s.goldEarned],
  ];
  stats.forEach(([label, value], i) => statBox(ctx, 90 + i * 232, 292, 210, 76, label, value));
  text(ctx, `${DIFFICULTIES[run.difficulty].name.toUpperCase()} — seed ${run.seed} — ${s.time} — +${s.overBest} over best`, 640, 404, 15, '#d9c9a0', FONT_UI, 'center', '600');
  // Last 3 runs.
  drawPanel(ctx, 90, 428, 560, 150, 'rgba(18,14,8,0.82)');
  text(ctx, 'LAST 3 RUNS', 110, 458, 14, PALETTE.gold, FONT_UI, 'left', '700');
  (view.history || []).slice(0, 3).forEach((h, i) => {
    text(ctx, `${h.result} — ${h.difficulty} — score ${h.score} — wing ${h.floor}/5`, 110, 492 + i * 30, 15, h.result === 'WON' ? PALETTE.greenSoft : '#f2a594', FONT_UI, 'left', '600');
  });
  if (!(view.history || []).length) text(ctx, 'No earlier runs in this browser yet.', 110, 492, 14, '#a89878', FONT_UI, 'left');
  // Bound deck.
  drawPanel(ctx, 680, 428, 510, 150, 'rgba(18,14,8,0.82)');
  text(ctx, 'YOUR BOUND DECK', 700, 458, 14, PALETTE.gold, FONT_UI, 'left', '700');
  if (s.bound.length) {
    s.bound.forEach((id, i) => {
      const c = anyCardById(id);
      text(ctx, `✦ ${c ? c.name : id}`, 700, 492 + i * 30, 15, '#fbf3dc', FONT_UI, 'left');
    });
  } else {
    text(ctx, 'No tales were bound this run.', 700, 492, 14, '#a89878', FONT_UI, 'left');
    text(ctx, 'Bind two cards after a fight to forge a stronger tale.', 700, 520, 13, '#a89878', FONT_UI, 'left');
  }
  text(ctx, 'NEXT GOAL: win on Forbidden', 640, 612, 17, PALETTE.goldBright, FONT_UI, 'center', '700');
  text(ctx, 'The Eraser erased ' + (s.erased.length ? s.erased.map((id) => (anyCardById(id) || { name: id }).name).join(', ') : 'nothing') + ' this run.', 640, 640, 13, '#a89878', FONT_UI, 'center');
  // Run recap + the finished deck as a fanned trophy row.
  text(ctx, `RUN RECAP — ${s.kills} foes unwritten · ${s.damageDealt} damage dealt`, 640, 668, 14, '#fbf3dc', FONT_UI, 'center', '600');
  drawFinalDeckFan(ctx, run, layout.finalDeck);
  for (const b of layout.buttons) drawButton(ctx, b, view.hover);
  text(ctx, 'R — READ AGAIN (new run) · S — SAME SEED · ESC — MENU', 640, 790, 13, '#c9b890', FONT_UI, 'center');
}

function screenLose(ctx, view, layout) {
  const run = view.run;
  const s = view.summary;
  drawBackground(ctx, 0.55);
  text(ctx, 'THE LIBRARY BURNS', 640, 180, 48, '#f2a594', FONT, 'center', '700');
  text(ctx, 'Your ink ran dry on the ' + run.map[run.floor - 1].label + '. The margins go dark.', 640, 226, 18, '#e8dcc0', FONT_UI, 'center');
  drawPanel(ctx, 440, 260, 400, 90, 'rgba(18,14,8,0.85)');
  text(ctx, `SCORE ${s.score}`, 640, 316, 28, '#fbf3dc', FONT_UI, 'center', '700');
  text(ctx, `You reached Wing ${s.floors}/5 · ${s.cardsPlayed} tales played · best combo x${s.bestCombo}`, 640, 396, 15, '#d9c9a0', FONT_UI, 'center');
  text(ctx, 'The tales you bound stay in your memory — try a different binding next time.', 640, 428, 14, '#a89878', FONT_UI, 'center');
  for (const b of layout.buttons) drawButton(ctx, b, view.hover);
  text(ctx, 'R — READ AGAIN (new run) · S — SAME SEED · ESC — MENU', 640, 780, 13, '#c9b890', FONT_UI, 'center');
}

function screenPaused(ctx, view, layout) {
  drawBackground(ctx, 0.6);
  text(ctx, 'PAUSED', 640, 300, 52, PALETTE.goldBright, FONT, 'center', '700');
  text(ctx, 'The ink waits. The library holds its breath.', 640, 350, 16, '#e8dcc0', FONT_UI, 'center', 'italic');
  for (const b of layout.buttons) drawButton(ctx, b, view.hover);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;

  function draw(view, screen) {
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    const layout = layoutFor(screen, view);
    if (screen === SCREEN_TITLE) screenTitle(ctx, view, layout);
    else if (screen === SCREEN_HOWTO) screenHowto(ctx, view, layout);
    else if (screen === SCREEN_OPTIONS) screenOptions(ctx, view, layout);
    else if (screen === SCREEN_MAP) screenMap(ctx, view, layout);
    else if (screen === SCREEN_PLAY) screenPlay(ctx, view, layout);
    else if (screen === SCREEN_DRAFT) screenDraft(ctx, view, layout);
    else if (screen === SCREEN_BIND) screenBind(ctx, view, layout);
    else if (screen === SCREEN_SHOP) screenShop(ctx, view, layout);
    else if (screen === SCREEN_REST) screenRest(ctx, view, layout);
    else if (screen === SCREEN_WIN) screenWin(ctx, view, layout);
    else if (screen === SCREEN_LOSE) screenLose(ctx, view, layout);
    else if (screen === SCREEN_PAUSED) screenPaused(ctx, view, layout);
    return layout;
  }

  return { draw, layoutFor };
}

// MARGINALIA — the 18 tale-cards. Every card is named for what it does, and its
// effect is data: { dmg, dmgAll, block, draw, heal, ink, discard, weaken, vuln,
// nextBonus, peek }. The engine reads the effect; the renderer reads the text.

export const CARDS = [
  { id: 'thorn', name: 'Thorn Lash', cost: 1, kind: 'attack', text: 'Deal 6 damage.', fx: { dmg: 6 } },
  { id: 'nettle', name: 'Nettle Fan', cost: 2, kind: 'attack', text: 'Deal 3 damage to all foes.', fx: { dmgAll: 3 } },
  { id: 'root', name: 'Root Snare', cost: 1, kind: 'attack', text: 'Deal 5. Apply Weaken 2.', fx: { dmg: 5, weaken: 2 } },
  { id: 'bookmark', name: 'Bookmark', cost: 1, kind: 'skill', text: 'Gain 8 block.', fx: { block: 8 } },
  { id: 'dogear', name: 'Dog-Ear', cost: 1, kind: 'skill', text: 'Draw 2 cards.', fx: { draw: 2 } },
  { id: 'quill', name: 'Quill Jab', cost: 0, kind: 'attack', text: 'Deal 4. Gain 1 ink.', fx: { dmg: 4, ink: 1 } },
  { id: 'margin', name: 'Margin Note', cost: 0, kind: 'skill', text: 'Your next card deals +4 damage.', fx: { nextBonus: 4 } },
  { id: 'inkwell', name: 'Inkwell', cost: 1, kind: 'skill', text: 'Gain 2 ink. Draw 1 card.', fx: { ink: 2, draw: 1 } },
  { id: 'flower', name: 'Pressed Flower', cost: 1, kind: 'skill', text: 'Heal 6 HP.', fx: { heal: 6 } },
  { id: 'torn', name: 'Torn Page', cost: 1, kind: 'attack', text: 'Deal 9. Discard 1 card.', fx: { dmg: 9, discard: 1 } },
  { id: 'catalogue', name: 'Catalogue', cost: 0, kind: 'skill', text: 'Peek the next draw. See the foe\u2019s next intent.', fx: { peek: 1 } },
  { id: 'jacket', name: 'Dust Jacket', cost: 2, kind: 'skill', text: 'Gain 12 block. Lose 1 ink.', fx: { block: 12, ink: -1 } },
  { id: 'footnote', name: 'Footnote', cost: 1, kind: 'attack', text: 'Deal 2. Apply Vulnerable 2.', fx: { dmg: 2, vuln: 2 } },
  { id: 'colophon', name: 'Colophon', cost: 2, kind: 'attack', text: 'Deal 1 per card in your discard pile.', fx: { perDiscard: 1 } },
  { id: 'vellum', name: 'Vellum Shield', cost: 1, kind: 'skill', text: 'Gain 10 block. Draw 1 card.', fx: { block: 10, draw: 1 } },
  { id: 'storm', name: 'Ink Storm', cost: 2, kind: 'attack', text: 'Deal 4 damage to all foes. Gain 1 ink.', fx: { dmgAll: 4, ink: 1 } },
  { id: 'scroll', name: 'Margin Scroll', cost: 1, kind: 'skill', text: 'Draw 1 card. Your next card deals +4 damage.', fx: { draw: 1, nextBonus: 4 } },
  { id: 'ash', name: 'Ashen Quill', cost: 2, kind: 'attack', text: 'Deal 8. Apply Vulnerable 2.', fx: { dmg: 8, vuln: 2 } },
];

export const CARD_MAP = Object.fromEntries(CARDS.map((c) => [c.id, c]));

export function cardById(id) {
  return CARD_MAP[id] || null;
}

/** Named fusions: two tales bound into one stronger tale. */
export const BIND_TABLE = {
  'nettle+thorn': { name: 'Bramble Fan', text: 'Deal 9 damage. Deal 4 to all foes.' },
  'bookmark+jacket': { name: 'Bound in Leather', text: 'Gain 18 block. Draw 1 card.' },
  'dogear+inkwell': { name: 'Deep Reading', text: 'Gain 2 ink. Draw 3 cards.' },
  'footnote+root': { name: 'Thorny Footnote', text: 'Deal 8. Apply Weaken 2 and Vulnerable 2.' },
  'flower+quill': { name: 'Quill of Bloom', text: 'Deal 6. Heal 6. Gain 1 ink.' },
  'margin+thorn': { name: 'Annotated Lash', text: 'Deal 12. Your next card deals +4.' },
  'catalogue+colophon': { name: 'The Full Index', text: 'Deal 2 per discard card. Peek the next draw.' },
  'jacket+torn': { name: 'Torn Cover', text: 'Deal 12. Gain 10 block. Discard 1.' },
  'bookmark+vellum': { name: 'Gilded Margin', text: 'Gain 18 block. Draw 1 card.' },
  'quill+torn': { name: 'Torn Quill', text: 'Deal 15 damage. Discard 1 card. Gain 1 ink.' },
  'dogear+scroll': { name: 'Deep Margin', text: 'Draw 3 cards. Your next card deals +4 damage.' },
  'ash+footnote': { name: 'Ashen Footnote', text: 'Deal 12 damage. Apply Vulnerable 4.' },
};

/** Fuse two cards into one bound card. Named fusions above win; anything else
 * combines both effects with stronger numbers under a generic name. */
export function bindCards(a, b) {
  const [first, second] = [a, b].sort((x, y) => (x.id < y.id ? -1 : 1));
  const key = `${first.id}+${second.id}`;
  const named = BIND_TABLE[key];
  const fx = {
    dmg: (first.fx.dmg || 0) + (second.fx.dmg || 0),
    dmgAll: (first.fx.dmgAll || 0) + (second.fx.dmgAll || 0),
    block: (first.fx.block || 0) + (second.fx.block || 0),
    draw: (first.fx.draw || 0) + (second.fx.draw || 0),
    heal: (first.fx.heal || 0) + (second.fx.heal || 0),
    ink: (first.fx.ink || 0) + (second.fx.ink || 0),
    discard: Math.max(first.fx.discard || 0, second.fx.discard || 0),
    weaken: (first.fx.weaken || 0) + (second.fx.weaken || 0),
    vuln: (first.fx.vuln || 0) + (second.fx.vuln || 0),
    nextBonus: (first.fx.nextBonus || 0) + (second.fx.nextBonus || 0),
    peek: Math.max(first.fx.peek || 0, second.fx.peek || 0),
    perDiscard: (first.fx.perDiscard || 0) + (second.fx.perDiscard || 0),
  };
  // A bound tale hits harder than its two halves: +2 to its damage lines.
  if (fx.dmg) fx.dmg += 2;
  if (fx.dmgAll) fx.dmgAll += 1;
  if (fx.perDiscard) fx.perDiscard += 1;
  const id = `bound:${first.id}+${second.id}`;
  if (named) {
    return { id, name: named.name, cost: Math.max(first.cost, second.cost), kind: 'bound', text: named.text, fx, bound: true, parents: [first.id, second.id] };
  }
  const parts = [];
  if (fx.dmg) parts.push(`Deal ${fx.dmg}`);
  if (fx.dmgAll) parts.push(`Deal ${fx.dmgAll} to all`);
  if (fx.perDiscard) parts.push(`Deal ${fx.perDiscard} per discard card`);
  if (fx.block) parts.push(`Gain ${fx.block} block`);
  if (fx.draw) parts.push(`Draw ${fx.draw}`);
  if (fx.heal) parts.push(`Heal ${fx.heal}`);
  if (fx.ink) parts.push(`Gain ${fx.ink} ink`);
  if (fx.weaken) parts.push(`Weaken ${fx.weaken}`);
  if (fx.vuln) parts.push(`Vulnerable ${fx.vuln}`);
  if (fx.nextBonus) parts.push(`Next card +${fx.nextBonus}`);
  if (fx.peek) parts.push('Peek the next draw');
  return {
    id,
    name: `Bound ${first.name} & ${second.name}`,
    cost: Math.max(first.cost, second.cost),
    kind: 'bound',
    text: `${parts.join('. ')}.`,
    fx,
    bound: true,
    parents: [first.id, second.id],
  };
}

/** Resolve a bound card id back to its definition (bound cards live only in decks). */
export function boundCardById(id) {
  if (!id || !id.startsWith('bound:')) return null;
  const [a, b] = id.slice('bound:'.length).split('+');
  const ca = cardById(a);
  const cb = cardById(b);
  if (!ca || !cb) return null;
  return bindCards(ca, cb);
}

/** Any card id — base or bound — resolves to a definition. */
export function anyCardById(id) {
  return cardById(id) || boundCardById(id);
}

/** One-line summary of a card's effect, for the bind preview and shop. */
export function cardSummary(card) {
  return card.text;
}

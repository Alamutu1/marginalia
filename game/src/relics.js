// MARGINALIA — the 12 relics. Each one bends one rule of the run: cheaper cards,
// more ink, a peek at the future, a heal after every fight. Relics are found in
// the shop, after elites, and sometimes in the draft.

export const RELICS = [
  { id: 'brassquill', name: 'Brass Quill', price: 90, desc: 'The first card you play each fight costs 0 ink.' },
  { id: 'spectacles', name: 'Spectacles', price: 80, desc: 'See the foe\u2019s next TWO intents, not one.' },
  { id: 'silverbookmark', name: 'Silver Bookmark', price: 85, desc: 'Start each fight with your first deck card in hand.' },
  { id: 'inkpot', name: 'Inkpot', price: 75, desc: 'Start each fight with +1 ink.' },
  { id: 'rose', name: 'Pressed Rose', price: 70, desc: 'Heal 4 HP after every fight you win.' },
  { id: 'catalogue', name: 'Card Catalogue', price: 95, desc: 'Drafts offer 4 tales instead of 3.' },
  { id: 'spine', name: 'Gilded Spine', price: 100, desc: '+8 max HP, and heal 8 at once.' },
  { id: 'snuffer', name: 'Candle Snuffer', price: 85, desc: 'Foes start each fight with Vulnerable 2.' },
  { id: 'satchel', name: 'Leather Satchel', price: 60, desc: '+40 gold right now.' },
  { id: 'quietquill', name: 'Quiet Quill', price: 80, desc: 'Your first attack each fight deals +4 damage.' },
  { id: 'lantern', name: 'Candle Lantern', price: 80, desc: 'Start each fight with +2 block.' },
  { id: 'glue', name: 'Binder\u2019s Glue', price: 85, desc: 'Bound tales cost 1 less ink.' },
];

export const RELIC_MAP = Object.fromEntries(RELICS.map((r) => [r.id, r]));

export function relicById(id) {
  return RELIC_MAP[id] || null;
}

export function hasRelic(run, id) {
  return run.relics.includes(id);
}

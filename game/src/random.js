// MARGINALIA — seeded randomness. Every die roll in the game comes from here;
// game logic never calls Math.random() or Date.now(), so the same seed replays
// the same run, the same draft and the same screenshot scene.

/** mulberry32: a tiny 32-bit seeded generator with a long, even period. */
export function createRandom(seed) {
  let state = (seed | 0) >>> 0;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [min, max] inclusive, from the seeded stream. */
export function randomInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Pick one element of an array, from the seeded stream. */
export function randomPick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

/** Fisher-Yates shuffle that consumes only the seeded stream. Returns a new array. */
export function seededShuffle(rng, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

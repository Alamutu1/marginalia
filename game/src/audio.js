// MARGINALIA — WebAudio synth sounds. No audio files: every sound is an
// oscillator and a gain envelope, so the game ships no assets and no network.

let ctx = null;
let muted = false;

export function isMuted() {
  return muted;
}

export function setMuted(value) {
  muted = !!value;
}

export function unlockAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

function tone(freq, dur, type, vol, when = 0, slideTo = 0) {
  if (muted || !ctx) return;
  try {
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch {
    // Audio is decoration; a failure never stops the game.
  }
}

/** A page turning: a soft paper snap. */
export function sfxPlay() {
  tone(620, 0.09, 'triangle', 0.16, 0, 880);
  tone(310, 0.07, 'sine', 0.08, 0.02);
}

/** Ink hitting the foe: a low thud with a bright edge. */
export function sfxDamage(amount) {
  tone(180, 0.16, 'sawtooth', 0.14, 0, 90);
  tone(520 + Math.min(240, (amount || 0) * 12), 0.1, 'triangle', 0.12);
}

/** A blow landing on the librarian. */
export function sfxHurt() {
  tone(140, 0.22, 'sawtooth', 0.16, 0, 70);
}

/** Block: a wooden shelf knock. */
export function sfxBlock() {
  tone(240, 0.1, 'square', 0.08);
  tone(360, 0.12, 'triangle', 0.1, 0.03);
}

/** Heal: a warm rising third. */
export function sfxHeal() {
  tone(440, 0.18, 'sine', 0.12);
  tone(554, 0.22, 'sine', 0.12, 0.09);
}

/** Gold: two bright coin ticks. */
export function sfxCoin() {
  tone(988, 0.08, 'sine', 0.12);
  tone(1319, 0.14, 'sine', 0.12, 0.07);
}

/** Draft pick: a quill scratch. */
export function sfxDraft() {
  tone(740, 0.08, 'triangle', 0.12, 0, 990);
  tone(880, 0.1, 'triangle', 0.1, 0.06, 1170);
}

/** Binding: two notes fusing into one chord. */
export function sfxBind() {
  tone(392, 0.2, 'triangle', 0.12);
  tone(523, 0.2, 'triangle', 0.12, 0.08);
  tone(659, 0.3, 'triangle', 0.12, 0.16);
}

/** A turn ending: a soft page flip down. */
export function sfxTurn() {
  tone(330, 0.1, 'triangle', 0.09, 0, 220);
}

/** Victory: a rising arpeggio on the library's own scale. */
export function sfxWin() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.32, 'triangle', 0.14, i * 0.13));
}

/** Defeat: a low falling line. */
export function sfxLose() {
  [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'sine', 0.12, i * 0.16));
}

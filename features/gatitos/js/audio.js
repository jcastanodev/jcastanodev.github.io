// Web Audio synth. Lazy context (browsers need a user gesture).

let ctx = null;
let master = null;

function ensure() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Plays one note. `timbre` from sound.js TIMBRES.
export function playNote(freq, { timbre = 'triangle', volume = 0.6, duration = 0.35 } = {}) {
  const c = ensure();
  const t0 = c.currentTime;
  const gain = c.createGain();
  const osc = c.createOscillator();
  const pluck = timbre === 'pluck';
  osc.type = pluck ? 'sawtooth' : timbre;
  osc.frequency.value = freq;

  // ADSR-ish: quick attack, exponential release.
  const peak = Math.max(0.0001, volume * 0.5);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  let node = osc;
  if (pluck) {
    // Low-pass sweep gives a plucked feel.
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(freq * 8, t0);
    lp.frequency.exponentialRampToValueAtTime(freq * 1.5, t0 + duration);
    osc.connect(lp);
    node = lp;
  }
  node.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

// Effective sound of a cat = its base sound modified by accessories / traits,
// applied in z order. Pure.
//
// A modifier is a partial Sound. Merge rules:
//   timbre, order, echo, ratchet  last one wins
//   octaveShift, degreeShift      add
//   volumeMul, durationMul        multiply
//   stack                         union of degrees

export const TIMBRES = ['sine', 'triangle', 'square', 'sawtooth', 'pluck'];

export function resolveSound(base, modifiers = []) {
  const out = {
    timbre: base.timbre || 'triangle',
    octave: base.octave ?? 4,
    volume: base.volume ?? 0.6,
    rhythm: base.rhythm || 1,
    degreeShift: 0,
    stack: [],
    echo: null,
    ratchet: 1,
    order: 'up',
    durationMul: 1,
  };
  const ordered = [...modifiers].sort((a, b) => (a.z || 0) - (b.z || 0));
  for (const m of ordered) {
    if (m.timbre) out.timbre = m.timbre;
    if (m.octaveShift) out.octave += m.octaveShift;
    if (m.volumeMul != null) out.volume *= m.volumeMul;
    if (m.rhythm) out.rhythm = m.rhythm;
    if (m.degreeShift) out.degreeShift += m.degreeShift;
    if (m.stack) out.stack = [...new Set([...out.stack, ...m.stack])].sort((a, b) => a - b);
    if (m.echo) out.echo = m.echo;
    if (m.ratchet) out.ratchet = m.ratchet;
    if (m.order) out.order = m.order;
    if (m.durationMul != null) out.durationMul *= m.durationMul;
  }
  out.volume = Math.min(1, Math.max(0, out.volume));
  return out;
}

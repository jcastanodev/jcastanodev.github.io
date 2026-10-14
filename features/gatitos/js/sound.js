// Effective sound of a cat = its base sound modified by accessories / traits,
// applied in z order. Pure.
//
// A modifier is a partial Sound:
//   { timbre?, octaveShift?, volumeMul?, rhythm? }
// timbre / rhythm: last one wins. octaveShift: adds. volumeMul: multiplies.

export const TIMBRES = ['sine', 'triangle', 'square', 'sawtooth', 'pluck'];

export function resolveSound(base, modifiers = []) {
  const out = {
    timbre: base.timbre || 'triangle',
    octave: base.octave ?? 4,
    volume: base.volume ?? 0.6,
    rhythm: base.rhythm || 1,
  };
  const ordered = [...modifiers].sort((a, b) => (a.z || 0) - (b.z || 0));
  for (const m of ordered) {
    if (m.timbre) out.timbre = m.timbre;
    if (m.octaveShift) out.octave += m.octaveShift;
    if (m.volumeMul != null) out.volume *= m.volumeMul;
    if (m.rhythm) out.rhythm = m.rhythm;
  }
  out.volume = Math.min(1, Math.max(0, out.volume));
  return out;
}

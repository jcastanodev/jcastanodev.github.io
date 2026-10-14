// Motion evaluator. Pure: no DOM, no clock. Time is passed in (ms since trigger).

const TAU = Math.PI * 2;

// Each kind maps progress p in [0,1] to a transform delta.
const KINDS = {
  jump: (p, m) => ({ y: -m.amp * 4 * p * (1 - p) }),
  shake: (p, m) => ({ x: m.amp * Math.sin(p * (m.freq || 6) * TAU) * (1 - p) }),
  spin: (p, m) => ({ rot: TAU * p * (m.turns || 1) }),
  pulse: (p, m) => ({ scale: 1 + m.amp * Math.sin(p * Math.PI) }),
};

export const MOTION_KINDS = Object.keys(KINDS);

// Absolute start time of every motion, resolved from `with` / `after` / delay.
export function resolveStarts(motions) {
  const byId = new Map(motions.map((m) => [m.id, m]));
  const starts = new Map();
  const visiting = new Set();

  const startOf = (m) => {
    if (starts.has(m.id)) return starts.get(m.id);
    if (visiting.has(m.id)) return 0; // cycle: fall back to trigger time
    visiting.add(m.id);
    const s = m.start || { mode: 'with', delay: 0 };
    let t = s.delay || 0;
    const ref = s.mode === 'after' && byId.get(s.ref);
    if (ref) t += startOf(ref) + ref.duration;
    visiting.delete(m.id);
    starts.set(m.id, t);
    return t;
  };

  motions.forEach(startOf);
  return starts;
}

export function totalDuration(motions) {
  const starts = resolveStarts(motions);
  return motions.reduce((end, m) => Math.max(end, starts.get(m.id) + m.duration), 0);
}

// Combined transform at time t: x/y/rot add, scale multiplies.
export function evaluate(motions, t) {
  const out = { x: 0, y: 0, rot: 0, scale: 1 };
  const starts = resolveStarts(motions);
  for (const m of motions) {
    const fn = KINDS[m.kind];
    if (!fn || m.duration <= 0) continue;
    const local = t - starts.get(m.id);
    if (local < 0 || local > m.duration) continue;
    const d = fn(local / m.duration, m);
    out.x += d.x || 0;
    out.y += d.y || 0;
    out.rot += d.rot || 0;
    out.scale *= d.scale ?? 1;
  }
  return out;
}

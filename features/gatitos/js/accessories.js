// Visible accessories. Original SVGs (viewBox 0 0 100 100, drawn centered).
// Each has a default anchor slot and a `mod` (partial Sound, see sound.js)
// so wearing it changes the melody exactly like an invisible trait.
// Pure: no DOM.

const s = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`;

export const ACCESSORIES = {
  sombrero: {
    name: 'Sombrero mexicano',
    slots: ['head'],
    size: 96,
    y: -10,
    mod: { timbre: 'pluck', stack: [4] },
    svg: s(`<ellipse cx="50" cy="68" rx="48" ry="12" fill="#e0b341"/>
      <path d="M26 66 Q28 20 50 18 Q72 20 74 66 Z" fill="#f2cd5c"/>
      <rect x="27" y="52" width="46" height="9" fill="#c0392b"/>
      <ellipse cx="50" cy="68" rx="48" ry="12" fill="none" stroke="#b8891f" stroke-width="3"/>`),
  },
  maraca: {
    name: 'Maraca',
    slots: ['handL', 'handR'],
    size: 40,
    rot: -20,
    mod: { ratchet: 2, durationMul: 0.6 },
    svg: s(`<rect x="46" y="52" width="8" height="44" rx="4" fill="#8a5a2b"/>
      <ellipse cx="50" cy="34" rx="24" ry="30" fill="#e74c3c"/>
      <path d="M32 24 Q50 8 68 24 M30 38 Q50 22 70 38 M34 50 Q50 38 66 50" stroke="#f9d56e" stroke-width="5" fill="none" stroke-linecap="round"/>`),
  },
  gafas: {
    name: 'Gafas',
    slots: ['eyes'],
    size: 76,
    mod: { timbre: 'square' },
    svg: s(`<circle cx="26" cy="50" r="19" fill="#223" fill-opacity=".85" stroke="#111" stroke-width="5"/>
      <circle cx="74" cy="50" r="19" fill="#223" fill-opacity=".85" stroke="#111" stroke-width="5"/>
      <path d="M45 48 Q50 42 55 48" stroke="#111" stroke-width="5" fill="none"/>`),
  },
  mono: {
    name: 'Moño',
    slots: ['neck'],
    size: 46,
    mod: { octaveShift: -1, volumeMul: 1.15 },
    svg: s(`<polygon points="50,50 8,22 8,78" fill="#c0392b"/>
      <polygon points="50,50 92,22 92,78" fill="#c0392b"/>
      <rect x="40" y="38" width="20" height="24" rx="5" fill="#962d22"/>`),
  },
  corona: {
    name: 'Corona',
    slots: ['head'],
    size: 54,
    y: -8,
    mod: { octaveShift: 1, echo: { count: 1, gap: 0.5, decay: 0.5 } },
    svg: s(`<polygon points="8,82 8,30 30,55 50,16 70,55 92,30 92,82" fill="#f5c518" stroke="#b8891f" stroke-width="4" stroke-linejoin="round"/>
      <circle cx="50" cy="66" r="7" fill="#e74c3c"/>`),
  },
};

export const accessoryIds = () => Object.keys(ACCESSORIES);

// Uploaded accessories register themselves at runtime.
//   def: { name, slots, size, aspect?, mods?, svg? | url? }
export function registerAccessory(id, def) {
  ACCESSORIES[id] = { slots: ['head'], size: 56, aspect: 1, ...def };
}

export function unregisterAccessory(id) {
  delete ACCESSORIES[id];
}

// Anchor points in cat-SVG coordinates (viewBox 0 0 200 220).
export const DEFAULT_ANCHORS = {
  head: { x: 100, y: 36, label: 'Cabeza' },
  eyes: { x: 100, y: 84, label: 'Ojos' },
  neck: { x: 100, y: 134, label: 'Cuello' },
  handL: { x: 52, y: 170, label: 'Mano izq.' },
  handR: { x: 148, y: 170, label: 'Mano der.' },
  body: { x: 100, y: 168, label: 'Cuerpo' },
  feet: { x: 100, y: 205, label: 'Pies' },
};

let seq = 1;

// New equip with the accessory's defaults; picks the first free slot.
export function newEquip(accessoryId, equips = []) {
  const acc = ACCESSORIES[accessoryId];
  if (!acc) return null;
  const used = new Set(equips.map((e) => e.anchor));
  const anchor = acc.slots.find((a) => !used.has(a)) || acc.slots[0];
  const mirror = anchor.endsWith('R') ? -1 : 1;
  const z = equips.reduce((m, e) => Math.max(m, e.z || 0), 0) + 1;
  return {
    id: `e${Date.now().toString(36)}${seq++}`,
    accessoryId,
    anchor,
    x: acc.x || 0,
    y: acc.y || 0,
    rot: (acc.rot || 0) * mirror,
    scale: 1,
    z,
  };
}

// Where to draw an equip, in cat-SVG coordinates.
export function equipPose(anchors, equip, acc = ACCESSORIES[equip.accessoryId]) {
  const a = anchors[equip.anchor] || { x: 100, y: 110 };
  return {
    x: a.x + (equip.x || 0),
    y: a.y + (equip.y || 0),
    rot: ((equip.rot || 0) * Math.PI) / 180,
    size: (acc?.size || 40) * (equip.scale || 1),
  };
}

// Sound modifiers of worn accessories (z order handled by resolveSound).
export function equipMods(equips = []) {
  return equips
    .filter((e) => ACCESSORIES[e.accessoryId])
    .flatMap((e) => {
      const acc = ACCESSORIES[e.accessoryId];
      return (acc.mods || [acc.mod || {}]).map((m) => ({ ...m, z: e.z || 0 }));
    });
}

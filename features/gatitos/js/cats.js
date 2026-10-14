// Built-in original cats, drawn as SVG strings (viewBox 0 0 200 220).
// Placeholders: simple shapes, replaced by better art in later increments.

function catSvg({ fur, belly, eye = '#222', extra = '' }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 220">
  <ellipse cx="100" cy="150" rx="55" ry="60" fill="${fur}"/>
  <ellipse cx="100" cy="160" rx="32" ry="38" fill="${belly}"/>
  <polygon points="52,62 62,12 98,48" fill="${fur}"/>
  <polygon points="148,62 138,12 102,48" fill="${fur}"/>
  <circle cx="100" cy="88" r="52" fill="${fur}"/>
  <ellipse cx="80" cy="82" rx="9" ry="12" fill="#fff"/>
  <ellipse cx="120" cy="82" rx="9" ry="12" fill="#fff"/>
  <circle cx="82" cy="85" r="5" fill="${eye}"/>
  <circle cx="118" cy="85" r="5" fill="${eye}"/>
  <polygon points="94,100 106,100 100,108" fill="#e88a9a"/>
  <path d="M100 108 q-8 10 -16 4 M100 108 q8 10 16 4" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M60 98 l-26 -4 M60 104 l-26 6 M140 98 l26 -4 M140 104 l26 6" stroke="#333" stroke-width="2" stroke-linecap="round"/>
  ${extra}
</svg>`;
}

export const DEFAULT_CATS = [
  {
    id: 'naranjo',
    name: 'Naranjo',
    svg: catSvg({ fur: '#f4a640', belly: '#ffe2b3' }),
    sound: { timbre: 'triangle', octave: 3, volume: 0.7 },
    pattern: [0, 2, 4, 2],
    motions: [
      { id: 'm1', kind: 'jump', amp: 50, duration: 380, start: { mode: 'with', delay: 0 } },
    ],
  },
  {
    id: 'gris',
    name: 'Gris',
    svg: catSvg({ fur: '#9aa3ad', belly: '#e6eaee', eye: '#0a3' }),
    sound: { timbre: 'square', octave: 4, volume: 0.35 },
    pattern: [0, 4, 7, 4],
    motions: [
      { id: 'm1', kind: 'shake', amp: 14, freq: 5, duration: 420, start: { mode: 'with', delay: 0 } },
      { id: 'm2', kind: 'pulse', amp: 0.15, duration: 420, start: { mode: 'with', delay: 0 } },
    ],
  },
  {
    id: 'negro',
    name: 'Negro',
    svg: catSvg({ fur: '#2d2d34', belly: '#555560', eye: '#ffd54a' }),
    sound: { timbre: 'pluck', octave: 5, volume: 0.6 },
    pattern: [2, 4, 5, 7],
    motions: [
      { id: 'm1', kind: 'jump', amp: 35, duration: 260, start: { mode: 'with', delay: 0 } },
      { id: 'm2', kind: 'spin', duration: 380, start: { mode: 'after', ref: 'm1', delay: 0 } },
    ],
  },
];

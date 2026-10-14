import { DEFAULT_CATS } from './cats.js';
import { KEYS, SCALES, noteFreq } from './harmony.js';
import { TIMBRES, resolveSound } from './sound.js';
import { TRAITS, traitMods } from './traits.js';
import { noteEvents } from './melody.js';
import { MOTION_KINDS, evaluate, totalDuration } from './anim.js';
import { playNote } from './audio.js';
import * as store from './store.js';

// ---- state -----------------------------------------------------------
const DEFAULT_HARMONY = { key: 'C', scale: 'mayor', bpm: 100 };

function initialState() {
  const saved = store.load();
  const cats = DEFAULT_CATS.map((def) => {
    const s = saved?.cats?.find((c) => c.id === def.id);
    return {
      id: def.id,
      name: def.name,
      svg: def.svg,
      pattern: def.pattern,
      sound: { ...def.sound, ...(s?.sound || {}) },
      traits: s?.traits || [],
      motions: s?.motions ? s.motions : structuredClone(def.motions),
    };
  });
  return { harmony: { ...DEFAULT_HARMONY, ...(saved?.harmony || {}) }, cats };
}

const state = initialState();

function persist() {
  store.save({
    harmony: state.harmony,
    cats: state.cats.map((c) => ({ id: c.id, sound: c.sound, traits: c.traits, motions: c.motions })),
  });
}

// ---- runtime (not persisted) ------------------------------------------
const runtime = new Map(); // cat id -> { img, startedAt, noteIdx }
for (const cat of state.cats) {
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(cat.svg);
  runtime.set(cat.id, { img, startedAt: null, noteIdx: 0 });
}

function trigger(cat) {
  const rt = runtime.get(cat.id);
  rt.startedAt = performance.now();
  const snd = resolveSound(cat.sound, traitMods(cat.traits));
  const { key, scale, bpm } = state.harmony;
  const events = noteEvents({ sound: snd, pattern: cat.pattern, step: rt.noteIdx++, beatMs: 60000 / bpm });
  for (const ev of events) {
    const play = () =>
      playNote(noteFreq(key, scale, ev.degree, ev.octave), {
        timbre: ev.timbre,
        volume: ev.volume,
        duration: ev.durationMs / 1000,
      });
    if (ev.delayMs <= 0) play();
    else setTimeout(play, ev.delayMs);
  }
}

// ---- stage ---------------------------------------------------------------
const canvas = document.getElementById('stage');
const g = canvas.getContext('2d');
let W = 0;
let H = 0;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = canvas.clientWidth;
  H = canvas.clientHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);

function slot(i) {
  const n = state.cats.length;
  const size = Math.min(W / (n + 0.6), H * 0.75);
  return { cx: (W / n) * (i + 0.5), size, ground: H - 24 };
}

function frame(now) {
  g.clearRect(0, 0, W, H);
  // floor
  g.fillStyle = '#241c36';
  g.fillRect(0, H - 24, W, 24);

  state.cats.forEach((cat, i) => {
    const rt = runtime.get(cat.id);
    const { cx, size, ground } = slot(i);
    let tr = { x: 0, y: 0, rot: 0, scale: 1 };
    if (rt.startedAt != null) {
      const t = now - rt.startedAt;
      if (t > totalDuration(cat.motions)) rt.startedAt = null;
      else tr = evaluate(cat.motions, t);
    }
    if (rt.img.complete) {
      const h = size;
      const w = size * (200 / 220);
      g.save();
      g.translate(cx + tr.x, ground - h / 2 + tr.y);
      g.rotate(tr.rot);
      g.scale(tr.scale, tr.scale);
      g.drawImage(rt.img, -w / 2, -h / 2, w, h);
      g.restore();
    }
    g.fillStyle = '#9a90b8';
    g.font = '12px system-ui';
    g.textAlign = 'center';
    g.fillText(`${i + 1} · ${cat.name}`, cx, H - 8);
  });
  requestAnimationFrame(frame);
}

canvas.addEventListener('pointerdown', (e) => {
  const x = e.clientX - canvas.getBoundingClientRect().left;
  const i = Math.min(state.cats.length - 1, Math.max(0, Math.floor(x / (W / state.cats.length))));
  trigger(state.cats[i]);
});
window.addEventListener('keydown', (e) => {
  if (e.target.closest('input, select, textarea')) return;
  const i = Number(e.key) - 1;
  if (state.cats[i]) trigger(state.cats[i]);
});

// ---- band playback ---------------------------------------------------------
let bandTimer = null;
const playBtn = document.getElementById('play');

function toggleBand() {
  if (bandTimer) {
    clearInterval(bandTimer);
    bandTimer = null;
    playBtn.textContent = '▶ Tocar banda';
    return;
  }
  let beat = 0;
  const tick = () => {
    state.cats.forEach((cat, i) => {
      // Cat i plays every (i+1) beats so the band interlocks.
      if (beat % (i + 1) === 0) trigger(cat);
    });
    beat++;
  };
  tick();
  bandTimer = setInterval(tick, 60000 / state.harmony.bpm);
  playBtn.textContent = '■ Parar';
}
playBtn.addEventListener('click', toggleBand);

// ---- controls -----------------------------------------------------------------
function fillSelect(el, values, current) {
  el.innerHTML = values.map((v) => `<option${v === current ? ' selected' : ''}>${v}</option>`).join('');
}

const keyEl = document.getElementById('key');
const scaleEl = document.getElementById('scale');
const bpmEl = document.getElementById('bpm');
const bpmOut = document.getElementById('bpmOut');

fillSelect(keyEl, KEYS, state.harmony.key);
fillSelect(scaleEl, Object.keys(SCALES), state.harmony.scale);
bpmEl.value = state.harmony.bpm;
bpmOut.textContent = state.harmony.bpm;

keyEl.addEventListener('change', () => { state.harmony.key = keyEl.value; persist(); });
scaleEl.addEventListener('change', () => { state.harmony.scale = scaleEl.value; persist(); });
bpmEl.addEventListener('input', () => {
  state.harmony.bpm = Number(bpmEl.value);
  bpmOut.textContent = bpmEl.value;
  persist();
  if (bandTimer) { toggleBand(); toggleBand(); } // restart at the new tempo
});
document.getElementById('reset').addEventListener('click', () => {
  store.reset();
  location.reload();
});

// Per-cat panel: sound + motion layers.
const panel = document.getElementById('panel');
let motionSeq = 100;

const opts = (values, cur) =>
  values.map((v) => `<option value="${v}"${v === cur ? ' selected' : ''}>${v}</option>`).join('');

function renderPanel() {
  panel.innerHTML = state.cats.map((cat) => `
    <div class="cat" data-cat="${cat.id}">
      <h2>${cat.name}</h2>
      <div class="row">
        <label>Timbre <select data-f="timbre">${opts(TIMBRES, cat.sound.timbre)}</select></label>
        <label>Octava <input data-f="octave" type="number" min="1" max="7" value="${cat.sound.octave}" style="width:56px"></label>
        <label>Vol <input data-f="volume" type="range" min="0" max="1" step="0.05" value="${cat.sound.volume}"></label>
      </div>
      <small>Características (cambian la melodía)</small>
      <div class="row traits">
        ${Object.entries(TRAITS).map(([id, t]) => `
          <label class="chip"><input type="checkbox" data-trait="${id}"${cat.traits.includes(id) ? ' checked' : ''}> ${t.label}</label>`).join('')}
      </div>
      <small>Movimientos (se combinan; "después" encadena tras el anterior)</small>
      ${cat.motions.map((m, mi) => `
        <div class="row motion" data-m="${m.id}">
          <select data-f="kind">${opts(MOTION_KINDS, m.kind)}</select>
          <label>amp <input data-f="amp" type="number" value="${m.amp ?? 30}"></label>
          <label>ms <input data-f="duration" type="number" step="50" value="${m.duration}"></label>
          <select data-f="mode">
            <option value="with"${m.start?.mode !== 'after' ? ' selected' : ''}>con</option>
            <option value="after"${m.start?.mode === 'after' ? ' selected' : ''}${mi === 0 ? ' disabled' : ''}>después</option>
          </select>
          <label>delay <input data-f="delay" type="number" step="50" value="${m.start?.delay || 0}"></label>
          <button data-act="del" class="ghost">✕</button>
        </div>`).join('')}
      <div class="row"><button data-act="add">+ movimiento</button> <button data-act="test">Probar</button></div>
    </div>`).join('');
}

panel.addEventListener('change', (e) => {
  const traitId = e.target.dataset.trait;
  if (traitId) {
    const tcat = state.cats.find((c) => c.id === e.target.closest('.cat').dataset.cat);
    tcat.traits = e.target.checked
      ? [...new Set([...tcat.traits, traitId])]
      : tcat.traits.filter((t) => t !== traitId);
    persist();
    trigger(tcat); // hear the change right away
    return;
  }
  const f = e.target.dataset.f;
  if (!f) return;
  const cat = state.cats.find((c) => c.id === e.target.closest('.cat').dataset.cat);
  const mEl = e.target.closest('.motion');
  const val = e.target.type === 'number' || e.target.type === 'range' ? Number(e.target.value) : e.target.value;
  if (!mEl) {
    cat.sound[f] = val;
  } else {
    const idx = cat.motions.findIndex((m) => m.id === mEl.dataset.m);
    const m = cat.motions[idx];
    m.start = m.start || { mode: 'with', delay: 0 };
    if (f === 'mode') {
      m.start.mode = val;
      m.start.ref = val === 'after' ? cat.motions[idx - 1]?.id : undefined;
    } else if (f === 'delay') m.start.delay = val;
    else m[f] = val;
  }
  persist();
});

panel.addEventListener('click', (e) => {
  const act = e.target.dataset.act;
  if (!act) return;
  const cat = state.cats.find((c) => c.id === e.target.closest('.cat').dataset.cat);
  if (act === 'test') return trigger(cat);
  if (act === 'add') {
    cat.motions.push({ id: `m${motionSeq++}`, kind: 'jump', amp: 30, duration: 300, start: { mode: 'with', delay: 0 } });
  } else if (act === 'del') {
    const id = e.target.closest('.motion').dataset.m;
    cat.motions = cat.motions.filter((m) => m.id !== id);
    // Drop dangling `after` refs.
    cat.motions.forEach((m) => {
      if (m.start?.ref === id) m.start = { mode: 'with', delay: m.start.delay || 0 };
    });
  }
  persist();
  renderPanel();
});

// ---- boot ---------------------------------------------------------------------
resize();
renderPanel();
requestAnimationFrame(frame);

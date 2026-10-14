import { DEFAULT_CATS, GIF_ASSETS, SVG_LOOKS, gifUrl } from './cats.js';
import { svgSprite, gifSprite, fitInCatBox } from './sprite.js';
import { KEYS, SCALES, noteFreq } from './harmony.js';
import { TIMBRES, resolveSound } from './sound.js';
import { TRAITS, traitMods } from './traits.js';
import { noteEvents } from './melody.js';
import { ACCESSORIES, ACCESSORY_IDS, DEFAULT_ANCHORS, newEquip, equipPose, equipMods } from './accessories.js';
import { MOTION_KINDS, evaluate, totalDuration } from './anim.js';
import { playNote } from './audio.js';
import * as store from './store.js';

// ---- state -----------------------------------------------------------
const DEFAULT_HARMONY = { key: 'C', scale: 'mayor', bpm: 100 };

// Accessories each cat wears on first load.
const STARTER_LOOK = {
  naranjo: ['sombrero', 'maraca', 'maraca'],
  gris: ['gafas', 'mono'],
  negro: ['corona'],
};

function starterEquips(catId) {
  const equips = [];
  for (const accId of STARTER_LOOK[catId] || []) equips.push(newEquip(accId, equips));
  return equips;
}

const DEFAULT_SOUND = { timbre: 'triangle', octave: 4, volume: 0.6 };
const PATTERNS = [[0, 2, 4, 2], [0, 4, 7, 4], [2, 4, 5, 7], [0, 1, 2, 4]];

// Fill every field of a cat, from saved data and/or a default definition.
function hydrate(c, def) {
  return {
    id: c.id,
    name: c.name ?? def?.name ?? 'Gatito',
    source: c.source ?? def?.source ?? { kind: 'svg', ref: 'naranjo' },
    pattern: c.pattern ?? def?.pattern ?? PATTERNS[0],
    anchors: structuredClone(DEFAULT_ANCHORS),
    sound: { ...DEFAULT_SOUND, ...(def?.sound || {}), ...(c.sound || {}) },
    traits: c.traits || [],
    equips: c.equips ?? starterEquips(c.id),
    motions: c.motions ?? structuredClone(def?.motions || [
      { id: 'm1', kind: 'jump', amp: 40, duration: 350, start: { mode: 'with', delay: 0 } },
    ]),
  };
}

function initialState() {
  const saved = store.load();
  const defs = new Map(DEFAULT_CATS.map((d) => [d.id, d]));
  const cats = saved?.cats?.length
    ? saved.cats.map((c) => hydrate(c, defs.get(c.id)))
    : DEFAULT_CATS.map((d) => hydrate({ id: d.id }, d));
  return { harmony: { ...DEFAULT_HARMONY, ...(saved?.harmony || {}) }, cats };
}

const state = initialState();

function persist() {
  store.save({
    harmony: state.harmony,
    cats: state.cats.map((c) => ({
      id: c.id, name: c.name, source: c.source, pattern: c.pattern,
      sound: c.sound, traits: c.traits, equips: c.equips, motions: c.motions,
    })),
  });
}

// ---- runtime (not persisted) ------------------------------------------
const runtime = new Map(); // cat id -> { sprite, startedAt, noteIdx }

// Source -> sprite. An unknown ref falls back to the first SVG look.
function makeSprite({ kind, ref }) {
  if (kind === 'gif') {
    const asset = GIF_ASSETS.find((a) => a.id === ref);
    if (asset) return gifSprite(gifUrl(asset));
  }
  return svgSprite((SVG_LOOKS[ref] || SVG_LOOKS.naranjo).svg);
}

function ensureRuntime(cat) {
  if (!runtime.has(cat.id)) {
    runtime.set(cat.id, { sprite: makeSprite(cat.source), startedAt: null, noteIdx: 0 });
  }
  return runtime.get(cat.id);
}
state.cats.forEach(ensureRuntime);

const accImgs = {};
for (const id of ACCESSORY_IDS) {
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ACCESSORIES[id].svg);
  accImgs[id] = img;
}

let selected = null; // { catId, equipId }
let showAnchors = false;

function trigger(cat) {
  const rt = runtime.get(cat.id);
  rt.startedAt = performance.now();
  const snd = resolveSound(cat.sound, [...traitMods(cat.traits), ...equipMods(cat.equips)]);
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
    const src = rt.sprite.frame(now);
    if (src) {
      const h = size;
      g.save();
      g.translate(cx + tr.x, ground - h / 2 + tr.y);
      g.rotate(tr.rot);
      g.scale(tr.scale, tr.scale);
      const fit = fitInCatBox(rt.sprite.w, rt.sprite.h);
      const kk = size / 220;
      g.drawImage(src, (fit.x - 100) * kk, (fit.y - 110) * kk, fit.w * kk, fit.h * kk);

      // Accessories live in the cat's local space, so they follow its motion.
      const k = size / 220;
      const worn = [...cat.equips].sort((a, b) => a.z - b.z);
      for (const eq of worn) {
        const img = accImgs[eq.accessoryId];
        if (!img?.complete) continue;
        const p = equipPose(cat.anchors, eq);
        const px = (p.x - 100) * k;
        const py = (p.y - 110) * k;
        const s = p.size * k;
        g.save();
        g.translate(px, py);
        g.rotate(p.rot);
        g.drawImage(img, -s / 2, -s / 2, s, s);
        if (selected?.equipId === eq.id) {
          g.strokeStyle = '#8a6bff';
          g.lineWidth = 2;
          g.setLineDash([5, 4]);
          g.strokeRect(-s / 2, -s / 2, s, s);
        }
        g.restore();
      }
      if (showAnchors) {
        for (const a of Object.values(cat.anchors)) {
          g.fillStyle = '#4ade80';
          g.beginPath();
          g.arc((a.x - 100) * k, (a.y - 110) * k, 4, 0, Math.PI * 2);
          g.fill();
        }
      }
      g.restore();
    }
    g.fillStyle = '#9a90b8';
    g.font = '12px system-ui';
    g.textAlign = 'center';
    g.fillText(`${i + 1} · ${cat.name}`, cx, H - 8);
  });
  requestAnimationFrame(frame);
}

// Topmost accessory under the pointer (rest pose), or null.
function accessoryAt(mx, my) {
  for (let i = 0; i < state.cats.length; i++) {
    const cat = state.cats[i];
    const { cx, size, ground } = slot(i);
    const k = size / 220;
    const sorted = [...cat.equips].sort((a, b) => b.z - a.z);
    for (const eq of sorted) {
      const p = equipPose(cat.anchors, eq);
      const sx = cx + (p.x - 100) * k;
      const sy = ground - size / 2 + (p.y - 110) * k;
      const r = Math.max(16, (p.size * k) / 2);
      if (Math.hypot(mx - sx, my - sy) <= r) return { cat, eq, k };
    }
  }
  return null;
}

let drag = null;

canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const hit = accessoryAt(mx, my);
  if (hit) {
    // Manual placement: drag the accessory instead of playing.
    drag = { ...hit, lastX: mx, lastY: my, moved: false };
    selected = { catId: hit.cat.id, equipId: hit.eq.id };
    canvas.setPointerCapture(e.pointerId);
    renderPanel();
    return;
  }
  selected = null;
  const i = Math.min(state.cats.length - 1, Math.max(0, Math.floor(mx / (W / state.cats.length))));
  trigger(state.cats[i]);
});

canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  drag.eq.x += (mx - drag.lastX) / drag.k;
  drag.eq.y += (my - drag.lastY) / drag.k;
  drag.lastX = mx;
  drag.lastY = my;
  drag.moved = true;
});

function endDrag() {
  if (!drag) return;
  const { cat, moved } = drag;
  drag = null;
  persist();
  if (moved) renderPanel();
  else trigger(cat); // plain click on an accessory still plays the cat
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
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
document.getElementById('anchors').addEventListener('change', (e) => { showAnchors = e.target.checked; });
document.getElementById('reset').addEventListener('click', () => {
  store.reset();
  location.reload();
});

// Per-cat panel: sound + motion layers.
const panel = document.getElementById('panel');
let motionSeq = 100;

const opts = (values, cur) =>
  values.map((v) => `<option value="${v}"${v === cur ? ' selected' : ''}>${v}</option>`).join('');

function sourceOptions(cur) {
  const sel = (kind, ref) => (cur.kind === kind && cur.ref === ref ? ' selected' : '');
  return `<optgroup label="GIF">${GIF_ASSETS.map((a) =>
      `<option value="gif:${a.id}"${sel('gif', a.id)}>${a.name}</option>`).join('')}</optgroup>
    <optgroup label="SVG">${Object.entries(SVG_LOOKS).map(([id, l]) =>
      `<option value="svg:${id}"${sel('svg', id)}>${l.name}</option>`).join('')}</optgroup>`;
}

function renderPanel() {
  panel.innerHTML = state.cats.map((cat) => `
    <div class="cat" data-cat="${cat.id}">
      <div class="row head">
        <input data-name type="text" value="${cat.name.replace(/"/g, '&quot;')}" aria-label="Nombre">
        <select data-src aria-label="Apariencia">${sourceOptions(cat.source)}</select>
        <button data-act="cat-del" class="ghost" title="Quitar gatito"${state.cats.length < 2 ? ' disabled' : ''}>🗑</button>
      </div>
      <div class="row">
        <label>Timbre <select data-f="timbre">${opts(TIMBRES, cat.sound.timbre)}</select></label>
        <label>Octava <input data-f="octave" type="number" min="1" max="7" value="${cat.sound.octave}" style="width:56px"></label>
        <label>Vol <input data-f="volume" type="range" min="0" max="1" step="0.05" value="${cat.sound.volume}"></label>
      </div>
      <small>Accesorios (arrastra sobre el gatito o ajusta aquí; cada uno cambia el sonido)</small>
      ${cat.equips.map((eq) => `
        <div class="row equip${selected?.equipId === eq.id ? ' sel' : ''}" data-eq="${eq.id}">
          <strong>${ACCESSORIES[eq.accessoryId]?.name || eq.accessoryId}</strong>
          <select data-ef="anchor">${Object.entries(cat.anchors).map(([k, a]) =>
            `<option value="${k}"${k === eq.anchor ? ' selected' : ''}>${a.label}</option>`).join('')}</select>
          <label>x <input data-ef="x" type="range" min="-80" max="80" step="1" value="${Math.round(eq.x)}"></label>
          <label>y <input data-ef="y" type="range" min="-80" max="80" step="1" value="${Math.round(eq.y)}"></label>
          <label>rot <input data-ef="rot" type="range" min="-180" max="180" step="5" value="${eq.rot}"></label>
          <label>tam <input data-ef="scale" type="range" min="0.3" max="2.5" step="0.05" value="${eq.scale}"></label>
          <label>z <input data-ef="z" type="number" min="0" max="20" value="${eq.z}" style="width:48px"></label>
          <button data-act="eq-del" class="ghost">✕</button>
        </div>`).join('')}
      <div class="row">
        <select data-add>${ACCESSORY_IDS.map((id) => `<option value="${id}">${ACCESSORIES[id].name}</option>`).join('')}</select>
        <button data-act="eq-add">+ accesorio</button>
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
    </div>`).join('') + `
    <div class="cat add">
      <h2>Nuevo gatito</h2>
      <div class="row">
        <select data-newsrc>${sourceOptions({})}</select>
        <button data-act="cat-add">+ Gatito</button>
      </div>
    </div>`;
}

// Accessory sliders: update live while dragging (no panel rebuild), save on release.
panel.addEventListener('input', (e) => {
  const f = e.target.dataset.ef;
  if (!f) return;
  const catEl = e.target.closest('.cat');
  const cat = state.cats.find((c) => c.id === catEl.dataset.cat);
  const eq = cat.equips.find((q) => q.id === e.target.closest('.equip').dataset.eq);
  eq[f] = f === 'anchor' ? e.target.value : Number(e.target.value);
  selected = { catId: cat.id, equipId: eq.id };
});

panel.addEventListener('change', (e) => {
  if (e.target.dataset.ef) {
    persist();
    return;
  }
  if (e.target.dataset.name !== undefined || e.target.dataset.src !== undefined) {
    const ecat = state.cats.find((c) => c.id === e.target.closest('.cat').dataset.cat);
    if (e.target.dataset.name !== undefined) {
      ecat.name = e.target.value.trim() || 'Gatito';
    } else {
      const [kind, ref] = e.target.value.split(':');
      ecat.source = { kind, ref };
      ensureRuntime(ecat).sprite = makeSprite(ecat.source);
    }
    persist();
    return;
  }
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
  if (act === 'cat-add') {
    const [kind, ref] = e.target.closest('.cat').querySelector('[data-newsrc]').value.split(':');
    const n = state.cats.length;
    const cat = hydrate({
      id: `c${Date.now().toString(36)}`,
      name: `Gatito ${n + 1}`,
      source: { kind, ref },
      pattern: PATTERNS[n % PATTERNS.length],
      equips: [],
    });
    state.cats.push(cat);
    ensureRuntime(cat);
    persist();
    renderPanel();
    return trigger(cat);
  }
  const cat = state.cats.find((c) => c.id === e.target.closest('.cat').dataset.cat);
  if (act === 'cat-del') {
    if (state.cats.length < 2) return;
    state.cats = state.cats.filter((c) => c.id !== cat.id);
    runtime.delete(cat.id);
    if (selected?.catId === cat.id) selected = null;
    persist();
    renderPanel();
    return;
  }
  if (act === 'test') return trigger(cat);
  if (act === 'eq-add') {
    const accId = e.target.closest('.cat').querySelector('[data-add]').value;
    const eq = newEquip(accId, cat.equips);
    cat.equips.push(eq);
    selected = { catId: cat.id, equipId: eq.id };
    persist();
    renderPanel();
    return trigger(cat); // hear what the accessory adds
  }
  if (act === 'eq-del') {
    const id = e.target.closest('.equip').dataset.eq;
    cat.equips = cat.equips.filter((q) => q.id !== id);
    if (selected?.equipId === id) selected = null;
    persist();
    renderPanel();
    return;
  }
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

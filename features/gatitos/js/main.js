import { DEFAULT_CATS, GIF_ASSETS, SVG_LOOKS, gifUrl } from './cats.js';
import { svgSprite, gifSprite, animatedSprite, imageSprite, fitInCatBox } from './sprite.js';
import { sanitizeSvg } from './sanitize.js';
import { putAsset, listAssets, deleteAsset } from './db.js';
import { KEYS, SCALES, noteFreq } from './harmony.js';
import { TIMBRES, resolveSound } from './sound.js';
import { TRAITS, traitMods } from './traits.js';
import { noteEvents } from './melody.js';
import {
  ACCESSORIES, DEFAULT_ANCHORS, accessoryIds, registerAccessory, unregisterAccessory,
  newEquip, equipPose, equipMods,
} from './accessories.js';
import { MOTION_KINDS, evaluate, totalDuration } from './anim.js';
import { playNote } from './audio.js';
import * as store from './store.js';

// ---- user assets (IndexedDB) --------------------------------------------
const accImgs = {}; // accessory id -> HTMLImageElement
const userAssets = new Map(); // asset id -> record + url
let uploadMsg = '';

const svgUri = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

function loadAccImg(id) {
  const acc = ACCESSORIES[id];
  if (!acc) return;
  const img = new Image();
  img.src = acc.url || svgUri(acc.svg);
  accImgs[id] = img;
}

function registerUserAsset(rec) {
  const url = rec.svg ? svgUri(rec.svg) : URL.createObjectURL(rec.blob);
  userAssets.set(rec.id, { ...rec, url });
  if (rec.kind === 'accessory') {
    const id = `u:${rec.id}`;
    registerAccessory(id, {
      name: rec.name,
      slots: [rec.slot || 'head'],
      size: 56,
      aspect: rec.w / rec.h || 1,
      mods: traitMods(rec.traits || []),
      url,
    });
    loadAccImg(id);
  }
}

for (const rec of await listAssets()) registerUserAsset(rec);

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
    anchors: Object.fromEntries(Object.entries(DEFAULT_ANCHORS).map(([k, a]) =>
      [k, { ...a, ...(c.anchors?.[k] ? { x: c.anchors[k].x, y: c.anchors[k].y } : {}) }])),
    sound: { ...DEFAULT_SOUND, ...(def?.sound || {}), ...(c.sound || {}) },
    traits: c.traits || [],
    equips: (c.equips ?? starterEquips(c.id)).filter((e) => ACCESSORIES[e.accessoryId]),
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
      anchors: Object.fromEntries(Object.entries(c.anchors).map(([k, a]) => [k, { x: a.x, y: a.y }])),
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
  if (kind === 'asset') {
    const a = userAssets.get(ref);
    if (a?.svg) return svgSprite(a.svg, { w: a.w, h: a.h });
    if (a && (a.mime === 'image/gif' || a.mime === 'image/webp')) return animatedSprite(a.url, a.mime);
    if (a) return imageSprite(a.url);
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

accessoryIds().filter((id) => !accImgs[id]).forEach(loadAccImg);

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
        const sh = s / (ACCESSORIES[eq.accessoryId].aspect || 1);
        g.save();
        g.translate(px, py);
        g.rotate(p.rot);
        g.drawImage(img, -s / 2, -sh / 2, s, sh);
        if (selected?.equipId === eq.id) {
          g.strokeStyle = '#8a6bff';
          g.lineWidth = 2;
          g.setLineDash([5, 4]);
          g.strokeRect(-s / 2, -sh / 2, s, sh);
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

// Anchor dot under the pointer (only while anchors are shown).
function anchorAt(mx, my) {
  for (let i = 0; i < state.cats.length; i++) {
    const cat = state.cats[i];
    const { cx, size, ground } = slot(i);
    const k = size / 220;
    for (const [key, a] of Object.entries(cat.anchors)) {
      const sx = cx + (a.x - 100) * k;
      const sy = ground - size / 2 + (a.y - 110) * k;
      if (Math.hypot(mx - sx, my - sy) <= 11) return { cat, key, k };
    }
  }
  return null;
}

let drag = null;

canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const anchorHit = showAnchors ? anchorAt(mx, my) : null;
  if (anchorHit) {
    drag = { type: 'anchor', ...anchorHit, lastX: mx, lastY: my, moved: false };
    try { canvas.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
    return;
  }
  const hit = accessoryAt(mx, my);
  if (hit) {
    // Manual placement: drag the accessory instead of playing.
    drag = { type: 'equip', ...hit, lastX: mx, lastY: my, moved: false };
    selected = { catId: hit.cat.id, equipId: hit.eq.id };
    try { canvas.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
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
  const target = drag.type === 'anchor' ? drag.cat.anchors[drag.key] : drag.eq;
  target.x += (mx - drag.lastX) / drag.k;
  target.y += (my - drag.lastY) / drag.k;
  drag.lastX = mx;
  drag.lastY = my;
  drag.moved = true;
});

function endDrag() {
  if (!drag) return;
  const { cat, moved, type } = drag;
  drag = null;
  persist();
  if (type === 'anchor') return;
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

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function sourceOptions(cur) {
  const mine = [...userAssets.values()].filter((a) => a.kind === 'cat');
  const sel = (kind, ref) => (cur.kind === kind && cur.ref === ref ? ' selected' : '');
  return `<optgroup label="GIF">${GIF_ASSETS.map((a) =>
      `<option value="gif:${a.id}"${sel('gif', a.id)}>${a.name}</option>`).join('')}</optgroup>
    <optgroup label="SVG">${Object.entries(SVG_LOOKS).map(([id, l]) =>
      `<option value="svg:${id}"${sel('svg', id)}>${l.name}</option>`).join('')}</optgroup>
    ${mine.length ? `<optgroup label="Mis recursos">${mine.map((a) =>
      `<option value="asset:${a.id}"${sel('asset', a.id)}>${esc(a.name)}</option>`).join('')}</optgroup>` : ''}`;
}

function renderPanel() {
  panel.innerHTML = state.cats.map((cat) => `
    <div class="cat" data-cat="${cat.id}">
      <div class="row head">
        <input data-name type="text" value="${esc(cat.name)}" aria-label="Nombre">
        <select data-src aria-label="Apariencia">${sourceOptions(cat.source)}</select>
        <button data-act="anchors-reset" class="ghost" title="Restablecer anclas">⌖</button>
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
          <strong>${esc(ACCESSORIES[eq.accessoryId]?.name || eq.accessoryId)}</strong>
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
        <select data-add>${accessoryIds().map((id) => `<option value="${id}">${esc(ACCESSORIES[id].name)}</option>`).join('')}</select>
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
    </div>
    <div class="cat upload">
      <h2>Subir recurso</h2>
      <div class="row">
        <label>Tipo <select data-up-kind>
          <option value="cat">Gatito (personaje)</option>
          <option value="accessory">Accesorio</option>
        </select></label>
      </div>
      <div class="row up-acc" hidden>
        <label>Ancla <select data-up-slot>${Object.entries(DEFAULT_ANCHORS).map(([k, a]) =>
          `<option value="${k}">${a.label}</option>`).join('')}</select></label>
        <small>Sonido del accesorio:</small>
        <div class="row traits">${Object.entries(TRAITS).map(([id, t]) =>
          `<label class="chip"><input type="checkbox" data-up-trait="${id}"> ${t.label}</label>`).join('')}</div>
      </div>
      <div class="row"><input type="file" data-upload accept=".svg,.gif,.webp,.png,.jpg,.jpeg,image/*"></div>
      <small>${esc(uploadMsg) || 'SVG, GIF, WebP, PNG o JPG (máx. 8 MB). Se guardan solo en tu navegador.'}</small>
      ${[...userAssets.values()].map((a) => `
        <div class="row asset">
          <span>${a.kind === 'cat' ? '🐱' : '🎩'} ${esc(a.name)}</span>
          <button data-act="asset-del" data-id="${a.id}" class="ghost" title="Borrar">✕</button>
        </div>`).join('')}
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
  if (e.target.closest('.upload')) {
    const card = e.target.closest('.upload');
    if (e.target.dataset.upKind !== undefined) {
      card.querySelector('.up-acc').hidden = e.target.value !== 'accessory';
    } else if (e.target.dataset.upload !== undefined && e.target.files[0]) {
      const traits = [...card.querySelectorAll('[data-up-trait]:checked')].map((c) => c.dataset.upTrait);
      handleUpload(e.target.files[0], {
        kind: card.querySelector('[data-up-kind]').value,
        slot: card.querySelector('[data-up-slot]').value,
        traits,
      });
    }
    return;
  }
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
  if (act === 'asset-del') return deleteUserAsset(e.target.dataset.id);
  const cat = state.cats.find((c) => c.id === e.target.closest('.cat').dataset.cat);
  if (act === 'anchors-reset') {
    cat.anchors = structuredClone(DEFAULT_ANCHORS);
    persist();
    return;
  }
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

// ---- uploads ------------------------------------------------------------------
const MAX_UPLOAD = 8 * 1024 * 1024;
const RASTER = { gif: 'image/gif', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' };

async function handleUpload(file, { kind, slot, traits }) {
  const fail = (msg) => { uploadMsg = msg; renderPanel(); };
  if (file.size > MAX_UPLOAD) return fail('El archivo supera 8 MB.');
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const rec = {
    id: `a${Date.now().toString(36)}`,
    kind,
    name: file.name.replace(/\.[^.]+$/, '').slice(0, 40) || 'Recurso',
    slot,
    traits,
  };

  if (ext === 'svg' || file.type === 'image/svg+xml') {
    const clean = sanitizeSvg(await file.text());
    if (!clean) return fail('SVG no válido.');
    Object.assign(rec, { mime: 'image/svg+xml', svg: clean.svg, w: clean.w, h: clean.h });
  } else if (RASTER[ext]) {
    const blob = new Blob([file], { type: RASTER[ext] });
    let bmp;
    try {
      bmp = await createImageBitmap(blob);
    } catch {
      return fail('No se pudo leer la imagen.');
    }
    Object.assign(rec, { mime: RASTER[ext], blob, w: bmp.width, h: bmp.height });
    bmp.close();
  } else {
    return fail('Formato no soportado (usa svg, gif, webp, png o jpg).');
  }

  const kept = await putAsset(rec);
  registerUserAsset(rec);
  uploadMsg = kept ? `"${rec.name}" guardado.` : `"${rec.name}" cargado (no se pudo guardar en el navegador).`;

  if (kind === 'cat') {
    const n = state.cats.length;
    const cat = hydrate({
      id: `c${Date.now().toString(36)}`,
      name: rec.name,
      source: { kind: 'asset', ref: rec.id },
      pattern: PATTERNS[n % PATTERNS.length],
      equips: [],
    });
    state.cats.push(cat);
    ensureRuntime(cat);
    persist();
  }
  renderPanel();
}

async function deleteUserAsset(id) {
  const a = userAssets.get(id);
  if (!a) return;
  userAssets.delete(id);
  if (a.blob) URL.revokeObjectURL(a.url);
  await deleteAsset(id);
  const accId = `u:${id}`;
  unregisterAccessory(accId);
  delete accImgs[accId];
  for (const cat of state.cats) {
    cat.equips = cat.equips.filter((q) => q.accessoryId !== accId);
    if (cat.source.kind === 'asset' && cat.source.ref === id) {
      cat.source = { kind: 'svg', ref: 'naranjo' };
      ensureRuntime(cat).sprite = makeSprite(cat.source);
    }
  }
  if (selected && !state.cats.some((c) => c.equips.some((q) => q.id === selected.equipId))) selected = null;
  uploadMsg = `"${a.name}" eliminado.`;
  persist();
  renderPanel();
}

// ---- boot ---------------------------------------------------------------------
resize();
renderPanel();
requestAnimationFrame(frame);

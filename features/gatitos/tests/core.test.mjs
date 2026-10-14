import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, resolveStarts, totalDuration } from '../js/anim.js';
import { noteFreq } from '../js/harmony.js';
import { resolveSound } from '../js/sound.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

test('jump peaks mid-way and returns to ground', () => {
  const m = [{ id: 'a', kind: 'jump', amp: 40, duration: 400 }];
  near(evaluate(m, 200).y, -40);
  near(evaluate(m, 0).y, 0);
  near(evaluate(m, 400).y, 0);
});

test('with motions run in parallel and sum', () => {
  const m = [
    { id: 'a', kind: 'jump', amp: 40, duration: 400 },
    { id: 'b', kind: 'pulse', amp: 0.5, duration: 400 },
  ];
  const r = evaluate(m, 200);
  near(r.y, -40);
  near(r.scale, 1.5);
});

test('after chains to the end of its ref, delay staggers', () => {
  const m = [
    { id: 'a', kind: 'jump', amp: 10, duration: 300 },
    { id: 'b', kind: 'shake', amp: 5, duration: 200, start: { mode: 'after', ref: 'a', delay: 50 } },
  ];
  assert.equal(resolveStarts(m).get('b'), 350);
  assert.equal(totalDuration(m), 550);
  assert.equal(evaluate(m, 100).x, 0); // b not started yet
});

test('after-cycle does not hang', () => {
  const m = [
    { id: 'a', kind: 'jump', amp: 1, duration: 100, start: { mode: 'after', ref: 'b' } },
    { id: 'b', kind: 'jump', amp: 1, duration: 100, start: { mode: 'after', ref: 'a' } },
  ];
  assert.ok(Number.isFinite(totalDuration(m)));
});

test('noteFreq: C4 = 261.63, A in C major degree 5 = 440', () => {
  near(noteFreq('C', 'mayor', 0, 4), 261.6256, 1e-3);
  near(noteFreq('C', 'mayor', 5, 4), 440, 0.1);
  near(noteFreq('C', 'mayor', 7, 4), 523.2511, 1e-2); // wraps to next octave
});

test('resolveSound composes modifiers in z order', () => {
  const s = resolveSound({ timbre: 'sine', octave: 4, volume: 0.5 }, [
    { z: 2, timbre: 'square' },
    { z: 1, timbre: 'pluck', octaveShift: 1 },
    { volumeMul: 0.5 },
  ]);
  assert.equal(s.timbre, 'square');
  assert.equal(s.octave, 5);
  near(s.volume, 0.25);
});

// ---- traits / melody ----
import { noteEvents, pickDegree } from '../js/melody.js';
import { traitMods } from '../js/traits.js';

const snd = (ids, base = { timbre: 'sine', octave: 4, volume: 0.5 }) => resolveSound(base, traitMods(ids));

test('no traits: one note per trigger, pattern walks up', () => {
  const ev = noteEvents({ sound: snd([]), pattern: [0, 2, 4], step: 1, beatMs: 600 });
  assert.equal(ev.length, 1);
  assert.equal(ev[0].degree, 2);
});

test('transponer shifts degree, acorde stacks a chord', () => {
  const ev = noteEvents({ sound: snd(['transponer', 'acorde']), pattern: [0], step: 0, beatMs: 600 });
  assert.deepEqual(ev.map((e) => e.degree), [2, 4, 6]);
});

test('doble + eco: ratchet hits each get echoes, decaying', () => {
  const ev = noteEvents({ sound: snd(['doble', 'eco']), pattern: [0], step: 0, beatMs: 600 });
  assert.equal(ev.length, 2 * 3); // 2 hits x (note + 2 echoes)
  assert.equal(ev[0].delayMs, 0);
  near(Math.max(...ev.map((e) => e.volume)), 0.5);
  near(Math.min(...ev.map((e) => e.volume)), 0.5 * 0.25);
});

test('bajada walks backwards, vaiven ping-pongs', () => {
  const p = [0, 1, 2];
  assert.deepEqual([0, 1, 2].map((s) => pickDegree(p, s, 'down')), [2, 1, 0]);
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((s) => pickDegree(p, s, 'pingpong')), [0, 1, 2, 1, 0, 1]);
});

test('octave traits stack, staccato shortens, unknown ids ignored', () => {
  const s = snd(['octava-arriba', 'octava-arriba', 'staccato', 'no-existe']);
  assert.equal(s.octave, 6);
  const ev = noteEvents({ sound: s, pattern: [0], step: 0, beatMs: 600 });
  assert.ok(ev[0].durationMs < 200);
});

// ---- accessories ----
import { newEquip, equipPose, equipMods, DEFAULT_ANCHORS } from '../js/accessories.js';

test('newEquip picks the next free slot and mirrors rotation on the right', () => {
  const a = newEquip('maraca', []);
  assert.equal(a.anchor, 'handL');
  const b = newEquip('maraca', [a]);
  assert.equal(b.anchor, 'handR');
  assert.equal(b.rot, -a.rot);
  assert.ok(b.z > a.z);
  assert.equal(newEquip('nope', []), null);
});

test('equipPose = anchor + offset, scaled size, rotation in radians', () => {
  const e = { accessoryId: 'sombrero', anchor: 'head', x: 5, y: -3, rot: 180, scale: 2, z: 1 };
  const p = equipPose(DEFAULT_ANCHORS, e);
  near(p.x, DEFAULT_ANCHORS.head.x + 5);
  near(p.y, DEFAULT_ANCHORS.head.y - 3);
  near(p.rot, Math.PI);
  near(p.size, 96 * 2);
});

test('worn accessories change the melody like traits', () => {
  const equips = [newEquip('maraca', []), newEquip('corona', [])];
  const s = resolveSound({ timbre: 'sine', octave: 4, volume: 0.5 }, equipMods(equips));
  assert.equal(s.ratchet, 2);
  assert.equal(s.octave, 5);
  assert.ok(s.echo);
});

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

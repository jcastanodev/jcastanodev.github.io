import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeSvg } from '../js/sanitize.js';

test('keeps shapes and viewBox, adds xmlns', () => {
  const r = sanitizeSvg('<svg viewBox="0 0 120 80"><circle cx="5" cy="5" r="3" fill="#f00"/></svg>');
  assert.equal(r.w, 120);
  assert.equal(r.h, 80);
  assert.match(r.svg, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(r.svg, /<circle cx="5" cy="5" r="3" fill="#f00"\/>/);
});

test('drops script, event handlers, foreignObject and their content', () => {
  const r = sanitizeSvg(
    '<svg viewBox="0 0 10 10" onload="alert(1)"><script>alert(2)</script>' +
    '<foreignObject><div>hi</div></foreignObject><rect width="5" height="5" onclick="x()"/></svg>');
  assert.ok(!/script|alert|onload|onclick|foreignObject|div/i.test(r.svg), r.svg);
  assert.match(r.svg, /<rect width="5" height="5"\/>/);
});

test('drops external references and javascript/data urls', () => {
  const r = sanitizeSvg(
    '<svg viewBox="0 0 10 10"><image href="http://evil/x.png"/>' +
    '<rect fill="url(http://evil/p)" stroke="javascript:alert(1)" width="1" height="1"/>' +
    '<path d="M0 0" fill="url(#g)"/></svg>');
  assert.ok(!/image|evil|javascript/i.test(r.svg), r.svg);
  assert.match(r.svg, /fill="url\(#g\)"/); // local gradient refs are fine
});

test('drops attribute values with entities (obfuscated payloads)', () => {
  const r = sanitizeSvg('<svg viewBox="0 0 10 10"><rect fill="&#106;avascript:x" width="1" height="1"/></svg>');
  assert.ok(!/fill=/.test(r.svg), r.svg);
});

test('derives viewBox from width/height, rejects non-svg', () => {
  const r = sanitizeSvg('<svg width="40" height="20"><g/></svg>');
  assert.equal(r.w, 40);
  assert.equal(r.h, 20);
  assert.equal(sanitizeSvg('<html><body>nope</body></html>'), null);
  assert.equal(sanitizeSvg(42), null);
});

test('strips doctype/entity bombs and comments', () => {
  const r = sanitizeSvg(
    '<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY a "bbb">]><!-- hi --><svg viewBox="0 0 1 1"><g/></svg>');
  assert.ok(r && !/ENTITY|DOCTYPE|hi/.test(r.svg), r && r.svg);
});

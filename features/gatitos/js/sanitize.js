// Allowlist SVG sanitizer for user-uploaded files. Pure: no DOM, runs in Node.
//
// Rebuilds the SVG from scratch: only known elements and attributes survive,
// all text/comments/doctype/CDATA are dropped, and any value that could load
// something external or run code is discarded. Returns { svg, w, h } or null.

const MAX_LEN = 500_000;

const TAGS = new Set([
  'svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon',
  'defs', 'lineargradient', 'radialgradient', 'stop', 'clippath',
]);

const ATTRS = new Set([
  'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height',
  'points', 'transform', 'fill', 'fill-opacity', 'fill-rule', 'clip-rule', 'stroke', 'stroke-width',
  'stroke-linecap', 'stroke-linejoin', 'stroke-opacity', 'stroke-dasharray', 'stroke-miterlimit',
  'opacity', 'viewbox', 'id', 'offset', 'stop-color', 'stop-opacity', 'gradientunits',
  'gradienttransform', 'fx', 'fy', 'clip-path', 'preserveaspectratio',
]);

const CANON = { viewbox: 'viewBox', gradientunits: 'gradientUnits', gradienttransform: 'gradientTransform', preserveaspectratio: 'preserveAspectRatio' };
const TAG_CANON = { lineargradient: 'linearGradient', radialgradient: 'radialGradient', clippath: 'clipPath' };

const BAD_VALUE = /javascript:|data:|https?:|\/\/|expression\(|url\((?!\s*['"]?#)/i;

const TAG_RE = /<(\/?)([a-zA-Z][\w:.-]*)((?:\s+[^\s=\/>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)>/g;
const ATTR_RE = /([^\s=\/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

function cleanAttrs(raw) {
  const out = {};
  for (const m of raw.matchAll(ATTR_RE)) {
    const name = m[1].toLowerCase();
    const value = m[2] ?? m[3] ?? m[4] ?? '';
    if (!ATTRS.has(name)) continue;
    if (/[&<]/.test(value) || BAD_VALUE.test(value)) continue;
    out[CANON[name] || name] = value;
  }
  return out;
}

const esc = (v) => v.replace(/"/g, '&quot;');

export function sanitizeSvg(input) {
  if (typeof input !== 'string' || input.length > MAX_LEN) return null;
  const text = input
    .replace(/^﻿/, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '')
    .replace(/<\?[\s\S]*?\?>/g, '')
    .replace(/<!DOCTYPE[^>[]*(\[[\s\S]*?\])?\s*>/gi, '');

  const out = [];
  const stack = [];
  let skip = null; // { name, depth } while inside a dropped element
  let sawRoot = false;
  let viewBox = null;
  let width = null;
  let height = null;

  for (const m of text.matchAll(TAG_RE)) {
    const closing = m[1] === '/';
    const name = m[2].toLowerCase();
    const selfClose = m[4] === '/';

    if (skip) {
      if (name === skip.name) {
        if (closing) skip.depth--;
        else if (!selfClose) skip.depth++;
        if (skip.depth === 0) skip = null;
      }
      continue;
    }

    if (!TAGS.has(name)) {
      if (!closing && !selfClose) skip = { name, depth: 1 };
      continue;
    }

    if (closing) {
      if (stack.at(-1) === name) {
        stack.pop();
        out.push(`</${TAG_CANON[name] || name}>`);
      }
      continue;
    }

    if (name === 'svg') {
      if (sawRoot) {
        if (!selfClose) skip = { name, depth: 1 }; // no nested svg
        continue;
      }
      sawRoot = true;
    } else if (!sawRoot) {
      continue; // content before root
    }

    const attrs = cleanAttrs(m[3] || '');
    if (name === 'svg') {
      viewBox = attrs.viewBox || null;
      width = parseFloat(attrs.width);
      height = parseFloat(attrs.height);
      if (!viewBox && width > 0 && height > 0) viewBox = `0 0 ${width} ${height}`;
      if (!viewBox) viewBox = '0 0 100 100';
      attrs.viewBox = viewBox;
      delete attrs.width;
      delete attrs.height;
    }

    const attrStr = Object.entries(attrs).map(([k, v]) => ` ${k}="${esc(v)}"`).join('');
    const xmlns = name === 'svg' ? ' xmlns="http://www.w3.org/2000/svg"' : '';
    const tag = TAG_CANON[name] || name;
    out.push(`<${tag}${xmlns}${attrStr}${selfClose ? '/' : ''}>`);
    if (!selfClose) stack.push(name);
  }

  if (!sawRoot) return null;
  while (stack.length) {
    const n = stack.pop();
    out.push(`</${TAG_CANON[n] || n}>`);
  }

  const parts = viewBox.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n)) || parts[2] <= 0 || parts[3] <= 0) return null;
  return { svg: out.join(''), w: parts[2], h: parts[3] };
}

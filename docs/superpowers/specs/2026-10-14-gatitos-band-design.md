# Gatitos band — design

Browser game at `features/gatitos/`: a band of cats, built from scratch.
Static only (GitHub Pages): vanilla ES modules, relative paths, no build,
no server, audio synthesized with Web Audio, state in the browser.

## Goal

Assemble a cat band. Each cat has a look (SVG original, later uploaded
image/WebP/GIF), accessories on anchors (head, hands, body…), invisible
traits, layered motions and a sound. A trigger (click now, webcam motion
zones later) makes the cat move and play a note of the band harmony.

## Data model (persisted as JSON)

```
Band      { harmony:{key, scale, bpm}, cats:[Cat] }
Cat       { id, name, source, anchors, accessories:[Equip], traits:[Sound],
            sound:Sound, motions:[Motion], harmonyOverride?, zone? }
Equip     { accessoryId, anchor, offset:{x,y}, rot, scale, z }
Accessory { id, anchorSlot, svg|null, sound:Sound }   // svg null = invisible trait
Sound     { timbre, octave, volume, rhythm }          // effective = base + accessories in z order
Motion    { id, kind:'jump'|'shake'|'spin'|'pulse'|'custom', target:'whole'|partId,
            amp, duration, start:{mode:'with'|'after', ref?, delay} }
```

Motions combine: `with` runs in parallel, `after` chains to another motion's
end, `delay` staggers. Transforms sum (x, y, rot) / multiply (scale).
Whole-image targets drag anchors and accessories along.

## Modules

`store` persistence · `harmony` scales/notes · `sound` effective-sound resolver ·
`anim` motion evaluator (pure) · `audio` Web Audio synth · `render` canvas ·
`cats` built-in SVG cats · `main` UI. Later: `accessories`, `tracker`,
`editor`, `export`.

## Increments (each shippable)

0. Skeleton + placeholder cats + click = note
1. Band sounding: global harmony, timbre per cat, combinable motions, persistence
2. Accessories + per-accessory sound + invisible traits
3. Webcam motion tracker by zones (trigger)
4. Upload image/WebP/GIF/SVG (sanitized), draggable anchors
5. Keyframe motion editor, per-cat harmony override
6. Export GIF/WebP

## Testing

Unit tests only where cheap and critical: sound resolver, motion evaluator,
SVG sanitizer. The rest is checked by hand in the browser.
Run: `node --test "features/gatitos/tests/*.test.mjs"`.

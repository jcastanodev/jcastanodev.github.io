// Trait catalog: invisible accessories. Each `mod` is a partial Sound that
// resolveSound() folds into the cat's base sound (see sound.js).
//
// Melody-level fields (consumed by melody.js):
//   degreeShift  scale degrees added to every note
//   stack        extra degrees played together with the note (chord)
//   echo         { count, gap (beats), decay } repeats the note
//   ratchet      hits per beat
//   order        'up' | 'down' | 'pingpong' pattern walk
//   durationMul  note length multiplier

export const TRAITS = {
  'octava-arriba': { label: 'Octava ↑', mod: { octaveShift: 1 } },
  'octava-abajo': { label: 'Octava ↓', mod: { octaveShift: -1 } },
  'transponer': { label: 'Transponer +2', mod: { degreeShift: 2 } },
  'tercera': { label: 'Tercera', mod: { stack: [2] } },
  'quinta': { label: 'Quinta', mod: { stack: [4] } },
  'acorde': { label: 'Acorde', mod: { stack: [2, 4] } },
  'eco': { label: 'Eco', mod: { echo: { count: 2, gap: 0.5, decay: 0.5 } } },
  'doble': { label: 'Doble', mod: { ratchet: 2 } },
  'triple': { label: 'Triple', mod: { ratchet: 3 } },
  'bajada': { label: 'Bajada', mod: { order: 'down' } },
  'vaiven': { label: 'Vaivén', mod: { order: 'pingpong' } },
  'staccato': { label: 'Staccato', mod: { durationMul: 0.4 } },
  'legato': { label: 'Legato', mod: { durationMul: 2 } },
  'electrico': { label: 'Eléctrico', mod: { timbre: 'square' } },
  'cristal': { label: 'Cristal', mod: { timbre: 'sine' } },
  'puas': { label: 'Púas', mod: { timbre: 'pluck' } },
};

export const TRAIT_IDS = Object.keys(TRAITS);

export function traitMods(ids = []) {
  return ids.map((id) => TRAITS[id]?.mod).filter(Boolean);
}

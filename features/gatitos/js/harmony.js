// Scales and note frequencies. Pure.

export const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Semitone offsets from the tonic.
export const SCALES = {
  mayor: [0, 2, 4, 5, 7, 9, 11],
  menor: [0, 2, 3, 5, 7, 8, 10],
  pentatonica: [0, 2, 4, 7, 9],
  blues: [0, 3, 5, 6, 7, 10],
  'mixolidio': [0, 2, 4, 5, 7, 9, 10],
};

// Frequency of scale `degree` (may exceed scale length: wraps up octaves).
// `octave` 4 puts degree 0 of C at middle C.
export function noteFreq(key, scale, degree, octave = 4) {
  const steps = SCALES[scale] || SCALES.mayor;
  const keyIdx = Math.max(0, KEYS.indexOf(key));
  const wrap = Math.floor(degree / steps.length);
  const idx = ((degree % steps.length) + steps.length) % steps.length;
  const semis = keyIdx + steps[idx] + 12 * (octave - 4 + wrap);
  // MIDI 60 = middle C = 261.63 Hz
  return 261.6256 * Math.pow(2, semis / 12);
}

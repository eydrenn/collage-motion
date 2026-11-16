// Synthesizes the built-in paper sounds (kit/sounds). Maintainers run it with `collage sounds --build-kit`.
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { rng, hash } from "./svg.mjs";
import { wavBytes } from "./sound.mjs";

const RATE = 48000;
const buf = (sec) => new Float32Array(Math.round(sec * RATE));

function biquad(x, type, f, q = 0.707) {
  const w = (2 * Math.PI * f) / RATE, c = Math.cos(w), al = Math.sin(w) / (2 * q), a0 = 1 + al, a1 = -2 * c, a2 = 1 - al;
  const [b0, b1, b2] = type === "lp" ? [(1 - c) / 2, 1 - c, (1 - c) / 2] : type === "hp" ? [(1 + c) / 2, -(1 + c), (1 + c) / 2] : [al, 0, -al];
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
  return y;
}
// paper is noise that crackles: every random "fibre" opens the noise and it dies out in a few milliseconds
function crackle(sec, R, rate, decayMs) {
  const y = buf(sec), k = Math.exp(-1 / ((decayMs / 1000) * RATE));
  let m = 0;
  for (let i = 0; i < y.length; i++) { if (R() < rate(i / y.length) / RATE) m = 0.35 + R() * 0.65; y[i] = (R() * 2 - 1) * m; m *= k; }
  return y;
}
function thump(sec, f0, f1, decay) {
  const y = buf(sec);
  let phase = 0;
  for (let i = 0; i < y.length; i++) { const t = i / RATE; phase += (2 * Math.PI * (f0 * Math.pow(f1 / f0, i / y.length))) / RATE; y[i] = Math.sin(phase) * Math.exp(-t * decay); }
  return y;
}
function burst(sec, R, decay) { const y = buf(sec); for (let i = 0; i < y.length; i++) y[i] = (R() * 2 - 1) * Math.exp((-i / RATE) * decay); return y; }
function fade(y, attackMs, releaseMs) {
  const a = (attackMs / 1000) * RATE, r = (releaseMs / 1000) * RATE;
  for (let i = 0; i < y.length; i++) y[i] *= Math.min(1, i / a) * Math.min(1, (y.length - 1 - i) / r);
  return y;
}
// moves the brightness from one band to another along the sound
function sweep(y, fromHz, toHz, q = 0.8) {
  const lo = biquad(y, "bp", fromHz, q), hi = biquad(y, "bp", toHz, q), out = new Float32Array(y.length);
  for (let i = 0; i < y.length; i++) { const u = i / y.length; out[i] = lo[i] * (1 - u) + hi[i] * u; }
  return out;
}
function mix(length, ...layers) {
  const y = buf(length);
  for (const [x, gain, at = 0] of layers) { const o = Math.round(at * RATE); for (let i = 0; i < x.length && o + i < y.length; i++) y[o + i] += x[i] * gain; }
  return y;
}
function level(y, peakDb) {
  let peak = 0;
  for (const v of y) peak = Math.max(peak, Math.abs(v));
  const g = Math.pow(10, peakDb / 20) / (peak || 1);
  for (let i = 0; i < y.length; i++) y[i] *= g;
  return y;
}

const RECIPES = {
  tear: (R) => level(fade(biquad(biquad(crackle(0.6, R, (t) => 700 + 2500 * Math.min(1, t * 1.6), 1.6), "hp", 1300), "lp", 9500), 4, 180), -4),
  slide: (R) => level(fade(sweep(crackle(0.34, R, () => 380, 7), 1800, 5200), 110, 160), -9),
  rise: (R) => level(fade(sweep(crackle(0.24, R, () => 450, 6), 1400, 6000), 60, 90), -9),
  pose: (R) => level(fade(biquad(crackle(0.13, R, () => 420, 5), "bp", 3600, 0.7), 20, 80), -11),
  hide: (R) => level(fade(biquad(crackle(0.11, R, () => 450, 5), "bp", 3000, 0.7), 80, 20), -12),
  shake: (R) => level(fade(biquad(crackle(0.42, R, (t) => 250 + 500 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 9 * t)), 5), "bp", 2600, 0.6), 10, 140), -8),
  camera: (R) => level(mix(0.17, [fade(sweep(crackle(0.17, R, () => 600, 4), 1500, 6500), 10, 110), 1], [thump(0.07, 110, 70, 40), 0.5]), -7),
  pop: (R) => level(mix(0.08, [thump(0.08, 260, 120, 55), 0.8], [biquad(burst(0.03, R, 260), "hp", 1800), 0.7]), -6),
  strip: (R) => level(mix(0.09, [thump(0.09, 180, 90, 45), 0.6], [biquad(burst(0.06, R, 120), "bp", 2500, 0.6), 0.9]), -6),
  drop: (R) => level(mix(0.18, [thump(0.16, 130, 55, 26), 1], [fade(biquad(crackle(0.16, R, () => 300, 6), "bp", 2200, 0.7), 2, 120), 0.5, 0.01]), -4),
  hop: (R) => level(mix(0.07, [thump(0.06, 300, 170, 60), 0.6], [fade(biquad(crackle(0.07, R, () => 500, 3), "bp", 3000, 0.7), 2, 50), 0.5]), -9),
  letter: (R) => level(mix(0.024, [biquad(biquad(burst(0.022, R, 380), "hp", 900), "lp", 5000), 1], [thump(0.02, 420, 300, 160), 0.4]), -10),
};

export function buildKit(dir) {
  mkdirSync(dir, { recursive: true });
  return Object.entries(RECIPES).map(([name, make]) => {
    const mono = make(rng(hash(`foley/${name}`))), stereo = new Float32Array(mono.length * 2);
    for (let i = 0; i < mono.length; i++) stereo[i * 2] = stereo[i * 2 + 1] = mono[i];
    writeFileSync(join(dir, `${name}.wav`), wavBytes(stereo));
    return { name, seconds: +(mono.length / RATE).toFixed(3) };
  });
}

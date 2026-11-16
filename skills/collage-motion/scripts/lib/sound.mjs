// Sound: the pack, the effects track mixed from cues, and the ffmpeg arguments for the final mix.
import { existsSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, extname, basename } from "node:path";
import { spawnSync } from "node:child_process";
import { PROJECT, SKILL, UsageError } from "./env.mjs";
import { CUE_KINDS } from "./cues.mjs";

const RATE = 48000, CHANNELS = 2;
const EXTENSIONS = [".wav", ".mp3", ".ogg", ".m4a", ".flac", ".aac"];
// when a kind has no file of its own: the kind whose file stands in (null = stays silent)
const FALLBACK = { move: "slide", show: "pop", hide: "pose", appear: "strip", cut: null, face: null, spin: null };
// Every file is brought to the level of its kind, whatever level it was recorded at: [peak, average] in dB.
// The numbers assume a voice at VOICE_LUFS: big events sit just under it, small repeated ones well under.
const LEVEL = {
  tear: [-8, -22], drop: [-8, -20], camera: [-11, -24], shake: [-12, -26], pop: [-12, -26], show: [-12, -26], strip: [-12, -26], appear: [-13, -27],
  slide: [-14, -28], move: [-14, -28], rise: [-14, -28], hop: [-14, -27], cut: [-14, -28], pose: [-18, -32], spin: [-18, -32], hide: [-20, -34], letter: [-20, -34], face: [-22, -36],
};
// the table was tuned against a voice at -16 LUFS; the offset keeps the same distance from whatever the standard is
const OTHER_LEVEL = [-12, -26], VOICE_LUFS = -14, LEVEL_OFFSET = VOICE_LUFS + 16, CEILING_DB = -1;
// kinds that repeat quickly get a slightly different speed each time, so they do not sound like a machine
const VARIED = new Set(["letter", "pop", "pose"]);
const SOUND_FIELDS = ["pack", "builtin", "narration", "words", "music", "effects", "musicVolume", "narrationVolume", "mute", "gain"];
export const KIT_SOUNDS = join(SKILL, "kit/sounds");

const fromDb = (db) => Math.pow(10, db / 20);
const findFile = (dir, name) => {
  if (!existsSync(dir)) return null;
  const exact = join(dir, name);
  if (extname(name) && existsSync(exact)) return exact;
  const hit = readdirSync(dir).find((f) => basename(f, extname(f)) === name && EXTENSIONS.includes(extname(f).toLowerCase()));
  return hit ? join(dir, hit) : null;
};

export function loudnessOf(file) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-vn", "-af", "loudnorm=print_format=json", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 1 << 26 });
  const json = (r.stderr || "").match(/\{[^{}]*"input_i"[^{}]*\}/);
  if (!json) return { lufs: null, peak: null };
  const m = JSON.parse(json[0]), n = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
  return { lufs: n(m.input_i), peak: n(m.input_tp) };
}

export function soundPlan(scene, cues) {
  const s = scene.sound || {}, warnings = [];
  for (const key of Object.keys(s)) if (!SOUND_FIELDS.includes(key)) warnings.push(`sound: unknown field "${key}" (known: ${SOUND_FIELDS.join(", ")})`);
  for (const kind of [...(s.mute || []), ...Object.keys(s.gain || {})]) if (!(kind in CUE_KINDS)) warnings.push(`sound: cue kind "${kind}" does not exist (there is: ${Object.keys(CUE_KINDS).join(", ")})`);
  const dir = resolve(PROJECT, s.pack || "sounds"), muted = new Set(s.mute || []);
  const places = s.builtin === false ? [dir] : [dir, KIT_SOUNDS];
  const lookup = (name) => { for (const place of places) { const file = findFile(place, name); if (file) return file; } return null; };
  const files = {};
  for (const kind of Object.keys(CUE_KINDS)) {
    if (muted.has(kind)) { files[kind] = null; continue; }
    files[kind] = findFile(dir, kind) || (FALLBACK[kind] ? findFile(dir, FALLBACK[kind]) : null) || lookup(kind) || (FALLBACK[kind] ? lookup(FALLBACK[kind]) : null);
  }
  // a voice or a track is brought to a known loudness first, so `narrationVolume` and `musicVolume` mean the same for any file
  const track = (value, what) => {
    if (!value) return null;
    const file = resolve(PROJECT, value);
    if (!existsSync(file)) { warnings.push(`sound: ${what} file not found: ${value}`); return null; }
    const { lufs } = loudnessOf(file);
    if (lufs == null) warnings.push(`sound: could not measure the loudness of ${value}; it plays at its own level`);
    return { file, lufs, gainDb: lufs == null ? 0 : Math.max(-24, Math.min(24, VOICE_LUFS - lufs)) };
  };
  const used = [...new Set(cues.map((c) => c.kind))];
  const named = cues.filter((c) => c.sound).map((c) => { const file = lookup(c.sound); if (!file) warnings.push(`sound: "${c.sound}" (asked by ${c.target || `shot ${c.shot}`}) is not in ${s.pack || "sounds"}/ nor a built-in sound`); return file; });
  const narration = track(s.narration, "narration"), music = track(s.music, "music");
  const plan = {
    dir, files, muted, warnings, lookup, narration, music,
    effects: s.effects ?? 1, narrationVolume: s.narrationVolume ?? 1, gain: s.gain || {},
    // under a voice the music is a bed; with no voice it is the programme
    musicVolume: s.musicVolume ?? (narration ? 0.2 : 0.7),
    silentKinds: used.filter((k) => !files[k] && !muted.has(k) && FALLBACK[k] !== null),
  };
  plan.hasEffects = used.some((k) => files[k]) || named.some(Boolean);
  plan.any = plan.hasEffects || Boolean(narration || music);
  return plan;
}

function decode(file) {
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-f", "f32le", "-ac", String(CHANNELS), "-ar", String(RATE), "-"], { maxBuffer: 1 << 29 });
  if (r.status !== 0) throw new UsageError(`could not read the sound file ${file}: ${String(r.stderr).trim().split("\n").pop()}`);
  const bytes = r.stdout.subarray(0, r.stdout.length - (r.stdout.length % 4));
  return new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length));
}

// the gain that brings a file to the level of its kind: whichever of peak and average is reached first
function levelGain(data, kind) {
  let peak = 0, sum = 0;
  for (let i = 0; i < data.length; i++) { const v = Math.abs(data[i]); if (v > peak) peak = v; sum += v * v; }
  const [peakDb, averageDb] = LEVEL[kind] || OTHER_LEVEL;
  return Math.min(fromDb(peakDb + LEVEL_OFFSET) / (peak || 1e-9), fromDb(averageDb + LEVEL_OFFSET) / (Math.sqrt(sum / (data.length || 1)) || 1e-9));
}

export function mixEffects(plan, cues, t0, t1, file) {
  const frames = Math.ceil((t1 - t0) * RATE), mix = new Float32Array(frames * CHANNELS), cache = new Map();
  const sample = (path, kind) => { const key = `${path}|${kind}`; if (!cache.has(key)) { const data = decode(path); cache.set(key, { data, gain: levelGain(data, kind) }); } return cache.get(key); };
  const sounding = cues.map((cue, index) => ({ cue, index, path: cue.t < t0 || cue.t >= t1 ? null : cue.sound ? plan.lookup(cue.sound) : plan.files[cue.kind] })).filter((c) => c.path);
  for (const { cue, index, path } of sounding) {
    const { data, gain: level } = sample(path, cue.sound ? "other" : cue.kind);
    // sounds that land together would add up: each one gives way a little
    const together = sounding.filter((o) => Math.abs(o.cue.t - cue.t) < 0.045).length;
    const gain = (level * plan.effects * (plan.gain[cue.kind] ?? 1)) / Math.sqrt(together);
    const speed = VARIED.has(cue.kind) ? 1 + (((index * 37) % 11) - 5) * 0.012 : 1;
    const start = Math.round((cue.t - t0) * RATE), length = Math.floor(data.length / CHANNELS / speed);
    for (let i = 0; i < length && start + i < frames; i++) {
      const pos = i * speed, a = Math.floor(pos), frac = pos - a, b = Math.min(a + 1, data.length / CHANNELS - 1);
      for (let ch = 0; ch < CHANNELS; ch++) mix[(start + i) * CHANNELS + ch] += (data[a * CHANNELS + ch] * (1 - frac) + data[b * CHANNELS + ch] * frac) * gain;
    }
  }
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, wavBytes(mix));
  return sounding.length;
}

export function audioArgs(plan, effectsFile, t0, duration) {
  const inputs = [], chains = [], labels = [];
  const voice = plan.narration, bed = plan.music, keys = voice ? [effectsFile && "kfx", bed && "kmu"].filter(Boolean) : [];
  let n = 1, fx = null;
  if (effectsFile) { inputs.push("-i", effectsFile); fx = n++; }
  if (voice) {
    inputs.push("-ss", String(t0), "-i", voice.file);
    const out = ["[na]", ...keys.map((k) => `[${k}]`)].join("");
    chains.push(`[${n}:a]volume=${(fromDb(voice.gainDb) * plan.narrationVolume).toFixed(4)}${keys.length ? `,asplit=${keys.length + 1}` : ""}${out}`);
    labels.push("[na]"); n++;
  }
  // effects and music both step back while the voice is speaking: the music a lot, the effects a little
  if (fx) { chains.push(voice ? `[${fx}:a][kfx]sidechaincompress=threshold=0.03:ratio=2.5:attack=8:release=220[fx]` : `[${fx}:a]anull[fx]`); labels.push("[fx]"); }
  if (bed) {
    inputs.push("-stream_loop", "-1", "-ss", String(t0), "-i", bed.file);
    const level = `[${n}:a]volume=${(fromDb(bed.gainDb) * plan.musicVolume).toFixed(4)},afade=t=out:st=${Math.max(0, duration - 0.6).toFixed(2)}:d=0.6`;
    chains.push(voice ? `${level}[bed];[bed][kmu]sidechaincompress=threshold=0.04:ratio=5:attack=25:release=350[mu]` : `${level}[mu]`);
    labels.push("[mu]"); n++;
  }
  if (!labels.length) return null;
  chains.push(`${labels.join("")}amix=inputs=${labels.length}:normalize=0:dropout_transition=0,apad,alimiter=limit=${fromDb(CEILING_DB - 0.5).toFixed(3)}:level=disabled[a]`);
  return { inputs, output: ["-filter_complex", chains.join(";"), "-map", "0:v", "-map", "[a]", "-t", duration.toFixed(3), "-c:a", "aac", "-b:a", "192k"] };
}

export function wavBytes(samples) {
  const bytes = Buffer.alloc(44 + samples.length * 2);
  bytes.write("RIFF", 0); bytes.writeUInt32LE(36 + samples.length * 2, 4); bytes.write("WAVEfmt ", 8); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(CHANNELS, 22); bytes.writeUInt32LE(RATE, 24); bytes.writeUInt32LE(RATE * CHANNELS * 2, 28); bytes.writeUInt16LE(CHANNELS * 2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36); bytes.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) bytes.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  return bytes;
}

export { FALLBACK, findFile, VOICE_LUFS };

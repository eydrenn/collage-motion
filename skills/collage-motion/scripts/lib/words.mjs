// Narration words with their times, and scene times written as "word:deploy" turned into seconds.
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { PROJECT, UsageError } from "./env.mjs";

const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/-/g, "").replace(/[^a-z0-9']+/g, " ").trim();

export function parseWords(data) {
  let raw;
  if (Array.isArray(data)) raw = data;
  else if (Array.isArray(data.words)) raw = data.words;
  else if (Array.isArray(data.segments)) raw = data.segments.flatMap((s) => s.words || []);
  else if (Array.isArray(data.transcription)) {
    // whisper.cpp: tokens that do not start with a space continue the previous word
    raw = [];
    for (const t of data.transcription) {
      const piece = { word: t.text, start: t.offsets.from / 1000, end: t.offsets.to / 1000 };
      if (raw.length && !/^\s/.test(t.text) && /^[\p{L}\p{N}']/u.test(t.text)) { raw[raw.length - 1].word += t.text; raw[raw.length - 1].end = piece.end; } else raw.push(piece);
    }
  } else if (data.alignment || data.normalized_alignment || data.characters) {
    const a = data.alignment || data.normalized_alignment || data, starts = a.character_start_times_seconds, ends = a.character_end_times_seconds;
    raw = [];
    let cur = null;
    a.characters.forEach((ch, i) => {
      if (/\s/.test(ch)) { cur = null; return; }
      if (!cur) raw.push((cur = { word: "", start: starts[i], end: ends[i] }));
      cur.word += ch; cur.end = ends[i];
    });
  } else throw new UsageError('the words file has a shape this tool does not know. The simplest one is a list: [{ "word": "deploy", "start": 4.2, "end": 4.6 }]');
  let tag = false;
  raw = raw.filter((w) => { const t = String(w.word ?? w.text ?? w.w ?? "").trim(), open = tag || t.startsWith("["); tag = open && !t.endsWith("]"); return !open; });
  return raw.map((w) => ({ text: String(w.word ?? w.text ?? w.w ?? "").trim(), start: Number(w.start), end: Number(w.end ?? w.start) }))
    .filter((w) => w.text && Number.isFinite(w.start)).map((w) => ({ ...w, key: norm(w.text) })).filter((w) => w.key);
}

export function loadWords(scene) {
  const value = scene.sound?.words;
  if (!value) return null;
  const file = resolve(PROJECT, value);
  if (!existsSync(file)) throw new UsageError(`words file not found: ${value}`);
  return parseWords(JSON.parse(readFileSync(file, "utf8")));
}

const REF = /^(word|after):(.+?)(?:#(\d+))?([+-]\d*\.?\d+)?$/;

// the reference syntax ("word:deploy", "after:", "#2", "+0.2") is described in references/voice.md
export function resolveScene(scene, words) {
  const out = structuredClone(scene), warnings = [], fps = scene.fps || 12;
  let start = 0;
  (out.shots || []).forEach((shot, si) => {
    const where = `shot ${si + 1}`;
    const absolute = (value) => {
      const m = REF.exec(value);
      if (!m) { warnings.push(`${where}: time "${value}" is not a number nor "word:<word>"`); return null; }
      if (!words) { warnings.push(`${where}: "${value}" needs the word timings of the narration: set sound.words`); return null; }
      const keys = norm(m[2]).split(" "), hits = [];
      for (let i = 0; i + keys.length <= words.length; i++) if (keys.every((k, j) => words[i + j].key === k)) hits.push(i);
      const i = m[3] ? hits[Number(m[3]) - 1] : hits.find((h) => words[h].start >= start - 0.25);
      if (i == null) { warnings.push(`${where}: "${m[2]}" is not said${m[3] ? ` ${m[3]} times` : hits.length ? " in or after this shot" : ""} in the narration`); return null; }
      return (m[1] === "after" ? words[i + keys.length - 1].end : words[i].start) + Number(m[4] || 0);
    };
    if (shot.until != null) {
      const t = typeof shot.until === "number" ? shot.until : absolute(shot.until);
      if (t != null && t - start < 1 / fps) warnings.push(`${where}: its "until" (${t.toFixed(2)} s) is not after its own start (${start.toFixed(2)} s)`);
      else if (t != null) shot.duration = +(t - start).toFixed(3);
      delete shot.until;
    }
    if (typeof shot.duration !== "number") { warnings.push(`${where}: needs a "duration" in seconds, or an "until"`); shot.duration = 2; }
    const local = (value) => {
      const t = absolute(value);
      if (t == null) return 0;
      if (t < start - 1e-6 || t >= start + shot.duration) warnings.push(`${where}: "${value}" is said at ${t.toFixed(2)} s, outside this shot (${start.toFixed(2)} to ${(start + shot.duration).toFixed(2)} s)`);
      return Math.max(0, +(t - start).toFixed(3));
    };
    for (const layer of shot.layers || []) for (const key of ["at", "until"]) if (typeof layer[key] === "string") layer[key] = local(layer[key]);
    for (const action of shot.actions || []) if (typeof action.at === "string") action.at = local(action.at);
    start += Math.round(shot.duration * fps) / fps;
  });
  return { scene: out, warnings };
}

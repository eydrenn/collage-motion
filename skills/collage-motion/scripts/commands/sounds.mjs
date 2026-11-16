// Command: sounds.
import { existsSync, readdirSync, copyFileSync, mkdirSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { eventsOf, CUE_KINDS } from "../lib/cues.mjs";
import { loadWords, resolveScene } from "../lib/words.mjs";
import { soundPlan, FALLBACK, KIT_SOUNDS, VOICE_LUFS } from "../lib/sound.mjs";
import { PROJECT, readArgs, UsageError } from "../lib/env.mjs";

export async function sounds(argv) {
  const a = readArgs(argv), arg = a.rest[0];
  if (a.flag("build-kit")) {
    const { buildKit } = await import("../lib/foley.mjs");
    for (const s of buildKit(KIT_SOUNDS)) console.log(`kit/sounds/${s.name}.wav  ${s.seconds} s`);
    return;
  }
  if (a.flag("copy")) {
    const dir = join(PROJECT, "sounds");
    mkdirSync(dir, { recursive: true });
    for (const file of readdirSync(KIT_SOUNDS).filter((f) => f.endsWith(".wav"))) {
      const kept = existsSync(join(dir, file));
      if (!kept) copyFileSync(join(KIT_SOUNDS, file), join(dir, file));
      console.log(`${kept ? "kept   " : "copied "} sounds/${file}`);
    }
    console.log("Replace any of them with your own recording of the same name; the next render uses yours.");
    return;
  }
  let scene = { shots: [] }, label = "";
  if (arg) {
    const file = [join(PROJECT, "scenes", arg, "scene.mjs"), resolve(arg)].find((f) => existsSync(f) && f.endsWith(".mjs"));
    if (!file) throw new UsageError(`scene "${arg}" not found`);
    const written = (await import(pathToFileURL(file).href)).default, timed = resolveScene(written, loadWords(written));
    for (const w of timed.warnings) console.log(`warning: ${w}`);
    scene = timed.scene;
    label = ` in ${basename(file) === "scene.mjs" ? basename(dirname(file)) : basename(file)}`;
  }
  const { cues } = eventsOf(scene), plan = soundPlan(scene, cues), count = {};
  for (const c of cues) count[c.kind] = (count[c.kind] || 0) + 1;
  for (const w of plan.warnings) console.log(`warning: ${w}`);
  const where = (file) => (file.startsWith(KIT_SOUNDS) ? `built-in ${basename(file)}` : relative(PROJECT, file));
  for (const [kind, about] of Object.entries(CUE_KINDS)) {
    if (arg && !count[kind]) continue;
    const file = plan.files[kind];
    const plays = plan.muted.has(kind) ? "muted" : file ? where(file) : FALLBACK[kind] === null ? "silent unless you add a file" : "silent";
    console.log(`${kind.padEnd(8)} ${arg ? String(count[kind]).padStart(3) + "×  " : ""}${plays.padEnd(30)} ${about}`);
  }
  const track = (t) => (t ? `${relative(PROJECT, t.file)}${t.lufs != null ? ` (${t.lufs.toFixed(1)} LUFS, ${t.gainDb >= 0 ? "+" : ""}${t.gainDb.toFixed(1)} dB to reach ${VOICE_LUFS})` : ""}` : "none");
  if (arg) console.log(`${cues.length} cues${label}. narration: ${track(plan.narration)} · music: ${track(plan.music)}${plan.music ? `, played at ${plan.musicVolume} of the voice level` : ""}`);
  console.log(`Your own files go in ${relative(PROJECT, plan.dir) || "."}/, named after the kind (pop.wav, tear.mp3). \`collage sounds --copy\` copies the built-in ones there to start from.`);
}

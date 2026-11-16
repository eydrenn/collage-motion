// Command: check (the warnings of a still or a scene, without a browser).
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { buildFrame } from "../lib/frame.mjs";
import { sceneWarnings } from "../lib/scene.mjs";
import { eventsOf } from "../lib/cues.mjs";
import { loadWords, resolveScene } from "../lib/words.mjs";
import { soundPlan } from "../lib/sound.mjs";
import { readArgs, loadKit, UsageError } from "../lib/env.mjs";
import { findScene } from "./film.mjs";

export async function check(argv) {
  const target = readArgs(argv).rest[0], kit = loadKit(), warnings = [];
  let about;
  if (target?.endsWith(".json")) {
    if (!existsSync(resolve(target))) throw new UsageError(`${target} not found`);
    const still = JSON.parse(readFileSync(resolve(target), "utf8"));
    if (!Array.isArray(still.frames)) throw new UsageError(`${target} needs a "frames" array`);
    still.frames.forEach((f, i) => { for (const w of buildFrame(f, i, kit, { width: f.width / 2 }).warnings) warnings.push(`frame ${i + 1}: ${w}`); });
    about = `${still.frames.length} frame(s)`;
  } else {
    const { file } = findScene(target);
    const written = (await import(pathToFileURL(file).href)).default;
    if (!written || !Array.isArray(written.shots)) throw new UsageError(`${file} must \`export default\` a scene object with a \`shots\` array`);
    const timed = resolveScene(written, loadWords(written)), scene = timed.scene;
    warnings.push(...timed.warnings, ...sceneWarnings(scene, kit));
    try {
      const events = eventsOf(scene);
      warnings.push(...(soundPlan(scene, events.cues).warnings || []));
      about = `${scene.shots.length} shot(s), ${events.duration.toFixed(2)} s, ${events.cues.length} sound cues`;
    } catch { about = `${scene.shots.length} shot(s); the times could not be worked out until the warnings above are fixed`; }
  }
  for (const w of [...new Set(warnings)]) console.log(`  warning: ${w}`);
  console.log(`checked: ${about} · ${warnings.length ? `${new Set(warnings).size} warning(s)` : "no warnings"}`);
  console.log("This checks names, fields, times and where the text sits. It does not draw: look at a still or a contact sheet before calling it done.");
}

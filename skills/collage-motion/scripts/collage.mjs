#!/usr/bin/env node
// collage-motion command line. Run from the project folder; output goes to ./out.
import { UsageError } from "./lib/env.mjs";

const COMMANDS = {
  doctor: ["setup", "Check Node, the browser, ffmpeg and the kit."],
  selftest: ["setup", "Render the examples in a temporary folder and check the results."],
  init: ["setup", "Create ./art, ./scenes/demo and ./stills/demo.json to start from."],
  library: ["art", "List the library art (name, size, parts). --sheet renders it."],
  art: ["art", "Turn SVG sources into paper cutouts: art <file.svg ...> | --all."],
  backgrounds: ["art", "Render every background colour of the kit."],
  cast: ["cast", "Render the cast, the faces and the poses: cast [name] [--src]."],
  check: ["check", "List the warnings of a still or a scene without drawing it (needs no browser): check <scene | file.json>."],
  frame: ["frame", "Render still frames from a JSON description: frame <file.json>."],
  slice: ["slice", "Export art or a character as transparent PNG pieces."],
  film: ["film", "Film a scene: film <scene> --sheet | --animatic | --stills a,b | --mp4 [--final] | --cues."],
  words: ["words", "List the word timings of a narration, or make them from audio: words <file>."],
  sounds: ["sounds", "Show what each cue plays: sounds [scene]. --copy puts the built-in sounds in ./sounds."],
};

const [name, ...argv] = process.argv.slice(2);
if (!name || name === "help" || name === "--help" || !COMMANDS[name]) {
  if (name && name !== "help" && name !== "--help") console.error(`unknown command: ${name}\n`);
  console.log("usage: collage <command> [options]\n");
  for (const [command, [, about]] of Object.entries(COMMANDS)) console.log(`  ${command.padEnd(12)} ${about}`);
  console.log("\nRun from your project folder. Output goes to ./out. Details: references/ in the skill folder.");
  process.exit(name && COMMANDS[name] === undefined && name !== "help" && name !== "--help" ? 1 : 0);
}

try {
  const module = await import(`./commands/${COMMANDS[name][0]}.mjs`);
  await module[name](argv);
} catch (error) {
  // a mistake in how the command was used gets a plain message; anything else keeps its stack
  if (error instanceof UsageError) { console.error(`collage ${name}: ${error.message}`); process.exit(1); }
  throw error;
}

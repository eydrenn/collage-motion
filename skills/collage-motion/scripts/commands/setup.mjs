// Commands: doctor, init.
import { existsSync, mkdirSync, copyFileSync, writeFileSync, accessSync, constants } from "node:fs";
import { join } from "node:path";
import { SKILL, PROJECT, loadKit, artNames, LIBRARY, launchBrowser, browserUsed, ffmpegVersion } from "../lib/env.mjs";
import { mkdtempSync, statSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

export async function doctor() {
  let failed = 0;
  const line = (ok, label, detail, fix) => { if (!ok) failed++; console.log(`${ok ? "ok     " : "MISSING"} ${label}${detail ? `: ${detail}` : ""}${!ok && fix ? `\n        fix: ${fix}` : ""}`); };
  const major = Number(process.versions.node.split(".")[0]);
  line(major >= 18, "Node.js 18 or newer", process.versions.node, "install a current Node.js from https://nodejs.org");
  try { const kit = loadKit(); line(true, "kit", `${Object.keys(kit.palette.paper).length} papers, ${Object.keys(kit.cast).length} characters, ${artNames(LIBRARY).length} library art`); }
  catch (e) { line(false, "kit", e.message, `reinstall the skill; files are missing under ${SKILL}`); }
  try { const browser = await launchBrowser(); const version = browser.version(); await browser.close(); line(true, "browser", `${browserUsed()} (${version})`); }
  catch (e) { line(false, "browser", e.message.split("\n")[0], e.message.split("\n").slice(1).join(" ").trim()); }
  const ff = ffmpegVersion();
  line(Boolean(ff), "ffmpeg (only needed for --mp4)", ff, "macOS: brew install ffmpeg · Debian/Ubuntu: sudo apt install ffmpeg · Windows: winget install ffmpeg");
  try { accessSync(PROJECT, constants.W_OK); line(true, "project folder is writable", PROJECT); }
  catch { line(false, "project folder is writable", PROJECT, "run the command from a folder you can write to"); }
  console.log(failed ? `\n${failed} problem(s). Fix them and run \`collage doctor\` again.` : "\nEverything is in place.");
  if (failed) process.exit(1);
}

export async function init() {
  const made = [];
  const copy = (from, to) => { const target = join(PROJECT, to); if (existsSync(target)) return; mkdirSync(join(target, ".."), { recursive: true }); copyFileSync(join(SKILL, "examples", from), target); made.push(to); };
  for (const dir of ["art", "scenes", "stills"]) mkdirSync(join(PROJECT, dir), { recursive: true });
  copy("demo/scene.mjs", "scenes/demo/scene.mjs");
  copy("demo.json", "stills/demo.json");
  copy("art/text-samples.svg", "art/text-samples.svg");
  if (!existsSync(join(PROJECT, "characters.json"))) { writeFileSync(join(PROJECT, "characters.json"), "{}\n"); made.push("characters.json"); }
  console.log(made.length ? `created: ${made.join(", ")}` : "nothing to create: the project files already exist");
  console.log("next:\n  collage frame stills/demo.json     a still, to judge the look\n  collage film demo --sheet          the contact sheet of the demo scene\n  collage film demo --animatic       the storyboard in motion\n  collage film demo --mp4            the preview video\nAdd `out/` and `.collage-cache/` to your .gitignore.");
}

// Renders the examples in a temporary project and checks what comes out. `npm test` runs it.
export async function selftest() {
  const dir = mkdtempSync(join(tmpdir(), "collage-selftest-")), cli = join(SKILL, "scripts/collage.mjs");
  const run = (...args) => { const r = spawnSync(process.execPath, [cli, ...args], { cwd: dir, encoding: "utf8" }); return { text: (r.stdout || "") + (r.stderr || ""), code: r.status }; };
  const size = (file) => { try { return statSync(join(dir, file)).size; } catch { return 0; } };
  let failed = 0;
  const check = (label, ok, detail = "") => { if (!ok) failed++; console.log(`${ok ? "pass" : "FAIL"}  ${label}${ok || !detail ? "" : `\n      ${detail.trim().split("\n").slice(-3).join("\n      ")}`}`); };
  const clean = (r) => r.code === 0 && !/warning|error/i.test(r.text);
  let r = run("init"); check("init creates a project", r.code === 0 && size("scenes/demo/scene.mjs") > 0, r.text);
  r = run("library"); check("the library lists its art", r.code === 0 && /\d+ library art/.test(r.text), r.text);
  r = run("frame", "stills/demo.json"); check("the demo still renders with no warning", clean(r) && size("out/demo-still.png") > 50000, r.text);
  r = run("check", "demo"); check("the demo scene checks clean without a browser", r.code === 0 && /no warnings/.test(r.text), r.text);
  r = run("cast"); check("the cast sheet renders", clean(r) && size("out/cast-sheet.png") > 50000, r.text);
  r = run("film", "demo", "--sheet"); check("the demo scene makes a contact sheet with no warning", clean(r) && size("out/demo-sheet.jpg") > 20000, r.text);
  r = run("film", "demo", "--cues"); check("the demo scene has cues", r.code === 0 && size("out/demo-cues.json") > 100, r.text);
  if (ffmpegVersion()) {
    r = run("film", "demo", "--animatic"); check("the animatic renders with sound", clean(r) && /sound: \d+ effects/.test(r.text) && size("out/demo-animatic.mp4") > 20000, r.text);
  } else console.log("skip  the animatic (ffmpeg is not installed)");
  writeFileSync(join(dir, "stills/wrong.json"), JSON.stringify({ name: "wrong", frames: [{ width: 1080, height: 1920, background: { color: "navy" }, layers: [{ type: "character", name: "dev", face: "nope", pose: "nope", x: 100, y: 700 }, { type: "text", text: "LOW", x: 540, y: 1800, size: 60, strip: "black" }] }] }));
  r = run("check", "stills/wrong.json"); check("check reports the same wrong still", r.code === 0 && /face "nope"/.test(r.text) && /3 warning|[4-9] warning/.test(r.text), r.text);
  r = run("frame", "stills/wrong.json"); check("a wrong still is reported, not drawn in silence", r.code === 0 && /face "nope"/.test(r.text) && /pose "nope"/.test(r.text) && /under the interface/.test(r.text), r.text);
  console.log(failed ? `\n${failed} check(s) failed. The project is kept in ${dir}` : `\nAll checks passed (${readdirSync(join(dir, "out")).length} files rendered in a temporary folder).`);
  if (failed) process.exit(1);
}

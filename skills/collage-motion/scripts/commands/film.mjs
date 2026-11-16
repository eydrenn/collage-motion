// Command: film (contact sheet, stills, animatic, video, cues).
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { prepare } from "../lib/scene.mjs";
import { eventsOf } from "../lib/cues.mjs";
import { loadWords, resolveScene } from "../lib/words.mjs";
import { soundPlan, mixEffects, audioArgs, loudnessOf } from "../lib/sound.mjs";
import { PROJECT, OUT, outDir, readArgs, loadKit, launchBrowser, needFfmpeg, UsageError } from "../lib/env.mjs";

export function findScene(arg) {
  if (!arg) throw new UsageError("give a scene: a name under ./scenes or the path to a scene file");
  const file = [join(PROJECT, "scenes", arg, "scene.mjs"), resolve(arg), resolve(arg, "scene.mjs")].find((f) => existsSync(f) && f.endsWith(".mjs"));
  if (!file) throw new UsageError(`scene "${arg}" not found (looked for scenes/${arg}/scene.mjs and ${arg})`);
  return { file, slug: basename(file) === "scene.mjs" ? basename(dirname(file)) : basename(file).replace(/\.mjs$/, "") };
}

export async function film(argv) {
  const a = readArgs(argv);
  const sheet = a.flag("sheet"), mp4 = a.flag("mp4"), final = a.flag("final"), animatic = a.flag("animatic");
  const scale = Number(a.value("scale", 0.5)), wantCues = a.flag("cues"), silent = a.flag("silent"), guides = a.flag("guides");
  const every = Number(a.value("every", 0.5)), stills = a.value("stills", ""), from = a.value("from"), to = a.value("to");
  const jitter = a.value("jitter"), suffix = a.value("suffix", "");
  const { file, slug } = findScene(a.rest[0]);
  if (!(sheet || mp4 || stills || animatic || wantCues)) throw new UsageError("choose what to make: --sheet, --stills <t1,t2>, --animatic, --mp4 [--final], or --cues");
  if (mp4 || animatic) needFfmpeg();

  const written = (await import(pathToFileURL(file).href)).default;
  if (!written || !Array.isArray(written.shots)) throw new UsageError(`${file} must \`export default\` a scene object with a \`shots\` array`);
  const timed = resolveScene(written, loadWords(written)), scene = timed.scene;
  for (const w of timed.warnings) console.log(`  warning: ${w}`);
  const cache = join(PROJECT, ".collage-cache", slug), started = Date.now();
  outDir();
  const out = (ending) => `${slug}${suffix ? `-${suffix}` : ""}${ending}`;
  const events = eventsOf(scene);

  if (wantCues) {
    writeFileSync(join(OUT, out("-cues.json")), JSON.stringify({ fps: events.fps, duration: events.duration, cues: events.cues }, null, 1) + "\n");
    const count = {};
    for (const c of events.cues) count[c.kind] = (count[c.kind] || 0) + 1;
    console.log(`cues: out/${out("-cues.json")} · ${events.cues.length} in ${events.duration.toFixed(2)} s · ${Object.entries(count).map(([k, n]) => `${k} ${n}`).join(", ")}`);
    if (!(sheet || mp4 || stills || animatic)) return;
  }
  const plan = silent ? null : soundPlan(scene, events.cues);
  for (const w of plan?.warnings || []) console.log(`  warning: ${w}`);
  const kit = loadKit(), browser = await launchBrowser();

  async function stage(k, still = false) {
    const t0 = Date.now();
    const p = await prepare(scene, { browser, kit, k, dir: cache, jitter: still ? 0 : jitter != null ? Number(jitter) : undefined, guides });
    for (const w of p.warnings) console.log(`  warning: ${w}`);
    mkdirSync(cache, { recursive: true });
    const pageFile = join(cache, `stage-${k}.html`);
    writeFileSync(pageFile, p.html);
    const page = await browser.newPage({ viewport: { width: Math.round(scene.width * k), height: Math.round(scene.height * k) }, deviceScaleFactor: 1 });
    page.on("pageerror", (e) => console.log(`  [page error] ${e.message}`));
    await page.goto(pathToFileURL(pageFile).href);
    await page.evaluate(() => window.ready);
    console.log(`pieces: ${p.pieces} (${p.fresh} new) in ${((Date.now() - t0) / 1000).toFixed(1)} s · ${p.duration.toFixed(2)} s of scene, ${p.total} frames at ${p.fps}/s · shots start at ${p.cuts.map((c) => c.toFixed(2)).join(", ")} s`);
    let before = new Map(), last = null, shots = 0;
    // sends only what changed; when nothing changed, returns the previous photo
    async function frame(f, quality = 95) {
      const state = p.state(f), ops = [];
      for (const [id, v] of state) { const b = before.get(id); if (!b || b[0] !== v[0] || b[1] !== v[1] || b[2] !== v[2]) ops.push([id, v[0], v[1] ?? null, v[2] ?? null]); }
      before = state;
      if (!ops.length && last) return last;
      await page.evaluate((o) => window.apply(o), ops);
      shots++;
      return (last = await page.screenshot({ type: "jpeg", quality }));
    }
    return { ...p, frame, photographed: () => shots, close: () => page.close() };
  }

  if (stills) {
    const p = await stage(1);
    for (const t of stills.split(",").map(Number)) {
      writeFileSync(join(OUT, out(`-t${t.toFixed(2)}.jpg`)), await p.frame(Math.min(p.total - 1, Math.round(t * p.fps))));
      console.log(`still: out/${out(`-t${t.toFixed(2)}.jpg`)}`);
    }
    await p.close();
  }

  if (sheet) {
    const p = await stage(0.25);
    const t0 = from != null ? Number(from) : 0, t1 = to != null ? Number(to) : p.duration, images = [];
    for (let t = t0; t < t1 - 1e-6; t += every) images.push({ t, b64: (await p.frame(Math.round(t * p.fps), 85)).toString("base64") });
    const cols = Math.min(10, Math.max(5, Math.ceil(Math.sqrt(images.length * 2.6)))), w = Math.round(scene.width * 0.25);
    const page = await browser.newPage({ viewport: { width: cols * (w + 4) + 8, height: 600 }, deviceScaleFactor: 1 });
    await page.setContent(`<body style="margin:0;background:#16181d;padding:6px;display:grid;grid-template-columns:repeat(${cols},${w}px);gap:4px;font:600 13px ui-monospace,Menlo,monospace;color:#fff">${images.map((i) => `<div style="position:relative"><img src="data:image/jpeg;base64,${i.b64}" style="width:${w}px;display:block"><span style="position:absolute;left:5px;top:4px;background:#000b;padding:1px 6px;border-radius:4px">${i.t.toFixed(2)} s</span></div>`).join("")}</body>`);
    await page.screenshot({ path: join(OUT, out("-sheet.jpg")), type: "jpeg", quality: 84, fullPage: true });
    await page.close(); await p.close();
    console.log(`sheet: out/${out("-sheet.jpg")} (${images.length} frames, one every ${every} s)`);
  }

  async function record(p, name, pick = (f) => f) {
    const f0 = from != null ? Math.round(Number(from) * p.fps) : 0, f1 = to != null ? Math.round(Number(to) * p.fps) : p.total, t0 = Date.now();
    let audio = null, sounded = 0;
    if (plan?.any) {
      const wav = join(cache, `effects-${name}.wav`);
      if (plan.hasEffects) sounded = mixEffects(plan, events.cues, f0 / p.fps, f1 / p.fps, wav);
      audio = audioArgs(plan, plan.hasEffects ? wav : null, f0 / p.fps, (f1 - f0) / p.fps);
    }
    // drawn at the scene's rate (12 a second by default); the file doubles each frame
    const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(p.fps), "-c:v", "mjpeg", "-i", "-", ...(audio?.inputs || []), "-vf", `fps=${p.fps * 2},scale=trunc(iw/2)*2:trunc(ih/2)*2`, "-c:v", "libx264", "-crf", "17", "-preset", "medium", "-pix_fmt", "yuv420p", ...(audio?.output || []), "-movflags", "+faststart", join(OUT, name)], { stdio: ["pipe", "inherit", "inherit"] });
    const finished = new Promise((ok, fail) => ff.on("close", (code) => (code ? fail(new Error(`ffmpeg exited with ${code}`)) : ok())));
    for (let f = f0; f < f1; f++) {
      const buffer = await p.frame(pick(f));
      if (!ff.stdin.write(buffer)) await new Promise((ok) => ff.stdin.once("drain", ok));
    }
    ff.stdin.end();
    await finished;
    const heard = [sounded ? `${sounded} effects` : null, plan?.narration ? "narration" : null, plan?.music ? "music" : null].filter(Boolean);
    // measured on the finished file, so the line reports what the video really has
    const loud = heard.length ? loudnessOf(join(OUT, name)) : null;
    const levels = loud?.lufs != null ? ` at ${loud.lufs.toFixed(1)} LUFS, peak ${loud.peak.toFixed(1)} dB` : "";
    const about = heard.length ? `sound: ${heard.join(", ")}${levels}` : silent ? "no sound (--silent)" : "no sound";
    if (loud?.peak > -0.3) console.log("  warning: the sound touches the ceiling; lower `effects`, `musicVolume` or `narrationVolume`");
    if (plan?.silentKinds.length && sounded) console.log(`  silent cues (no file in the pack): ${plan.silentKinds.join(", ")}`);
    console.log(`video: out/${name} · ${f1 - f0} frames, ${p.photographed()} photographed (${Math.round((1 - p.photographed() / (f1 - f0)) * 100)} % reused) in ${((Date.now() - t0) / 1000).toFixed(1)} s · ${about}`);
    await p.close();
  }

  if (animatic) {
    const { keys } = eventsOf(scene);
    const hold = (f) => { let k = keys[0] ?? 0; for (const key of keys) { if (key > f) break; k = key; } return k; };
    await record(await stage(0.25, true), out("-animatic.mp4"), hold);
  }

  if (mp4) await record(await stage(final ? 1 : scale), out(final ? "-final.mp4" : "-preview.mp4"));
  console.log(`total: ${((Date.now() - started) / 1000).toFixed(1)} s`);
  await browser.close();
}

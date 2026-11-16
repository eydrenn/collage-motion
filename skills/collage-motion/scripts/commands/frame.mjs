// Command: frame (still frames from JSON).
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildFrame } from "../lib/frame.mjs";
import { OUT, FONT_CSS, outDir, readArgs, loadKit, launchBrowser, shoot, UsageError } from "../lib/env.mjs";

export async function frame(argv) {
  const a = readArgs(argv), guides = a.flag("guides"), file = a.rest[0] && resolve(a.rest[0]);
  if (!file || !existsSync(file)) throw new UsageError("give the JSON file that describes the frames, for example stills/demo.json");
  const still = JSON.parse(readFileSync(file, "utf8")), kit = loadKit();
  const frames = still.frames.map((f, i) => {
    const r = buildFrame(f, i, kit, { width: f.width / 2, guides });
    for (const w of r.warnings) console.log(`  warning (frame ${i + 1}): ${w}`);
    return r.svg;
  });
  const html = `<!doctype html><meta charset="utf-8"><style>${FONT_CSS}html,body{margin:0;background:#fff}#f{display:inline-flex;gap:24px;padding:24px;background:#222}svg{display:block}</style><div id="f">${frames.join("")}</div>`;
  const browser = await launchBrowser();
  outDir();
  await shoot(browser, html, join(OUT, `${still.name}.png`), { width: 3200, scale: 2 });
  await browser.close();
  console.log(`frames: out/${still.name}.png`);
}

// Command: slice (art or a character as transparent PNG pieces).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { generate } from "../lib/generate.mjs";
import { sourceOf } from "../lib/frame.mjs";
import { stamp } from "../lib/pieces.mjs";
import { OUT, LIBRARY, PROJECT, FONT_CSS, readArgs, loadKit, artNames, launchBrowser, UsageError } from "../lib/env.mjs";

const MARGIN = 40; // room around the art for its shadow

export async function slice(argv) {
  const a = readArgs(argv), scale = Number(a.value("scale", 2)), who = a.value("character"), face = a.value("face"), all = a.flag("all");
  const kit = loadKit();
  const names = all ? [...new Set([...artNames(LIBRARY), ...artNames(join(PROJECT, "art"))])].sort() : a.rest;
  const targets = who ? [{ layer: { type: "character", name: who, face }, name: `character-${who}${face ? `-${face}` : ""}` }] : names.map((name) => ({ layer: { type: "art", name }, name }));
  if (!targets.length) throw new UsageError("give art names, --character <name> [--face <face>], or --all");
  const browser = await launchBrowser();
  let done = 0, skipped = 0;
  for (const t of targets) {
    const source = sourceOf(t.layer, kit), dir = join(OUT, "pieces", t.name), sheet = join(dir, "pieces.json");
    const mark = stamp(source, scale, JSON.stringify(kit.palette), FONT_CSS.length);
    if (existsSync(sheet) && JSON.parse(readFileSync(sheet, "utf8")).mark === mark) { skipped++; continue; }
    const g = generate(source, t.name, kit), width = g.width + 2 * MARGIN, height = g.height + 2 * MARGIN;
    mkdirSync(dir, { recursive: true });
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
    await page.setContent(`<!doctype html><meta charset="utf-8"><style>${FONT_CSS}html,body{margin:0;background:transparent}svg{display:block}</style><svg xmlns="http://www.w3.org/2000/svg" viewBox="${-MARGIN} ${-MARGIN} ${width} ${height}" width="${width}" height="${height}"><defs>${g.defs}</defs>${g.fragments.map((f) => f.svg).join("")}</svg>`);
    await page.evaluate(() => document.fonts.ready);
    const parts = [];
    for (const p of g.meta.parts) {
      await page.evaluate((id) => { for (const e of document.querySelectorAll("svg > g")) e.style.display = e.id === id ? "" : "none"; }, `${t.name}-${p.id}`);
      await page.screenshot({ path: join(dir, `${p.id}.png`), omitBackground: true });
      parts.push({ id: p.id, ...(p.parent ? { parent: p.parent } : {}), file: `${p.id}.png`, pivot: p.pivot.map((v) => (v + MARGIN) * scale), box: p.box.map((v) => (v + MARGIN) * scale) });
    }
    await page.close();
    writeFileSync(sheet, JSON.stringify({ name: t.name, mark, scale, margin: MARGIN * scale, width: width * scale, height: height * scale, parts }, null, 1) + "\n");
    console.log(`${t.name}: ${parts.length} pieces in out/pieces/${t.name}/`);
    done++;
  }
  console.log(`${done} sliced, ${skipped} already up to date`);
  await browser.close();
}

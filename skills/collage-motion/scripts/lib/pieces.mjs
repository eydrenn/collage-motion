// Rasterizes SVG groups to PNG files named by content, so unchanged pieces are reused.
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { FONT_CSS } from "./env.mjs";

export const stamp = (...values) => createHash("sha1").update(values.map(String).join("|")).digest("hex").slice(0, 14);

export async function slice(browser, { box, defs, groups, dsf, dir, opaque = false }) {
  const x = Math.floor(box[0]), y = Math.floor(box[1]), w = Math.ceil(box[2] + box[0] - x), h = Math.ceil(box[3] + box[1] - y);
  const files = {}, missing = [];
  for (const g of groups) {
    files[g.id] = `${stamp(x, y, w, h, dsf, opaque, defs, g.svg)}.png`;
    if (!existsSync(join(dir, files[g.id]))) missing.push(g);
  }
  const r = { files, x, y, width: w * dsf, height: h * dsf, fresh: missing.length };
  if (!missing.length) return r;
  mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dsf });
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>${FONT_CSS}html,body{margin:0;background:transparent}svg{display:block}</style>` +
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}"><defs>${defs}</defs>${missing.map((g, i) => `<g id="s${i}" style="display:none">${g.svg}</g>`).join("")}</svg>`);
  await page.evaluate(() => document.fonts.ready);
  for (const [i, g] of missing.entries()) {
    await page.evaluate((n) => { for (const e of document.querySelectorAll("svg > g")) e.style.display = e.id === `s${n}` ? "" : "none"; }, i);
    await page.screenshot({ path: join(dir, files[g.id]), omitBackground: !opaque });
  }
  await page.close();
  return r;
}

// Command: cast.
import { join } from "node:path";
import { character, faces, POSES } from "../lib/character.mjs";
import { generate } from "../lib/generate.mjs";
import { applyPose } from "../lib/frame.mjs";
import { checkSheet } from "../lib/check.mjs";
import { OUT, FONT_CSS, outDir, readArgs, loadKit, launchBrowser, shoot, UsageError } from "../lib/env.mjs";

export async function cast(argv) {
  const a = readArgs(argv), src = a.flag("src"), who = a.rest[0];
  const kit = loadKit();
  if (who && !kit.cast[who]) throw new UsageError(`character "${who}" is not in the cast (there is: ${Object.keys(kit.cast).join(", ")})`);
  if (src) { if (!who) throw new UsageError("--src needs a character name"); console.log(character(kit.cast[who], kit.palette)); return; }

  for (const [name, sheet] of Object.entries(who ? { [who]: kit.cast[who] } : kit.cast)) for (const w of checkSheet(sheet, kit, name)) console.log(`  warning: ${w}`);

  let n = 0;
  const one = (sheet, pose = {}, height = 300) => {
    const name = `c${n++}`, g = generate(character(sheet, kit.palette), name, kit);
    for (const w of [...new Set(g.warnings)]) console.log(`  warning: ${w}`);
    // extra room so raised arms stay inside the picture
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-110 -60 620 ${g.height + 60}" height="${height}"><defs>${g.defs}</defs>${applyPose(g, name, pose)}</svg>`;
  };
  const row = (title, items) => `<h2>${title}</h2><div class="l">${items.map((i) => `<div class="q">${i.svg}<small>${i.label}</small></div>`).join("")}</div>`;
  const first = who || Object.keys(kit.cast)[0], base = kit.cast[first];
  let body = "";
  if (!who) body += row("cast", Object.entries(kit.cast).map(([name, sheet]) => ({ svg: one(sheet), label: name })));
  body += row(`faces · ${first}`, faces.map((face) => ({ svg: one({ ...base, face }, {}, 240), label: face })));
  body += row(`poses · ${first}`, Object.entries(POSES).map(([name, pose]) => ({ svg: one(base, pose, 240), label: name })));

  const html = `<!doctype html><meta charset="utf-8"><style>${FONT_CSS}
html,body{margin:0;background:#fff}#f{display:inline-block;padding:28px 36px;background:#CDBE9C}
h2{font:600 15px ui-monospace,Menlo,monospace;color:#5d5443;margin:18px 0 4px}
.l{display:flex;flex-wrap:wrap;align-items:flex-end;gap:6px;max-width:2500px}.q{display:flex;flex-direction:column;align-items:center}
.q small{font:500 13px ui-monospace,Menlo,monospace;color:#5d5443;margin-top:4px}svg{display:block}
</style><div id="f">${body}</div>`;
  const file = who ? `cast-${who}-sheet.png` : "cast-sheet.png", browser = await launchBrowser();
  outDir();
  await shoot(browser, html, join(OUT, file), { width: 3200, height: 1600, scale: 1 });
  await browser.close();
  console.log(`sheet: out/${file}`);
}

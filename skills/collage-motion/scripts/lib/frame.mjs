// Builds a still frame (SVG) from its description.
import { generate } from "./generate.mjs";
import { createContext } from "./paper.mjs";
import { mosaic, band, tear } from "./background.mjs";
import { write } from "./text.mjs";
import { character, POSES } from "./character.mjs";
import { rng, hash } from "./svg.mjs";
import { checkFrame } from "./check.mjs";
import { zonesFor, placeText, textWarnings, guidesSvg } from "./zones.mjs";

export function sourceOf(layer, kit) {
  if (layer.type === "character") {
    const sheet = kit.cast[layer.name];
    if (!sheet) throw new Error(`character "${layer.name}" is not in the cast`);
    return character({ ...sheet, ...(layer.overrides || {}), ...(layer.face ? { face: layer.face } : {}), ...(layer.stance ? { stance: layer.stance } : {}) }, kit.palette);
  }
  return kit.artSource(layer.name);
}

export const poseOf = (layer) => (typeof layer.pose === "string" ? POSES[layer.pose] || {} : layer.pose || {});

export function applyPose(g, name, pose, warnings = []) {
  let svg = g.body;
  for (const [part, degrees] of Object.entries(pose)) {
    const p = g.meta.parts.find((x) => x.id === part);
    if (!p) { warnings.push(`${name} has no part "${part}"`); continue; }
    svg = svg.replace(`<g id="${name}-${part}"`, `<g id="${name}-${part}" transform="rotate(${degrees} ${p.pivot[0]} ${p.pivot[1]})"`);
  }
  return svg;
}

export function buildFrame(frame, index, kit, { width, guides } = {}) {
  const ctx = createContext(`f${index}`, kit, 1), color = (n) => kit.palette.paper[n] || n;
  checkFrame(frame, kit, ctx.warnings);
  const zones = zonesFor(kit.zones, frame.safe, frame.width, frame.height, frame.margins === "ads");
  if (zones?.error) ctx.warnings.push(zones.error);
  let defs = "", body = mosaic({ width: frame.width, height: frame.height, color: color(frame.background.color), seed: frame.background.seed }, ctx);
  frame.layers.forEach((layer, i) => {
    if (layer.type === "band") body += band({ width: frame.width, y: layer.y, height: layer.height, color: color(layer.color), shadow: layer.shadow }, ctx);
    else if (layer.type === "art" || layer.type === "character") {
      const name = `${layer.name}${index}x${i}`;
      const g = generate(sourceOf(layer, kit), name, kit, { seed: layer.seed ?? 1 });
      defs += g.defs;
      // a piece turns around the same point as in a filmed scene: the middle of its feet
      const t = `translate(${layer.x} ${layer.y}) scale(${layer.scale ?? 1})${layer.rotate ? ` rotate(${layer.rotate} ${g.width / 2} ${g.height * 0.8 + 24})` : ""}${layer.flip ? ` translate(${g.width} 0) scale(-1 1)` : ""}`;
      body += `<g transform="${t}">${applyPose(g, name, poseOf(layer), ctx.warnings)}</g>`;
    } else if (layer.type === "text") {
      const placed = placeText(layer, zones, ctx.warnings, frame.width, frame.height), t = write({ ...placed, anchor: placed.anchor || "start" }, ctx, rng(hash(`${index}/${i}/${layer.text}`)));
      ctx.warnings.push(...textWarnings(layer.text, t.box, zones));
      body += t.svg;
    } else if (layer.type === "tear") {
      if (layer.mosaic) {
        const id = `tear${index}x${i}`, R = rng(hash(id));
        const pts = [[-40, -40], [layer.at, -40]];
        let x = layer.at;
        for (let y = -40; y <= frame.height + 40; y += 9 + R() * 16) { x += (R() - 0.5) * 9 + (layer.at - x) * 0.25; pts.push([x + (R() - 0.5) * 7, y]); }
        pts.push([layer.at, frame.height + 40], [-40, frame.height + 40]);
        const d = "M" + pts.map((p) => p.map((v) => v.toFixed(1)).join(" ")).join("L") + "Z";
        defs += `<clipPath id="${id}"><path d="${d}"/></clipPath>`;
        body += `<g filter="url(#${ctx.filter("torn", 3, 0)})"><g clip-path="url(#${id})">${mosaic({ width: frame.width, height: frame.height, color: color(layer.color), seed: 9 }, ctx)}</g>` +
          `<path d="${d}" fill="none" stroke="#F6F1E4" stroke-width="4" stroke-linejoin="round"/></g>`;
      } else body += tear({ height: frame.height, at: layer.at, color: color(layer.color) }, ctx);
    }
  });
  // filters repeat across arts (same id, same definition): keep the first
  const seen = new Set();
  const unique = (defs + ctx.defs()).replace(/<(filter|clipPath) id="([^"]+)"[\s\S]*?<\/\1>/g, (m, _t, id) => (seen.has(id) ? "" : (seen.add(id), m)));
  const w = width ?? frame.width;
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${frame.width} ${frame.height}" width="${w}" height="${(w * frame.height) / frame.width}" style="overflow:hidden"><defs>${unique}</defs>${body}${guides ? guidesSvg(zones) : ""}</svg>`, warnings: [...new Set(ctx.warnings)] };
}

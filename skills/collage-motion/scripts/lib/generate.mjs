// Source SVG -> paper pieces grouped by part.
import { readSvg, geometry, rng, hash } from "./svg.mjs";
import { createContext, piece, boundsOf } from "./paper.mjs";
import { write } from "./text.mjs";

const f = (n) => +n.toFixed(1);

export function generate(source, name, kit, { seed = 1 } = {}) {
  const { viewBox, elements, parts, pivots, parents } = readSvg(source);
  const [, , width, height] = viewBox;
  const ctx = createContext(name, kit, seed);
  if (/\sstyle="/.test(source)) ctx.warnings.push('style="" attribute is ignored: use fill and data-* directly on the element');
  const meta = { name, width, height, pieces: 0, parts: [] };
  const own = {};
  for (const part of parts) {
    let svg = "", box = [Infinity, Infinity, -Infinity, -Infinity];
    const grow = (b) => { box = [Math.min(box[0], b[0]), Math.min(box[1], b[1]), Math.max(box[2], b[2]), Math.max(box[3], b[3])]; };
    const texts = [];
    elements.filter((e) => e.part === part).forEach((el, idx) => {
      const R = rng(hash(`${name}/${part}/${idx}`) + seed * 7919);
      const a = el.attrs;
      if (el.tag === "text") {
        const [x, y] = [el.matrix[0] * +(a.x || 0) + el.matrix[2] * +(a.y || 0) + el.matrix[4], el.matrix[1] * +(a.x || 0) + el.matrix[3] * +(a.y || 0) + el.matrix[5]];
        const t = write({
          text: el.text, x, y, size: parseFloat(a["font-size"] || 60), anchor: a["text-anchor"] || "start",
          color: a.fill && a.fill !== "none" ? a.fill : null, strip: a["data-strip"], ransom: a["data-ransom"],
          tilt: a["data-tilt"] != null ? parseFloat(a["data-tilt"]) : undefined,
          shadow: a["data-shadow"] != null ? parseInt(a["data-shadow"]) : undefined,
        }, ctx, R);
        svg += t.svg; grow(t.box); meta.pieces += t.letters.length;
        texts.push({ text: el.text, tilt: t.tilt, letters: t.letters });
        return;
      }
      if ((el.tag === "polygon" || el.tag === "polyline") && /[a-df-zA-DF-Z]/.test(a.points || "")) ctx.warnings.push(`${el.tag} with a letter in points (${part}): curves only work in <path>`);
      const subs = geometry(el, R, 5);
      if (!subs.length) return;
      const p = piece(el, subs, ctx, R);
      if (p) { svg += p; grow(boundsOf(subs)); meta.pieces++; }
    });
    const pivot = pivots[part] || [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2];
    own[part] = svg;
    meta.parts.push({ id: part, ...(parents[part] ? { parent: parents[part] } : {}), box: box.map(f), pivot: pivot.map(f), ...(texts.length ? { texts } : {}) });
    if (box[0] < -1 || box[1] < -1 || box[2] > width + 1 || box[3] > height + 1) ctx.warnings.push(`part "${part}" extends outside the viewBox`);
  }
  // `body` nests each part inside its parent, so a pose turns the whole limb; `fragments` keeps every part alone, for slicing
  const group = (part, inner) => `<g id="${name}-${part}" data-part="${part}">${own[part]}${inner}</g>`;
  const nest = (part) => group(part, parts.filter((c) => parents[c] === part).map(nest).join(""));
  const body = parts.filter((p) => !parents[p]).map(nest).join(""), fragments = parts.map((p) => ({ id: p, svg: group(p, "") }));
  return { name, width, height, body, fragments, defs: ctx.defs(), meta, warnings: ctx.warnings };
}

export const compose = (g) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.width} ${g.height}" width="${g.width}" height="${g.height}"><defs>${g.defs}</defs>${g.body}</svg>`;

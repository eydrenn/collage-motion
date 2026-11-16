// Cut-out letters: on a strip, loose, or one per paper square (ransom).
import { cutout } from "./paper.mjs";

const f = (n) => +n.toFixed(2);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
export const FONT = `Anton, Impact, sans-serif`;

export function write(o, ctx, R) {
  const M = ctx.kit.metrics, P = ctx.kit.palette;
  const cap = o.size, fs = cap / M.cap, str = o.text.toUpperCase();
  const width = (ch) => (M.adv[ch] ?? (ctx.warnings.push(`letter without a measured width in "${o.text}": ${ch}`), M.adv["?"] ?? 0.5)) * fs;
  const isRansom = o.ransom != null && o.ransom !== false;
  const pad = isRansom ? cap * 0.17 : 0, gap = isRansom ? -1.5 : cap * 0.045, space = isRansom ? cap * 0.34 : cap * 0.3;
  const items = [];
  let x = 0;
  for (const ch of str) {
    if (ch === " ") { x += space; continue; }
    const w = width(ch) + pad * 2;
    items.push({ ch, x, w });
    x += w + gap;
  }
  const total = x - gap;
  const x0 = o.x - (o.anchor === "middle" ? total / 2 : o.anchor === "end" ? total : 0);
  const tilt = o.tilt ?? (R() - 0.5) * 2.4;
  const cx = x0 + total / 2, cy = o.y - cap / 2;
  const px = cap * 0.34, py = cap * 0.3;
  const box = [x0 - px, o.y - cap - py, x0 + total + px, o.y + py];
  const letters = [], parts = [];

  if (isRansom) {
    const colors = (typeof o.ransom === "string" && o.ransom ? o.ransom.split(/[\s,]+/) : P.ransom).map((c) => ctx.color(c));
    const ink = ctx.color(o.color, "black");
    items.forEach((it, i) => {
      const lx = x0 + it.x, dy = (R() - 0.5) * cap * 0.12, g = (R() - 0.5) * 7, over = cap * 0.2 + R() * cap * 0.06;
      const q = (dx, dyy) => [dx + (R() - 0.5) * 3, dyy + (R() - 0.5) * 3];
      const pts = [q(lx, o.y - cap - over), q(lx + it.w, o.y - cap - over), q(lx + it.w, o.y + over * 0.9), q(lx, o.y + over * 0.9)];
      const mx = lx + it.w / 2, my = o.y - cap / 2 + dy;
      parts.push({ id: `l${i}`, svg: `<g data-letter="${i}" transform="translate(0 ${f(dy)}) rotate(${f(g)} ${f(mx)} ${f(my - dy)})">` +
        cutout([{ pts, closed: true }], { color: colors[(i + ((R() * 2) | 0)) % colors.length], shadow: o.shadow ?? 1, rim: false, cut: "scissors" }, ctx, R) +
        `<g filter="url(#${ctx.filter("scissors", 0, i % 3)})"><text x="${f(mx)}" y="${f(o.y)}" font-family='${FONT}' font-size="${f(fs)}" text-anchor="middle" fill="${ink}">${esc(it.ch)}</text></g></g>` });
      letters.push({ ch: it.ch, x: f(mx), y: f(o.y + dy), w: f(it.w) });
    });
  } else {
    if (o.strip) {
      const q = ([a, b]) => [a + (R() - 0.5) * cap * 0.09, b + (R() - 0.5) * cap * 0.09];
      const pts = [[box[0], box[1]], [box[2], box[1]], [box[2], box[3]], [box[0], box[3]]].map(q);
      parts.push({ id: "strip", svg: `<g data-strip="1">` + cutout([{ pts, closed: true }], { color: ctx.color(o.strip), shadow: o.shadow ?? 2, rim: true }, ctx, R) + "</g>" });
    }
    const ink = ctx.color(o.color, o.strip && ["black", "navy", "red", "brick", "coffee", "purple", "moss", "graphite"].includes(o.strip) ? "cream" : "black");
    const m = cap * 0.4, filter = ctx.filter(cap < 44 ? "smooth" : "scissors", 1, 1);
    items.forEach((it, i) => {
      const lx = x0 + it.x + it.w / 2, dy = (R() - 0.5) * cap * 0.05, g = (R() - 0.5) * 3.2;
      parts.push({ id: `l${i}`, svg: `<g data-letter="${i}" filter="url(#${filter})">` +
        `<rect x="${f(lx - it.w / 2 - m)}" y="${f(o.y - cap - m)}" width="${f(it.w + 2 * m)}" height="${f(cap + 2 * m)}" fill="none"/>` +
        `<text x="${f(lx)}" y="${f(o.y + dy)}" transform="rotate(${f(g)} ${f(lx)} ${f(o.y - cap / 2)})" font-family='${FONT}' font-size="${f(fs)}" text-anchor="middle" fill="${ink}">${esc(it.ch)}</text></g>` });
      letters.push({ ch: it.ch, x: f(lx), y: f(o.y + dy), w: f(it.w) });
    });
  }
  const svg = `<g transform="rotate(${f(tilt)} ${f(cx)} ${f(cy)})">${parts.map((p) => p.svg).join("")}</g>`;
  return { svg, parts, letters, box: box.map(f), center: [f(cx), f(cy)], tilt: f(tilt), cap };
}

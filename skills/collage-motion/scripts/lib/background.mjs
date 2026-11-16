// Paper backgrounds: mosaic, band, tear.
import { cutout, shade, luma } from "./paper.mjs";
import { rng, hash } from "./svg.mjs";

export function mosaic(o, ctx) {
  const { width, height, color } = o, R = rng(hash(`mosaic/${color}`) + (o.seed ?? 1) * 7919);
  const cell = o.cell ?? Math.min(width, height) * 0.5, k = o.contrast ?? 1;
  const cols = Math.ceil(width / cell) + 1, rows = Math.ceil(height / cell) + 1;
  const pieces = [], base = Math.min(0.5, luma(color) * 0.75 + 0.08);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const cx = (i + (j % 2 ? 0.5 : 0) - 0.25 + (R() - 0.5) * 0.5) * cell, cy = (j - 0.1 + (R() - 0.5) * 0.5) * cell;
    const sides = 5 + ((R() * 3) | 0), a0 = R() * Math.PI * 2, radius = cell * (0.62 + R() * 0.3);
    const pts = Array.from({ length: sides }, (_, n) => {
      const an = a0 + ((n + (R() - 0.5) * 0.45) / sides) * Math.PI * 2, r = radius * (0.78 + R() * 0.34);
      return [cx + Math.cos(an) * r, cy + Math.sin(an) * r * (0.85 + R() * 0.3)];
    });
    pieces.push({ pts, order: R(), dl: (R() < 0.28 ? -(0.1 + 0.3 * R()) * base : (R() - 0.52) * 0.17) * k });
  }
  pieces.sort((a, b) => a.order - b.order);
  return `<rect x="0" y="0" width="${width}" height="${height}" fill="${shade(color, -0.05 * k)}"/>` +
    pieces.map((p) => cutout([{ pts: p.pts, closed: true }], { color: shade(color, p.dl), shadow: 1, rim: true }, ctx, R)).join("");
}

export function band(o, ctx) {
  const R = rng(hash(`band/${o.color}/${o.y}`));
  const pts = [[-30, o.y + (R() - 0.5) * 6], [o.width + 30, o.y + (R() - 0.5) * 6], [o.width + 30, o.y + o.height], [-30, o.y + o.height]];
  return cutout([{ pts, closed: true }], { color: o.color, shadow: o.shadow ?? 2, rim: true }, ctx, R);
}

export function tear(o, ctx) {
  const R = rng(hash(`tear/${o.color}`) + (o.seed ?? 1) * 31);
  const pts = [[-40, -40], [o.at, -40]];
  let x = o.at;
  for (let y = -40; y <= o.height + 40; y += 9 + R() * 16) { x += (R() - 0.5) * 9 + (o.at - x) * 0.25; pts.push([x + (R() - 0.5) * 7, y]); }
  pts.push([o.at, o.height + 40], [-40, o.height + 40]);
  return cutout([{ pts, closed: true }], { color: o.color, cut: "torn", shadow: 3, rim: true }, ctx, R);
}

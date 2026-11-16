// Turns an outline into a paper piece: grain, cut, rim, shadow, creases.
import { dist } from "./svg.mjs";

const f = (n) => +n.toFixed(2);
export const pathData = (subs) => subs.map((s) => "M" + s.pts.map((p) => `${f(p[0])} ${f(p[1])}`).join("L") + (s.closed ? "Z" : "")).join("");
export const boundsOf = (subs) => {
  let b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const s of subs) for (const [x, y] of s.pts) b = [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)];
  return b;
};
const inside = (pts, [x, y]) => {
  let d = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) d = !d;
  }
  return d;
};

const hex2rgb = (h) => { h = h.replace("#", ""); if (h.length === 3) h = [...h].map((c) => c + c).join(""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); };
const rgb2hex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
export function shade(hex, dl, ds = 0) {
  const [r, g, b] = hex2rgb(hex), mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0, l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  l = Math.max(0.04, Math.min(0.96, l + dl)); s = Math.max(0, Math.min(1, s + ds));
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const k = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return rgb2hex([k(h + 1 / 3), k(h), k(h - 1 / 3)]);
}
export const luma = (hex) => { const [r, g, b] = hex2rgb(hex); return 0.299 * r + 0.587 * g + 0.114 * b; };

const SHADOWS = [null, { dx: 2, dy: 3, b: 2.1, o: 0.36 }, { dx: 4, dy: 7, b: 4.5, o: 0.38 }, { dx: 8, dy: 14, b: 9, o: 0.34 }];
const CUTS = { smooth: { disp: 0.9, freq: 0.06 }, scissors: { disp: 2.4, freq: 0.045 }, torn: { disp: 8, freq: 0.06 } };
// Two-letter prefix per cut: scissors and smooth share an initial.
const CUT_PREFIX = { scissors: "sc", smooth: "sm", torn: "to" };
function filterMarkup(id, cut, shadow, variant) {
  const c = CUTS[cut], s = 7 + variant * 13, sh = SHADOWS[shadow];
  const channel = (k) => `<feFunc${k} type="linear" slope="1.0" intercept="0"/>`;
  return `<filter id="${id}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">` +
    `<feTurbulence type="fractalNoise" baseFrequency="${c.freq}" numOctaves="2" seed="${s}" result="wave"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="wave" scale="${c.disp}" xChannelSelector="R" yChannelSelector="G" result="cut"/>` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="${s + 3}"/>` +
    `<feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 0 1"/>` +
    `<feComponentTransfer result="grain">${channel("R")}${channel("G")}${channel("B")}</feComponentTransfer>` +
    `<feBlend in="grain" in2="cut" mode="soft-light"/>` +
    `<feComposite in2="cut" operator="in" result="paper"/>` +
    (sh
      ? `<feGaussianBlur in="cut" stdDeviation="${sh.b}"/><feOffset dx="${sh.dx}" dy="${sh.dy}"/>` +
        `<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${sh.o} 0" result="shadow"/>` +
        `<feMerge><feMergeNode in="shadow"/><feMergeNode in="paper"/></feMerge>`
      : "") +
    `</filter>`;
}

export function createContext(name, kit, seed = 1) {
  const filters = new Map(), extras = [];
  let n = 0;
  return {
    name, kit, seed, warnings: [],
    color(value, fallback = "cream") {
      const P = kit.palette.paper;
      if (!value || value === "none") return P[fallback];
      return P[value] || (value.startsWith("#") ? value : (this.warnings.push(`color outside the palette: ${value}`), value));
    },
    filter(cut = "scissors", shadow = 1, variant = 0) {
      if (!CUTS[cut]) cut = "scissors";
      shadow = Math.max(0, Math.min(3, shadow | 0));
      const id = `cg-${CUT_PREFIX[cut]}${shadow}${variant}`;
      if (!filters.has(id)) filters.set(id, filterMarkup(id, cut, shadow, variant));
      return id;
    },
    id(prefix) { return `cg-${name}-${prefix}${n++}`; },
    extra(markup) { extras.push(markup); },
    defs() { return [...filters.values(), ...extras].join(""); },
  };
}

function strip(s, w) {
  const p = s.pts, n = p.length, h = w / 2, left = [], right = [];
  const norm = (a, b) => { const d = dist(a, b) || 1; return [-(b[1] - a[1]) / d, (b[0] - a[0]) / d]; };
  for (let i = 0; i < n; i++) {
    const prev = s.closed ? p[(i - 1 + n) % n] : p[Math.max(0, i - 1)], next = s.closed ? p[(i + 1) % n] : p[Math.min(n - 1, i + 1)];
    const n1 = i > 0 || s.closed ? norm(prev, p[i]) : norm(p[i], next), n2 = i < n - 1 || s.closed ? norm(p[i], next) : n1;
    let nx = n1[0] + n2[0], ny = n1[1] + n2[1];
    const m = Math.hypot(nx, ny) || 1; nx /= m; ny /= m;
    const k = Math.min(2.2, 1 / Math.max(0.25, nx * n1[0] + ny * n1[1]));
    left.push([p[i][0] + nx * h * k, p[i][1] + ny * h * k]); right.push([p[i][0] - nx * h * k, p[i][1] - ny * h * k]);
  }
  return s.closed ? [{ pts: left, closed: true }, { pts: right.reverse(), closed: true }] : [{ pts: [...left, ...right.reverse()], closed: true }];
}

const gaps = (R) => Array.from({ length: 22 }, (_, i) => f(i % 2 ? 2 + R() * 11 : 16 + R() * 80)).join(" ");

export function cutout(subs, opts, ctx, R) {
  const [x0, y0, x1, y1] = boundsOf(subs), w = x1 - x0, h = y1 - y0;
  const cut = opts.cut || "scissors", shadow = opts.shadow ?? 1;
  const rim = opts.rim ?? (Math.min(w, h) >= 44 && Math.max(w, h) >= 70);
  const d = pathData(subs), m = shadow >= 3 ? 34 : shadow === 2 ? 20 : 12;
  let s = `<g filter="url(#${ctx.filter(cut, shadow, opts.variant ?? (R() * 3) | 0)})">` +
    `<rect x="${f(x0 - m)}" y="${f(y0 - m)}" width="${f(w + 2 * m)}" height="${f(h + 2 * m + 8)}" fill="none"/>` +
    `<path d="${d}" fill="${opts.color}"${subs.length > 1 ? ' fill-rule="evenodd"' : ""}/>`;
  if (opts.crease) s += creases(subs[0].pts, [x0, y0, x1, y1], opts.crease, opts.color, ctx, R);
  if (rim) {
    s += cut === "torn"
      ? `<path d="${d}" fill="none" stroke="#F6F1E4" stroke-width="3.4" stroke-linejoin="round" opacity="0.92"/>`
      : `<path d="${d}" fill="none" stroke="#FBF7EC" stroke-width="${luma(opts.color) > 0.7 ? 1.2 : 1.7}" stroke-dasharray="${gaps(R)}" stroke-dashoffset="${f(R() * 60)}" opacity="${luma(opts.color) > 0.7 ? 0.6 : 0.85}"/>`;
  }
  return s + "</g>";
}

function creases(pts, [x0, y0, x1, y1], count, color, ctx, R) {
  const nodes = [];
  for (let t = 0; t < 60 && nodes.length < count; t++) {
    const p = [x0 + (0.2 + R() * 0.6) * (x1 - x0), y0 + (0.2 + R() * 0.6) * (y1 - y0)];
    if (inside(pts, p) && nodes.every((q) => dist(p, q) > Math.min(x1 - x0, y1 - y0) * 0.3)) nodes.push(p);
  }
  if (!nodes.length) return "";
  const bend = (a, b) => { const k = 0.35 + R() * 0.3, e = (R() - 0.5) * dist(a, b) * 0.1; const nx = -(b[1] - a[1]) / (dist(a, b) || 1), ny = (b[0] - a[0]) / (dist(a, b) || 1); return [a, [a[0] + (b[0] - a[0]) * k + nx * e, a[1] + (b[1] - a[1]) * k + ny * e], b]; };
  const lines = [];
  nodes.forEach((node, i) => {
    const rays = 3 + ((R() * 2) | 0), a0 = R() * Math.PI * 2;
    for (let j = 0; j < rays; j++) {
      const an = a0 + (j / rays) * Math.PI * 2 + (R() - 0.5) * 0.7, L = Math.hypot(x1 - x0, y1 - y0);
      lines.push(bend(node, [node[0] + Math.cos(an) * L, node[1] + Math.sin(an) * L]));
    }
    if (i) lines.push(bend(nodes[i - 1], node));
  });
  const id = ctx.id("v");
  ctx.extra(`<clipPath id="${id}"><path d="${pathData([{ pts, closed: true }])}"/></clipPath>`);
  const light = luma(color) > 0.72;
  return `<g clip-path="url(#${id})" fill="none" stroke="${light ? "#8A7B63" : "#FBF7EC"}" stroke-width="1.1" opacity="${light ? 0.4 : 0.5}">` +
    lines.map((l) => `<path d="${pathData([{ pts: l, closed: false }])}" stroke-dasharray="${gaps(R)}"/>`).join("") + "</g>";
}

export function piece(el, subs, ctx, R) {
  const a = el.attrs;
  const hasFill = a.fill && a.fill !== "none";
  if (!hasFill) {
    if (!a.stroke || a.stroke === "none") return "";
    const w = parseFloat(a["stroke-width"] || 6);
    subs = subs.flatMap((s) => strip(s, w));
  } else subs = subs.filter((s) => s.pts.length > 2).map((s) => ({ ...s, closed: true }));
  if (!subs.length) return "";
  return cutout(subs, {
    color: ctx.color(hasFill ? a.fill : a.stroke),
    cut: a["data-cut"],
    shadow: a["data-shadow"] != null ? parseInt(a["data-shadow"]) : 1,
    rim: a["data-rim"] != null ? a["data-rim"] !== "0" : undefined,
    crease: a["data-crease"] ? parseInt(a["data-crease"]) : 0,
  }, ctx, R);
}

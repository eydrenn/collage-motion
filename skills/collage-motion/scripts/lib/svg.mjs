// Reads the source SVG and turns each element into subpaths of points.
export const rng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
export const hash = (s) => {
  let h = 2166136261;
  for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

const I = [1, 0, 0, 1, 0, 0];
const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
const apply = (m, [x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const parseTransform = (s) => {
  let m = I;
  for (const [, fn, args] of (s || "").matchAll(/(\w+)\s*\(([^)]*)\)/g)) {
    const v = args.split(/[\s,]+/).filter(Boolean).map(Number);
    if (fn === "translate") m = mul(m, [1, 0, 0, 1, v[0], v[1] || 0]);
    else if (fn === "scale") m = mul(m, [v[0], 0, 0, v[1] ?? v[0], 0, 0]);
    else if (fn === "rotate") {
      const r = (v[0] * Math.PI) / 180, c = Math.cos(r), sn = Math.sin(r);
      const cx = v[1] || 0, cy = v[2] || 0;
      m = mul(m, [1, 0, 0, 1, cx, cy]); m = mul(m, [c, sn, -sn, c, 0, 0]); m = mul(m, [1, 0, 0, 1, -cx, -cy]);
    } else if (fn === "matrix") m = mul(m, v);
  }
  return m;
};

export function smooth(pts, step = 3, closed = false) {
  const n = pts.length;
  if (n < 3) return pts.slice();
  const P = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const out = [pts[0]];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const k = Math.max(2, Math.ceil(dist(p1, p2) / step));
    for (let j = 1; j <= k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
    }
  }
  return out;
}

function arc(x1, y1, rx, ry, phi, fa, fs, x2, y2, step) {
  if (!rx || !ry) return [[x2, y2]];
  const ph = (phi * Math.PI) / 180, c = Math.cos(ph), s = Math.sin(ph);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const x1p = c * dx + s * dy, y1p = -s * dx + c * dy;
  rx = Math.abs(rx); ry = Math.abs(ry);
  const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const co = (fa === fs ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cxp = (co * rx * y1p) / ry, cyp = (-co * ry * x1p) / rx;
  const cx = c * cxp - s * cyp + (x1 + x2) / 2, cy = s * cxp + c * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!fs && dt > 0) dt -= 2 * Math.PI; else if (fs && dt < 0) dt += 2 * Math.PI;
  const k = Math.max(3, Math.ceil((Math.abs(dt) * Math.max(rx, ry)) / step));
  const out = [];
  for (let j = 1; j <= k; j++) {
    const t = t1 + (dt * j) / k;
    out.push([cx + rx * Math.cos(t) * c - ry * Math.sin(t) * s, cy + rx * Math.cos(t) * s + ry * Math.sin(t) * c]);
  }
  return out;
}

export function flatten(d, step = 3) {
  const tk = d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/gi) || [];
  const subs = [];
  let i = 0, cmd = "", x = 0, y = 0, sx = 0, sy = 0, cur = null, lc = null, lq = null;
  const num = () => parseFloat(tk[i++]);
  const need = () => { if (!cur) { cur = { pts: [[x, y]], closed: false }; subs.push(cur); } };
  const bez = (p) => {
    let len = 0;
    for (let k = 1; k < p.length; k++) len += dist(p[k - 1], p[k]);
    const n = Math.max(3, Math.ceil(len / step));
    for (let k = 1; k <= n; k++) {
      const t = k / n, u = 1 - t;
      cur.pts.push(p.length === 3
        ? [0, 1].map((c) => u * u * p[0][c] + 2 * u * t * p[1][c] + t * t * p[2][c])
        : [0, 1].map((c) => u ** 3 * p[0][c] + 3 * u * u * t * p[1][c] + 3 * u * t * t * p[2][c] + t ** 3 * p[3][c]));
    }
  };
  while (i < tk.length) {
    if (/^[a-zA-Z]$/.test(tk[i])) cmd = tk[i++];
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    if (C === "M") { x = ox + num(); y = oy + num(); cur = { pts: [[x, y]], closed: false }; subs.push(cur); sx = x; sy = y; cmd = rel ? "l" : "L"; lc = lq = null; continue; }
    if (C === "Z") { if (cur) cur.closed = true; x = sx; y = sy; cur = null; lc = lq = null; continue; }
    need();
    if (C === "L") { x = ox + num(); y = oy + num(); cur.pts.push([x, y]); lc = lq = null; }
    else if (C === "H") { x = ox + num(); cur.pts.push([x, y]); lc = lq = null; }
    else if (C === "V") { y = oy + num(); cur.pts.push([x, y]); lc = lq = null; }
    else if (C === "C") { const p1 = [ox + num(), oy + num()], p2 = [ox + num(), oy + num()], p3 = [ox + num(), oy + num()]; bez([[x, y], p1, p2, p3]); lc = p2; lq = null; [x, y] = p3; }
    else if (C === "S") { const p1 = lc ? [2 * x - lc[0], 2 * y - lc[1]] : [x, y], p2 = [ox + num(), oy + num()], p3 = [ox + num(), oy + num()]; bez([[x, y], p1, p2, p3]); lc = p2; lq = null; [x, y] = p3; }
    else if (C === "Q") { const p1 = [ox + num(), oy + num()], p2 = [ox + num(), oy + num()]; bez([[x, y], p1, p2]); lq = p1; lc = null; [x, y] = p2; }
    else if (C === "T") { const p1 = lq ? [2 * x - lq[0], 2 * y - lq[1]] : [x, y], p2 = [ox + num(), oy + num()]; bez([[x, y], p1, p2]); lq = p1; lc = null; [x, y] = p2; }
    else if (C === "A") { const rx = num(), ry = num(), ph = num(), fa = num(), fs = num(), ex = ox + num(), ey = oy + num(); cur.pts.push(...arc(x, y, rx, ry, ph, fa, fs, ex, ey, step)); x = ex; y = ey; lc = lq = null; }
    else throw new Error(`unsupported path command: ${cmd}`);
  }
  return subs.filter((s) => s.pts.length > 1);
}

const INHERITED = ["stroke", "stroke-width", "fill", "font-size", "text-anchor", "data-cut", "data-shadow", "data-rim"];
const SHAPES = new Set(["path", "line", "polyline", "polygon", "rect", "circle", "ellipse", "text"]);
// attributes in double quotes, single quotes, or bare (a bare attribute reads as an empty string)
const attrsOf = (s) => Object.fromEntries([...s.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g)].map((m) => [m[1], m[2] ?? m[3] ?? ""]));
const decodeEntities = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");

export function readSvg(text) {
  text = text.replace(/<!--[\s\S]*?-->/g, "");
  const re = /<(\/?)([a-zA-Z][\w-]*)((?:\s+[\w:-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*)\s*(\/?)>/g;
  const stack = [{ attrs: {}, matrix: I, part: null }];
  const elements = [], parts = [], pivots = {}, parents = {};
  let viewBox = [0, 0, 100, 100], m;
  const partOf = (name) => { if (!parts.includes(name)) parts.push(name); return name; };
  while ((m = re.exec(text))) {
    const [, closing, tag, raw, selfClosing] = m;
    const top = stack[stack.length - 1];
    if (closing) { if (tag === "g" && stack.length > 1) stack.pop(); continue; }
    const own = attrsOf(raw);
    if (tag === "svg") {
      if (own.viewBox) viewBox = own.viewBox.split(/[\s,]+/).map(Number);
      for (const k of INHERITED) if (own[k] != null) top.attrs[k] = own[k];
      continue;
    }
    const attrs = { ...Object.fromEntries(INHERITED.filter((k) => top.attrs[k] != null).map((k) => [k, top.attrs[k]])), ...own };
    const matrix = mul(top.matrix, parseTransform(own.transform));
    if (tag === "g") {
      if (selfClosing) continue;
      // a group inside a part, with its own id and pivot, is a part that hangs from it (a forearm on an arm)
      const child = top.part != null && own.id && own["data-pivot"];
      const part = child || top.part == null ? partOf(own.id || `part-${parts.length + 1}`) : top.part;
      if (child) parents[part] = top.part;
      if ((child || top.part == null) && own["data-pivot"]) pivots[part] = own["data-pivot"].split(/[\s,]+/).map(Number);
      stack.push({ attrs, matrix, part });
      continue;
    }
    if (!SHAPES.has(tag)) continue;
    const el = { tag, attrs, matrix, part: top.part ?? partOf("base") };
    if (tag === "text" && !selfClosing) {
      const end = text.indexOf("</text>", re.lastIndex);
      if (end < 0) continue;
      el.text = decodeEntities(text.slice(re.lastIndex, end).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
      re.lastIndex = end + 7;
    }
    elements.push(el);
  }
  return { viewBox, elements, parts, pivots, parents };
}

export function geometry(el, R, step = 3) {
  const a = el.attrs, n = (k, d = 0) => (a[k] != null ? parseFloat(a[k]) : d);
  const pairs = (s) => { const v = (s.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) || []).map(Number); const o = []; for (let i = 0; i + 1 < v.length; i += 2) o.push([v[i], v[i + 1]]); return o; };
  let subs = [];
  if (el.tag === "path") subs = flatten(a.d || "", step);
  else if (el.tag === "line") subs = [{ pts: [[n("x1"), n("y1")], [n("x2"), n("y2")]], closed: false }];
  else if (el.tag === "polyline" || el.tag === "polygon") {
    let pts = pairs(a.points || "");
    const closed = el.tag === "polygon";
    if (a["data-smooth"] != null) { pts = smooth(pts, step, closed); if (closed) pts.pop(); }
    subs = [{ pts, closed }];
  } else if (el.tag === "rect") {
    const x = n("x"), y = n("y"), w = n("width"), h = n("height"), r = Math.min(n("rx", n("ry")), w / 2, h / 2);
    if (!r) subs = [{ pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], closed: true }];
    else {
      const pts = [];
      const corner = (cx, cy, a0) => { const k = Math.max(3, Math.ceil((r * Math.PI) / 2 / step)); for (let j = 0; j <= k; j++) { const t = a0 + (Math.PI / 2) * (j / k); pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); } };
      corner(x + r, y + r, Math.PI); corner(x + w - r, y + r, -Math.PI / 2); corner(x + w - r, y + h - r, 0); corner(x + r, y + h - r, Math.PI / 2);
      subs = [{ pts, closed: true }];
    }
  } else if (el.tag === "circle" || el.tag === "ellipse") {
    const cx = n("cx"), cy = n("cy"), rx = n("r", n("rx")), ry = n("r", n("ry"));
    const k = Math.max(16, Math.ceil((2 * Math.PI * Math.max(rx, ry)) / step));
    const a0 = R() * Math.PI * 2;
    subs = [{ pts: Array.from({ length: k }, (_, j) => [cx + rx * Math.cos(a0 + (j / k) * 2 * Math.PI), cy + ry * Math.sin(a0 + (j / k) * 2 * Math.PI)]), closed: true }];
  }
  for (const s of subs) s.pts = s.pts.map((p) => apply(el.matrix, p));
  return subs;
}

export const pointAt = (matrix, point) => apply(matrix, point);

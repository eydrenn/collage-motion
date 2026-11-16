// The scene engine: prepare() rasterizes the pieces once, state(f) places them for frame f.
import { generate } from "./generate.mjs";
import { createContext } from "./paper.mjs";
import { mosaic, band } from "./background.mjs";
import { write } from "./text.mjs";
import { POSES } from "./character.mjs";
import { sourceOf } from "./frame.mjs";
import { slice } from "./pieces.mjs";
import { rng, hash } from "./svg.mjs";
import { checkScene } from "./check.mjs";
import { zonesFor, placeText, textWarnings, guidesSvg } from "./zones.mjs";

const M = 40; // margin around each art, for the shadow

export const ENTRANCES = {
  none: [],
  pop: [{ s: 0.55 }, { s: 1.12 }, { s: 0.97 }],
  drop: [{ y: -760 }, { y: -190 }, { y: 28 }, { y: -8 }],
  rise: [{ y: 560 }, { y: 140 }, { y: -22 }],
  "slide-left": [{ x: -780 }, { x: -290 }, { x: 36 }, { x: -8 }],
  "slide-right": [{ x: 780 }, { x: 290 }, { x: -36 }, { x: 8 }],
};
export const ARRIVALS = {
  none: [],
  fly: [{ x: 1.5, y: -3, r: 36 }, { x: 0.55, y: -1.3, r: 15 }, { x: 0.1, y: -0.22, r: 4 }],
  drop: [{ x: 0, y: -2.6, r: -14 }, { x: 0, y: -0.7, r: 6 }, { x: 0, y: 0.14, r: -2 }],
};
const HOP = [-48, -66, -30];
const n2 = (v, digits = 2) => +v.toFixed(digits);
// how a camera move travels: `punch` goes a little past the target and settles
export const EASES = { linear: (q) => q, out: (q) => 1 - Math.pow(1 - q, 3), "in-out": (q) => q * q * (3 - 2 * q), punch: (q) => (q < 0.6 ? (1.1 * q) / 0.6 : 1.1 - (0.1 * (q - 0.6)) / 0.4) };
const SHAKE_ZOOM = 1.04;
const resolvePose = (p) => (typeof p === "string" ? POSES[p] || {} : p || {});

// what prepare() would warn about, found without drawing anything
export function sceneWarnings(scene, kit) {
  const warnings = [], { width, height } = scene;
  checkScene(scene, kit, { entrances: Object.keys(ENTRANCES), arrivals: Object.keys(ARRIVALS), eases: Object.keys(EASES) }, warnings);
  const zones = zonesFor(kit.zones, scene.safe, width, height, scene.margins === "ads");
  if (zones?.error) warnings.push(zones.error);
  for (const [si, shot] of (scene.shots || []).entries()) {
    const layers = shot.layers || [], actions = shot.actions || [], parts = {};
    for (const [li, c] of layers.entries()) {
      try {
        if (c.type === "text") {
          const tc = createContext(`t${si}x${li}`, kit, 1), placed = placeText(c, zones, warnings, width, height);
          const t = write({ ...placed, anchor: placed.anchor || "start" }, tc, rng(hash(`${si}/${li}/${c.text}`)));
          if (c.fixed ?? true) warnings.push(...textWarnings(c.text, t.box, zones));
          warnings.push(...tc.warnings);
          if (c.id) parts[c.id] = [];
        } else if (c.type === "art" || c.type === "character") {
          const g = generate(sourceOf(c, kit), `x-${c.name}`, kit, { seed: c.seed ?? 1 });
          warnings.push(...g.warnings);
          if (c.id) parts[c.id] = g.meta.parts.map((p) => p.id);
        }
      } catch (e) { warnings.push(`shot ${si + 1}, layer ${c.id ? `"${c.id}"` : li + 1}: ${e.message}`); }
    }
    for (const a of actions) {
      if (a.target === "camera") {
        const [id, part] = String(a.on || "").split(".");
        if (a.on && !(parts[id] && (!part || parts[id].includes(part)))) warnings.push(`shot ${si + 1}: the camera's "on" points at "${a.on}", which is not a layer id${part ? " with that part" : ""} in this shot`);
      } else if (!parts[a.target]) warnings.push(`shot ${si + 1}: action targets "${a.target}", which is not the id of any layer`);
      else if (a.part && !parts[a.target].includes(a.part)) warnings.push(`${a.target}: there is no part "${a.part}"`);
    }
  }
  return [...new Set(warnings)];
}

export async function prepare(scene, { browser, kit, k, dir, jitter, guides }) {
  const { width, height } = scene, fps = scene.fps || 12, jit = jitter ?? scene.jitter ?? 1;
  const color = (name) => kit.palette.paper[name] || name, px = (v) => n2(v * k);
  const frames = (s) => Math.round(s * fps);
  const shots = [], doms = [], tears = [], warnings = [];
  checkScene(scene, kit, { entrances: Object.keys(ENTRANCES), arrivals: Object.keys(ARRIVALS), eases: Object.keys(EASES) }, warnings);
  let f0 = 0, fresh = 0, pieces = 0;
  const zones = zonesFor(kit.zones, scene.safe, width, height, scene.margins === "ads");
  if (zones?.error) warnings.push(zones.error);

  for (const [si, shot] of scene.shots.entries()) {
    const items = [];
    const camActions = (shot.actions || []).filter((a) => a.target === "camera");
    const cams = [{ f: 0, n: 0, ...(shot.camera || {}) }, ...camActions.filter((a) => a.zoom != null || a.x != null || a.y != null || a.on).map((a) => ({ f: frames(a.at), n: frames(a.duration ?? 0), ease: a.ease, zoom: a.zoom, x: a.x, y: a.y, on: a.on }))].sort((a, b) => a.f - b.f);
    const shakes = camActions.filter((a) => a.shake).map((a) => ({ f: frames(a.at), n: frames(a.shake) }));
    // pieces are rasterised at the shot's highest zoom (with room for a punch overshoot or a shake), so a close-up does not blur
    const z = Math.max(1, ...cams.map((c) => (c.zoom ?? 1) * (c.ease === "punch" ? 1.08 : 1))) * (shakes.length ? SHAKE_ZOOM : 1);
    const boxes = {};
    const bgCtx = createContext(`f${si}`, kit, 1);
    let background = mosaic({ width, height, color: color(shot.background.color), seed: shot.background.seed }, bgCtx);
    for (const c of shot.layers) if (c.type === "band") background += band({ width, y: c.y, height: c.height, color: color(c.color), shadow: c.shadow }, bgCtx);
    const rf = await slice(browser, { box: [0, 0, width, height], defs: bgCtx.defs(), groups: [{ id: "background", svg: background }], dsf: k * z, dir, opaque: true });
    fresh += rf.fresh; pieces++;
    let dom = `<img src="${rf.files.background}" style="width:${px(width)}px;height:${px(height)}px">`, fixed = "";

    for (const [li, c] of shot.layers.entries()) {
      if (c.type === "band") continue;
      const id = `s${si}-${c.id || `l${li}`}`;
      const actions = (shot.actions || []).filter((a) => c.id && a.target === c.id).sort((a, b) => a.at - b.at);

      if (c.type === "text") {
        const tc = createContext(`t${si}x${li}`, kit, 1);
        const placed = placeText(c, zones, warnings, width, height), t = write({ ...placed, anchor: placed.anchor || "start" }, tc, rng(hash(`${si}/${li}/${c.text}`)));
        if (c.fixed ?? true) warnings.push(...textWarnings(c.text, t.box, zones));
        const mg = c.size * 0.9, zz = c.fixed ?? true ? 1 : z;   // captions stay still on screen, outside the camera
        const r = await slice(browser, { box: [t.box[0] - mg, t.box[1] - mg, t.box[2] - t.box[0] + 2 * mg, t.box[3] - t.box[1] + 2 * mg], defs: tc.defs(), groups: t.parts, dsf: k * zz, dir });
        fresh += r.fresh; pieces += t.parts.length;
        const size = `width:${n2(r.width / zz)}px;height:${n2(r.height / zz)}px`, o = (x, y) => `${px(x - r.x)}px ${px(y - r.y)}px`;
        const block = `<div class="layer" id="${id}" style="left:${px(r.x)}px;top:${px(r.y)}px;${size};transform-origin:${o(...t.center)};transform:rotate(${t.tilt}deg);display:none">` +
          t.parts.map((p) => { const l = p.id === "strip" ? null : t.letters[+p.id.slice(1)]; return `<img id="${id}-${p.id}" src="${r.files[p.id]}" style="${size};transform-origin:${l ? o(l.x, l.y - t.cap / 2) : o(...t.center)}">`; }).join("") + "</div>";
        if (zz === 1 && (c.fixed ?? true)) fixed += block; else dom += block;
        if (c.id) boxes[c.id] = { box: t.box, parts: {} };
        items.push({ type: "text", id, c, actions, strip: t.parts[0]?.id === "strip", n: t.letters.length, cap: t.cap });
        for (const a of tc.warnings) warnings.push(a);
        continue;
      }

      const sc = c.scale ?? 1, dsf = sc * k, isCharacter = c.type === "character", zz = c.fixed ? 1 : z;
      const base = isCharacter ? c.face || "neutral" : null;
      const variants = isCharacter ? [...new Set([base, ...actions.filter((a) => a.face).map((a) => a.face)])] : [null];
      let parts, size = "";
      const images = {}, origins = {};
      for (const v of variants) {
        const g = generate(sourceOf(isCharacter ? { ...c, face: v } : c, kit), isCharacter ? `c-${c.name}` : `a-${c.name}`, kit, { seed: c.seed ?? 1 });
        const groups = v === base ? g.fragments : g.fragments.filter((f) => f.id === "head");
        const r = await slice(browser, { box: [-M, -M, g.width + 2 * M, g.height + 2 * M], defs: g.defs, groups, dsf: dsf * zz, dir });
        fresh += r.fresh; pieces += groups.length;
        if (v === base && c.id) {
          const at = ([x0, y0, x1, y1]) => (c.flip ? [c.x + (g.width - x1) * sc, c.y + y0 * sc, c.x + (g.width - x0) * sc, c.y + y1 * sc] : [c.x + x0 * sc, c.y + y0 * sc, c.x + x1 * sc, c.y + y1 * sc]);
          boxes[c.id] = { box: at([0, 0, g.width, g.height]), parts: Object.fromEntries(g.meta.parts.map((p) => [p.id, at(p.box)])) };
        }
        if (v === base) { parts = g.meta.parts; size = `width:${n2(r.width / zz)}px;height:${n2(r.height / zz)}px`; }
        for (const f of groups) {
          const p = g.meta.parts.find((x) => x.id === f.id);
          (images[f.id] ||= []).push(`<img${isCharacter && f.id === "head" ? ` id="${id}-head-${v}"` : ""} src="${r.files[f.id]}" style="${size}">`);
          origins[f.id] = `${n2((p.pivot[0] + M) * dsf)}px ${n2((p.pivot[1] + M) * dsf)}px`;
        }
        for (const a of g.warnings) warnings.push(a);
      }
      for (const a of actions) if (a.part && !parts.some((p) => p.id === a.part)) warnings.push(`${c.id}: there is no part "${a.part}"`);
      const partDiv = (p) => `<div class="part" id="${id}-${p.id}" style="transform-origin:${origins[p.id]}">${images[p.id].join("")}${parts.filter((ch) => ch.parent === p.id).map(partDiv).join("")}</div>`;
      const block = `<div class="layer" id="${id}" style="left:${px(c.x - M * sc)}px;top:${px(c.y - M * sc)}px;${size};transform-origin:50% 80%;display:none">${parts.filter((p) => !p.parent).map(partDiv).join("")}</div>`;
      if (c.fixed) fixed += block; else dom += block;
      items.push({ type: c.type, id, c, actions, parts: parts.map((p) => p.id), variants, base });
    }
    for (const a of shot.actions || []) if (a.target !== "camera" && !shot.layers.some((c) => c.id === a.target)) warnings.push(`shot ${si + 1}: action targets "${a.target}", which is not the id of any layer`);

    // the tear edge: same shape from the start to the end of the transition, it only moves
    const transition = si > 0 ? shot.transition || "cut" : "cut", jag = [];
    if (transition === "tear") {
      const R = rng(hash(`tear/${si}`));
      let x = 0;
      for (let y = -30; y <= height + 30; y += 10 + R() * 18) { x += (R() - 0.5) * 12 - x * 0.25; jag.push([x + (R() - 0.5) * 9, y]); }
      tears.push(`<svg class="tear" id="tear${si}" width="4" height="${px(height)}" style="display:none"><path d="M${jag.map(([a, b]) => `${px(a)} ${px(b)}`).join("L")}" fill="none" stroke="#F6F1E4" stroke-width="${px(7)}" stroke-linejoin="round"/></svg>`);
    }
    doms.push(`<div class="shot" id="s${si}" style="display:none"><div class="cam" id="s${si}-cam">${dom}</div>${fixed}</div>`);
    let framing = { zoom: 1, x: width / 2, y: height / 2 };
    for (const c of cams) {
      let { x, y } = c;
      if (c.on) {
        const [layerId, part] = String(c.on).split("."), b = boxes[layerId] && (part ? boxes[layerId].parts[part] : boxes[layerId].box);
        if (!b) warnings.push(`shot ${si + 1}: the camera's "on" points at "${c.on}", which is not a layer id${part ? " with that part" : ""} in this shot`);
        else { x = x ?? (b[0] + b[2]) / 2; y = y ?? (b[1] + b[3]) / 2; }
      }
      c.zoom = c.zoom ?? framing.zoom; c.x = x ?? framing.x; c.y = y ?? framing.y;
      framing = c;
    }
    const nf = frames(shot.duration);
    shots.push({ si, f0, nf, items, cams, shakes, transition, trans: Math.min(nf, frames(shot.transitionDuration ?? 0.5)), jag });
    f0 += nf;
  }

  const html = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#000}
#stage{position:relative;width:${px(width)}px;height:${px(height)}px;overflow:hidden}
.shot{position:absolute;inset:0}.cam{position:absolute;inset:0;transform-origin:0 0}.cam>img{position:absolute;left:0;top:0;display:block}
.layer{position:absolute}.layer img{position:absolute;left:0;top:0;display:block}.part{position:absolute;left:0;top:0;width:100%;height:100%}
.tear{position:absolute;left:0;top:0;overflow:visible;filter:drop-shadow(${px(7)}px 0 ${px(7)}px rgba(0,0,0,.45))}
</style><div id="stage">${doms.join("")}${tears.join("")}${guides && zones && !zones.error ? `<svg style="position:absolute;left:0;top:0" width="${px(width)}" height="${px(height)}">${guidesSvg(zones, k)}</svg>` : ""}</div><script>
window.apply=(ops)=>{for(const[id,vis,t,clip]of ops){const e=document.getElementById(id);if(!e)continue;e.style.display=vis?"":"none";if(t!=null)e.style.transform=t;if(clip!=null)e.style.clipPath=clip||"none"}};
window.ready=Promise.all([...document.images].map((i)=>i.decode().catch(()=>{})));
</script>`;

  const noise = (key, f) => rng(hash(`${key}/${Math.floor(f / 3)}`))() - 0.5;
  function layerStates(P, lf, f, S) {
    for (const it of P.items) {
      const c = it.c, at = frames(c.at ?? 0), until = c.until != null ? frames(c.until) : Infinity, d = lf - at;
      let vis = lf >= at && lf < until;
      if (it.type === "text") {
        for (const a of it.actions) if (lf >= frames(a.at) && a.hide) vis = false;
        S.set(it.id, [vis]);
        if (!vis) continue;
        const flight = ARRIVALS[c.arrive || "fly"] || ARRIVALS.fly, wait = it.strip ? 2 : 0, perFrame = Math.max(1, Math.ceil(it.n / 12));
        if (it.strip) { const s = [0.5, 1.1][d] ?? 1; S.set(`${it.id}-strip`, [true, `scale(${s})`]); }
        for (let i = 0; i < it.n; i++) {
          const dl = d - wait - Math.floor(i / perFrame), v = flight[dl];
          S.set(`${it.id}-l${i}`, dl < 0 && flight.length ? [false] : [true, v ? `translate(${px(v.x * it.cap)}px,${px(v.y * it.cap)}px) rotate(${v.r}deg)` : "none"]);
        }
        continue;
      }
      let ps = resolvePose(c.pose), prevPose = ps, poseFrame = -1, face = it.base, x = c.x, y = c.y, dx = 0, dy = 0, s = 1;
      const spins = {};
      for (const a of it.actions) {
        const fa = frames(a.at), da = lf - fa;
        if (da < 0) break;
        if (a.pose != null) { prevPose = ps; ps = resolvePose(a.pose); poseFrame = fa; }
        if (a.face) face = a.face;
        if (a.hop && da < HOP.length * a.hop) dy += HOP[da % HOP.length];
        if (a.shake && da < frames(a.shake)) dx += da % 2 ? 10 : -10;
        if (a.spin) spins[a.part] = (spins[a.part] || 0) + a.spin * Math.min(1, (da + 1) / Math.max(1, frames(a.duration ?? 0)));
        if (a.move) { const q = Math.min(1, (da + 1) / Math.max(1, frames(a.duration ?? 0))); x += (a.move.x - x) * q; y += (a.move.y - y) * q; }
        if (a.hide) vis = false;
        if (a.show) vis = true;
      }
      S.set(it.id, [vis]);
      if (!vis) continue;
      const step = (ENTRANCES[c.enter || "none"] || [])[d];
      if (step) { dx += step.x || 0; dy += step.y || 0; s *= step.s || 1; }
      const t = jit * (c.jitter ?? 1);
      const rot = (c.rotate || 0) + (t ? noise(it.id, f) * 0.7 * t : 0);
      if (t) { dx += noise(`${it.id}/x`, f) * 2.4 * t; dy += noise(`${it.id}/y`, f) * 2.4 * t; }
      S.set(it.id, [true, `translate(${px(x - c.x + dx)}px,${px(y - c.y + dy)}px) rotate(${n2(rot)}deg) scale(${n2(s * (c.flip ? -1 : 1))},${n2(s)})`]);
      for (const p of it.parts) {
        // pose change: on the first frame it goes a little past the target, on the next it settles
        const target = ps[p] || 0, prev = prevPose[p] || 0;
        let ang = (lf === poseFrame ? prev + (target - prev) * 1.16 : target) + (spins[p] || 0);
        if (t && it.type === "character") ang += noise(`${it.id}/${p}`, f) * 1.1 * t;
        const T = `rotate(${n2(ang)}deg)`;
        if (it.type === "character" && p === "head") { S.set(`${it.id}-head`, [true, T]); for (const v of it.variants) S.set(`${it.id}-head-${v}`, [v === face]); }
        else S.set(`${it.id}-${p}`, [true, T]);
      }
    }
  }

  // a camera move goes from wherever the camera is to its target, over `n` frames; zoom moves in ratio so it looks even
  function cameraAt(p, l) {
    let cur = { zoom: p.cams[0].zoom, x: p.cams[0].x, y: p.cams[0].y };
    for (const c of p.cams.slice(1)) {
      if (c.f > l) break;
      const q = c.n ? Math.min(1, (l - c.f + 1) / c.n) : 1, e = c.n ? (EASES[c.ease] || EASES.out)(q) : 1;
      cur = { zoom: cur.zoom * Math.pow(c.zoom / cur.zoom, e), x: cur.x + (c.x - cur.x) * e, y: cur.y + (c.y - cur.y) * e };
    }
    let dx = 0, dy = 0;
    for (const sh of p.shakes) { const d = l - sh.f; if (d >= 0 && d < sh.n) { cur.zoom *= SHAKE_ZOOM; dx = (d % 2 ? 1 : -1) * 16; dy = (((d * 7) % 3) - 1) * 10; } }
    return { ...cur, dx, dy };
  }

  function state(f) {
    const S = new Map();
    let P = shots.find((p) => f < p.f0 + p.nf) || shots[shots.length - 1];
    const lf = f - P.f0, tearing = P.transition === "tear" && lf < P.trans;
    for (const p of shots) {
      const current = p === P, vis = current || (tearing && p.si === P.si - 1);
      let clip = "";
      if (current && tearing) {
        const q = (lf + 1) / (P.trans + 1), edge = -60 + (width + 160) * (q * q * (3 - 2 * q));
        clip = `polygon(${px(-40)}px ${px(-40)}px,${P.jag.map(([a, b]) => `${px(edge + a)}px ${px(b)}px`).join(",")},${px(-40)}px ${px(height + 40)}px)`;
        S.set(`tear${p.si}`, [true, `translateX(${px(edge)}px)`]);
      } else if (p.transition === "tear") S.set(`tear${p.si}`, [false]);
      S.set(`s${p.si}`, [vis, null, clip]);
      if (!vis) continue;
      const l = current ? lf : p.nf - 1, cam = cameraAt(p, l);
      const clamp = (v, size) => Math.min(0, Math.max(size - size * cam.zoom, v));   // never shows outside the background
      S.set(`s${p.si}-cam`, [true, `translate(${px(clamp(width / 2 - cam.x * cam.zoom + cam.dx, width))}px,${px(clamp(height / 2 - cam.y * cam.zoom + cam.dy, height))}px) scale(${n2(cam.zoom, 4)})`]);
      layerStates(p, l, f, S);
    }
    return S;
  }

  return { html, state, fps, total: f0, duration: f0 / fps, fresh, pieces, warnings: [...new Set(warnings)], cuts: shots.map((p) => p.f0 / fps) };
}

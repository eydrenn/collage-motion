// Builds a character's SVG source from its sheet.
import { shade } from "./paper.mjs";

const BODIES = {
  medium: { shoulder: 114, torso: 172, leg: 62, head: 1 },
  short: { shoulder: 108, torso: 148, leg: 44, head: 1.04 },
  tall: { shoulder: 108, torso: 192, leg: 104, head: 0.9 },
  wide: { shoulder: 142, torso: 178, leg: 58, head: 0.98 },
};

const HEADS = {
  hex: [[-96, -14], [-72, -90], [62, -98], [98, -36], [92, 52], [50, 98], [-48, 98], [-90, 52]],
  square: [[-94, -82], [-60, -96], [86, -90], [98, -30], [94, 62], [58, 98], [-56, 98], [-96, 58]],
  long: [[-82, -20], [-62, -100], [54, -106], [84, -40], [80, 60], [42, 108], [-40, 108], [-78, 60]],
  round: [[-98, 4], [-84, -58], [-34, -96], [34, -98], [84, -60], [100, 2], [80, 62], [28, 98], [-32, 98], [-82, 60]],
};

// brow slant = how far the inner end drops (positive = angry)
const FACES = {
  neutral: { slant: [2, 2], lift: 0, lid: 0.24, mouth: "flat" },
  happy: { slant: [-2, -2], lift: -8, lid: 0, below: 0.3, mouth: "smile" },
  laughing: { slant: [-4, -4], lift: -10, closed: true, mouth: "open" },
  angry: { slant: [18, 18], lift: 8, lid: 0.3, mouth: "teeth" },
  surprised: { slant: [-4, -4], lift: -20, lid: 0, eye: 1.2, pupil: 0.75, mouth: "o" },
  tired: { slant: [-8, -8], lift: 2, lid: 0.56, bags: true, mouth: "small" },
  sad: { slant: [-16, -16], lift: -2, lid: 0.3, mouth: "frown" },
  suspicious: { slant: [12, -10], lift: 0, lid: 0.46, gaze: 5, mouth: "crooked" },
  scared: { slant: [-18, -18], lift: -16, lid: 0, eye: 1.15, pupil: 0.6, mouth: "teeth" },
  excited: { slant: [-6, -6], lift: -16, lid: 0, eye: 1.12, mouth: "open" },
  shocked: { slant: [-6, -6], lift: -26, lid: 0, eye: 1.3, pupil: 0.5, mouth: "gasp" },
  wink: { slant: [-2, 4], lift: -6, lid: 0, closed: "right", mouth: "smirk" },
  smug: { slant: [6, -12], lift: -2, lid: 0.42, gaze: 4, mouth: "smirk" },
  thinking: { slant: [8, -12], lift: -4, lid: 0.2, gaze: 6, gazeY: -6, mouth: "small" },
  confused: { slant: [-14, 10], lift: -4, lid: 0.15, gaze: -3, mouth: "crooked" },
  focused: { slant: [12, 12], lift: 4, lid: 0.2, mouth: "line" },
  bored: { slant: [0, 0], lift: 6, lid: 0.5, gazeY: 2, mouth: "line" },
  worried: { slant: [-14, -14], lift: -8, lid: 0.1, pupil: 0.8, mouth: "wavy" },
  embarrassed: { slant: [-10, -10], lift: -4, lid: 0.2, gaze: -6, gazeY: 3, blush: true, mouth: "wavy" },
  furious: { slant: [26, 26], lift: 12, lid: 0.44, pupil: 0.7, mouth: "teeth" },
  crying: { slant: [-20, -20], lift: -4, closed: true, tears: true, mouth: "frown" },
  asleep: { slant: [-4, -4], lift: 4, closed: true, mouth: "pout" },
};

const MOUTHS = {
  flat: [{ p: [[-28, -5], [30, -8], [26, 6], [-24, 7]], c: "mouth" }],
  small: [{ p: [[-16, -4], [18, -5], [15, 5], [-13, 6]], c: "mouth" }],
  crooked: [{ p: [[-30, 2], [30, -12], [28, 2], [-26, 12]], c: "mouth" }],
  frown: [{ p: [[-20, -9], [22, -9], [34, 7], [-32, 8]], c: "mouth" }],
  smile: [{ p: [[-38, -11], [40, -13], [26, 15], [-22, 16]], c: "mouth" }, { p: [[-30, -9], [32, -11], [28, -1], [-27, 0]], c: "tooth" }],
  teeth: [{ p: [[-36, -13], [36, -14], [32, 14], [-32, 15]], c: "mouth" }, { p: [[-29, -6], [29, -7], [27, 6], [-27, 7]], c: "tooth" }],
  open: [{ p: [[-38, -15], [40, -16], [26, 24], [-24, 25]], c: "mouth" }, { p: [[-30, -13], [32, -14], [29, -4], [-28, -3]], c: "tooth" }, { p: [[-14, 10], [16, 9], [18, 22], [-16, 23]], c: "tongue" }],
  o: [{ e: [0, 2, 15, 20], c: "mouth" }],
  gasp: [{ e: [0, 4, 20, 26], c: "mouth" }],
  pout: [{ e: [0, 2, 9, 10], c: "mouth" }],
  line: [{ p: [[-22, -3], [24, -4], [23, 3], [-21, 4]], c: "mouth" }],
  smirk: [{ p: [[-12, -1], [30, -13], [33, -3], [-8, 9]], c: "mouth" }],
  wavy: [{ p: [[-30, -2], [-14, -8], [2, -1], [18, -8], [32, -1], [30, 7], [16, 0], [2, 7], [-14, 0], [-28, 6]], c: "mouth" }],
};

export const POSES = {
  idle: {},
  wave: { "arm-right": -150, head: 4 },
  point: { "arm-right": -98 },
  "point-left": { "arm-left": 98 },
  cheer: { "arm-left": 152, "arm-right": -152, head: -3 },
  shrug: { "arm-left": 34, "forearm-left": 58, "arm-right": -34, "forearm-right": -58, head: 9 },
  slump: { "arm-left": -6, "arm-right": 6, head: 11 },
  think: { "arm-right": -12, "forearm-right": 150, head: -6 },
  scold: { "arm-right": -118, "arm-left": 30, head: -5 },
  "wave-left": { "arm-left": 150, head: -4 },
  "point-up": { "arm-right": -172, head: -4 },
  present: { "arm-right": -62, head: 3 },
  "present-left": { "arm-left": 62, head: -3 },
  "arms-out": { "arm-left": 72, "arm-right": -72 },
  "hands-up": { "arm-left": 176, "arm-right": -176, head: -5 },
  panic: { "arm-left": 166, "arm-right": -138, head: -7 },
  shout: { "arm-left": 58, "arm-right": -58, head: -9 },
  cower: { "arm-left": -22, "arm-right": 22, head: 13 },
  "look-up": { head: -12 },
  "look-down": { head: 14 },
  tilt: { head: 10 },
  "dance-a": { "arm-left": 122, "arm-right": -38, head: 8, legs: 4 },
  "dance-b": { "arm-left": 38, "arm-right": -122, head: -8, legs: -4 },
  hips: { "arm-left": 40, "forearm-left": -98, "arm-right": -40, "forearm-right": 98 },
  type: { "arm-left": -4, "forearm-left": -78, "arm-right": 4, "forearm-right": 78, head: 6 },
  phone: { "arm-right": -34, "forearm-right": -132, head: 6 },
  facepalm: { "arm-right": -78, "forearm-right": 138, head: 13 },
  stop: { "arm-right": -72, "forearm-right": -96, head: -3 },
  flex: { "arm-left": 96, "forearm-left": 100, "arm-right": -96, "forearm-right": -100 },
};

const n = (v) => +v.toFixed(1);

export function character(sheet, palette) {
  const P = palette.paper, color = (v, d) => P[v] || (v && v.startsWith("#") ? v : P[d]);
  const B = BODIES[sheet.body] || BODIES.medium, e = B.head, s = B.shoulder, T = B.torso, sitting = sheet.stance === "sit";
  // seated, the thighs point at the viewer: a lap under the torso and short shins below it
  const L = sitting ? 34 + Math.max(40, B.leg * 0.55) : B.leg;
  const skin = color(sheet.skin, "skin-light"), skinS = shade(skin, -0.1, -0.04);
  const hair = sheet.hair || { style: "short", color: "coffee" }, hairColor = color(hair.color, "coffee");
  const outfit = sheet.outfit || { type: "hoodie", color: "blue" }, outfitColor = color(outfit.color, "blue"), outfitS = shade(outfitColor, -0.06), outfitE = shade(outfitColor, -0.2);
  const F = FACES[sheet.face] || FACES.neutral;
  const hc = 98 * e, cy = -18 - hc;                       // head centre (the chin sits at y = -18)
  const extra = hair.style === "bun" ? 64 : hair.style === "quiff" || hair.style === "curly" ? 44 : 30;
  const oy = hc * 2 + 18 + extra + 18, H = Math.ceil(oy + T + L + 22 + 22), CX = 200;
  const pt = ([x, y]) => `${n(CX + x)},${n(oy + y)}`;
  const poly = (pts, fill, at = "") => `<polygon points="${pts.map(pt).join(" ")}" fill="${fill}"${at ? " " + at : ""}/>`;
  const line = (a, b, stroke, w) => `<line x1="${n(CX + a[0])}" y1="${n(oy + a[1])}" x2="${n(CX + b[0])}" y2="${n(oy + b[1])}" stroke="${stroke}" stroke-width="${w}"/>`;
  const circ = (x, y, r, fill, at = "") => `<circle cx="${n(CX + x)}" cy="${n(oy + y)}" r="${n(r)}" fill="${fill}"${at ? " " + at : ""}/>`;
  const piv = (x, y) => `data-pivot="${n(CX + x)},${n(oy + y)}"`;
  const hd = (pts) => pts.map(([x, y]) => [x * e, cy + y * e]);  // point in the head's coordinate system
  const mirror = (pts) => pts.map(([x, y]) => [-x, y]);

  const pants = color(sheet.pants, "graphite"), shoes = color(sheet.shoes, "black");
  const legL = sitting ? [[-74, T + 26], [-14, T + 26], [-16, T + L], [-68, T + L]] : [[-78, T - 10], [-4, T - 10], [-6, T + L], [-70, T + L]], shoeL = [[-84, T + L - 8], [-4, T + L - 8], [-4, T + L + 19], [-100, T + L + 19]];
  const legs = `<g id="legs" ${piv(0, T - 6)}>` +
    poly(legL, pants, 'data-rim="0"') + poly(mirror(legL), pants, 'data-rim="0"') + poly(shoeL, shoes) + poly(mirror(shoeL), shoes) +
    (sitting ? poly([[-88, T - 12], [88, T - 12], [96, T + 36], [-96, T + 36]], shade(pants, 0.06)) + line([0, T + 4], [0, T + 34], shade(pants, -0.08), 5) : "") +
    line([-100, T + L + 22], [-4, T + L + 22], P.white, 7) + line([4, T + L + 22], [100, T + L + 22], P.white, 7) + "</g>";

  const body = [[-s, 28], [-s + 40, 0], [s - 40, 0], [s, 28], [s + 10, T], [-s - 10, T]];
  let torso = "";
  if (outfit.type === "hoodie") {
    torso += poly([[-s + 8, -12], [-s + 40, -64], [s - 40, -64], [s - 8, -12], [s + 4, 36], [-s - 4, 36]], outfitE);
    torso += poly(body, outfitColor, 'data-crease="1"') + poly([[-36, 0], [36, 0], [0, 40]], outfitE, 'data-rim="0"');
    torso += line([-16, 22], [-20, 80], P.cream, 6) + line([16, 22], [21, 73], P.cream, 6);
    torso += poly([[-60, T - 60], [60, T - 60], [74, T - 12], [-74, T - 12]], shade(outfitColor, -0.1));
  } else if (outfit.type === "tshirt") {
    torso += poly(body, outfitColor, 'data-crease="1"') + poly([[-30, 0], [30, 0], [16, 22], [-16, 22]], skin, 'data-rim="0" data-shadow="0"');
    if (outfit.detail) torso += poly([[-s + 2, 70], [s - 2, 66], [s + 2, 104], [-s - 2, 108]], color(outfit.detail, "white"), 'data-rim="0"');
  } else if (outfit.type === "shirt") {
    torso += poly(body, outfitColor, 'data-crease="1"') + poly([[-5, 4], [5, 4], [6, T], [-6, T]], shade(outfitColor, -0.12), 'data-rim="0" data-shadow="0"');
    for (const y of [44, 84, 124]) if (y < T - 14) torso += circ(0, y, 5, outfitE, 'data-shadow="0" data-cut="smooth"');
    torso += poly([[-40, -4], [-4, 6], [-22, 38]], shade(outfitColor, 0.04)) + poly([[40, -4], [4, 6], [22, 38]], shade(outfitColor, 0.04));
    if (outfit.detail) torso += poly([[-10, 12], [10, 12], [14, 96], [0, 116], [-14, 96]], color(outfit.detail, "red"));
  } else { // suit
    torso += poly(body, outfitColor, 'data-crease="1"') + poly([[-34, 0], [34, 0], [0, 112]], P.white, 'data-rim="0"');
    torso += poly([[-9, 14], [9, 14], [13, 82], [0, 104], [-13, 82]], color(outfit.detail, "red"));
    torso += poly([[-46, -2], [-4, 108], [-34, 96], [-58, 34]], outfitE) + poly([[46, -2], [4, 108], [34, 96], [58, 34]], outfitE);
    torso += circ(8, 136, 6, outfitE, 'data-shadow="0" data-cut="smooth"');
  }
  torso = `<g id="torso" ${piv(0, T)}>${torso}</g>`;

  const A = Math.min(150, T * 0.87), E = 28 + (A - 28) * 0.5;   // wrist and elbow heights
  const hand = [[-s - 10, A - 8], [-s + 24, A - 4], [-s + 22, A + 28], [-s - 7, A + 28]];
  const upper = [[-s + 2, 28], [-s + 34, 20], [-s + 40, 64], [-s + 36, E + 10], [-s - 20, E + 8], [-s - 24, 70]];
  const lower = [[-s - 21, E - 4], [-s + 37, E - 2], [-s + 26, A], [-s - 14, A - 4]];
  const short = [[-s + 2, 28], [-s + 34, 20], [-s + 40, 64], [-s + 36, 84], [-s - 24, 80], [-s - 24, 70]];
  const bare = [[-s - 20, 70], [-s + 34, 74], [-s + 34, E + 8], [-s - 18, E + 6]];
  const sleeved = outfit.type !== "tshirt";
  // the forearm hangs from the arm at the elbow, so it turns with it and can bend on its own
  const arm = (m, side, sign) => `<g id="arm-${side}" ${piv(sign * (-s + 20), 38)}>` +
    (sleeved ? poly(m(upper), outfitS) : poly(m(bare), skin, 'data-rim="0"') + poly(m(short), outfitS)) +
    `<g id="forearm-${side}" ${piv(sign * (-s + 8), E)}>${poly(m(hand), skin, 'data-rim="0"')}${poly(m(lower), sleeved ? outfitS : skin, 'data-rim="0"')}</g></g>`;
  const arms = arm((p) => p, "left", 1) + arm(mirror, "right", -1);

  let c = "";
  if (hair.style === "long") c += poly(hd([[-112, -30], [-84, -104], [80, -108], [114, -34], [120, 120], [70, 150], [-74, 150], [-122, 118]]), hairColor);
  if (hair.style === "bun") c += circ(6 * e, cy - 122 * e, 44 * e, hairColor);
  c += poly([[-20, -34], [20, -34], [22, 8], [-22, 8]], skinS, 'data-rim="0"');
  c += poly(hd([[-110, 6], [-92, -2], [-88, 50], [-103, 52]]), skinS, 'data-rim="0"') + poly(hd([[110, 6], [92, -2], [88, 50], [103, 52]]), skinS, 'data-rim="0"');
  c += poly(hd(HEADS[sheet.head] || HEADS.hex), skin, 'data-crease="1"');
  const eyeR = 17 * (F.eye || 1), ex = 42, ey = 12;
  for (const side of [-1, 1]) {
    const x = side * ex * e, y = cy + ey * e;
    if (F.closed === true || F.closed === (side < 0 ? "left" : "right")) { c += poly(hd([[side * ex - 20, ey - 2], [side * ex + 20, ey - 6], [side * ex + 20, ey + 4], [side * ex - 20, ey + 8]]), P.black, 'data-rim="0"'); continue; }
    if (F.bags) c += poly(hd([[side * ex - 20, ey + 12], [side * ex + 20, ey + 12], [side * ex + 15, ey + 27], [side * ex - 15, ey + 27]]), skinS, 'data-rim="0" data-shadow="0"');
    c += circ(x, y, eyeR * e, P.white, 'data-cut="smooth"');
    c += circ(x + (4 + (F.gaze || 0)) * e, y + (3 + (F.gazeY || 0)) * e, 8 * (F.pupil || 1) * e, P.black, 'data-shadow="0" data-cut="smooth"');
    if (F.lid) c += poly(hd([[side * ex - eyeR - 4, ey - eyeR - 4], [side * ex + eyeR + 4, ey - eyeR - 4], [side * ex + eyeR + 4, ey - eyeR + 2 * eyeR * F.lid], [side * ex - eyeR - 4, ey - eyeR + 2 * eyeR * F.lid]]), skinS, 'data-rim="0"');
    if (F.below) c += poly(hd([[side * ex - eyeR - 4, ey + eyeR + 4], [side * ex + eyeR + 4, ey + eyeR + 4], [side * ex + eyeR + 4, ey + eyeR - 2 * eyeR * F.below], [side * ex - eyeR - 4, ey + eyeR - 2 * eyeR * F.below]]), skin, 'data-rim="0" data-shadow="0"');
  }
  if (F.tears) for (const side of [-1, 1]) c += poly(hd([[side * ex, ey + 14], [side * ex + 9, ey + 36], [side * ex, ey + 48], [side * ex - 9, ey + 36]]), P.sky, 'data-rim="0"');
  if (F.blush) for (const side of [-1, 1]) c += poly(hd([[side * 66 - 15, ey + 28], [side * 66 + 15, ey + 26], [side * 66 + 13, ey + 42], [side * 66 - 13, ey + 44]]), P.pink, 'data-rim="0" data-shadow="0"');
  c += poly(hd([[0, 20], [17, 48], [-10, 48]]), skinS, 'data-rim="0"');
  const cut = { short: [[-110, 4], [-96, -88], [-40, -126], [50, -130], [104, -90], [112, 0], [88, -36], [50, -56], [4, -42], [-40, -62], [-72, -34]],
    quiff: [[-108, 0], [-98, -84], [-58, -120], [10, -160], [84, -128], [110, -70], [112, -4], [90, -40], [40, -64], [-10, -48], [-52, -70], [-80, -36]],
    long: [[-112, 30], [-98, -86], [-40, -126], [50, -130], [106, -88], [116, 34], [88, -30], [44, -62], [-6, -72], [-52, -56], [-84, -24]],
    bun: [[-108, 0], [-96, -86], [-40, -122], [50, -126], [104, -88], [112, 0], [84, -46], [20, -70], [-44, -62], [-82, -36]],
    buzz: [[-102, -20], [-90, -86], [-40, -116], [50, -120], [98, -86], [106, -22], [80, -60], [20, -78], [-40, -74], [-78, -54]],
    cap: [[-108, 6], [-100, -40], [-80, -30], [-78, 0]] }[hair.style];
  if (hair.style === "curly") for (const [x, y, r] of [[-92, -30, 38], [-70, -84, 42], [-18, -112, 44], [40, -112, 42], [84, -78, 40], [100, -24, 36], [-108, 22, 28], [112, 26, 26]]) c += circ(x * e, cy + y * e, r * e, hairColor, 'data-rim="0"');
  else if (cut) c += poly(hd(cut), hair.style === "buzz" ? shade(hairColor, 0.06) : hairColor);
  if (hair.style === "cap") {
    const capColor = color(hair.cap, "green");
    c += poly(hd(mirror(cut)), hairColor) + poly(hd([[-104, -30], [-92, -92], [-36, -126], [44, -128], [98, -92], [106, -32]]), capColor) + poly(hd([[-110, -40], [150, -52], [156, -28], [-108, -22]]), shade(capColor, -0.12));
  }
  if (sheet.beard) c += poly(hd([[-92, 40], [-60, 34], [-34, 52], [34, 52], [60, 34], [92, 40], [86, 70], [50, 108], [-48, 108], [-86, 70]]), color(sheet.beard === true ? hair.color : sheet.beard, "coffee"));
  if (sheet.mustache) c += poly(hd([[-36, 50], [0, 44], [38, 50], [44, 64], [0, 58], [-42, 64]]), color(sheet.mustache === true ? hair.color : sheet.mustache, "coffee"), 'data-rim="0"');
  for (const [i, side] of [[0, -1], [1, 1]]) {
    const slant = F.slant[i], y0 = -30 + F.lift;
    const outer = [side * 74, y0 - slant * 0.25], inner = [side * 16, y0 + slant * 0.75];
    c += poly(hd([outer, inner, [inner[0], inner[1] + 15], [outer[0], outer[1] + 16]]), P.black, 'data-rim="0"');
  }
  const my = sheet.beard ? 70 : 66, mouthColors = { mouth: P.coffee, tooth: P.white, tongue: P.pink };
  for (const b of MOUTHS[F.mouth] || MOUTHS.flat) {
    const at = `data-rim="0"${b.c === "mouth" ? "" : ' data-shadow="0"'}`;
    c += b.e ? `<ellipse cx="${n(CX + b.e[0] * e)}" cy="${n(oy + cy + (my + b.e[1]) * e)}" rx="${n(b.e[2] * e)}" ry="${n(b.e[3] * e)}" fill="${mouthColors[b.c]}" ${at}/>` : poly(hd(b.p.map(([x, y]) => [x, my + y])), mouthColors[b.c], at);
  }
  if (sheet.glasses) {
    const frame = (x) => `<rect x="${n(CX + (x - 25) * e)}" y="${n(oy + cy + (ey - 22) * e)}" width="${n(50 * e)}" height="${n(44 * e)}" rx="${n(10 * e)}" stroke="${P.black}" stroke-width="6"/>`;
    c += frame(-ex) + frame(ex) + line([-17 * e, cy + (ey - 4) * e], [17 * e, cy + (ey - 4) * e], P.black, 6);
  }
  if (sheet.headphones) {
    const hpColor = color(sheet.headphones === true ? "graphite" : sheet.headphones, "graphite");
    c += `<path d="M${n(CX - 106 * e)} ${n(oy + cy + 10 * e)} C${n(CX - 120 * e)} ${n(oy + cy - 150 * e)} ${n(CX + 120 * e)} ${n(oy + cy - 150 * e)} ${n(CX + 106 * e)} ${n(oy + cy + 10 * e)}" stroke="${hpColor}" stroke-width="13"/>`;
    c += poly(hd([[-124, -14], [-96, -18], [-92, 58], [-120, 62]]), hpColor) + poly(hd([[124, -14], [96, -18], [92, 58], [120, 62]]), hpColor);
  }
  const head = `<g id="head" ${piv(0, -16)}>${c}</g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 ${H}">\n<!-- Character generated from a sheet by scripts/lib/character.mjs. Do not edit: change the sheet. -->\n${legs}\n${torso}\n${arms}\n${head}\n</svg>\n`;
}

export const faces = Object.keys(FACES), bodies = Object.keys(BODIES), heads = Object.keys(HEADS);
export const hairStyles = ["short", "quiff", "long", "bun", "curly", "buzz", "cap", "bald"], outfits = ["hoodie", "tshirt", "shirt", "suit"];

// Safe zones of a vertical video: where the apps cover the picture, where captions go, and the guides drawn over a render.
const SLOTS = ["title", "caption", "caption-2", "center"];

// `area` is where text may go: what the apps were not seen covering, or the published ad margins when `ads` is set
export function zonesFor(data, name, width, height, ads = false) {
  if (name === false || name === "none") return null;
  const all = Object.keys(data.platforms), picked = name == null || name === "all" ? all : [name];
  if (picked.some((p) => !data.platforms[p])) return { error: `safe zone "${name}" does not exist (there is: all, ${all.join(", ")}, or false)` };
  // the measurements only describe a 9:16 frame; any other shape gets a plain margin, so slots still work
  if (Math.abs(width / height - data.frame.width / data.frame.height) > 0.02) {
    const area = [width * 0.05, height * 0.06, width * 0.95, height * 0.94];
    return { name: "margin", ads: false, width, height, area, adArea: area, columns: [], covered: [], slots: slotsOf(area, height / data.frame.height) };
  }
  const W = data.frame.width, H = data.frame.height, pad = data.buffer;
  const m = { top: 0, bottom: 0, left: 0, right: 0 }, covered = [], adColumns = [], columns = [];
  let top = data.top, bottom = H, side = data.side;
  for (const p of picked) {
    const z = data.platforms[p];
    for (const s of Object.keys(m)) m[s] = Math.max(m[s], z.margins[s]);
    if (z.column) adColumns.push([z.column[0], z.column[1], W, z.column[2]]);
    if (z.sideCrop) side = Math.max(side, z.sideCrop), m.left = Math.max(m.left, z.sideCrop), m.right = Math.max(m.right, z.sideCrop);
    if (z.bottom) bottom = Math.min(bottom, z.bottom);
    for (const box of z.covered) {
      covered.push({ platform: p, box });
      const [x0, y0, x1, y1] = box;
      if (x0 > 0) columns.push([x0 - pad, y0 - pad, W, y1 + pad]);          // a strip on the right
      else if (y0 === 0) top = Math.max(top, y1 + pad);                     // a bar across the top
      else if (x1 === W) bottom = Math.min(bottom, y0 - pad);               // a block across the bottom
    }
  }
  const sx = width / W, sy = height / H, scale = ([x0, y0, x1, y1]) => [x0 * sx, y0 * sy, x1 * sx, y1 * sy];
  const adArea = scale([m.left, m.top, W - m.right, H - m.bottom]);
  const area = ads ? adArea : scale([side, top, W - side, bottom]);
  return {
    name: name ?? "all", ads, width, height, area, adArea,
    columns: (ads ? adColumns : columns).map(scale), covered: covered.map((c) => ({ platform: c.platform, box: scale(c.box) })),
    slots: slotsOf(area, sy),
  };
}

// each slot gives the baseline for letters of a given height, so the text and its paper stay inside the area
function slotsOf(area, sy) {
  return {
    title: (size) => area[1] + 12 * sy + size * 1.34,
    center: (size) => (area[1] + area[3]) / 2 + size / 2,
    caption: (size) => area[3] - 12 * sy - size * 0.36,
    "caption-2": (size) => area[3] - 12 * sy - size * 2.2,
  };
}

// the area is narrower where the column of buttons runs: [left, right] for a band of the frame
function span(zones, top, bottom) {
  return [zones.area[0], Math.min(zones.area[2], ...zones.columns.filter((c) => c[1] < bottom && c[3] > top).map((c) => c[0]))];
}

export function placeText(layer, zones, warnings, width, height) {
  // a text with nowhere to go is drawn in the middle of the frame, with a warning, rather than stopping the render
  const lost = (why) => { warnings.push(`text "${String(layer.text).slice(0, 24)}": ${why}`); return { anchor: "middle", ...layer, x: layer.x ?? width / 2, y: layer.y ?? height / 2 }; };
  if (layer.place == null) return typeof layer.x === "number" && typeof layer.y === "number" ? layer : lost('needs "place", or numbers in "x" and "y"');
  if (!SLOTS.includes(layer.place)) return lost(`place "${layer.place}" does not exist (there is: ${SLOTS.join(", ")})`);
  if (!zones || zones.error) return lost('"place" needs safe zones, which exist only for a 9:16 frame with `safe` not turned off');
  const size = layer.size || 60, y = layer.y ?? zones.slots[layer.place](size), [left, right] = span(zones, y - size * 1.4, y + size * 0.4);
  return { anchor: "middle", ...layer, x: layer.x ?? (left + right) / 2, y };
}

const overlap = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

export function textWarnings(text, box, zones) {
  if (!zones || zones.error) return [];
  const label = `text "${String(text).slice(0, 24)}"`, hit = [...new Set(zones.covered.filter((c) => overlap(box, c.box)).map((c) => c.platform))];
  const [, y0, , y1] = zones.area, [x0, x1] = span(zones, box[1], box[3]);
  if (box[2] - box[0] > x1 - x0) return [`${label} is ${Math.round(box[2] - box[0])} wide and there is room for ${Math.round(x1 - x0)} at that height: shorten it, lower \`size\`, or split it in two lines (\`caption-2\` and \`caption\`)`];
  if (hit.length) return [`${label} sits under the interface of ${hit.join(", ")}: move it into the free area (\`place\` does that)`];
  if (box[1] < y0 - 1 || box[3] > y1 + 1 || box[0] < x0 - 1 || box[2] > x1 + 1) return [`${label} is outside the ${zones.ads ? "ad-safe" : "free"} area (x ${Math.round(x0)}-${Math.round(x1)} at that height, y ${Math.round(y0)}-${Math.round(y1)})${zones.ads ? "" : ": too close to the interface of the apps"}`];
  return [];
}

export function guidesSvg(zones, k = 1) {
  if (!zones || zones.error) return "";
  const { area: [x0, y0, x1, y1], adArea } = zones, n = (v) => +(v * k).toFixed(1);
  const rect = ([a, b, c, d], attrs) => `<rect x="${n(a)}" y="${n(b)}" width="${n(c - a)}" height="${n(d - b)}" ${attrs}/>`;
  const label = (x, y, text, anchor = "start") => `<text x="${n(x)}" y="${n(y)}" text-anchor="${anchor}" font-family="ui-monospace,Menlo,monospace" font-size="${n(26)}" fill="#fff" stroke="#000" stroke-width="${n(5)}" paint-order="stroke">${text}</text>`;
  const red = zones.covered.map((c) => rect(c.box, 'fill="rgba(255,40,40,.34)"')).join("");
  const other = zones.ads || zones.name === "margin" ? "" : rect(adArea, `fill="none" stroke="#ffd23f" stroke-width="${n(3)}" stroke-dasharray="${n(8)} ${n(10)}" opacity=".8"`) + label(adArea[2] - 8, adArea[1] + 30, "ads", "end");
  const slots = Object.entries(zones.slots).map(([name, at]) => { const y = at(60), right = span(zones, y - 84, y + 24)[1]; return `<line x1="${n(x0)}" y1="${n(y)}" x2="${n(right)}" y2="${n(y)}" stroke="#fff" stroke-width="${n(3)}" stroke-dasharray="${n(18)} ${n(12)}" opacity=".85"/>` + label(right - 8, y - 10, name, "end"); }).join("");
  return red + other + rect([x0, y0, x1, y1], `fill="none" stroke="#fff" stroke-width="${n(4)}" opacity=".9"`) + slots;
}

export { SLOTS };

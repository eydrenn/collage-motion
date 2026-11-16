// Validates stills and scenes before drawing; returns warnings.
import { POSES, faces, bodies, heads, hairStyles, outfits } from "./character.mjs";

const PARTS = ["legs", "torso", "arm-left", "forearm-left", "arm-right", "forearm-right", "head"];
const COMMON = ["type", "id", "x", "y", "at", "until", "enter", "jitter", "fixed", "seed", "sound"];
const FIELDS = {
  band: ["type", "y", "height", "color", "shadow"],
  art: [...COMMON, "name", "scale", "rotate", "flip"],
  character: [...COMMON, "name", "face", "pose", "stance", "overrides", "scale", "rotate", "flip"],
  // text arrives letter by letter (`arrive`) and does not jitter, so it has no `enter`, `jitter` or `seed`
  text: ["type", "id", "x", "y", "place", "at", "until", "fixed", "sound", "text", "size", "anchor", "color", "strip", "ransom", "tilt", "shadow", "arrive"],
  tear: ["type", "at", "color", "mosaic"],
};
const ACTION = ["at", "target", "pose", "face", "hop", "shake", "spin", "part", "duration", "move", "hide", "show", "zoom", "x", "y", "on", "ease", "sound"];
const CAMERA = ["zoom", "x", "y", "on"];
const SHOT = ["duration", "until", "background", "transition", "transitionDuration", "camera", "layers", "actions", "sound"];
const SCENE = ["width", "height", "fps", "jitter", "shots", "sound", "safe", "margins"];
const SHEET = ["body", "head", "skin", "hair", "beard", "mustache", "glasses", "headphones", "outfit", "pants", "shoes", "face", "stance"];

const list = (names) => names.join(", ");
const isPaper = (kit, v) => v in kit.palette.paper || /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);

function unknownFields(object, allowed, where, out) {
  for (const key of Object.keys(object)) if (!allowed.includes(key)) out.push(`${where}: unknown field "${key}" (known: ${list(allowed)})`);
}
function oneOf(value, allowed, what, where, out) {
  if (value != null && !allowed.includes(value)) out.push(`${where}: ${what} "${value}" does not exist (there is: ${list(allowed)})`);
}
function paper(kit, value, what, where, out) {
  if (value != null && value !== true && value !== false && !isPaper(kit, value)) out.push(`${where}: ${what} "${value}" is not a paper of the palette nor a hex colour`);
}
function pose(value, where, out) {
  if (typeof value === "string") oneOf(value, Object.keys(POSES), "pose", where, out);
  else if (value && typeof value === "object") for (const part of Object.keys(value)) oneOf(part, PARTS, "part in the pose", where, out);
}

export function checkSheet(sheet, kit, where, out = []) {
  unknownFields(sheet, SHEET, where, out);
  oneOf(sheet.body, bodies, "body", where, out);
  oneOf(sheet.head, heads, "head", where, out);
  oneOf(sheet.face, faces, "face", where, out);
  paper(kit, sheet.skin, "skin", where, out);
  if (sheet.hair) { oneOf(sheet.hair.style, hairStyles, "hair style", where, out); paper(kit, sheet.hair.color, "hair colour", where, out); paper(kit, sheet.hair.cap, "cap colour", where, out); if (!sheet.hair.style) out.push(`${where}: hair needs a "style"`); }
  if (sheet.outfit) { oneOf(sheet.outfit.type, outfits, "outfit type", where, out); paper(kit, sheet.outfit.color, "outfit colour", where, out); paper(kit, sheet.outfit.detail, "outfit detail", where, out); if (!sheet.outfit.type) out.push(`${where}: outfit needs a "type"`); }
  for (const key of ["beard", "mustache", "headphones", "pants", "shoes"]) paper(kit, sheet[key], key, where, out);
  return out;
}

function checkLayer(layer, kit, where, known, out) {
  const fields = FIELDS[layer.type];
  if (!fields || (layer.type === "tear" && !known.stills)) { out.push(`${where}: layer type "${layer.type}" does not exist here (there is: ${list(Object.keys(FIELDS).filter((t) => t !== "tear" || known.stills))})`); return; }
  unknownFields(layer, fields, where, out);
  if (layer.type === "band" || layer.type === "tear") { paper(kit, layer.color, "colour", where, out); return; }
  if (layer.type === "art" || layer.type === "character") {
    if (!layer.name) out.push(`${where}: needs a "name"`);
    for (const key of ["x", "y"]) if (typeof layer[key] !== "number") out.push(`${where}: needs a number in "${key}"`);
  }
  if (layer.type === "character") {
    oneOf(layer.face, faces, "face", where, out);
    oneOf(layer.stance, ["stand", "sit"], "stance", where, out);
    pose(layer.pose, where, out);
    if (kit.cast[layer.name]) checkSheet({ ...kit.cast[layer.name], ...(layer.overrides || {}) }, kit, `${where} sheet`, out);
  }
  if (layer.type === "text") {
    if (typeof layer.text !== "string" || !layer.text) out.push(`${where}: needs "text"`);
    if (typeof layer.size !== "number") out.push(`${where}: needs a number in "size" (the height of a capital letter)`);
    oneOf(layer.anchor, ["start", "middle", "end"], "anchor", where, out);
    paper(kit, layer.color, "colour", where, out);
    paper(kit, layer.strip, "strip", where, out);
    if (typeof layer.ransom === "string") for (const c of layer.ransom.split(/[\s,]+/).filter(Boolean)) paper(kit, c, "ransom paper", where, out);
    if (known.arrivals) oneOf(layer.arrive, known.arrivals, "arrival", where, out);
  }
  if (known.entrances) oneOf(layer.enter, known.entrances, "entrance", where, out);
}

export function checkFrame(frame, kit, out = []) {
  for (const key of ["width", "height"]) if (typeof frame[key] !== "number") out.push(`frame: needs a number in "${key}"`);
  if (!frame.background) out.push('frame: needs a "background" ({ color, seed })'); else paper(kit, frame.background.color, "background colour", "background", out);
  (frame.layers || []).forEach((layer, i) => checkLayer(layer, kit, `layer ${i + 1} (${layer.type}${layer.name ? ` ${layer.name}` : ""})`, { stills: true }, out));
  return out;
}

export function checkScene(scene, kit, known, out = []) {
  unknownFields(scene, SCENE, "scene", out);
  for (const key of ["width", "height"]) if (typeof scene[key] !== "number") out.push(`scene: needs a number in "${key}"`);
  (scene.shots || []).forEach((shot, s) => {
    const at = `shot ${s + 1}`;
    unknownFields(shot, SHOT, at, out);
    if (typeof shot.duration !== "number" || shot.duration <= 0) out.push(`${at}: needs a "duration" in seconds`);
    oneOf(shot.transition, ["cut", "tear"], "transition", at, out);
    if (shot.camera) unknownFields(shot.camera, CAMERA, `${at}, camera`, out);
    if (!shot.background) out.push(`${at}: needs a "background" ({ color, seed })`); else paper(kit, shot.background.color, "background colour", at, out);
    const ids = new Set();
    (shot.layers || []).forEach((layer, i) => {
      const where = `${at}, layer ${layer.id ? `"${layer.id}"` : i + 1} (${layer.type}${layer.name ? ` ${layer.name}` : ""})`;
      checkLayer(layer, kit, where, known, out);
      if (layer.id) { if (ids.has(layer.id)) out.push(`${where}: the id "${layer.id}" is used twice in this shot`); ids.add(layer.id); }
      if (typeof layer.at === "number" && layer.at >= shot.duration) out.push(`${where}: appears at ${layer.at} s, after the shot ends (${shot.duration} s)`);
    });
    (shot.actions || []).forEach((action, i) => {
      const where = `${at}, action ${i + 1}${action.target ? ` on "${action.target}"` : ""}`;
      unknownFields(action, ACTION, where, out);
      if (typeof action.at !== "number") out.push(`${where}: needs a number in "at" (seconds inside the shot)`);
      else if (action.at >= shot.duration) out.push(`${where}: happens at ${action.at} s, after the shot ends (${shot.duration} s)`);
      if (!action.target) out.push(`${where}: needs a "target" (a layer id, or "camera")`);
      oneOf(action.ease, known.eases || [], "ease", where, out);
      if ((action.on || action.ease) && action.target !== "camera") out.push(`${where}: "on" and "ease" belong to a camera action`);
      oneOf(action.face, faces, "face", where, out);
      pose(action.pose, where, out);
      if (action.spin != null && !action.part) out.push(`${where}: "spin" needs the "part" to turn`);
      const layer = (shot.layers || []).find((l) => l.id && l.id === action.target);
      if (layer && layer.type !== "character" && (action.face || action.pose)) out.push(`${where}: only a character has a face or a pose`);
    });
  });
  return out;
}

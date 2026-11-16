// When things happen in a scene: sound cues and the key frames of the animatic. Timing mirrors scene.mjs.
import { ENTRANCES, ARRIVALS } from "./scene.mjs";

// which sound an entrance asks for, and on which step of the entrance it should hit
const ENTER_CUE = { pop: ["pop", 0], drop: ["drop", 2], rise: ["rise", 0], "slide-left": ["slide", 0], "slide-right": ["slide", 0] };
const HOP_FRAMES = 3, STRIP_FRAMES = 2, LETTERS_PER_SECOND_CAP = 12;

export const CUE_KINDS = {
  cut: "a shot starts with a plain cut", tear: "a shot starts with the sheet tearing",
  pop: "a piece pops in", drop: "a piece lands after dropping", rise: "a piece comes up", slide: "a piece slides in", appear: "a piece simply appears",
  strip: "a caption strip snaps in", letter: "one or more letters land",
  pose: "a character changes pose", face: "a character changes face only", hop: "a hop", shake: "a shake starts", spin: "a part starts to spin",
  move: "a piece starts to move", hide: "a piece goes away", show: "a piece comes back", camera: "the camera cuts to another framing",
};

export function eventsOf(scene) {
  const fps = scene.fps || 12, frames = (s) => Math.round(s * fps);
  const cues = [], keys = new Set();
  let f0 = 0;
  (scene.shots || []).forEach((shot, si) => {
    const nf = frames(shot.duration), last = f0 + nf - 1;
    const inShot = (f) => Math.max(f0, Math.min(last, f0 + f));
    const cue = (localFrame, kind, target, own) => { if (own === false) return; const frame = inShot(localFrame); cues.push({ t: +(frame / fps).toFixed(3), frame, kind, shot: si + 1, ...(target ? { target } : {}), ...(typeof own === "string" ? { sound: own } : {}) }); };
    const key = (localFrame) => keys.add(inShot(localFrame));

    key(0);
    if (si > 0) {
      const tearing = shot.transition === "tear";
      cue(0, tearing ? "tear" : "cut", null, shot.sound);
      if (tearing) key(Math.min(nf, frames(shot.transitionDuration ?? 0.5)));
    }
    for (const layer of shot.layers || []) {
      if (layer.type === "band") continue;
      const at = frames(layer.at ?? 0), name = layer.id || layer.name || layer.type;
      if (layer.type === "text") {
        const letters = [...String(layer.text || "").toUpperCase()].filter((ch) => ch !== " ").length;
        const hasStrip = Boolean(layer.strip) && layer.ransom == null, wait = hasStrip ? STRIP_FRAMES : 0;
        const flight = ARRIVALS[layer.arrive || "fly"] || ARRIVALS.fly, perFrame = Math.max(1, Math.ceil(letters / LETTERS_PER_SECOND_CAP));
        if (hasStrip) { cue(at, "strip", name, layer.sound); key(at + wait); }
        if (!flight.length) { if (!hasStrip) cue(at, "appear", name, layer.sound); key(at); }
        else {
          const groups = Math.ceil(letters / perFrame);
          for (let g = 0; g < groups; g++) cue(at + wait + g + flight.length, "letter", name, layer.sound);
          key(at + wait + groups - 1 + flight.length);
        }
        if (layer.until != null) key(frames(layer.until));
        continue;
      }
      const steps = (ENTRANCES[layer.enter || "none"] || []).length, enter = ENTER_CUE[layer.enter];
      if (enter) cue(at + enter[1], enter[0], name, layer.sound);
      else if (at > 0) cue(at, "appear", name, layer.sound);
      if (at > 0 || steps) key(at + steps);
      if (layer.until != null) key(frames(layer.until));
    }
    for (const action of shot.actions || []) {
      const at = frames(action.at ?? 0), span = Math.max(0, frames(action.duration ?? 0)), who = action.target;
      if (who === "camera") {
        // a quick reframing clicks; a slow push is silent
        if ((action.zoom != null || action.x != null || action.y != null || action.on) && span <= frames(0.6)) cue(at, "camera", who, action.sound);
        if (action.shake) { cue(at, "shake", who, action.sound); key(at + frames(action.shake)); }
        key(at + span);
        continue;
      }
      if (action.pose != null) { cue(at, "pose", who, action.sound); key(at + 1); }
      else if (action.face) { cue(at, "face", who, action.sound); key(at); }
      if (action.hop) { for (let h = 0; h < action.hop; h++) cue(at + h * HOP_FRAMES, "hop", who, action.sound); key(at + 1); key(at + HOP_FRAMES * action.hop); }
      if (action.shake) { cue(at, "shake", who, action.sound); key(at); key(at + frames(action.shake)); }
      if (action.spin) { cue(at, "spin", who, action.sound); key(at); key(at + span); }
      if (action.move) { cue(at, "move", who, action.sound); key(at + span); }
      if (action.hide) { cue(at, "hide", who, action.sound); key(at); }
      if (action.show) { cue(at, "show", who, action.sound); key(at); }
    }
    f0 += nf;
  });
  cues.sort((a, b) => a.frame - b.frame);
  return { fps, total: f0, duration: f0 / fps, cues, keys: [...keys].sort((a, b) => a - b) };
}

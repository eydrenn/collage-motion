# Stills and scenes

This page explains how to compose a paper-cutout video with collage-motion: first as still frames, then as an animated scene. It assumes you have the skill installed and nothing else.

In every command below, `collage` stands for `node <skill folder>/scripts/collage.mjs`. Run it from your **project folder** (the folder that holds your `art/`, `scenes/` and `stills/`). The tool writes its results to `out/` and its cache to `.collage-cache/` inside the project folder. Add both to `.gitignore`. `collage init` creates a working starting point: `scenes/demo/scene.mjs`, `stills/demo.json`, `art/` and `characters.json`.

Names of art (`clock`, `server`, `mug`, ...) come from the library (`references/library.md`) or from your own `art/*.svg`. Character names (`dev`, `boss`, ...) come from the cast. See `references/art.md` and `references/characters.md`.

## 1. The order of work

1. **Still frame**: `collage frame stills/<file>.json`. One command, about 2.5 seconds, a PNG.
2. **Contact sheet**: `collage film <scene> --sheet --every 0.25`. A grid of small frames of the whole scene. Open it and look.
3. **Animatic**: `collage film <scene> --animatic`. The storyboard in motion: a quarter-size video (270x480) that shows only the drawing where each event has settled and holds it until the next one. It is for judging the rhythm, and the timing against narration and sound, before any motion is worth looking at. It reuses the pieces the contact sheet already rasterized.
4. **Preview**: `collage film <scene> --mp4`. Half size (540x960), with all the motion.
5. **Final**: `collage film <scene> --mp4 --final`. Full size (1080x1920). Only when the preview is right.

Why this order: composition mistakes (a piece in the wrong place, a red object on a red background, a caption over a foot, a cut-off close-up) are visible in a single still. They cost seconds to find there and a full render to find later. Settle the composition and the cast in stills, the sequence on the sheet, the rhythm in the animatic, the motion in the preview, and spend the full-size render once.

## 2. Still frames

A still file is JSON, usually kept in `stills/`:

```json
{
  "name": "demo-still",
  "frames": [
    {
      "width": 1080, "height": 1920,
      "background": { "color": "navy", "seed": 3 },
      "layers": [
        { "type": "band", "y": 1480, "height": 500, "color": "coffee" },
        { "type": "art", "name": "window", "x": 80, "y": 330, "scale": 1.05 },
        { "type": "character", "name": "dev", "face": "suspicious", "pose": "point", "x": 110, "y": 700, "scale": 1.75 },
        { "type": "text", "text": "FRIDAY", "x": 540, "y": 230, "size": 104, "ransom": "", "anchor": "middle" },
        { "type": "text", "text": "DID SOMEONE SAY DEPLOY?", "x": 540, "y": 1740, "size": 62, "strip": "black", "anchor": "middle", "tilt": -1.5 }
      ]
    }
  ]
}
```

The complete working example (two frames, every layer type) is `examples/demo.json` in the skill folder. `collage init` copies it to `stills/demo.json`.

- `name`: the output is `out/<name>.png`.
- `frames`: a list. All frames of the file are rendered side by side in one PNG, each at half size, so you can compare shots.
- Each frame has `width`, `height` (pixels; 1080 by 1920 is the tested size), `background` (`color` is a paper name from `kit/palette.json`, `seed` changes the layout of the patchwork pieces) and `layers`.
- `layers` are drawn in order: the last one is in front.
- The layer types and fields are the ones in section 4. In a still, `id`, `at`, `until`, `enter`, `jitter` and `fixed` have no effect (nothing moves), and `pose` and `face` are applied as given.
- One layer type exists only in stills: **`tear`**. It draws a sheet of paper with a torn edge on the left side of the frame, so you can see what a tear transition looks like. Fields: `at` (the x where the torn edge sits), `color` (paper name) and `mosaic` (`true` fills the sheet with a patchwork of that colour, like a real shot; without it the sheet is one plain piece of paper).

  ```json
  { "type": "tear", "at": 70, "color": "red", "mosaic": true }
  ```

  In a scene, a tear is not a layer. It is the `transition` of a shot (section 3).

Run it:

```bash
collage frame stills/demo.json     # writes out/demo-still.png
```

The command prints `warning (frame N): ...` for a pose part that the art does not have, or for a letter whose width is not known to the bundled font. Fix warnings before going on.

## 3. Scenes

A scene is the file `scenes/<name>/scene.mjs`. It exports one object: a list of **shots**, each with a background, layers and actions over time.

```js
export default {
  width: 1080, height: 1920, fps: 12, jitter: 1,
  shots: [
    {
      duration: 3.5,                              // seconds
      transition: "tear",                         // how this shot arrives: "cut" (default) or "tear"
      transitionDuration: 0.5,                    // seconds, for "tear" (default 0.5)
      background: { color: "navy", seed: 3 },     // patchwork; the seed changes the pieces
      camera: { zoom: 1, x: 540, y: 960 },        // starting framing (optional)
      layers: [ /* ... */ ],                      // glue order: the last one is in front
      actions: [ /* ... */ ],                     // what changes, and when
    },
  ],
};
```

- **Root**: `width`, `height` (pixels), `fps` (default 12, the number of drawings per second, see section 6), `jitter` (default 1, the global amount of hand-placement wobble, see section 6) and `shots`.
- **Times** are seconds, or a word of the narration (`"word:deploy"`): see `references/voice.md`.
- **Shot**: `duration` in seconds (or `until`, a word or a time at which it ends), `background`, `layers`, `actions`, and optionally `transition`, `transitionDuration` and `camera`.
- **Times** (`at`, `until`, `duration` of an action) are seconds **inside the shot**, not in the whole scene. Positions are pixels of a frame that is `width` wide (1080 in the examples).
- **Transition**: `"cut"` is a hard cut. `"tear"` brings the new shot in as a sheet of paper that enters from the left with a torn edge, over the previous shot. The first shot has no previous shot, so its transition is always a cut.
- **Background**: a patchwork of paper pieces in `color`. `color` is a paper name (`navy`, `red`, `sand`, ...) or a hex value. `collage backgrounds` renders a sheet of the background colours.
- **Camera**: `zoom` (1 is the whole frame), and `x`, `y`, the point of the frame that sits in the centre of the view, or `on` to point at a layer. Defaults: zoom 1, centred. The camera never shows anything outside the background. Camera actions move it during the shot: see "The camera" in section 5.

Run it:

```bash
collage film demo --sheet --every 0.25   # open out/demo-sheet.jpg
collage film demo --stills 2,5.5         # full-size frames at 2 s and 5.5 s: out/demo-t2.00.jpg, out/demo-t5.50.jpg
collage film demo --animatic             # out/demo-animatic.mp4 (270x480, one held drawing per event)
collage film demo --mp4                  # out/demo-preview.mp4 (540x960)
collage film demo --mp4 --final          # out/demo-final.mp4 (1080x1920)
```

`<scene>` is a name under `./scenes`, or the path to a scene file. Options:

| Option | What it does |
|---|---|
| `--every <s>` | Seconds between frames on the sheet (default 0.5). |
| `--stills 1.2,4` | Full-size JPEG stills at those times. |
| `--from <s> --to <s>` | Render only a stretch (sheet and video). |
| `--jitter <n>` | Replaces the scene's `jitter`. `0` turns the wobble off. |
| `--suffix <text>` | Adds `-<text>` to the output names, to compare versions. |
| `--final` | With `--mp4`, full size instead of half size. |
| `--scale <n>` | With `--mp4`, the preview size as a fraction of the scene (default `0.5`). A smaller preview is not noticeably faster: use the animatic for speed. |
| `--cues` | Writes `out/<scene>-cues.json`: when each event happens. See `references/sound.md`. |
| `--silent` | Leaves the sound out of a video. |
| `--guides` | Draws the safe zones and the caption slots over the sheet, the stills or the video. See `references/safe-zones.md`. |

The video is H.264, 24 frames a second. It comes with the built-in sound effects, plus your narration and music if the scene names them: see `references/sound.md`. It needs `ffmpeg` (`collage doctor` checks). The working example is `examples/demo/scene.mjs`: 10.25 seconds, three shots, a pose and face change, a hop, a shake, a spinning clock hand, two tears and two camera cuts.

## 4. Layers

Layers are listed back to front. Four types:

| Type | Fields | Notes |
|---|---|---|
| `band` | `y`, `height`, `color`, `shadow` (optional) | A floor or wall strip, edge to edge. It is always part of the background, so it takes none of the common fields. |
| `art` | `name` (library or project art), `x`, `y`, `scale` (default 1), `rotate` (degrees), `flip` (true mirrors it), `seed` | `x`, `y` is where the top-left corner of the art's own canvas lands. |
| `character` | `name` (a cast member), `face`, `pose`, `overrides`, `x`, `y`, `scale`, `rotate`, `flip`, `seed` | `overrides` replaces fields of the character's sheet for this layer only, for example `{ "skin": "skin-dark" }`. It replaces whole top-level fields, so to change an outfit give all of `{ type, color, detail }`. `face` defaults to `neutral`. |
| `text` | `text`, `place` (a slot: `title`, `caption`, `caption-2`, `center`) or `x`, `y`, `size`, `anchor`, `color`, `strip` or `ransom`, `tilt`, `shadow`, `arrive` | See below. |

In a scene, `rotate` and `scale` turn the piece around a point near the middle of its feet (50% across, 80% down). In a still, they turn it around its `x`, `y` corner. If a rotated piece lands differently in the still and in the scene, that is why.

**Fields every layer accepts, except `band`:**

| Field | Meaning |
|---|---|
| `id` | A name, so that actions can find the layer. A layer without `id` cannot receive actions. |
| `at`, `until` | When the layer appears and when it goes away, in seconds inside the shot. Default: visible for the whole shot. |
| `enter` | How it appears (below). Default `none`. Art and characters only. |
| `jitter` | Multiplies the wobble for this layer only. `3` shakes more (the demo's fire uses it), `0` holds the layer still. Art and characters only. |
| `fixed` | `true` pins the layer to the screen, outside the camera. See the end of this section. |

**Entrances (`enter`)**: each is a few frames of movement, then the piece settles. All of them are hard steps, never a smooth slide.

| Name | What happens |
|---|---|
| `none` | The piece is simply there. |
| `pop` | Starts small, grows past its size, settles (3 frames). |
| `drop` | Falls from above and bounces once (4 frames). |
| `rise` | Comes up from below (3 frames). |
| `slide-left` | Comes in from the left edge (4 frames). |
| `slide-right` | Comes in from the right edge (4 frames). |

**Text** is upper-cased and set in the bundled font (Anton).

- `place`: `title`, `caption`, `caption-2` or `center` puts the text where no app covers it, and is the normal way to position a caption. See `references/safe-zones.md`.
- `x`, `y`: used when there is no `place` (or to override it). `y` is the **baseline** of the letters. `size` is the height of a capital letter in pixels.
- `anchor`: `start` (default, `x` is the left end), `middle` or `end`.
- `strip`: a paper name. The text goes on a strip of that paper, like a label. The letter colour is cream on dark strips (`black`, `navy`, `red`, `brick`, `coffee`, `purple`, `moss`, `graphite`) and black on the others; `color` overrides it.
- `ransom`: each letter is cut out on its own small square, like a ransom note. `"ransom": ""` uses the default ransom papers; `"ransom": "white,cream,yellow"` picks the papers (names separated by commas or spaces). If both `strip` and `ransom` are missing, the letters have no paper at all.
- `tilt`: degrees to turn the whole text. If you leave it out, each text gets a small tilt of its own, up to 1.2 degrees either way (the same every run).
- `arrive`: how the letters come in (scenes only). `fly` (default): the strip snaps in, then the letters fly to it one by one. `drop`: each letter falls from above, good for ransom-letter titles. `none`: all at once. A text of up to 12 letters brings one letter per frame; a longer one brings several per frame, so it never takes much more than a second.
- `shadow`: how much paper shadow (default: 2 for the strip, 1 for ransom letters).
- **Text is fixed to the screen by default.** A caption does not follow the camera, so a close-up does not push it out of the frame. Fixed layers are also drawn on top of everything that is not fixed, whatever their position in the list. `fixed: false` puts a text inside the scene, so the camera moves it with the art (the "DEPLOY?" balloon text in the demo does this). `fixed: true` on art or a character pins it to the screen in the same way.
- Text has no `enter` and no `jitter`. It only has `arrive` and `at`/`until`.

## 5. Actions

Every action has `at` (seconds inside the shot) and `target` (the `id` of a layer, or `"camera"`). The actions of a layer apply in order of time. The examples below are from a scene that ran (`clock`, `dev`, `server`, `bubble` are layer ids; `dev` has `enter: "slide-left"` and so on).

| Action | Example | What it does |
|---|---|---|
| Change pose | `{ at: 0.8, target: "dev", pose: "wave" }` | Hard swap: the first frame goes a little past the pose, the next one settles. `pose` is a name (`idle`, `wave`, `point`, `point-left`, `cheer`, `shrug`, `slump`, `think`, `scold`) or an object of part angles in degrees, such as `{ "arm-right": -120 }`. A new pose replaces the previous one as a whole. |
| Change face | `{ at: 0.8, target: "dev", face: "happy" }` | Swaps the head. It can sit in the same action as `pose`. Any of the 22 faces listed in `references/characters.md` (`neutral`, `happy`, `shocked`, `tired`, ...). |
| Hop | `{ at: 1.4, target: "dev", hop: 1 }` | A small jump of three frames. `2` jumps twice. |
| Shake | `{ at: 1.4, target: "server", shake: 0.5 }` | Shakes side to side for that many seconds. |
| Spin a part | `{ at: 0, target: "clock", part: "minute-hand", spin: 240, duration: 2.5 }` | Turns one part of the art around its pivot by `spin` degrees, in steps, over `duration` seconds, and leaves it where it stopped. Without `duration`, it turns at once. The part must exist in the art (`collage library` lists the parts). |
| Move | `{ at: 1.7, target: "dev", move: { x: 260, y: 700 }, duration: 0.5 }` | Goes to that `x`, `y` in steps, and stays there. Without `duration`, it jumps at once. |
| Hide, show | `{ at: 2.0, target: "bubble", hide: true }` and `{ at: 2.4, target: "bubble", show: true }` | Takes a layer away and brings it back. Text layers only honour `hide`. |
| Camera | `{ at: 1.9, target: "camera", zoom: 1.5, on: "dev.head", duration: 0.25, ease: "punch" }` | Moves the camera. See "The camera" below. |

Pieces are rasterized at the highest zoom their shot uses, so a close-up does not blur.

### The camera

Zooms are what keep a scene of held poses alive. A camera action says where the camera goes and how:

| Field | Meaning |
|---|---|
| `zoom` | How close: `1` is the whole frame, `1.5` a close-up. Left out, the zoom stays as it is. |
| `on` | What to centre: a layer `id` (`"dev"`), or one of its parts (`"dev.head"`). The layer needs an `id`. |
| `x`, `y` | The point to centre, instead of `on`. Left out with no `on`, the camera keeps looking where it was. |
| `duration` | Seconds the move takes. Left out or `0`, it is a cut. |
| `ease` | How the move travels: `out` (default: fast, then settles), `linear`, `in-out`, `punch` (goes a little past the target and comes back). |
| `shake` | Seconds of camera shake, for an impact. It can stand alone: `{ at: 0.9, target: "camera", shake: 0.4 }`. |

Three moves cover most needs:

```js
{ at: 0, target: "camera", zoom: 1.12, on: "dev", duration: 3.5, ease: "linear" }           // slow push, over a whole shot
{ at: 1.6, target: "camera", zoom: 1.5, on: "dev.head", duration: 0.25, ease: "punch" }    // punch-in on a reaction
{ at: 2.4, target: "camera", zoom: 1 }                                                     // cut back to the whole frame
```

Use them like this:

- **A slow push on every shot that holds.** `1.08` to `1.15` over the whole shot. A shot with no movement at all reads as a frozen picture.
- **A punch-in on the reaction**, at the same instant as the face or pose change: `1.4` to `1.6`, in 0.2 to 0.3 seconds, `on` the head.
- **A cut back** (no `duration`) on the next line, or let the shot end close.
- **A shake** when something lands, breaks or catches fire, with the piece's own `shake`.
- Do not let two moves overlap in time: the second starts from where the first would be at that instant.

`on` uses where the layer starts, so a layer that later `move`s is not followed. Pieces are drawn at the highest zoom the shot reaches, so a close-up stays sharp; zooms above 2 make the first render slower.

A complete short scene that uses every action, a `tear` transition, a punch-in, a slow push and a camera shake is in the next block. It ran as written (two shots, 5.25 seconds):

```js
export default {
  width: 1080, height: 1920, fps: 12, jitter: 1,
  shots: [
    {
      duration: 2.8,
      background: { color: "sand", seed: 1 },
      layers: [
        { type: "band", y: 1500, height: 480, color: "brown" },
        { id: "clock", type: "art", name: "clock", x: 700, y: 330, scale: 0.8 },
        { id: "dev", type: "character", name: "dev", face: "neutral", x: 120, y: 700, scale: 1.6, enter: "slide-left" },
        { id: "server", type: "art", name: "server", x: 700, y: 950, scale: 1.3, at: 0.3, enter: "rise" },
        { id: "bubble", type: "art", name: "speech-bubble", x: 380, y: 380, scale: 1.2, at: 0.6, enter: "pop" },
        { type: "text", text: "TWO SHOTS", place: "title", size: 100, ransom: "", arrive: "drop" },
        { type: "text", text: "EVERY ACTION ONCE", place: "caption", size: 54, strip: "black", tilt: -1.5, at: 0.8 },
      ],
      actions: [
        { at: 0, target: "clock", part: "minute-hand", spin: 240, duration: 2.5 },
        { at: 0.8, target: "dev", pose: "wave", face: "happy" },
        { at: 1.4, target: "dev", hop: 1 },
        { at: 1.4, target: "server", shake: 0.5 },
        { at: 1.7, target: "dev", move: { x: 260, y: 700 }, duration: 0.5 },
        { at: 2.0, target: "bubble", hide: true },
        { at: 2.4, target: "bubble", show: true },
        { at: 1.9, target: "camera", zoom: 1.5, on: "dev.head", duration: 0.25, ease: "punch" },
      ],
    },
    {
      duration: 2.4, transition: "tear",
      background: { color: "teal", seed: 4 },
      layers: [
        { type: "band", y: 1500, height: 480, color: "graphite" },
        { id: "boss", type: "character", name: "boss", face: "angry", pose: "scold", x: 300, y: 760, scale: 1.5 },
        { type: "text", text: "TORN IN", place: "caption", size: 70, strip: "cream", at: 0.5 },
      ],
      actions: [
        { at: 0, target: "camera", zoom: 1.12, on: "boss", duration: 1.4, ease: "linear" },
        { at: 1.5, target: "camera", shake: 0.3 },
        { at: 2.0, target: "camera", zoom: 1 },
      ],
    },
  ],
};
```

## 6. How things move

- **12 drawings a second, doubled to 24 in the file.** Each drawing is held for two frames of the video. This is what gives the hand-animated cutout look. Times in a scene are rounded to the nearest drawing (a 2.8 s shot is 34 drawings, so the next shot starts at 2.83 s).
- **Held poses and dry changes.** Nothing glides slowly. A pose or a face changes in one step. A piece that has to travel goes in three or four steps (an entrance, a `move` with a `duration`). If you want it to feel slow, give it more time between steps, not smoother steps.
- **Jitter.** Every three drawings, each piece of art and each character part gets a tiny random change of position (about 1 pixel) and angle (fractions of a degree), as if the paper were put back by hand. The same scene always wobbles the same way. `jitter: 0` in the scene, or `--jitter 0` on the command, turns it off; a layer's own `jitter` multiplies it. It is on by default. Text does not wobble.
- **The tear.** With `transition: "tear"`, the new shot's sheet comes in from the left with a torn, uneven edge and a thin pale paper rim along it, over `transitionDuration` seconds (default 0.5), with the old shot still visible on the right. Those seconds are the first seconds of the new shot, not extra time: the video lasts the sum of the shot durations (each rounded to a whole drawing), and `at: 0` in the new shot is the instant the tear starts, so keep the first action of that shot after the tear ends. The edge keeps one shape the whole time; it only moves. The sheet moves slowly at the start and the end and faster in the middle.
- **Identical frames are not photographed again.** The tool compares each drawing with the previous one and, if nothing changed, reuses the last image. In the demo that saved 13 % of the frames with jitter on and 20 % with jitter off, because the clock hand and the arriving letters change nearly every drawing. The saving is big in a still shot with `jitter: 0`; do not count on it in a busy one.

## 7. Cost

How it works: before filming, every piece (the background of each shot, each part of each character, each art, each letter and strip) is rasterized once to a transparent PNG, and the PNGs are cached in `.collage-cache/<scene>/`. During filming there are no paper filters and no live SVG, only images being moved around a page and photographed as JPEG. The paper grain does not compress well, so a PNG capture of a frame is much slower than a JPEG one; that is why frames are captured as JPEG, and why PNG is used only for the pieces and for `frame`.

What makes a render slow or fast:

- **The first run of a scene is the slow one** (rasterizing the pieces). Later runs find every piece in the cache and skip that part.
- **Pieces are cached per output size.** The sheet (quarter size), the preview (half size) and the final (full size) each rasterize their own pieces the first time. Going from the preview to the final re-rasterizes once.
- **A piece is re-rasterized only if it changed**: its art, colour, size (`scale`, zoom) or text. Changing only times, positions, poses or actions does not touch the cache. The cache is safe to delete at any time; the next run rebuilds it.
- **Size of the output dominates the per-frame time.** Full size costs about 2.5 times the time of half size per frame.
- **Number of drawings**: about 12 a second of video. Frames that repeat the previous one are free.

Measured by running the demo scene from this skill (`examples/demo/scene.mjs`: 10.25 s, three shots, 105 pieces, 123 drawings, 246 video frames) on one machine (an Apple-silicon Mac, Node 24, headless Chromium), one run each, no averaging. These are one machine and one 10-second scene. Use them for orders of magnitude, not as a promise:

| Run | Pieces | Per frame | Total |
|---|---|---|---|
| Preview, first run (nothing cached) | 5.3 s | | 9.0 s |
| Preview, cached | 0.1 s | about 21 ms | 2.4 s |
| Final, first run (full-size pieces) | 7.5 s | | 13.3 s |
| Final, cached | 0.2 s | about 53 ms | 5.9 s |
| Contact sheet, 21 frames, first run | 4.7 s | | 5.2 s |
| Contact sheet, 21 frames, cached | | | 0.9 s |
| Animatic, first run | | | 6.1 s |
| Animatic, cached (or right after the sheet) | | | 1.4 s |
| Preview at 480 wide (`--scale 0.4444`), cached | | | 3.7 s |

(The "Pieces" column is the time to rasterize or load the pieces; "Per frame" is the filming time divided by the 107 drawings that were photographed. The preview file is 540x960, 1.7 MB per 5 s example and 2.6 MB for the demo; the final is 8.9 MB. The cache of the demo with the three sizes is 27 MB.)

The animatic photographs 25 drawings where the preview photographs 107, and shares the quarter-size pieces with the contact sheet, which is why it is the fast one. Shrinking the preview from 540 to 480 wide changed nothing measurable.

So a preview of this scene is a couple of seconds once the pieces exist, and a full-size render about six. Longer scenes scale roughly with the number of drawings, but this was not measured.

## 8. Check before showing anyone

1. Compose and cast in stills first (`collage frame`), then the contact sheet, then the preview.
2. Open the sheet (`--sheet --every 0.25` is a good density) and check:
   - nothing important is cut off in a close-up;
   - the whole caption is inside the screen;
   - no red piece sits on a red background (and the same for other near colours);
   - no foot or object shows behind the caption strip when the camera closes in (captions are fixed and drawn on top of the art, so a close-up can put a foot under them);
   - a text that arrives late does not leave an empty strip for too long.
3. Run without warnings. `collage check <scene>` prints them without drawing anything, so run it after every edit. Before drawing, the tool also checks the still or the scene and prints a `warning:` for every name it does not know, with the list of the ones that exist: a field (a typo such as `scal`), a layer type, a paper, a face, a pose, an entrance, an arrival, a transition, an action whose `target` is not the `id` of any layer in that shot, a `part` the art does not have, a layer or action timed after its shot ends, and a letter whose width is unknown. It still draws, using the default for whatever it did not understand, so a warning always means the picture is not what you asked for.
4. A scene that does not exist or has no `shots` array stops with a message that says what is missing.
5. Watch the preview once, at the real speed, before spending the final render.

## 9. What the engine does not do yet

- **A talking mouth.** Times can be tied to the words of a narration (`references/voice.md`), but faces only change on actions.
- **Voices and music.** The tool has built-in sound effects and mixes the narration and music you give it (`references/sound.md`); it does not generate a voice or compose music.
- **A camera that follows.** The camera zooms, pans and shakes, but it does not track a layer that moves, and it does not rotate.
- **Layouts for other formats.** Square and wide frames render, and their caption slots use a plain margin, but the measured safe zones, the examples and the sizes in this guide are for 1080x1920.

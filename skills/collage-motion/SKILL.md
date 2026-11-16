---
name: collage-motion
description: Makes paper-cutout (collage) art, characters, still frames and short videos from plain SVG and JSON files, rendered locally with a headless browser and ffmpeg. Everything looks cut from paper and glued down - mosaic backgrounds of paper scraps, pieces with grain, a white torn rim and a short shadow, ransom-note letters, captions on paper strips, the sheet tearing between shots, movement at 12 drawings a second. Use when asked for a collage, paper cutout, papercraft, cut-paper or stop-motion-paper look, for an explainer or short vertical video in that style, for a character, prop, background or caption in that style, or when working in a project that has collage scenes (scenes/*/scene.mjs) or art (art/*.svg).
license: MIT
---

# collage-motion

Everything on screen is paper. You write simple shapes and a list of what happens when; the tool cuts the paper, casts the shadows and films it.

This skill folder (the one this file is in) holds the scripts, the kit and a library of art. You do not edit it while making a video. Your work goes in the **project folder**: the directory you run the command from.

## The command

```
node <this skill folder>/scripts/collage.mjs <command>
```

Below it is written `collage <command>`. Always run it from the project folder. Everything it writes goes to `./out`.

## First time on a machine

1. `npm install --prefix <this skill folder>` (one dependency, `playwright-core`). It writes `node_modules` inside the skill folder, so it needs write access there once; skip it when `node_modules` is already there.
2. `collage doctor`. It checks Node, the browser and ffmpeg and prints the fix for anything missing. Do what it says before going on; do not work around a missing browser. A browser cannot start inside the sandbox some coding agents run commands in: when `doctor` says the browser "was not allowed to start", every `collage` command that draws has to run outside that sandbox (ask for the permission once, at the start).
3. `collage init` in the project folder. It creates `art/`, `scenes/demo/scene.mjs`, `stills/demo.json` and `characters.json`.

## What to read

Read only the file that answers the question in front of you.

| You are about to | Read |
|---|---|
| Use existing art, or find out what exists | `references/library.md` (or run `collage library`) |
| Draw a new object, prop or symbol | `references/art.md`, all of it |
| Put people in a scene: a new character, a face, a pose | `references/characters.md` |
| Compose a still, write a scene, film it | `references/scenes.md` |
| Plan a piece: shots, rhythm, what moves when | `references/direction.md` |
| Add sound effects, narration or music | `references/sound.md` |
| Time a scene to a voice, word by word | `references/voice.md` |
| Place a title or a caption, or check what the apps cover | `references/safe-zones.md` |

## The order of work

Each step is cheaper than the next, so settle each one before moving on.

1. **Still first.** Describe the composition in `stills/<name>.json` and run `collage frame stills/<name>.json`. Open `out/<name>.png` and look at it. Fix the composition here.
2. **Contact sheet.** Write `scenes/<name>/scene.mjs` and run `collage film <name> --sheet --every 0.25`. Open `out/<name>-sheet.jpg` and look at it. Fix the sequence and the framing here.
3. **Animatic.** `collage film <name> --animatic` gives the storyboard in motion: a small video with one held drawing per event, in about a second. Fix the rhythm here, and the timing against narration and sound.
4. **Preview.** `collage film <name> --mp4` gives a half-size video with all the motion.
5. **Final.** `collage film <name> --mp4 --final`, only when the preview is right.

`collage check <name>` (or `collage check stills/<name>.json`) lists the warnings of a scene or a still in a fraction of a second, without drawing and without a browser. Run it after every edit, before the step that draws; it is also the only check available inside a sandbox where the browser cannot start. It does not replace looking at the picture.

Show the person the still before animating, the animatic before polishing motion, and the preview before the final.

## Rules

- **Everything is paper.** Every piece goes through this tool. No generated images, no icon packs, no drawn outlines, no gradients, no opacity.
- **People come from the cast.** Never draw a person as art. A new character is a sheet in `characters.json`; a new expression or pose is a field in the scene.
- **Captions go in a slot.** Give a text `place: "title"` or `place: "caption"` instead of coordinates: the slot puts it as low (or as high) as it can go without ending under the buttons and descriptions the apps draw over a vertical video. `--guides` shows the zones. For a paid post add `margins: "ads"`.
- **Move the camera.** A shot of held poses needs a zoom: a slow push while it holds, a punch-in on the reaction. `references/scenes.md`, "The camera".
- **Look before you claim.** Open the image you rendered. Do not describe a picture you have not opened.
- **Use the names that exist.** Art names, palette names, faces, poses, entrances and actions are fixed lists. The tool prints a `warning:` for a name it does not know and draws a default instead, so a warning means the picture is not what was asked for.
- **The shipped cast and the demo text are samples.** Characters, story and wording for a real video come from the person you are working for.
- **Do not copy** another creator's characters, scripts or scenes. The paper technique is common ground; their work is not.
- Run with no `warning:` lines before showing anything.

## What it does not do

Videos come with built-in paper sound effects, one per event, and mix in a narration and a music file if the person provides them. It does not generate voices or music. Nothing in this skill calls a paid service; a voice or a track made elsewhere is the person's own cost and license. Times can be tied to the words of a narration, but there is no talking mouth. The camera zooms, pans and shakes, but does not follow a moving layer. Characters are seen from the front only; they bend their arms and can sit, but do not walk. Vertical 1080×1920 is the tested format; square and horizontal render, with plain margins instead of the app safe zones. Say so when a request needs one of these, instead of improvising it.

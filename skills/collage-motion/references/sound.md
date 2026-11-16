# Sound

The engine knows the exact instant of everything that happens in a scene: a piece popping in, a pose changing, each letter landing, the sheet tearing. It turns those instants into **cues**, plays one of your sound files on each, and puts the result under the video together with your narration and your music.

The effects come with the skill: twelve paper sounds (a tear, rustles, a slap of paper on the table, the tap of a letter), so a video has sound the first time you render it. They are synthesized, which keeps them free to use and to redistribute, and they are a starting point: any of them can be replaced by a recording of your own.

There is no voice generator and no music in this skill, and nothing here calls a paid service. A voice or a track you make elsewhere is your own cost and your own license.

In every command below, `collage` stands for `node <skill folder>/scripts/collage.mjs`, run from your project folder.

## It already has sound

```bash
collage film demo --animatic    # out/demo-animatic.mp4, with the built-in effects
collage film demo --mp4         # the preview has them too
```

Nothing to set up. `--silent` renders without sound.

## The kinds of cue

| Kind | When it plays | Built-in sound |
|---|---|---|
| `tear` | a shot starts with the sheet tearing | a paper tear |
| `cut` | a shot starts with a plain cut | none: silent unless you add `cut.*` |
| `pop` | a piece pops in | a small slap of paper |
| `drop` | a dropping piece lands | a cardboard thud |
| `rise` | a piece comes up | a rising rustle |
| `slide` | a piece slides in | a long rustle |
| `appear` | a piece simply appears partway through a shot | plays `strip` |
| `strip` | a caption strip snaps in | a flat slap |
| `letter` | one or more letters land (once per drawing, not once per letter) | a tap |
| `pose` | a character changes pose | a short rustle |
| `face` | a character changes face and nothing else | none: silent unless you add `face.*` |
| `hop` | each hop | a soft thump |
| `shake` | a shake starts | a rattle of paper |
| `spin` | a part starts to spin | none: silent unless you add `spin.*` |
| `move` | a piece starts to move | plays `slide` |
| `hide` | a piece goes away | a rustle that cuts off |
| `show` | a piece comes back | plays `pop` |
| `camera` | the camera cuts to another framing | a page flick |

## Your own sounds

Put a file named after the kind in `./sounds` (`pop.wav`, `tear.mp3`) and it replaces the built-in one. Accepted formats: wav, mp3, ogg, m4a, flac, aac. What you do not replace keeps the built-in sound.

```bash
collage sounds --copy    # copies the twelve built-in files into ./sounds, to listen to and replace one by one
```

`--copy` never overwrites a file that is already there. For a real paper sound, record it: tear a sheet, slap one on a table, crumple one, each as a short separate file. Set `builtin: false` in the scene's `sound` to use only your own files and keep everything else silent.

`letter`, `pop` and `pose` repeat often, so each one plays at a slightly different speed, up to 6 % either way. Short sounds work best for them: a `letter` longer than a tenth of a second turns a caption into a blur.

See what your pack covers, in general or for one scene:

```bash
collage sounds          # every kind and the file it would play
collage sounds demo     # only the kinds the scene uses, with how many times each
```

## Sound in the scene file

All of it is optional. With no `sound` at all, the built-in effects already play.

```js
export default {
  width: 1080, height: 1920, fps: 12,
  sound: {
    narration: "audio/voice.mp3",   // starts with the scene
    music: "audio/bed.mp3",         // loops if it is shorter than the scene, fades out at the end
    musicVolume: 0.25,              // how loud the music is next to the voice; default 0.2 under a voice, 0.7 with no voice
    narrationVolume: 1,             // default 1
    effects: 0.8,                   // all effects together, default 1
    mute: ["letter"],               // kinds that stay silent in this scene
    gain: { pop: 0.5 },             // one kind louder or quieter than its normal level
    pack: "sounds",                 // another folder for your own files, if not ./sounds
    builtin: true,                  // false: only your own files play
  },
  shots: [ /* ... */ ],
};
```

Paths are relative to the project folder. When there is narration and music, the music drops in volume while the voice is speaking and comes back in the pauses.

One layer or one action can choose its own sound, or none:

```js
{ type: "art", name: "fire", x: 720, y: 690, at: 0.9, enter: "pop", sound: "whoosh" }   // plays sounds/whoosh.* instead of pop
{ type: "art", name: "desk", x: 90, y: 960, at: 0.5, enter: "pop", sound: "drop" }      // any built-in name works too
{ at: 1.5, target: "dev", pose: "scold", sound: false }                                 // this pose change is silent
{ duration: 3, transition: "tear", sound: false, background: { color: "navy" }, layers: [] }   // a silent tear
```

## Levels are set for you

You do not balance volumes by hand. Whatever level a file was recorded at:

- **Each effect is brought to the level of its kind.** A tear or a thud sits just under the voice; a rustle is quieter; a letter tap is quiet enough to repeat twelve times a second. A recording that is far too loud or too quiet comes out at the same level as the built-in one it replaces.
- **Sounds that land on the same drawing give way to each other**, so four pieces popping at once are not four times as loud.
- **The voice is brought to a standard loudness** (-14 LUFS, what the vertical-video apps play at), and the music is set relative to it.
- **While the voice speaks, the music drops a lot and the effects drop a little.**
- **Nothing clips**: the mix is limited 1 dB under the ceiling.

Every video ends with a line that reports what it measured, for example `sound: 54 effects, narration, music at -14.2 LUFS, peak -4.1 dB`. With a narration, expect a number near -14. With effects only it is lower (around -20), because effects are short and the silence between them counts.

`effects`, `musicVolume`, `narrationVolume` and `gain` are for taste, on top of that: `gain: { letter: 0.5 }` halves the taps, `effects: 0.7` pulls every effect down together.

## Narration first

Record or generate the voice **before** timing the scene, then write the times as words of the narration (`at: "word:deploy"`) instead of seconds: `references/voice.md` has the whole route, including how to get the time of each word. Then check with the animatic: it renders in about a second with the voice under it, which makes it the right place to move things by a few tenths until they land on the word.

Any voice works, since the tool only needs the audio file: your own recording, or a text-to-speech service such as ElevenLabs. Those services are paid and have their own rules about what you may publish.

## Checking

- `collage sounds <scene>` before rendering: it shows which cues have a file, and warns about a narration or music file it cannot find.
- A video's last line says what it has: `sound: 53 effects, narration, music`, or why it is silent.
- `collage film <scene> --mp4 --silent` renders without sound.
- If a word is still hard to hear, lower `effects` or mute the busiest kind, usually `letter`.
- `collage sounds <scene>` shows the loudness it measured in your narration and music, and the correction it will apply.

## The cues file, for other tools

```bash
collage film demo --cues    # out/demo-cues.json
```

```json
{ "fps": 12, "duration": 10.25, "cues": [
  { "t": 3.5, "frame": 42, "kind": "tear", "shot": 2 },
  { "t": 4.167, "frame": 50, "kind": "slide", "shot": 2, "target": "boss" }
] }
```

`t` is seconds from the start of the scene, `target` is the layer's `id` (or its art name), and `sound` appears when the layer or action asked for a specific file. Use it to place effects in an editor, or to hand the timing to another program.

## What it does not do

- It does not generate a voice or music, and it does not download any sound.
- The built-in effects are synthesized. They follow the timing well; a real recording will sound more like paper.
- It has no mouth movement for speech.
- One narration file and one music file per scene; a second voice track has to be mixed into the first beforehand.

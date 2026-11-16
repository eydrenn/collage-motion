# Characters

People are not drawn by hand in collage-motion. A character is a **sheet**: a few lines of JSON that say which body, head, skin, hair, outfit and face it has. `scripts/lib/character.mjs` builds the paper cutout from the sheet, in the same SVG format as any other art, with seven parts that can move (legs, torso, two arms, two forearms, head). A new character is one entry in a JSON file. The expression and the pose are fields of the still or the scene, not of the character.

In this document `collage` stands for `node <skill folder>/scripts/collage.mjs`, run from your project folder.

## Where characters live

- `kit/characters.json` in the skill folder holds the cast that ships with the skill. It is **a generic sample to start from**: eight stock people (`dev`, `ana`, `boss`, `intern`, `client`, `support`, `veteran`, `designer`) that exist to show what the sheet can do. They have no story or identity. Use them as they are for a quick job or a test; for a series, build your own cast.
- `./characters.json` in your project folder holds your characters. It is created by `collage init` as `{}`. It is merged over the shipped cast: a new name is added, and **a character with the same name as a shipped one replaces it** (the whole sheet, not field by field).

Do not edit the skill folder to add a character.

## The commands

```bash
collage cast               # out/cast-sheet.png: the whole cast, then the faces and the poses of the first character
collage cast maya          # out/cast-maya-sheet.png: the faces and the poses of one character
collage cast maya --src    # prints the SVG source the sheet produces (needs a name)
```

Use `collage cast <name>` right after writing a sheet: it shows every face and every pose on that character, so you see the hair, outfit and glasses at once. A name that is not in the cast stops with an error that lists the names there are.

`--src` is useful to see the part ids and the pivots, or to copy the result into `art/<name>.svg` if you ever want to draw over a generated character by hand (after that it is plain art, no longer a sheet).

## The sheet

Add this to `./characters.json`:

```json
{
  "maya": {
    "body": "tall", "head": "round", "skin": "skin-dark",
    "hair": { "style": "bun", "color": "black" },
    "glasses": true,
    "outfit": { "type": "shirt", "color": "teal", "detail": "yellow" },
    "pants": "navy", "shoes": "white"
  }
}
```

Every field is optional. A missing value falls back to the default in the last column. An unknown value also falls back, and the command prints a `warning:` naming the value and listing the ones that exist. Colours are paper names from `kit/palette.json` (`white`, `cream`, `sand`, `kraft`, `brown`, `coffee`, `black`, `graphite`, `gray`, `silver`, `red`, `brick`, `orange`, `yellow`, `ochre`, `green`, `moss`, `sky`, `blue`, `teal`, `navy`, `purple`, `lilac`, `pink`, `skin-light`, `skin-medium`, `skin-dark`) or a hex string such as `"#8A4B2F"`.

| Field | Values | Default |
|---|---|---|
| `body` | `medium`, `short`, `tall`, `wide` (they change shoulders, torso length and leg length; `short` has the biggest head, `tall` the smallest) | `medium` |
| `head` | `hex`, `square`, `long`, `round` | `hex` |
| `skin` | `skin-light`, `skin-medium`, `skin-dark`, or any paper or hex | `skin-light` |
| `hair.style` | `short`, `quiff`, `long`, `bun`, `curly`, `buzz`, `cap`, `bald` | `short` (when `hair` is missing) |
| `hair.color` | paper of the hair | `coffee` |
| `hair.cap` | paper of the cap, only with `style: "cap"` | `green` |
| `beard`, `mustache` | `true` (uses the hair colour) or a paper | none |
| `glasses` | `true` | none |
| `headphones` | `true` (graphite) or a paper | none |
| `outfit.type` | `hoodie`, `tshirt`, `shirt`, `suit` | `hoodie` |
| `outfit.color` | paper of the clothes | `blue` |
| `outfit.detail` | `tshirt`: the stripe across the chest. `shirt` and `suit`: the tie. `hoodie`: unused | none (a `suit` always has a tie, red when no detail is given; a `shirt` has a tie only when a detail is given) |
| `pants` | paper | `graphite` |
| `shoes` | paper | `black` |
| `face` | one of the faces below; the default expression of the character, usually replaced in the still or the scene | `neutral` |

Notes:

- `hair.style: "bald"` draws no hair at all. `hair.style: "cap"` draws the hair under a cap; give `hair.color` and `hair.cap`.
- A `shirt` has a collar and buttons, a `suit` has a white shirt, tie and lapels, a `tshirt` shows bare forearms in the skin colour.
- If `hair` is an object, `style` is required to get hair: `{ "color": "black" }` alone draws no hair.

## Faces

| Mood | Faces |
|---|---|
| Calm | `neutral` `focused` `bored` `thinking` `asleep` |
| Good | `happy` `laughing` `excited` `wink` `smug` |
| Bad | `angry` `furious` `sad` `crying` `tired` |
| Uneasy | `surprised` `shocked` `scared` `worried` `confused` `suspicious` `embarrassed` |

`crying` adds tears and `embarrassed` adds a blush; `wink` closes one eye.

Each face sets the eyebrows, the eyelids, the pupils and the mouth. An unknown face name falls back to `neutral` and prints a `warning:` with the list of faces. A new face has to be added to `FACES` (and a new mouth to `MOUTHS`) at the top of `scripts/lib/character.mjs`, which is a change to the skill itself.

## Parts and poses

Every character has seven parts, each with its own pivot: `legs`, `torso`, `arm-left`, `forearm-left`, `arm-right`, `forearm-right` and `head`. The pivot is the hip, the shoulder, the elbow or the neck, so a rotated part swings from the right joint. A forearm hangs from its arm: turning the arm takes the forearm with it, and the forearm's own angle bends the elbow.

- `arm-left` is the arm on the **left side of the screen**; `arm-right` is on the right side of the screen. (That is the character's own right hand as the viewer sees it: the character faces you.)
- A pose is one angle per part, in degrees, **clockwise positive** (the SVG rotation). Parts you do not mention stay at rest.
- The right arm goes **up** with a negative angle; the left arm goes up with a positive angle. About 90 is straight out sideways, 150 is almost straight up. The head tilts a few degrees: positive tilts it clockwise.
- A forearm bends from where its arm points. On the right arm a positive angle folds the hand in towards the body and the face, a negative one out and up; on the left arm it is the reverse. `{ "arm-right": -12, "forearm-right": 150 }` puts the hand at the chin.

Ready-made poses (`POSES` in `scripts/lib/character.mjs`):

| Pose | Angles |
|---|---|
| `idle` | none (arms down) |
| `wave` | `arm-right: -150`, `head: 4` |
| `point` | `arm-right: -98` (the screen-right arm points out to the right) |
| `point-left` | `arm-left: 98` (the screen-left arm points out to the left) |
| `cheer` | `arm-left: 152`, `arm-right: -152`, `head: -3` |
| `shrug` | `arm-left: 34`, `forearm-left: 58`, `arm-right: -34`, `forearm-right: -58`, `head: 9` |
| `slump` | `arm-left: -6`, `arm-right: 6`, `head: 11` |
| `think` | `arm-right: -12`, `forearm-right: 150`, `head: -6` |
| `scold` | `arm-right: -118`, `arm-left: 30`, `head: -5` |
| `wave-left` | `arm-left: 150`, `head: -4` |
| `point-up` | `arm-right: -172`, `head: -4` |
| `present` | `arm-right: -62`, `head: 3` |
| `present-left` | `arm-left: 62`, `head: -3` |
| `arms-out` | `arm-left: 72`, `arm-right: -72` |
| `hands-up` | `arm-left: 176`, `arm-right: -176`, `head: -5` |
| `panic` | `arm-left: 166`, `arm-right: -138`, `head: -7` |
| `shout` | `arm-left: 58`, `arm-right: -58`, `head: -9` |
| `cower` | `arm-left: -22`, `arm-right: 22`, `head: 13` |
| `look-up` | `head: -12` |
| `look-down` | `head: 14` |
| `tilt` | `head: 10` |
| `dance-a` | `arm-left: 122`, `arm-right: -38`, `head: 8`, `legs: 4` |
| `dance-b` | `arm-left: 38`, `arm-right: -122`, `head: -8`, `legs: -4` |
| `hips` | `arm-left: 40`, `forearm-left: -98`, `arm-right: -40`, `forearm-right: 98` |
| `type` | `arm-left: -4`, `forearm-left: -78`, `arm-right: 4`, `forearm-right: 78`, `head: 6` |
| `phone` | `arm-right: -34`, `forearm-right: -132`, `head: 6` |
| `facepalm` | `arm-right: -78`, `forearm-right: 138`, `head: 13` |
| `stop` | `arm-right: -72`, `forearm-right: -96`, `head: -3` |
| `flex` | `arm-left: 96`, `forearm-left: 100`, `arm-right: -96`, `forearm-right: -100` |

Alternating two poses makes a movement: `dance-a` and `dance-b` every few tenths of a second, or `look-up` and `look-down` for a nod.

An unknown pose name means "no rotation" (same as `idle`) and prints a `warning:` with the list of poses. A part name that does not exist in a pose given as angles (for example `"tail"`) also prints a warning and is skipped.

## Using a character in a still

In a layer of `type: "character"`:

```json
{ "type": "character", "name": "maya", "face": "happy", "pose": "wave", "x": 40, "y": 160, "scale": 1.1 }
```

| Field | Meaning |
|---|---|
| `name` | the character, as written in `characters.json` or the shipped cast. An unknown name stops the render with `character "<name>" is not in the cast` |
| `face` | one of the faces above; replaces the sheet's `face` for this layer only |
| `pose` | a pose name (`"wave"`), or angles by part (`{ "arm-right": -98, "arm-left": 40, "head": 8 }`) |
| `overrides` | sheet fields replaced for this layer only (today's outfit, a cap, other glasses) |
| `x`, `y` | top-left corner of the character art, in the frame |
| `scale` | size factor (default 1) |
| `rotate` | rotation of the whole character in degrees (optional) |
| `flip` | `true` cuts the paper facing the other way; the character mirrors around its own axis |
| `seed` | changes the random look of the paper cuts (default 1) |

`overrides` is a **shallow merge** over the sheet: each key you give replaces the whole key. So `"overrides": { "outfit": { "type": "tshirt", "color": "red", "detail": "white" } }` is right, but `"overrides": { "outfit": { "type": "tshirt" } }` loses the colour and the clothes come out in the default `blue`. Always give the whole `outfit`, and the whole `hair` if you change it. When both are present, the layer's `face` wins over `overrides.face`.

A character in a still looks like this (all three examples ran with `collage frame`):

```json
{
  "name": "chars",
  "frames": [
    {
      "width": 1080, "height": 1080,
      "background": { "color": "cream", "seed": 2 },
      "layers": [
        { "type": "band", "y": 860, "height": 220, "color": "kraft" },
        { "type": "character", "name": "maya", "face": "happy", "pose": "wave", "x": 40, "y": 160, "scale": 1.1 },
        { "type": "character", "name": "maya", "face": "suspicious", "pose": { "arm-right": -98, "arm-left": 40, "head": 8 }, "x": 360, "y": 160, "scale": 1.1 },
        { "type": "character", "name": "maya", "face": "surprised", "pose": "cheer",
          "overrides": { "outfit": { "type": "tshirt", "color": "red", "detail": "white" },
                         "hair": { "style": "cap", "color": "black", "cap": "green" } },
          "flip": true, "x": 680, "y": 160, "scale": 1.1 },
        { "type": "text", "text": "MAYA", "x": 540, "y": 120, "size": 80, "anchor": "middle", "strip": "black" }
      ]
    }
  ]
}
```

Save it as `stills/chars.json` and run `collage frame stills/chars.json` to get `out/chars.png`.

Tips from use:

- Put several characters on the same ground line by giving them the same `y` plus the same `scale`; a `tall` body is taller, a `short` one shorter, so they differ without any extra work.
- Face the characters toward each other with `flip`, and use `point` or `point-left` so the arm points at the other one or at an object.
- A character is about 400 art units wide and 600 to 700 tall, so a `scale` between 1.3 and 1.8 fills a 1080 by 1920 frame well.

## Using a character in a scene

In a scene file (`scenes/<name>/scene.mjs`) a character is the same layer, with an `id` if you want to act on it, and the actions change `pose` and `face` over time. See `scenes.md` for the layer fields (`at`, `until`, `enter`, `jitter`, `fixed`) and for the actions (`pose`, `face`, `hop`, `shake`, `spin`, `move`, `hide`, `show`) that target a character by its `id`.

## Slicing a character

`collage slice --character <name> [--face <face>]` writes the seven parts as transparent PNGs in `out/pieces/character-<name>-<face>/` (for example `out/pieces/character-maya-happy/`) with a `pieces.json`, for use in another tool.

## What a character cannot do yet

- It exists only from the front: no profile and no three-quarter view.
- The hand does not hold anything. Put the object over the hand in the layer order.
- It sits only as seen from the front: `"stance": "sit"` on the layer draws a lap and short shins. Put a chair, a sofa or a desk behind or in front of it. A character cannot change stance in the middle of a shot.
- The legs are one part: no walking cycle, no knee.
- Face, outfit and body are chosen from fixed lists. A new face, hair style, outfit or body is an edit to `scripts/lib/character.mjs`. For something outside the lists, draw the person as normal art (see `art.md`).
- The shipped cast is a sample. Replace it, or add your own characters next to it, before using it for anything that should look like your own.

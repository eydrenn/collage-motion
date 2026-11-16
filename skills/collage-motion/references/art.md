# How to cut out art

Read this file in full before you start. It is enough on its own: you do not need to open the code.

You write a **simple SVG made only of filled shapes**. The tool is the scissors and the paper: it gives every shape a paper grain, makes the edge slightly irregular, adds the thin white rim of the paper core and drops the short shadow that separates the layers. You do not draw texture, shadow or outline.

Two folders are involved:

- **The skill folder** holds the library of ready-made art (`assets/src/*.svg`), the kit and the scripts. Do not edit it.
- **The project folder** is where you run the commands. Your own art goes in `./art/<name>.svg`. A file there with the same name as a library art wins over the library one.

Below, `collage` stands for `node <skill folder>/scripts/collage.mjs`, always run from the project folder.

```bash
collage art art/kettle.svg          # writes out/art/kettle.svg, out/art/kettle.json, out/art/kettle.png
collage art art/kettle.svg --seed 2 # a different random grain and edge, same drawing
collage art --all                   # every SVG in ./art, plus out/art-sheet.png
```

After rendering, **open `out/art/<name>.png` and look at it**. Fix the source SVG and render again until it is good. Never edit `out/`. The PNG is a preview on a beige paper at 2x scale; the size that counts is the `viewBox`.

The command prints one line (pieces and parts) and a `warning:` line for each problem it found. Read the warnings; they are the only feedback the tool gives besides the picture.

## Check the library first

Before cutting something new, see whether it already exists: `collage library` lists every library art with its size, a one-line description and its parts; the same list is in `references/library.md`. `collage library --sheet` renders them all into `out/library-sheet.png`. A library art can be used in a scene by name with no work on your side. Cut your own art when nothing fits, or when you need a different look or different moving parts.

People are not drawn as art. Characters are assembled from a sheet: see `references/characters.md`.

## Think in paper, not in drawing

- **Everything is a piece.** There are no outlines. A detail is a piece of paper of another colour glued on top.
- **Scissors cut straight.** Prefer a `polygon` with 4 to 8 points. Use curves only where the object is truly round (wheel, coin, clock).
- **Nothing is square.** Move the corners by 2 to 6 units. A rectangle written as `40,40 240,36 244,180 38,184` looks cut by hand; a perfect `rect` looks like vector art. This changes the result more than anything else.
- **Few colours.** 3 to 5 papers per art. Put a dark paper next to a light one: contrast is what makes the piece read.
- **Stack.** File order is gluing order: the big base piece first, then what goes on top. The last shape is in front.
- **Stop early.** 3 to 6 details that say what the object is (the lights on a server, the code lines on a screen). Good art has 5 to 25 pieces, not counting small repeated ones such as the keys of a keyboard.
- **Soft things are lumpy polygons.** A puff of dust or a cloud is a polygon with 6 or 7 lumps of about 4 points each, dipping inward between lumps. Too few points per lump and it turns into a star.

## The skeleton

This skeleton was rendered as written (a kraft box with a red lid that can turn, and a cream label glued on the box):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 320">
  <!-- A kraft box with a red lid. -->
  <g id="lid" data-pivot="120,120">
    <polygon points="120,120 330,114 326,160 118,164" fill="brick"/>
  </g>
  <g id="body">
    <polygon points="106,160 340,156 346,290 100,296" fill="kraft"/>
    <polygon points="150,196 296,194 298,250 152,254" fill="cream" data-rim="0"/>
  </g>
</svg>
```

- **The first comment** is the art's one-line description. `collage library` prints it, so write one sentence there. If you need two sentences, make two arts.
- **Size.** 1 `viewBox` unit = 1 px in a 1080-wide frame. Draw at the size the art will appear: a small symbol 120 to 220 wide, an object 220 to 450, a piece of furniture or a set 450 to 800. The art holds up under scales from 0.6 to 1.8 in a scene.
- **Margin.** Leave 16 units free all around (the shadow falls down and to the right). The tool warns `part "<name>" extends outside the viewBox` if the pieces of a part go past the `viewBox` (by more than 1 unit).
- **Parts.** Each first-level `<g id="...">` is a **part**: the piece the animation moves as a whole (it can enter, turn, hop or hide on its own). Name it for what it is (`lid`, `hand`, `door`), lowercase, no spaces, with letters, digits and hyphens. An object that does not move inside itself needs only one part. A first-level `<g>` without an `id` gets an automatic name (`part-1`, `part-2`...), so always give an id.
- **Pivot.** `data-pivot="x,y"` on the part says around which point it turns (the lid's hinge, the centre of a clock), in `viewBox` coordinates. Without a pivot it turns around the centre of its pieces. It works on any part, including one made only of strips. Put it on the first-level `<g>` only: on a nested `<g>` it is ignored.
- **Order between parts.** File order applies to everything: a part written later is in front of an earlier one. In the skeleton the lid comes first, so the box covers its lower edge.
- **A `<g>` inside a part** only groups shapes or applies a `transform`; it is still the same part (its own `id` is ignored).
- **Loose shapes.** A shape outside any `<g>` goes into a part called `base`. So `base` is just the name of the "no group" part. If you also name a group `base`, the two merge into one part. If the art has a single part, loose shapes are fine; if it has several, put every shape in a group.
- **Not supported:** `style=""` (warned and ignored), CSS, `<defs>`, `<use>`, `opacity`, gradients, `<image>`. Unknown tags are silently skipped. Attributes must be written with double quotes (`attr="value"`).

## Elements and attributes

Accepted: `polygon`, `path` (commands M L H V C S Q T A Z, upper or lower case), `rect` (with `rx`), `circle`, `ellipse`, `line`, `polyline`, `text`, and `g` for grouping (with a `transform` made of `translate`, `scale`, `rotate` or `matrix`; there is no `skewX` or `skewY`). Any other path command stops the render with an error.

| Attribute | Values | What it does |
|---|---|---|
| `fill` | palette name (or a hex such as `#E9DFC6`) | The colour of the paper. A shape with a `fill` is a piece. |
| `stroke` + `stroke-width`, **no** `fill` (or `fill="none"`) | colour and width | Becomes a **paper strip** of that width: cord, code line, smoke, clock hand, grid. Use 5 or wider (see below). Without `stroke-width` the strip is 6 wide. |
| `data-shadow` | `0` · `1` (default) · `2` · `3` | The height of the piece. `0` = printed on the paper below, no shadow (pupil, freckle). `2` = a piece that stands out (balloon, cloud, label). `3` = a loose sheet. |
| `data-rim` | `0` or anything else | `0` removes the white rim; any other value forces it. Without the attribute, a piece gets the rim only when it is big: its bounding box is at least 44 in the short side and 70 in the long side. Use `0` on a medium piece that looks "dotted". |
| `data-cut` | `scissors` (default) · `smooth` · `torn` | `smooth` for a small round piece that is getting deformed. `torn` for hand-torn paper (wide white border). |
| `data-crease` | `1` (rarely `2`) | Thin creases of folded paper, that many fold points. Only on the biggest piece of the art, and not always. |
| `data-smooth` | present, with or without a value | On a `polyline` or `polygon`: the line passes through the points as a smooth curve. |
| `data-pivot` | `x,y` | On a first-level `<g>`: the turning point of the part (see above). |

Things to know:

- `fill` and `stroke` on the same element: the `stroke` is ignored.
- A **frame** (window, picture frame) is a closed shape with only a `stroke`, a rectangle or a polygon: it becomes a ring of paper.
- A stroke narrower than 5 is **not** rejected: it is cut as written. But a strip of 2 or 3 units is a hair and will not look like paper, so keep to 5 or more.
- `data-shadow`, `data-rim` and `data-cut` can be placed on a `<g>` (or on the `<svg>`) and the shapes inside inherit them. `fill`, `stroke`, `stroke-width`, `font-size` and `text-anchor` are inherited too. `data-crease` is not inherited: put it on the shape.
- **No holes**: glue a paper of the background colour on top (the keyhole is a dark piece).
- **Curves only in `<path>`.** `polygon` and `polyline` take only points; the tool warns if it finds a letter in `points`.
- **A shape repeated in a circle** (gear teeth, sun rays): compute the points with a script and paste them into the SVG.
- A colour that is not in the palette and not a hex gives `warning: color outside the palette: <name>` and is used as written.
- A fill piece with fewer than 3 points is dropped. An open `path` with a `fill` is closed automatically.

## Text

```svg
<text x="170" y="124" font-size="50" text-anchor="middle">DEPLOY?</text>
<text x="450" y="240" font-size="46" text-anchor="middle" data-strip="black">ONE LINE PER BEAT</text>
<text x="450" y="120" font-size="78" text-anchor="middle" data-ransom="">COLLAGE</text>
```

(The kettle example below has no text. A paper plane tested with this line rendered as black letters on a tilted yellow strip: `<text x="120" y="60" font-size="40" text-anchor="middle" data-strip="yellow" data-tilt="-4">SENT</text>`.)

- `x`,`y` = the baseline; `font-size` = the **cap height** (the height of a capital letter); `text-anchor` = `start`, `middle` or `end`. Always upper case: the tool converts what you write to capitals.
- Without extra attributes: loose cut-out letters, in the `fill` colour (default black).
- `data-strip="<colour>"`: a strip of paper behind the text. On a dark strip (`black`, `navy`, `red`, `brick`, `coffee`, `purple`, `moss`, `graphite`) the letters turn cream by themselves.
- `data-ransom=""`: every letter on its own little square, alternating colours (ransom note). `data-ransom="white,yellow"` picks the papers. The ink is the `fill` colour (default black).
- `data-tilt="-3"`: tilt in degrees. Without it you get a small random tilt.
- `data-shadow` sets the height of the strip or of the ransom squares.
- Approximate width: `0.62 × font-size` per letter (`0.95 ×` for ransom).
- `fill` on the `<text>` changes the letter colour (the yellow dollar sign on a coin).
- Only letters, digits and common punctuation of the bundled font are measured. A character with no measured width gives a warning and an estimated width.
- Write little inside the art: a label of 1 or 2 words. The sentence of the scene is a caption, not art.
- A letter under 24 high does not read: calendar numbers, keys and screen text become little blocks and strips, not letters. (The tool does not enforce this; small text under 44 high is cut with the smooth cut so it holds together.)

## Palette

The names you can use in `fill`, `stroke` and `data-strip`:

Neutrals: `white` `cream` `sand` `silver` `gray` `graphite` `black`
Earth: `kraft` `brown` `coffee` `ochre`
Warm: `yellow` `orange` `red` `brick` `pink`
Cool: `green` `moss` `sky` `blue` `teal` `navy` `purple` `lilac`
Skin: `skin-light` `skin-medium` `skin-dark`

`brown` and `coffee` look alike on a small piece: separate the two with `kraft` or `ochre`. Art goes on a background of any colour of the kit, so a light paper (`white`, `cream`, `sand`) alone vanishes on a light background: give it a dark supporting piece or `data-shadow="2"`.

A hex value is allowed for a tone between two papers, but prefer the names: that is what makes all the art look like it came from the same block of paper.

## Recipe, step by step

1. **One sentence.** Write it in the comment. If you need two sentences, they are two arts.
2. **Silhouette first.** The big base piece, with corners off the square. If the silhouette alone does not say what it is, change the silhouette before adding detail.
3. **Second layer.** The pieces that divide the base into areas (the screen inside the monitor, the drawer inside the cabinet), in another paper.
4. **Details.** 3 to 6 small pieces or strips. A small piece in a strong colour (light, button, label) is worth more than three neutral ones.
5. **Parts and pivots.** Group what moves together and mark the hinge.
6. **Render, open the PNG, fix.** Really look at it.

## A complete example

A kettle: 8 pieces, three parts (the steam, the body with handle and spout, the lid that lifts around its hinge). Rendered with `collage art art/kettle.svg` with no warnings; save it as `./art/kettle.svg`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 320">
  <!-- Red kettle with a graphite handle and spout, and a lid that lifts, steaming. -->
  <g id="steam">
    <polyline points="170,58 158,40 178,26 166,12" stroke="silver" stroke-width="8" data-smooth="1" data-rim="0"/>
  </g>
  <g id="kettle">
    <polygon points="232,150 290,98 312,112 262,196" fill="graphite" data-rim="0"/>
    <polygon points="104,110 250,106 286,190 276,268 82,274 66,190" fill="red"/>
    <polygon points="76,196 276,192 278,214 74,218" fill="yellow" data-rim="0"/>
    <polygon points="48,138 78,146 78,214 58,222 40,170" fill="graphite" data-rim="0"/>
    <polygon points="92,274 262,272 268,292 88,294" fill="black" data-shadow="0"/>
  </g>
  <g id="lid" data-pivot="104,108">
    <polygon points="108,108 246,104 238,84 116,86" fill="brick"/>
    <circle cx="176" cy="74" r="11" fill="yellow" data-cut="smooth" data-rim="0"/>
  </g>
</svg>
```

What to notice: the spout is written before the body, so the body covers its root; the big red body keeps the white rim (it is large) while the small pieces turn it off; the knob is small and round, so `smooth`; the black foot is "printed" under the body with `data-shadow="0"`; the steam is a strip (`stroke`, width 8) bent with `data-smooth`; the lid has its own pivot at the hinge.

## Before delivering

- [ ] The silhouette says what it is without reading a label.
- [ ] No big perfect rectangle: corners moved.
- [ ] 3 to 5 papers, light against dark.
- [ ] No important piece touching the edge of the `viewBox`, and no `warning:` line from the tool.
- [ ] Small pieces (under 20 wide) have `data-rim="0"` and, if round, `data-cut="smooth"`.
- [ ] The white rim is not turning into a "seam" around everything: remove it with `data-rim="0"` on medium pieces.
- [ ] Parts are named for what they are, and each part that turns has a `data-pivot`.
- [ ] No brand logo, no third-party character, no long text.
- [ ] The PNG was opened and checked.

## Common mistakes

- **It looks like flat vector art.** Shapes too square and too symmetric. Bend the corners and vary the widths.
- **It looks like a drawing with outlines.** You used a thin `stroke` as a line. A line here is a strip of paper: width 5 or more, and only a few.
- **Dirty, full of little dashes.** Too much rim. `data-rim="0"` on whatever is not the main piece.
- **A piece disappeared.** The same colour of paper on top of another one. Change one of the two or move the tones apart.
- **A strip or shape is missing and there is no warning.** The tool skips what it does not understand without saying so: a tag it does not know, or a malformed attribute. Compare the `pieces` count printed by the command with what you wrote.
- **A part moves or turns around the wrong point.** The `data-pivot` is missing, or it sits on a nested `<g>`.
- **Cut shadow.** Not enough margin in the `viewBox`.
- **A shape has the wrong colour.** `fill` plus `stroke` on one element: the `stroke` is ignored. Or a colour name that does not exist: look for `color outside the palette`.

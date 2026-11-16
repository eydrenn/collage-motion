# Safe zones and where captions go

Every app that plays vertical video draws its own interface on top of it: a column of buttons on the right, the description at the bottom, a header at the top. Text you put there is covered. This page says where the free area is and how to put captions in it.

In every command below, `collage` stands for `node <skill folder>/scripts/collage.mjs`, run from your project folder.

## Put text in a slot

Give a text layer a `place` instead of `x` and `y`:

```js
{ type: "text", text: "FRIDAY", place: "title", size: 104, ransom: "" }
{ type: "text", text: "5:59 PM. ALL QUIET.", place: "caption", size: 54, strip: "black" }
```

| Slot | Where | Use it for |
|---|---|---|
| `title` | top of the free area | the big ransom-letter title of a shot |
| `center` | middle of the free area | one word that is the whole point of the shot |
| `caption-2` | the line above the caption | the first line of a two-line caption |
| `caption` | bottom of the free area, just above what the apps cover | the caption of the shot |

The slot centres the text and sets the height from its `size`, so the letters and their paper stay inside the free area. `x` or `y` on the layer still override it.

The `caption` and `caption-2` slots sit beside the column of buttons, so they are a little narrower than the frame and a little left of centre. By default a caption has about 790 pixels: roughly 22 letters at `size: 54`. A longer line gets a warning; shorten it, lower `size`, or split it between `caption-2` and `caption`.

## See the zones

```bash
collage frame stills/demo.json --guides
collage film demo --sheet --guides
```

- **Red**: where the apps were seen drawing buttons and text. Nothing that matters goes here.
- **White box**: the free area, where text goes. It stops a little short of the red.
- **Dashed lines**: the slots.
- **Dashed yellow box, marked `ads`**: the stricter area the platforms publish for ads, for reference.

Pictures and characters can and should fill the whole frame. The zones are about text, and about anything the viewer must see: a face in a close-up, the detail a caption points at.

## What the tool checks

Every text that is fixed to the screen is checked when a still or a scene is drawn:

- `sits under the interface of tiktok, instagram`: it is in a red area.
- `is outside the free area`: it is too close to the interface.
- `is 912 wide and there is room for 786 at that height`: it does not fit on one line.

Text with `fixed: false` moves with the camera and is not checked.

## Which app

By default the zones are the worst case of the three apps together, so one video is safe everywhere. Set `safe` at the top of the scene or of a still frame to target one:

```js
export default { width: 1080, height: 1920, safe: "instagram", shots: [ /* ... */ ] };
```

| `safe` | Free area in a 1080x1920 frame | Column of buttons |
|---|---|---|
| `"all"` (default) | x 97 to 983, y 192 to 1440 | right of x 889 from y 908, right of x 883 from y 1393 |
| `"tiktok"` | x 60 to 1020, y 192 to 1473 | right of x 889, y 908 to 1777 |
| `"instagram"` | x 97 to 983, y 192 to 1545 | right of x 926, from y 1095 |
| `"youtube"` | x 60 to 1020, y 192 to 1440 | right of x 883, from y 1393 |
| `false` | no zones, no checks, no slots | |

The zones exist only for a 9:16 frame.

## Ads

A paid post gets more interface on top of it: a call-to-action button, a longer description. For that, the platforms publish stricter safe zones. Add `margins: "ads"` to use them:

```js
export default { width: 1080, height: 1920, margins: "ads", shots: [ /* ... */ ] };
```

With all three apps this shrinks the area to x 120 to 960, y 269 to 1248, and the caption line to about 660 pixels beside the buttons. Captions sit noticeably higher. Use it for ads, not for ordinary posts.

## Where the numbers come from

They are in `kit/safe-zones.json`:

- **The red areas** were measured on the mobile web versions of the three apps, on a 375x812 screen, on 16 November 2026, and scaled as if the video filled the screen. The free area keeps 24 pixels away from them.
- **The top** of the free area (y 192) is not a measurement: the web versions show no header, and the native apps do, so room is kept for it.
- **The bottom on YouTube** could not be measured either, because on the web the title sits below the video. The published margin (y 1440) is used there, and it is what sets the bottom of the default area.
- **On Instagram** a tall phone crops about 97 pixels off each side of the video, which is why the free area starts at x 97.
- **The ad margins** are the safe zones each platform publishes for ads.

The native apps are close to the web versions but not identical, and they change. If a caption ends up covered on a real phone, edit `kit/safe-zones.json`; the slots, the guides and the checks follow.

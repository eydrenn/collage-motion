# Working on collage-motion

This file is for whoever changes this repository. To **use** the skill, read `skills/collage-motion/SKILL.md`.

## Layout

```
skills/collage-motion/          the skill: everything a user installs
  SKILL.md                      entry point for agents
  scripts/collage.mjs           the command; one file per group of commands in scripts/commands/
  scripts/lib/                  the engine (no file access except env.mjs and pieces.mjs)
  kit/                          palette, cast, font and its measured letter widths
  assets/src/                   the library art, one SVG per piece
  references/                   the documentation agents read
  examples/                     what `collage init` copies into a project
docs/                           images for the README
.claude-plugin/                 Claude Code plugin manifest
```

The skill folder must stay self-contained: installers copy only `skills/collage-motion`, so nothing in it may reach outside.

## Try a change

```sh
npm install --prefix skills/collage-motion
mkdir /tmp/collage-try && cd /tmp/collage-try
node <repo>/skills/collage-motion/scripts/collage.mjs doctor
node <repo>/skills/collage-motion/scripts/collage.mjs init
node <repo>/skills/collage-motion/scripts/collage.mjs frame stills/demo.json
node <repo>/skills/collage-motion/scripts/collage.mjs film demo --sheet --every 0.25
```

Then run the checks: `npm test --prefix skills/collage-motion`. It renders the examples in a temporary folder and fails on any warning or missing file. It does not judge pictures: after a change to how things are drawn, open the demo still, the cast sheet and the demo contact sheet and look at them.

## Rules

- **English only**: names, comments, messages, documentation.
- **Few comments in code.** One line at the top of a file saying what it is, and a comment only where the reason is not obvious from the code. How to use something is explained in `SKILL.md` and `references/`, not in the source.
- **The names people type are an interface.** SVG attributes (`data-cut`, `data-shadow`, ...), palette names, sheet fields, faces, poses, layer and action fields, entrances and commands are used in other people's files. Add, do not rename.
- **Documentation follows the code.** A new field or value goes in the matching file in `references/` in the same change, with an example that was actually run.
- **Library art**: the first comment of the SVG is its one-line description. After adding or changing art, run `collage library --write-catalog` to rebuild `references/library.md`. Never edit that file by hand.
- **No generated files in the repository** except `references/library.md`, the sounds in `kit/sounds/` (rebuilt by `collage sounds --build-kit` from `scripts/lib/foley.mjs`) and the images in `docs/`.
- **One dependency.** `playwright-core` drives the browser and ffmpeg is called from the system. Do not add packages without a strong reason.
- Changing how paper is drawn changes every picture. Render the library sheet (`collage library --sheet`) before and after.

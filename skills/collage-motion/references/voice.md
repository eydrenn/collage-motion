# Narration, and timing a scene to its words

A narrated video is timed to the voice: the tear lands on a word, the face changes on a word. This page says how to get a voice, how to get the time of each of its words, and how to write those words into a scene instead of seconds.

In every command below, `collage` stands for `node <skill folder>/scripts/collage.mjs`, run from your project folder.

## The order

1. Write the narration.
2. Record or generate the voice, as one audio file.
3. Get the words file: the time of each word.
4. Write the scene with words where the times go.
5. Check with the animatic, which renders in a second or two with the voice under it.

Voice first, scene second. A scene timed before the voice exists has to be timed again.

## Getting a voice

The tool only needs an audio file (mp3, wav, m4a ...). It does not make one.

| Route | Cost | Words file |
|---|---|---|
| Record yourself | free | make it with `collage words` |
| A local text-to-speech (macOS `say`, Kokoro, Piper) | free | make it with `collage words` |
| ElevenLabs | paid | comes with the audio: ask for timestamps |
| HeyGen, or another service | paid | from the service if it gives word times, otherwise `collage words` |

A paid service is your own account, your own cost and your own license to publish. Nothing in this skill calls one.

**ElevenLabs.** Its text-to-speech has a variant that returns the audio together with the time of every character (`POST /v1/text-to-speech/{voice_id}/with-timestamps`). Save the JSON it answers with: the `alignment` object in it is read directly as a words file, with no conversion.

**HyperFrames.** If you also use HyperFrames, its `tts` and `transcribe` commands are a free local route to a voice and its words. Any result that is a list of words with a start and an end is read as it is.

## The words file

Set it in the scene, next to the narration:

```js
sound: { narration: "audio/voice.mp3", words: "audio/voice.words.json" }
```

Four shapes are understood:

- a plain list: `[{ "word": "deploy", "start": 6.13, "end": 6.62 }]` (seconds);
- `{ "words": [...] }` or `{ "segments": [{ "words": [...] }] }`, as OpenAI Whisper writes with word timestamps;
- the JSON of `whisper-cli` (whisper.cpp) run word by word;
- `{ "alignment": { "characters": [...], "character_start_times_seconds": [...], "character_end_times_seconds": [...] } }`, as ElevenLabs answers.

### Making it from audio

```bash
collage words audio/voice.mp3 --model path/to/ggml-small.bin --language en
```

This runs a local whisper (`whisper-cli`, from whisper.cpp) and writes `audio/voice.words.json` beside the audio. It needs a model file, given with `--model` or in `COLLAGE_WHISPER_MODEL`.

**Read the list it prints.** A transcription mishears. In a test with a synthetic voice and the small model, a third of the words came out wrong ("then the boss walks in" became "tend to doze off in") while their times stayed usable. Open the JSON and fix the text of the words you want to use; leave the numbers. A bigger model mishears less.

```bash
collage words audio/voice.words.json    # lists any words file, with the time of each word
```

## Words as times

Anywhere a scene takes a time, it takes a word:

| Written | Means |
|---|---|
| `"word:deploy"` | when "deploy" starts, the first time it is said in or after the shot |
| `"after:deploy"` | when it ends |
| `"word:deploy#2"` | its second time in the whole narration |
| `"word:deploy+0.2"`, `"word:deploy-0.1"` | that much later or earlier, in seconds |
| `"word:quick deploy"` | when the phrase starts |

Capitals, accents and punctuation do not matter.

- A layer takes it in `at` and `until`. An action takes it in `at`.
- A shot takes it in `until`, in place of `duration`: the shot ends, and the next one begins, on that word.

```js
export default {
  width: 1080, height: 1920, fps: 12,
  sound: { narration: "audio/voice.mp3", words: "audio/voice.words.json" },
  shots: [
    {
      until: "word:just-0.3",                        // the tear starts a breath before "just"
      background: { color: "navy", seed: 3 },
      layers: [
        { id: "dev", type: "character", name: "dev", face: "happy", x: 210, y: 690, scale: 1.65 },
        { type: "text", text: "ALL QUIET.", place: "caption", size: 60, strip: "black", at: "word:quiet" },
      ],
      actions: [{ at: "word:quiet", target: "dev", pose: "wave", face: "laughing" }],
    },
    {
      until: "word:now", transition: "tear",
      background: { color: "red", seed: 5 },
      layers: [
        { id: "dev", type: "character", name: "dev", x: 540, y: 800, scale: 1.5 },
        { id: "boss", type: "character", name: "boss", pose: "point", x: -20, y: 780, scale: 1.5, at: "word:just", enter: "slide-left" },
      ],
      actions: [
        { at: "word:deploy", target: "dev", face: "scared", pose: "shrug", hop: 1 },
        { at: "word:deploy", target: "camera", zoom: 1.5, on: "dev.head", duration: 0.25, ease: "punch" },
      ],
    },
  ],
};
```

This scene ran against a real audio file. Each action landed within 40 milliseconds of its word, which is as close as 12 drawings a second allows.

A word that is not in the narration, or is said outside the shot it is used in, gives a `warning:` and the time falls back to the start of the shot. The last shot usually keeps a `duration`, so the picture outlasts the last word.

## Where to put what

- **Cut on the word that changes the subject.** Start the tear about 0.3 seconds before it (`"word:then-0.3"`): the tear takes half a second and should finish on the word.
- **The caption arrives with its first word**, not before: `at: "word:..."` on the text layer.
- **The reaction lands on the word that causes it**: the face, the pose and the punch-in, all on the same word.
- **Entrances start slightly early.** A piece that slides in takes four drawings; start it 0.2 seconds before the word that names it.

## What it does not do

- It does not make a voice, and it does not call any service.
- It does not move a mouth: faces change on words, there is no lip movement.
- It does not correct a transcription. The words you use have to be right in the file.

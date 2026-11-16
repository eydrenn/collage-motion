// Command: words (list the word timings of a narration, or make them from audio with a local whisper).
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { basename, extname, join, resolve, relative } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { parseWords } from "../lib/words.mjs";
import { PROJECT, readArgs, needFfmpeg, UsageError } from "../lib/env.mjs";

export async function words(argv) {
  const a = readArgs(argv), model = a.value("model", process.env.COLLAGE_WHISPER_MODEL), language = a.value("language", "auto");
  const file = a.rest[0] && resolve(a.rest[0]);
  if (!file || !existsSync(file)) throw new UsageError("give a words file (.json) to list, or an audio file to transcribe");
  let list, saved = null;
  if (extname(file) === ".json") list = parseWords(JSON.parse(readFileSync(file, "utf8")));
  else {
    needFfmpeg();
    if (spawnSync("whisper-cli", ["--help"], { encoding: "utf8" }).error) throw new UsageError("whisper-cli (whisper.cpp) was not found. Install it (macOS: `brew install whisper-cpp`), or get word timings from the service that made the voice and pass that JSON as sound.words.");
    if (!model || !existsSync(model)) throw new UsageError("give the whisper model file with --model <ggml-*.bin> (or set COLLAGE_WHISPER_MODEL). Models are at https://huggingface.co/ggerganov/whisper.cpp");
    const dir = mkdtempSync(join(tmpdir(), "collage-words-")), wav = join(dir, "audio.wav");
    const conv = spawnSync("ffmpeg", ["-y", "-v", "error", "-i", file, "-ar", "16000", "-ac", "1", wav], { encoding: "utf8" });
    if (conv.status !== 0) throw new UsageError(`could not read ${file}: ${conv.stderr.trim().split("\n").pop()}`);
    const run = spawnSync("whisper-cli", ["-m", model, "-f", wav, "-l", language, "-ml", "1", "-sow", "-oj", "-of", join(dir, "out"), "-np"], { encoding: "utf8", maxBuffer: 1 << 26 });
    if (run.status !== 0 || !existsSync(join(dir, "out.json"))) throw new UsageError(`whisper-cli failed: ${(run.stderr || "").trim().split("\n").pop()}`);
    list = parseWords(JSON.parse(readFileSync(join(dir, "out.json"), "utf8")));
    saved = join(resolve(file, ".."), `${basename(file, extname(file))}.words.json`);
    writeFileSync(saved, JSON.stringify(list.map((w) => ({ word: w.text, start: +w.start.toFixed(2), end: +w.end.toFixed(2) })), null, 1) + "\n");
  }
  for (const w of list) console.log(`${w.start.toFixed(2).padStart(7)}  ${w.text}`);
  console.log(`${list.length} words, ${list.length ? list[list.length - 1].end.toFixed(2) : 0} s.${saved ? ` Saved: ${relative(PROJECT, saved)}. A transcription can mishear: read the list before using it.` : ""}`);
  console.log('Use a word as a time in the scene: at: "word:deploy". Set sound.words to this file.');
}

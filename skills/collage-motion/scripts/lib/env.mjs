// The machine: skill and project folders, kit, browser, ffmpeg.
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir, platform } from "node:os";
import { spawnSync } from "node:child_process";

export const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const PROJECT = process.cwd();
export const OUT = join(PROJECT, "out");
export const LIBRARY = join(SKILL, "assets/src");

const FONT_FILE = join(SKILL, "kit/fonts/anton-latin-400.woff2");
export const FONT_CSS = `@font-face{font-family:Anton;src:url(data:font/woff2;base64,${readFileSync(FONT_FILE).toString("base64")}) format("woff2")}`;

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
export const outDir = (...parts) => { const dir = join(OUT, ...parts); mkdirSync(dir, { recursive: true }); return dir; };

export function readArgs(argv) {
  const rest = [...argv];
  return {
    rest,
    flag(name) { const i = rest.indexOf(`--${name}`); return i < 0 ? false : (rest.splice(i, 1), true); },
    value(name, fallback = null) { const i = rest.indexOf(`--${name}`); return i < 0 ? fallback : rest.splice(i, 2)[1]; },
  };
}
export class UsageError extends Error {}

export function loadKit() {
  const palette = readJson(join(SKILL, "kit/palette.json"));
  const metrics = readJson(join(SKILL, "kit/metrics.json"));
  const own = join(PROJECT, "characters.json");
  const cast = { ...readJson(join(SKILL, "kit/characters.json")), ...(existsSync(own) ? readJson(own) : {}) };
  const artDirs = [join(PROJECT, "art"), LIBRARY];
  const artFile = (name) => artDirs.map((dir) => join(dir, `${name}.svg`)).find(existsSync);
  const artSource = (name) => {
    const file = artFile(name);
    if (!file) throw new UsageError(`art "${name}" not found in ./art or in the library. Run \`collage library\` to see what exists.`);
    return readFileSync(file, "utf8");
  };
  return { palette, metrics, cast, artSource, artFile, artDirs, zones: readJson(join(SKILL, "kit/safe-zones.json")) };
}

export const artNames = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".svg")).map((f) => f.replace(/\.svg$/, "")).sort() : []);

function playwrightCache() {
  if (process.env.PLAYWRIGHT_BROWSERS_PATH && process.env.PLAYWRIGHT_BROWSERS_PATH !== "0") return process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (platform() === "darwin") return join(homedir(), "Library/Caches/ms-playwright");
  if (platform() === "win32") return join(process.env.LOCALAPPDATA || join(homedir(), "AppData/Local"), "ms-playwright");
  return join(process.env.XDG_CACHE_HOME || join(homedir(), ".cache"), "ms-playwright");
}
// Any Chromium that Playwright already downloaded, whatever its version: newest first,
// and on a tie the headless shell (lighter) before the full browser.
function downloadedBrowsers() {
  const base = playwrightCache(), found = [];
  if (!existsSync(base)) return found;
  const exe = platform() === "win32" ? ".exe" : "";
  for (const dir of readdirSync(base).filter((d) => /^chromium(_headless_shell)?-\d+$/.test(d)).sort((a, b) => Number(b.split("-").pop()) - Number(a.split("-").pop()) || b.length - a.length)) {
    for (const sub of readdirSync(join(base, dir))) {
      const candidates = [
        join(base, dir, sub, `chrome-headless-shell${exe}`), join(base, dir, sub, `headless_shell${exe}`), join(base, dir, sub, `chrome${exe}`),
        join(base, dir, sub, "Chromium.app/Contents/MacOS/Chromium"), join(base, dir, sub, "Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
      ];
      const hit = candidates.find(existsSync);
      if (hit) found.push(hit);
    }
  }
  return found;
}

let lastBrowser = "";
export const browserUsed = () => lastBrowser;

export async function launchBrowser() {
  let chromium;
  try { ({ chromium } = await import("playwright-core")); }
  catch { throw new UsageError(`playwright-core is not installed. Run:\n  npm install --prefix "${SKILL}"`); }
  const tries = [];
  if (process.env.COLLAGE_BROWSER) tries.push(["COLLAGE_BROWSER", { executablePath: process.env.COLLAGE_BROWSER }]);
  tries.push(["Playwright's Chromium", {}]);
  for (const path of downloadedBrowsers()) tries.push([path, { executablePath: path }]);
  tries.push(["Google Chrome", { channel: "chrome" }], ["Microsoft Edge", { channel: "msedge" }]);
  // as root (containers, CI) Chromium refuses to start with its sandbox
  const args = process.env.COLLAGE_NO_SANDBOX || process.getuid?.() === 0 ? ["--no-sandbox"] : [];
  let refused = "";
  for (const [label, options] of tries) {
    try { const browser = await chromium.launch({ ...options, args }); lastBrowser = label; return browser; }
    catch (e) { if (!refused && !/doesn't exist|not found|not installed|ENOENT/i.test(e.message)) refused = label; }
  }
  if (refused) throw new UsageError(`A browser is installed (${refused}) but was not allowed to start.\nThis is what a restricted shell does, such as the sandbox of a coding agent: run this command outside the sandbox (ask for permission to run it unsandboxed).`);
  throw new UsageError(`No Chromium-based browser could be started. Install one with:\n  npx --prefix "${SKILL}" playwright-core install chromium\nor point COLLAGE_BROWSER at a Chrome or Chromium executable.`);
}

export async function shoot(browser, html, file, { width = 2700, height = 1400, scale = 2, target = "#f" } = {}) {
  const page = await browser.newPage({ deviceScaleFactor: scale, viewport: { width, height } });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  const jpeg = /\.jpe?g$/.test(file);
  await page.locator(target).screenshot({ path: file, type: jpeg ? "jpeg" : "png", ...(jpeg ? { quality: 90 } : {}) });
  await page.close();
}

export async function measureFont(browser) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ÁÀÂÃÉÊÍÓÔÕÚÜÇÑ.,:;!?¿¡-–+=/()$%'\"×<>#_*&@•";
  const page = await browser.newPage();
  await page.setContent(`<style>${FONT_CSS}</style><canvas></canvas>`);
  const metrics = await page.evaluate(async (chars) => {
    await document.fonts.load("1000px Anton");
    const ctx = document.querySelector("canvas").getContext("2d");
    ctx.font = "1000px Anton";
    const adv = {};
    for (const ch of chars) adv[ch] = +(ctx.measureText(ch).width / 1000).toFixed(4);
    return { font: "Anton 400", cap: +(ctx.measureText("H").actualBoundingBoxAscent / 1000).toFixed(4), adv };
  }, letters);
  await page.close();
  writeFileSync(join(SKILL, "kit/metrics.json"), JSON.stringify(metrics, null, 1) + "\n");
  return metrics;
}

export function ffmpegVersion() {
  const r = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
  return r.status === 0 ? (r.stdout.split("\n")[0].match(/version (\S+)/) || [])[1] || "found" : null;
}
export function needFfmpeg() {
  if (!ffmpegVersion()) throw new UsageError("ffmpeg was not found on PATH. Install it (macOS: `brew install ffmpeg`, Debian or Ubuntu: `sudo apt install ffmpeg`, Windows: `winget install ffmpeg`) and try again.");
}

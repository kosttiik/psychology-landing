#!/usr/bin/env node
// Manual one-off tool — NOT part of the build. Rasterizes the OG image from
// og/og-image.html with headless Chrome/Chromium into public/og-image.png,
// which is then committed and served as a static asset. og:image must be raster
// — Telegram/WhatsApp/VK don't render SVG previews. Re-run it yourself whenever
// the photos or artwork change:
//
//   npm run og        -> regenerate public/og-image.png (1200x630 @2x)
//   npm run og:icon   -> regenerate public/apple-touch-icon.png (180x180 @2x)
//
// Needs a local Chrome/Chromium (auto-detected; override with CHROME_BIN).
// The polaroid photos are picked from the maria-*.{jpg,png} files present in
// public/, so swapping the photos and re-running refreshes the preview.
// Rendered at 2x for a crisp, high-resolution result.

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ogDir = join(root, "og");
const publicDir = join(root, "public");
const outDir = publicDir;

// `npm run og:icon` renders the static apple-touch-icon instead of the OG image.
const iconMode = process.argv.includes("--icon");

mkdirSync(outDir, { recursive: true });

// --- locate a Chrome/Chromium binary -----------------------------------------
function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    "/usr/bin/chromium-browser", // alpine
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ].filter(Boolean);
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error(
    "No Chrome/Chromium found. Install it or set CHROME_BIN to its path.",
  );
}
const CHROME = findChrome();

// --- pick the polaroid photos from public/ ------------------------------------
// front = first photo, back = last photo (preserves the maria-1 / maria-3 look).
function pickPhotos() {
  const photos = readdirSync(publicDir)
    .filter((f) => /^maria-.*\.(jpe?g|png)$/i.test(f))
    .sort();
  if (photos.length === 0) return null;
  return {
    front: pathToFileURL(join(publicDir, photos[0])).href,
    back: pathToFileURL(join(publicDir, photos[photos.length - 1])).href,
    count: photos.length,
  };
}

function shot({ htmlUrl, out, width, height, scale }) {
  const profile = mkdtempSync(join(tmpdir(), "og-chrome-"));
  rmSync(out, { force: true });
  try {
    spawnSync(
      CHROME,
      [
        "--headless",
        "--disable-gpu",
        "--no-sandbox",
        "--hide-scrollbars",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-networking",
        "--disable-component-update",
        "--disable-default-apps",
        `--force-device-scale-factor=${scale}`,
        `--user-data-dir=${profile}`,
        `--window-size=${width},${height}`,
        "--virtual-time-budget=15000",
        `--screenshot=${out}`,
        htmlUrl,
      ],
      // Success is judged by the output file, not the exit code: on macOS's new
      // headless Chrome the screenshot lands but the process then hangs on
      // shutdown (harmless), so we cap it and SIGKILL the zombie. Alpine's
      // chromium exits cleanly well before the timeout.
      { stdio: "inherit", timeout: 30000, killSignal: "SIGKILL" },
    );
    if (!existsSync(out) || statSync(out).size === 0) {
      throw new Error(`Chrome produced no screenshot at ${out}`);
    }
  } finally {
    rmSync(profile, { recursive: true, force: true });
  }
}

if (iconMode) {
  // apple-touch-icon: 180x180 logical, rendered @2x (= 360x360 px)
  shot({
    htmlUrl: pathToFileURL(join(ogDir, "apple-touch-icon.html")).href,
    out: join(outDir, "apple-touch-icon.png"),
    width: 180,
    height: 180,
    scale: 2,
  });
  console.log(`apple-touch-icon.png written to ${outDir}`);
} else {
  // OG image: 1200x630 logical, rendered @2x (= 2400x1260 px)
  const photos = pickPhotos();
  let htmlUrl = pathToFileURL(join(ogDir, "og-image.html")).href;
  let tmpDir;
  if (photos) {
    let src = readFileSync(join(ogDir, "og-image.html"), "utf8")
      .replace("../public/maria-1.jpg", photos.front)
      .replace("../public/maria-3.jpg", photos.back);
    // With a single portrait front === back, which would render two identical
    // polaroids. Drop the duplicate back card and recentre the remaining one.
    if (photos.count === 1) {
      src = src.replace(/\s*<!-- Polaroid, back[\s\S]*?<\/g>/, "");
      src = src.replace(
        "translate(884,128) rotate(5 140 185)",
        "translate(802,118) rotate(-3 140 185)",
      );
    }
    tmpDir = mkdtempSync(join(tmpdir(), "og-html-"));
    const tmpHtml = join(tmpDir, "og-image.html");
    writeFileSync(tmpHtml, src);
    htmlUrl = pathToFileURL(tmpHtml).href;
  }
  try {
    shot({
      htmlUrl,
      out: join(outDir, "og-image.png"),
      width: 1200,
      height: 630,
      scale: 2,
    });
  } finally {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  }
  console.log(`og-image.png written to ${outDir}`);
}

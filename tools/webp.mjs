#!/usr/bin/env node
// Manual one-off tool — NOT part of the build. Generates WebP copies of the
// portrait photos so the page can serve WebP with a JPEG fallback (see the
// <picture> elements in index.html). Re-run it yourself whenever you add or
// swap a maria-*.jpg photo:
//
//   npm run img   -> (re)generate public/maria-*.webp from public/maria-*.jpg
//
// Needs the `cwebp` binary (libwebp): `brew install webp`. Quality 82 is a good
// balance for these photos; bump WEBP_Q if you want them crisper.

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");
const WEBP_Q = 82;

if (spawnSync("cwebp", ["-version"]).error) {
  console.error("cwebp not found. Install it with: brew install webp");
  process.exit(1);
}

const sources = readdirSync(publicDir).filter((f) => /^maria-\d+\.(jpe?g|png)$/i.test(f));

if (sources.length === 0) {
  console.error("No maria-*.{jpg,png} portraits found in public/.");
  process.exit(1);
}

let kb = (n) => `${(n / 1024).toFixed(0)} KB`;

for (const file of sources) {
  const src = join(publicDir, file);
  const out = join(publicDir, file.replace(/\.(jpe?g|png)$/i, ".webp"));
  const res = spawnSync("cwebp", ["-q", String(WEBP_Q), "-quiet", src, "-o", out], {
    stdio: "inherit",
  });
  if (res.status !== 0) {
    console.error(`Failed to convert ${file}`);
    process.exit(1);
  }
  const before = statSync(src).size;
  const after = statSync(out).size;
  const saved = Math.round((1 - after / before) * 100);
  console.log(`${file} ${kb(before)} -> ${kb(after)} webp  (-${saved}%)`);
}

console.log(`\nDone. ${sources.length} file(s) converted.`);

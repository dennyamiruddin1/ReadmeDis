// Copies the onnxruntime-web WASM runtime into public/ort/ so the app can serve
// it same-origin. That keeps it fast on mobile (no CDN round-trip) and lets it
// load under the COOP/COEP headers we set for cross-origin isolation (which in
// turn lets onnxruntime use multiple threads).
//
// Runs automatically via the predev/prebuild npm scripts. The files are also
// committed so a bare `next start` works without this step.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "onnxruntime-web", "dist");
const dest = join(root, "public", "ort");

const FILES = [
  "ort-wasm-simd-threaded.jsep.wasm",
  "ort-wasm-simd-threaded.jsep.mjs",
  "ort-wasm-simd-threaded.wasm",
  "ort-wasm-simd-threaded.mjs",
];

mkdirSync(dest, { recursive: true });
let copied = 0;
for (const file of FILES) {
  try {
    copyFileSync(join(src, file), join(dest, file));
    copied++;
  } catch (err) {
    console.warn(`[sync-ort-wasm] skipped ${file}: ${err.message}`);
  }
}
console.log(`[sync-ort-wasm] ${copied}/${FILES.length} runtime files in public/ort/`);

/* Run: node scripts/ux/test-pwa-r31.mjs */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "../..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const manifest = JSON.parse(read("manifest.webmanifest"));
assert.equal(manifest.start_url, "./index.html");
assert.equal(manifest.scope, "./");
assert.equal(manifest.id, "./");
assert.equal(manifest.display, "standalone");
assert.equal(manifest.lang, "th");
for (const size of [192, 512]) {
  assert(manifest.icons.some((i) => i.sizes === size + "x" + size));
  assert(existsSync(resolve(root, "icons/pwa-" + size + ".png")));
}
assert(existsSync(resolve(root, "icons/pwa-180.png")));
for (const page of ["index.html", "results.html", "standings.html", "review.html", "committee.html", "install.html"]) {
  const content = read(page);
  assert.match(content, /rel="manifest" href="\.\/manifest\.webmanifest"/, page);
  assert.match(content, /js\/pwa\.js/, page);
}
const sw = read("sw.js");
assert.match(sw, /request\.mode !== "navigate"/);
assert.match(sw, /fetch\(request\)\.catch/);
assert.match(sw, /caches\.match\(OFFLINE_URL\)/);
assert(!/cache\.put\(/.test(sw), "PWA must never cache user-facing pages or JSON");
assert(!/public-results\.json/.test(sw), "No public results snapshot in pre-cache");
assert(!/\/data\//.test(sw), "No schedule data in pre-cache");
const offline = read("offline.html");
assert.match(offline, /ไม่มีอินเทอร์เน็ต/);
assert.match(offline, /ไม่แสดงตารางแข่งขัน/);
console.log("R31 PWA structural QA PASS — manifest, icons, offline fallback, network-only data");

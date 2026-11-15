/* Run: node scripts/ux/test-pwa-r31.mjs */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";

const root = resolve(import.meta.dirname, "../..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const manifest = JSON.parse(read("manifest.webmanifest"));
assert.equal(manifest.start_url, "./index.html");
assert.equal(manifest.scope, "./");
assert.equal(manifest.id, "./");
assert.equal(manifest.display, "standalone");
assert.equal(manifest.lang, "th");
// PNG signature/dimensions alone are insufficient: reject truncated or mutated chunks.
function assertValidPng(png, label) {
  let pos = 8;
  let hasData = false;
  let ended = false;
  while (pos + 12 <= png.length) {
    const length = png.readUInt32BE(pos);
    assert(pos + 12 + length <= png.length, label + ": truncated PNG chunk");
    const type = png.toString("ascii", pos + 4, pos + 8);
    const dataEnd = pos + 8 + length;
    let crc = 0xffffffff;
    for (let i = pos + 4; i < dataEnd; i++) {
      crc ^= png[i];
      for (let b = 0; b < 8; b++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    const expected = (crc ^ 0xffffffff) >>> 0;
    assert.equal(png.readUInt32BE(dataEnd), expected, label + ": CRC mismatch " + type);
    pos = dataEnd + 4;
    if (type === "IDAT") hasData = true;
    if (type === "IEND") { ended = true; break; }
  }
  assert(hasData && ended && pos === png.length, label + ": missing IEND or trailing bytes");
}

for (const size of [180, 192, 512]) {
  const file = resolve(root, "icons/pwa-" + size + ".png");
  assert(existsSync(file), "Missing icon " + size);
  const png = readFileSync(file);
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(png.readUInt32BE(16), size, "PNG width mismatch");
  assert.equal(png.readUInt32BE(20), size, "PNG height mismatch");
  assertValidPng(png, "icon " + size);
}
for (const size of [192, 512]) {
  assert(manifest.icons.some((i) => i.sizes === size + "x" + size));
}
for (const page of ["index.html", "results.html", "standings.html", "review.html", "committee.html", "install.html"]) {
  const content = read(page);
  assert.match(content, /rel="manifest" href="\.\/manifest\.webmanifest"/, page);
  assert.match(content, /js\/pwa\.js/, page);
}
const sw = read("sw.js");
new vm.Script(sw, { filename: "sw.js" });
new vm.Script(read("js/pwa.js"), { filename: "pwa.js" });
assert(!/cache\.put\(/.test(sw), "Never cache user-facing pages or data");
assert(!/\/data\//.test(sw), "Do not pre-cache public data");
assert.match(read("offline.html"), /ไม่มีอินเทอร์เน็ต/);

// Functional simulation of installation, navigation and disallowed caching.
const origin = "https://infobwd.github.io";
const scope = origin + "/nongkum-sports-hub/";
const handlers = {};
const saved = new Map();
const cacheNames = new Set(["nongkum-sports-pwa-old"]);
let online = true;
const context = {
  URL,
  self: {
    registration: { scope },
    location: { origin },
    clients: { claim: () => Promise.resolve() },
    addEventListener: (type, callback) => { handlers[type] = callback; }
  },
  caches: {
    open: async (name) => {
      cacheNames.add(name);
      return { addAll: async (urls) => {
        for (const url of urls) saved.set(url, { url, fromCache: true });
      }};
    },
    match: async (url) => saved.get(url) || null,
    keys: async () => [...cacheNames],
    delete: async (name) => cacheNames.delete(name)
  },
  fetch: async (request) => {
    if (!online) throw new Error("offline");
    return { url: request.url, fromNetwork: true };
  },
  Response: { error: () => ({ networkError: true }) }
};
vm.runInNewContext(sw, context);
let installJob;
handlers.install({ waitUntil: (task) => { installJob = task; } });
await installJob;
assert.deepEqual([...saved.keys()].sort(), [
  scope + "offline.html", scope + "icons/pwa-192.png", scope + "icons/pwa-512.png?v=r31-v2"
].sort(), "Only offline page and public icons may be cached");
let activation;
handlers.activate({ waitUntil: (task) => { activation = task; } });
await activation;
assert(!cacheNames.has("nongkum-sports-pwa-old"), "Old versions must be removed");

function dispatch(request) {
  let response = null;
  handlers.fetch({ request, respondWith: (value) => { response = value; } });
  return response;
}
const nav = { method: "GET", mode: "navigate", url: scope + "results.html" };
assert.equal((await dispatch(nav)).fromNetwork, true);
online = false;
assert.equal((await dispatch(nav)).url, scope + "offline.html");
assert.equal(dispatch({ method: "GET", mode: "cors", url: scope + "data/public-results.json" }), null);
assert.equal(dispatch({ method: "GET", mode: "cors", url: scope + "booklet.pdf" }), null);
assert.equal(dispatch({ method: "POST", mode: "navigate", url: scope + "index.html" }), null);
assert.equal(dispatch({ method: "GET", mode: "navigate", url: origin + "/another-app/" }), null);
assert.equal((await dispatch({ method: "GET", mode: "no-cors", url: scope + "icons/pwa-192.png" })).fromCache, true);
console.log("R31 PWA QA PASS — 180/192/512 PNG, manifest, 6 pages, offline, network-only data, scope");

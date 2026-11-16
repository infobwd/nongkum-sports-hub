#!/usr/bin/env node
// R34 static integration checks; no secrets, network or production DB writes.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const get=(p)=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const editor=get("js/r34-card-editor.js");
const css=get("css/r34-card-editor.css");
const api=get("supabase/functions/nongkum-results-editor/index.ts");
const index=get("index.html");
const results=get("results.html");
new vm.Script(editor,{filename:"r34-card-editor.js"});
assert.match(editor,/MutationObserver/);
assert.match(editor,/data-fixture-card/);
assert.match(editor,/data-result-card/);
assert.match(editor,/data-r34-edit/);
assert.match(editor,/localStorage\.setItem\(STORAGE,JSON\.stringify\(state\.session\)\)/);
assert.match(editor,/action/);
assert.match(editor,/base_revision/);
assert.match(editor,/reason_required/);
assert.match(editor,/รับรอง/);
assert.doesNotMatch(editor,/SERVICE_ROLE_KEY|PIN_HASH|SUPABASE_SECRET/);
assert.match(css,/r34-overlay/);
for(const [name,html] of [["index.html",index],["results.html",results]]){
  assert.match(html,/r34-card-editor\.js\?v=r34-2/);
  assert.match(html,/r34-card-editor\.css\?v=r34-2/);
  assert.ok(html.indexOf("r34-card-editor.js")>html.indexOf("js/results-source-r32.js"),name+" must load approved reader first");
}
assert.match(api,/SUPABASE_SERVICE_ROLE_KEY/);
assert.match(api,/ALLOWED_ORIGINS/);
assert.match(api,/wrong_pin|"unlock"/);
assert.match(api,/verify|authorization/i);
assert.doesNotMatch(api,/\bconst\s+PIN\s*=/);
console.log("R34 static UI and security-contract checks passed");

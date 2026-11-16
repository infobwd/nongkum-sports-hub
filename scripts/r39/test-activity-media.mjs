#!/usr/bin/env node
/* R39-C/D: never copy unapproved images or private Drive IDs into the public site. */
import assert from "node:assert/strict";
import {readFileSync,existsSync,statSync} from "node:fs";
import vm from "node:vm";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const manifest=JSON.parse(read("data/public-activity-media.json"));
assert.equal(manifest.schema_version,1);
assert.equal(manifest.approved_only,true);
assert.equal(manifest.source,"organizer-reviewed-public-media-only");
assert.ok(Array.isArray(manifest.entries)&&manifest.entries.length<=236);
assert.deepEqual(Object.keys(manifest).sort(),["approved_only","entries","schema_version","source"].sort());
const ctx={globalThis:{}};new vm.Script(read("js/activity-media-r39.js")).runInNewContext(ctx);
const verified=ctx.globalThis.NongkumActivityMedia.verified;
const fixtureRaw=JSON.parse(read("data/program-from-pdf-2569-20261104-draft.json"));
new vm.Script(read("js/program-corrections.js")).runInNewContext(ctx);
const fixtures=ctx.globalThis.NongkumProgramCorrections.apply(fixtureRaw).fixtures;
assert.equal(fixtures.length,236);
const byId=new Map(fixtures.map(f=>[f.id,f]));
const seen=new Set();
for(const item of manifest.entries){
 assert.equal(verified(item),true,"only explicit approved media");
 assert.deepEqual(Object.keys(item).sort(),["caption","consent_checked","division","event_id","revision","sport_id","src","status"].sort());
 assert.ok(!seen.has(item.event_id),"duplicate activity image ID");seen.add(item.event_id);
 const fixture=byId.get(item.event_id);
 assert.ok(fixture&&fixture.sport_id===item.sport_id&&fixture.division===item.division,"exact fixture join");
 assert.doesNotMatch(JSON.stringify(item),/https?:|drive\.google|file[_-]?id|student|ผู้ถ่าย|ลายเซ็น/i,"no private links or identifiers");
 assert.ok(existsSync(new URL("../../"+item.src,import.meta.url)),"approved derivative must exist");
 assert.ok(statSync(new URL("../../"+item.src,import.meta.url)).size<=350000,"WebP too large");
}
const invalid={status:"review",consent_checked:false,event_id:"test",sport_id:"athletics",division:"12 ปี ชาย",revision:1,src:"assets/activity-approved/test.webp",caption:"ภาพ"};
assert.equal(verified(invalid),false);
assert.equal(verified({...invalid,status:"approved",consent_checked:true,src:"https://drive.google.com/private"}),false);
assert.equal(verified({...invalid,status:"approved",consent_checked:true,src:"../../private.webp"}),false);
console.log("R39 media PASS: curated-only manifest, exact fixture joins, private paths rejected");

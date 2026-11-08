/* R24-I: offline, evidence-first tests. No external service, no approvals/writes. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const json=p=>JSON.parse(read(p));
const model=require(path.join(root,"js/booklet-notes-model.js"));
const register=json("data/booklet-observations-2569.json");
const raw=json("data/program-from-pdf-2569-20261104-draft.json");
const built=model.build(register,raw);
assert.equal(built.notes.length,18,"must show only evidence-grounded grouped observations");
assert.equal(built.source_qa_count,11,"must cover all 11 original source-qa codes");
assert.equal(built.counts.total,18);
assert.equal(built.counts.urgent,2);
assert.equal(built.counts.needs_review,16);
assert.equal(built.counts.web_adjusted,1);
assert.equal(built.counts.reference,1);
assert.equal(raw.fixtures.length,237);
assert.equal(raw.fixtures.filter(f=>f.id!==register.source.excluded_fixture_id).length,236);
assert.equal(raw.fixtures.filter(f=>Array.isArray(f.qa_flags)&&f.qa_flags.length>0).length,70);
assert(!built.notes.some(n=>n.id===register.source.excluded_fixture_id),
  "excluded source-only football fixture must not be presented as active match");
assert.equal(model.filter(built.notes,{priority:"urgent"}).length,2);
assert.equal(model.filter(built.notes,{sport:"petanque",priority:"urgent"}).length,2);
assert.equal(model.filter(built.notes,{state:"web_handled_document_pending"}).length,1);
assert(model.filter(built.notes,{query:"วอลเลย์บอล"}).some(n=>n.id==="PDF69-R02"));
assert(model.filter(built.notes,{query:"PDF69-R08"}).some(n=>n.id==="PDF69-R04"));
assert.equal(model.filter(built.notes,{query:"unlikelyunmatchedxyz"}).length,0);
const sample=built.notes.find(n=>n.id==="PDF69-R04");
assert(sample&&sample.findings.length===2);
assert(model.copyText(sample).includes("ยังไม่ใช่มติรับรอง"));
assert(model.copyText(sample).includes("หลักฐาน/มติจากผู้จัด: (รอกรอก)"));
assert(!model.copyText(sample).includes("ผลการแข่งขัน:"));
assert(built.notes.every(n=>n.evidence.length&&n.evidence.every(e=>e.url.includes("/blob/main/docs/"))));
assert(built.notes.every(n=>n.pages.every(p=>p>=1&&p<=41)));
assert(built.notes.find(n=>n.id==="BOOKLET-COVER-V22B").pages.length===0,
  "cover of integrated booklet must not jump to V2 program page 1");
assert.throws(()=>model.build({...register,source:{...register.source,source_pdf_sha256:"wrong"}},raw),
  /source_contract/);
assert.throws(()=>model.build(register,{...raw,fixtures:raw.fixtures.slice(1)}),
  /source_revision_mismatch/);
assert.throws(()=>model.build({...register,notes:register.notes.slice(1)},raw),
  /source_qa_not_fully_covered/);
assert.throws(()=>model.build({...register,notes:[...register.notes,{...register.notes[0]}]},raw),
  /duplicate_note_id/);
const html=read("booklet-notes.html");
const ui=read("js/booklet-notes.js");
const css=read("css/booklet-notes.css");
const bookletHome=read("booklets.html");
const comparison=read("booklet-comparison.html");
for(const id of ["notesList","notesSearch","notesPriority","notesSport","notesState",
  "notesReset","notesRefresh","notesBackToTop","notesCopyFallback","notesStatus"]){
  assert(html.includes('id="'+id+'"'),"missing UI control "+id);
}
assert(ui.includes('fetch("./data/booklet-observations-2569.json"'));
assert(ui.includes('fetch("./data/program-from-pdf-2569-20261104-draft.json"'));
assert(ui.includes("model.build("),"page must validate source revision");
assert(ui.includes("textContent"),"render text safely");
assert(!/method\s*:\s*["'](?:POST|PUT|PATCH|DELETE)/i.test(ui),"public page must not write");
assert(bookletHome.includes('./booklet-notes.html'));
assert(comparison.includes('./booklet-notes.html'));
assert(css.includes("safe-area-inset-bottom"));
assert(!html.includes("ประกาศผลการแข่งขันจริง"));
const publicResults=json("data/public-results.json");
assert(publicResults.metadata?.approved_only===true,
  "approved-only results policy must remain");
assert.deepEqual(publicResults.results,[],"no fabricated results");
console.log("R24-I PASS: 18 note groups / 11 source flags / 70 original QA rows; 236 active fixtures; copy-only UI and safe links");

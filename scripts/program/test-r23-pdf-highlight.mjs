import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {createHash} from "node:crypto";

const read = p => fs.readFileSync(new URL("../../" + p, import.meta.url));
const json = p => JSON.parse(read(p).toString("utf8"));
const src = json("data/program-from-pdf-2569-20261104-draft.json");
const index = json("data/program-pdf-positions-v2.json");
const pdf = read("assets/souvenir-2569-v2.pdf");
const pdfSha = createHash("sha256").update(pdf).digest("hex");
assert.equal(pdfSha, index.source_sha256, "coordinate index must be pinned to actual source PDF");
assert.equal(index.source_pdf_pages, 41);
assert.equal(index.coordinate_space, "normalized_top_left_cropbox");
assert.equal(index.qa.active_total, 236);
assert.equal(index.qa.match_rows, 186);
assert.equal(index.qa.track_rows, 50);

const excluded = "football-p07-มัธยมหญิง-020-repeated-final";
const active = src.fixtures.filter(x => x.id !== excluded);
assert.equal(src.fixtures.length, 237);
assert.equal(active.length, 236);
assert.deepEqual(new Set(Object.keys(index.entries)), new Set(active.map(x=>x.id)));
assert.equal(index.entries[excluded], undefined);
const rowRect = e => e.rect.map(v => Number(v));
const seen = new Set();
for (const f of active) {
  const e = index.entries[f.id];
  assert.equal(e.page, f.source_pdf?.page ?? f.source_page, f.id + " page mismatch");
  assert.equal(e.number, String(f.source_match_no), f.id + " source number mismatch");
  assert.equal(e.kind, f.kind, f.id + " kind mismatch");
  assert.equal(e.division, f.division, f.id + " division mismatch");
  assert.equal(e.sport_id, f.sport_id, f.id + " sport mismatch");
  const r = rowRect(e);
  assert.equal(r.length, 4);
  assert.ok(r.every(Number.isFinite), f.id);
  assert.ok(r[0]>=0&&r[0]<r[2]&&r[2]<=1&&r[1]>=0&&r[1]<r[3]&&r[3]<=1,f.id);
  const at=e.page+"/"+r.join(",");
  assert.ok(!seen.has(at),"two fixtures cannot highlight one source PDF line: "+f.id);
  seen.add(at);
}
assert.notDeepEqual(index.entries["athletics-p32-035-m"].rect,
  index.entries["athletics-p32-035-f"].rect);
assert.notDeepEqual(index.entries["athletics-p35-048-m"].rect,
  index.entries["athletics-p35-048-f"].rect);
const footballMale = index.entries["football-p07-มัธยมชาย-018"];
assert.equal(footballMale.number,"20");
assert.ok(footballMale.rect[1]>0.90, "male final must highlight last row, not women's duplicate");
assert.equal(index.entries["takraw-p12-12-ปี-ชาย-A-009"].page,12);
assert.equal(index.entries["takraw-p12-12-ปี-ชาย-B-010"].page,13);

const sandbox={window:{}};
vm.runInNewContext(read("js/program-pdf-highlight.js").toString("utf8"),sandbox);
const hilite=sandbox.window.NongkumProgramPdfHighlight;
assert.ok(hilite?.select && hilite?.draw);
const first=active[0];
assert.equal(hilite.select(index,first.id,first.source_pdf.page)?.number,String(first.source_match_no));
assert.equal(hilite.select(index,first.id,first.source_pdf.page+1),null);
assert.equal(hilite.select(index,excluded,7),null);
assert.equal(hilite.select(index,"not-in-index",7),null);
assert.equal(hilite.select({...index,source_sha256:"changed"},first.id,7),null);
assert.equal(hilite.select({...index,source_pdf_pages:155},first.id,7),null);
assert.equal(hilite.select({...index,qa:{...index.qa,unresolved:1}},first.id,7),null);
assert.equal(hilite.select({...index,entries:{...index.entries,[first.id]:{...index.entries[first.id],rect:[.2,.7,.1,.9]}}},first.id,7),null);

// DOM-free drawing regression, dimensions and cleared overlay.
const nodes=[];
const overlay={
 ownerDocument:{createElement(){return {className:"",style:{},setAttribute(){}}}},
 replaceChildren(){nodes.length=0},
 appendChild(v){nodes.push(v)},
 style:{}
};
const canvas={style:{width:"595px",height:"842px"}};
const result=hilite.draw({index,fixtureId:first.id,page:7,
 viewport:{width:595,height:842},overlay,canvas});
assert.ok(result && nodes.length===1);
assert.equal(nodes[0].className,"program-pdf-fixture-highlight");
assert.ok(parseFloat(nodes[0].style.top)>0);
const missing=hilite.draw({index,fixtureId:first.id,page:8,
 viewport:{width:595,height:842},overlay,canvas});
assert.equal(missing,null);
assert.equal(nodes.length,0);

// Prevent regression to the committee's own 64-page coordinate and highlight contract.
const programHtml=read("pdf-viewer.html").toString("utf8");
const committeeHtml=read("committee-pdf-viewer.html").toString("utf8");
const reader=read("js/pdf-viewer.js").toString("utf8");
assert.match(programHtml,/program-pdf-highlight\.js/);
assert.match(programHtml,/pdfHighlightLayer/);
assert.match(programHtml,/program-pdf-highlight\.css/);
assert.match(reader,/NongkumProgramPdfHighlight\.draw/);
assert.match(reader,/NongkumCommitteeHighlight\.draw/);
assert.match(reader,/program-pdf-positions-v2\.json/);
assert.match(reader,/source_pdf_pages !== pdf\.numPages/);
assert.match(committeeHtml,/committee-pdf-highlight\.js/);
assert.match(reader,/souvenir-committee-2569-v3\.pdf/);
assert.match(reader,/souvenir-2569-v2\.pdf/);
const oldProgram=read("js/program.js").toString("utf8");
assert.match(oldProgram,/&amp;from=program&amp;fixture=/);
const oldReview=read("js/review.js").toString("utf8");
assert.match(oldReview,/url\.searchParams\.set\("fixture",f\.id\)/);

console.log("R23 PASS — 236/236 mapped, 186 matches / 50 athletics, SHA pinned,");
console.log("duplicate-final exclusion, repeated numbered headings, viewer and committee regression guards");

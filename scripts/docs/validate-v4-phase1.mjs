#!/usr/bin/env node
// R11C-V4 Phase 1 — read-only validation of the V3 source inventory and six sample contracts.
// Does not write Docs, Sheets, PDFs, public results, or the live website.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const read=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
const json=path=>JSON.parse(read(path));
const outline=json("data/souvenir-v4/source-outline-v1.json");
const samples=json("data/souvenir-v4/sample-page-contracts-v1.json");
const candidate=json("data/program-from-pdf-2569-20261104-draft.json");
const draftRosters=json("data/committee-2569-draft-public-review.json");
const oldCoords=json("data/committee-pdf-positions-v3.json");

assert.equal(outline.schema_version,1);
assert.equal(outline.status,"phase1_source_inventory_only");
assert.equal(outline.source_pdf.pages,64);
assert.equal(outline.working_copy.source_text_page_markers,64);
assert.equal(outline.working_copy.native_tables,0);
assert.equal(outline.working_copy.explicit_page_breaks,0);
assert.equal(outline.working_copy.paragraphs,1953);
assert.equal(outline.working_copy.physical_page_layout_unverified,true);
assert.equal(outline.pages.length,64);
assert.equal(outline.sections.length,8);
const allowedChapters=new Set(outline.sections.map(s=>s.id));
const allowedTemplates=new Set(["cover","ceremony","school_identity","committee_roster","rules_and_groups",
"sports_schedule","sport_group","athletics_lanes","athlete_roster_blank","score_sheet_blank","score_summary"]);
const sourcePages=new Set();
for(const [i,page] of outline.pages.entries()){
  assert.equal(page.source_page_marker,i+1);
  assert.ok(!sourcePages.has(page.source_page_marker));
  sourcePages.add(page.source_page_marker);
  assert.ok(allowedChapters.has(page.chapter),"unknown chapter "+page.chapter);
  assert.ok(allowedTemplates.has(page.template),"unknown template "+page.template);
  assert.ok(["transcription_only_not_page_layout_verified","source_page_visual_qa_required"].includes(page.verification));
  assert.ok(Number.isInteger(page.working_copy_text_chars)&&page.working_copy_text_chars>=0);
}
let mapped=[];
for(const s of outline.sections){
  assert.equal(s.source_pages.length,2);
  const [first,last]=s.source_pages;
  assert.ok(Number.isInteger(first)&&Number.isInteger(last)&&first>=1&&last<=64&&last>=first);
  for(let i=first;i<=last;i++){assert.equal(outline.pages[i-1].chapter,s.id);mapped.push(i)}
}
assert.deepEqual(mapped,Array.from({length:64},(_,i)=>i+1),"source sections must cover 64 pages once");
assert.deepEqual(outline.pages.filter(p=>!p.working_copy_has_readable_body).map(p=>p.source_page_marker),[1,2,61,64]);
assert.equal(samples.schema_version,1);
assert.equal(samples.samples.length,6);
const expectedSamples=[
  ["sample-cover",1,"cover"],
  ["sample-committee",11,"committee_roster"],
  ["sample-football",25,"sports_schedule"],
  ["sample-petanque",36,"sports_schedule"],
  ["sample-athletics",42,"athletics_lanes"],
  ["sample-score-sheet",63,"score_sheet_blank"]
];
for(const [i,[id,page,template]] of expectedSamples.entries()){
 const sample=samples.samples[i];
 assert.equal(sample.id,id);
 assert.equal(sample.v3_source_marker,page);
 assert.equal(sample.template,template);
 assert.ok(sample.bindings.length>1);
 assert.ok(sample.rules.length>1);
 assert.equal(outline.pages[page-1].template,template);
}
assert.equal(candidate.schema_version,3);
assert.equal(candidate.metadata.source_status,"revised_pdf_draft");
assert.equal(candidate.schools.length,8);
assert.equal(candidate.sports.length,9);
assert.equal(candidate.fixtures.length,237);
const uncorrectedCounts={
  matches:candidate.fixtures.filter(x=>x.kind==="match").length,
  athletics:candidate.fixtures.filter(x=>x.kind==="track_event").length
};
assert.deepEqual(uncorrectedCounts,{matches:187,athletics:50});
const candidatesById=new Set(candidate.fixtures.map(x=>x.id));
assert.equal(candidatesById.size,237);
const confirmedRaw=candidate.fixtures.filter(x=>
 x.planning_date_confirmation==="confirmed" &&
 x.planning_time_confirmation==="confirmed" &&
 x.planning_venue_confirmation==="confirmed"
);
assert.equal(confirmedRaw.length,45,"only organizer-confirmed fields count as confirmed");
assert.equal(candidate.metadata.count_confirmed_schedule_rows,45);
const context={globalThis:{}};
vm.runInNewContext(read("js/program-corrections.js"),context,{filename:"js/program-corrections.js"});
const apply=context.globalThis.NongkumProgramCorrections?.apply;
assert.equal(typeof apply,"function");
const corrected=apply(candidate);
assert.equal(candidate.fixtures.length,237,"source PDF extraction must remain immutable");
assert.equal(corrected.fixtures.length,236);
assert.equal(corrected.fixtures.filter(x=>x.kind==="match").length,186);
assert.equal(corrected.fixtures.filter(x=>x.kind==="track_event").length,50);
const excluded="football-p07-มัธยมหญิง-020-repeated-final";
const kept="football-p07-มัธยมหญิง-007";
assert.ok(candidate.fixtures.some(x=>x.id===excluded),"raw PDF source must retain duplicate for audit");
assert.ok(!corrected.fixtures.some(x=>x.id===excluded),"approved correction removes duplicate from print projection");
const final=corrected.fixtures.find(x=>x.id===kept);
assert.equal(final.planning_date,"2026-11-18");
assert.equal(final.planning_date_confirmation,"confirmed");
assert.equal(corrected.fixtures.filter(x=>x.planning_date_confirmation==="confirmed"&&
x.planning_time_confirmation==="confirmed"&&x.planning_venue_confirmation==="confirmed").length,45);
assert.equal(draftRosters.source_sha256,outline.source_pdf.sha256);
assert.equal(draftRosters.entries.length,250);
assert.equal(oldCoords.source_sha256,outline.source_pdf.sha256);
assert.equal(oldCoords.source_pdf_pages,64);
assert.equal(Object.keys(oldCoords.entries).length,250);
// Old R19K rectangles are pinned to V3; they must not be used as V4 geometry.
assert.match(read("docs/R11C_V4_DOCUMENT_BUILDER_PLAN_20261106.md"),/V4.*พิกัดใหม่/);
const result={
 phase:"R11C-V4-source-structure-1",
 status:"PASS",
 source_pdf_pages:64,
 google_docs_text_markers:64,
 native_docs_tables:0,
 native_docs_page_breaks:0,
 outline_sections:8,
 sample_contracts:6,
 raw_events:237,
 corrected_print_events:236,
 corrected_matches:186,
 athletics_events:50,
 confirmed_schedule_rows:45,
 draft_committee_entries:250,
 v4_pdf_created:false,
 live_website_modified:false
};
console.log(JSON.stringify(result,null,2));

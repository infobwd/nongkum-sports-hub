/* R24-K: evidence-bound source-row highlighting and return to the original note. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
const require=createRequire(import.meta.url);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const json=p=>JSON.parse(read(p));
const helper=require(path.join(root,"js/booklet-note-highlight.js"));
const cfg=json("data/booklet-note-targets-v2.json");
const idx=json("data/program-pdf-positions-v2.json");
const reg=json("data/booklet-observations-2569.json");
const raw=json("data/program-from-pdf-2569-20261104-draft.json");
const active=raw.fixtures.filter(f=>f.id!=="football-p07-มัธยมหญิง-020-repeated-final");
assert.equal(active.length,236);
assert.equal(Object.keys(idx.entries).length,236);
assert.equal(reg.notes.length,18);
assert.equal(raw.source_qa.length,11);
assert.equal(cfg.source_pdf_sha256,idx.source_sha256);
assert.equal(cfg.notes_revision,reg.revision);
assert.equal(Object.keys(cfg.groups).length,6);
let total=0, all=[];
for(const [noteId,points] of Object.entries(cfg.groups)){
  const note=reg.notes.find(n=>n.id===noteId);
  assert(note,"every highlighted observation must exist in the source registry");
  const found=helper.resolve(cfg,idx,noteId);
  assert(found&&found.length===points.length,"all points must have verified positions");
  total+=found.length;
  all.push(...found);
  for(const item of found){
    const fixture=active.find(f=>f.id===item.fixture_id);
    assert(fixture,"never point to an excluded or invented fixture");
    assert.equal(fixture.sport_id,note.sport);
    assert.equal(String(fixture.source_match_no),item.number);
    assert(note.pages.includes(item.page),"marked page must be in the observation's sources");
  }
}
assert.equal(total,27,"only 27 source-verified rows are initially targeted");
assert.equal(new Set(all.map(z=>z.fixture_id)).size,27,"no reused target IDs");
assert.deepEqual(Object.keys(cfg.groups).sort(),
  ["PDF69-R01","PDF69-R02","PDF69-R03","PDF69-R04","PDF69-R06","PDF69-R07"].sort());
assert.equal(helper.resolve(cfg,idx,"PDF69-R09"),null);
assert.equal(helper.resolve(cfg,idx,"../etc"),null);
assert(!all.some(z=>z.fixture_id.includes("repeated-final")));
assert.equal(helper.resolve({...cfg,source_pdf_sha256:"invalid"},idx,"PDF69-R04"),null);
assert.equal(helper.resolve(cfg,{...idx,source_pdf_pages:155},"PDF69-R04"),null);
assert.equal(helper.resolve(cfg,{...idx,entries:{}},"PDF69-R04"),null);
const tampered=structuredClone(cfg);
tampered.groups["PDF69-R04"][1].page=18;
assert.equal(helper.resolve(tampered,idx,"PDF69-R04"),null,
  "wrong page must fail rather than highlight a different row");
const badRect=structuredClone(idx);
badRect.entries[cfg.groups["PDF69-R04"][0].fixture_id].rect=[0,0,2,3];
assert.equal(helper.resolve(cfg,badRect,"PDF69-R04"),null,
  "unverified geometry cannot be used");
const petanque=helper.resolve(cfg,idx,"PDF69-R04");
assert.equal(petanque.length,5);
assert.equal(helper.activeForPage(petanque,17,0),0);
assert.equal(helper.activeForPage(petanque,18,0),-1);
const year=helper.resolve(cfg,idx,"PDF69-R03");
assert.equal(helper.activeForPage(year,18,0),3,"point selector respects page 18");
const fakeMarks=[];
const oldDocument=globalThis.document;
globalThis.document={createElement:tag=>({tag,className:"",style:{}})};
try{
  const mock={targets:petanque,page:17,activeIndex:1,
    viewport:{width:600,height:840},overlay:{appendChild:z=>fakeMarks.push(z)},
    canvas:{style:{width:"600px",height:"840px"}}};
  const drawn=helper.draw(mock);
  assert.equal(drawn.count,5);
  assert.equal(drawn.selected,1);
  assert(fakeMarks[1].className.includes("current"));
  assert(fakeMarks.every(z=>Number.parseFloat(z.style.left)>=0));
  assert.equal(helper.draw({...mock,page:18}).count,0);
}finally{globalThis.document=oldDocument;}
const notesJs=read("js/booklet-notes.js");
const viewerJs=read("js/pdf-viewer.js");
const unifiedJs=read("js/booklet-unified-viewer.js");
const notesHtml=read("booklet-notes.html");
const viewerHtml=read("pdf-viewer.html");
const unifiedHtml=read("booklet-drive-viewer.html");
for(const id of ["r24kNoteControls","r24kNoteWarning","r24kNotePrev","r24kNoteNext"]){
  assert(viewerHtml.includes('id="'+id+'"'),"missing note-specific reader control: "+id);
}
assert(viewerHtml.includes("js/booklet-note-highlight.js"));
assert(viewerHtml.includes("css/booklet-note-highlight.css"));
assert(notesJs.includes('"&note="+encodeURIComponent(n.id)'));
assert(notesJs.includes("safeRequestedNote"));
assert(notesJs.includes("scrollIntoView"));
assert(notesJs.includes('จุดที่ต้องตรวจ "+(i+1)'));
assert(viewerJs.includes("booklet-note-targets-v2.json"));
assert(viewerJs.includes("noteHighlighter?.resolve"));
assert(viewerJs.includes("changeNotePoint"));
assert(viewerJs.includes('backUrl.searchParams.set("note",noteId)'));
assert(unifiedJs.includes("booklet-notes.html?note="));
assert(unifiedHtml.includes("r24kBookNotice"));
assert(notesHtml.includes("booklet-note-highlight.css"));
for(const script of [notesJs,viewerJs,unifiedJs]){
  assert(!/method\s*:\s*["'](?:POST|PUT|PATCH|DELETE)/i.test(script),
    "read-only viewer must not write any data");
}
const publicResults=json("data/public-results.json");
assert(publicResults.metadata?.approved_only===true);
assert.deepEqual(publicResults.results,[]);
console.log("R24-K PASS: 18 notes / 6 verified groups / 27 row highlights / 236 active fixtures / safe return and read-only 155 fallback");

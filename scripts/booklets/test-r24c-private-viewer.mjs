import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash,webcrypto} from "node:crypto";
import vm from "node:vm";

const read=p=>readFileSync(new URL("../../"+p,import.meta.url)).toString("utf8");
const source=JSON.parse(read("data/program-from-pdf-2569-20261104-draft.json"));
const roster=JSON.parse(read("data/committee-2569-draft-public-review.json"));
const registry=JSON.parse(read("data/booklet-versions.json"));
const code=read("js/booklet-private-viewer.js");
const html=read("booklet-private-viewer.html");
const booklets=read("js/booklets.js");
const program=read("js/program.js");
const committee=read("js/committee.js");

assert.equal(registry.documents[2].document_status,"draft_review_not_approved");
assert.equal(registry.documents[2].viewer_route,"./booklet-drive-viewer.html");
assert.equal(registry.documents[2].access_mode,"same_origin_reader");
assert.equal(registry.documents[2].approved_at,null);
assert.equal(registry.documents[2].pdf_revision_sha256,
  "9da71db34f092a4a65a1ee2ea05984b343fc03097988854b1debe5251e2fae1a");
assert.match(html,/type="file" id="privatePdf"/);
assert.match(html,/type="file" id="privateMap"/);
assert.match(html,/id="privateOverlay"/);
assert.match(code,/crypto\.subtle\.digest/);
assert.match(code,/PDF_SHA/);
assert.match(code,/MAP_SHA/);
assert.match(code,/sourceRow\(\)/);
assert.match(code,/f\.id !== "football-p07-มัธยมหญิง-020-repeated-final"/);
assert.match(code,/new Uint8Array\(pdfBytes\)/);
assert.match(code,/clearMark\(\)/);
assert.match(code,/getDocument\(\{data:/);
assert.match(booklets,/booklet-private-viewer\.html/);
assert.match(program,/booklet-private-viewer\.html\?fixture=/);
assert.match(committee,/booklet-private-viewer\.html\?entry=/);
assert.match(program,/pdf-viewer\.html\?page=/);
assert.match(committee,/NongkumCommitteePdf\?\.open/);
assert.doesNotMatch(html+booklets+code,/1C1StUK5o1rXeOGzM4mOnvnwCgeuWdPRF/,
  "no private Drive file ID in public repo");
assert.doesNotMatch(html+booklets+code,/https:\/\/drive\.google\.com\/file\/d\//,
  "no unverified private PDF link in public repo");
assert.doesNotMatch(code,/fetch\([^)]*privatePdf|fetch\([^)]*privateMap/,
  "never upload or fetch user-selected files");

// Source-ID identity: 236 active fixtures plus 250 role assignments, not duplicate finals.
const ids=[
 ...source.fixtures.filter(x=>x.id!=="football-p07-มัธยมหญิง-020-repeated-final").map(x=>x.id),
 ...roster.entries.map(x=>x.id)
];
assert.equal(ids.length,486);
const token=id=>"v4"+createHash("sha1").update(id,"utf8").digest("hex").slice(0,12);
const tokens=ids.map(token);
assert.equal(new Set(tokens).size,486);
assert.equal(createHash("sha256").update(tokens.sort().join("\n")).digest("hex"),
  registry.audit_155.anchor_ids_digest_sha256);

// Test validation logic directly without browser and without any private map.
const nodes=new Map();
function node(id){
 if(!nodes.has(id))nodes.set(id,{
  addEventListener(){},setAttribute(){},className:"",style:{},hidden:true,
  files:null,textContent:"",value:"",disabled:false,replaceChildren(){},
  appendChild(){},getContext(){return {};},clientWidth:400,clientHeight:500
 });
 return nodes.get(id);
}
const env={
 document:{getElementById:node,createElement(){return node("element");}},
 location:{search:"?fixture=football-p07-12-ปี-ชาย-006"},
 URLSearchParams,crypto:webcrypto,TextEncoder,ArrayBuffer,Uint8Array,Number,
 window:{addEventListener(){},devicePixelRatio:1},
 console:{warn(){}}
};
vm.runInNewContext(code,env,{filename:"booklet-private-viewer.js"});
const viewer=env.window.NongkumPrivateBooklet;
assert.ok(viewer && viewer.validMap && viewer.verifiedMap);
assert.equal(nodes.get("privateBack").href,"./index.html");
assert.equal(viewer.validMap(null),false);
assert.equal(viewer.validMap({schema_version:1,entries:{}}),false);
const entries={};
for(let i=0;i<486;i++)entries["v4"+i.toString(16).padStart(12,"0")]={page:1,rect:[.1,.2,.8,.22]};
const sample={schema_version:1,document_status:"review_only_not_public",
  source_sha256:"a2a9f47f8bf871403c3995e6b4ebd102802e600fc20c16198eb12ab73b12e89d",page_count:155,anchor_count:486,
  coordinate_space:"normalized_top_left_cropbox",entries};
assert.equal(viewer.validMap(sample),true,"old private viewer still verifies old PDF map");
assert.equal(viewer.validMap({...sample,source_sha256:registry.documents[2].pdf_revision_sha256}),false,"no verified coordinates for the new PDF");
assert.equal(await viewer.verifiedMap(sample),false,"synthetic coordinate layout must not pass checksum");
assert.equal(viewer.validMap({...sample,source_sha256:"f".repeat(64)}),false);
assert.equal(viewer.validMap({...sample,entries:{...entries,[Object.keys(entries)[0]]:{page:160,rect:[.1,.2,.8,.22]}}}),false);
assert.equal(viewer.validMap({...sample,entries:{...entries,[Object.keys(entries)[0]]:{page:1,rect:[.9,.2,.1,.22]}}}),false);
console.log("R24-C PASS: source IDs 236+250, private SHA/coordinate gates, no Drive leak, V2/V3 routes preserved");

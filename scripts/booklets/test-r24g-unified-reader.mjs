import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {webcrypto} from "node:crypto";
const read=p=>fs.readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const registry=JSON.parse(read("data/booklet-versions.json"));
const config=JSON.parse(read("data/booklet-oauth-config.json"));
const html=read("booklet-drive-viewer.html");
const code=read("js/booklet-unified-viewer.js");
const css=read("css/booklet-unified-viewer.css");
const oldViewer=read("js/pdf-viewer.js");
const privateViewer=read("js/booklet-private-viewer.js");
const src=registry.documents[2];
assert.deepEqual(registry.documents.map(d=>d.page_count),[41,64,155]);
assert.equal(src.pdf_revision_sha256,"a2a9f47f8bf871403c3995e6b4ebd102802e600fc20c16198eb12ab73b12e89d");
assert.equal(src.document_status,"draft_review_not_approved");
assert.equal(src.access_mode,"google_drive_permissioned_preview");
assert.equal(src.approved_at,null);
assert.equal(src.source_path,null);
assert.equal(registry.audit_155.anchor_count,486);
assert.equal(registry.audit_155.publication_approved,false);
assert.equal(config.enabled,false,"Google auth must fail closed until owner config");
assert.equal(config.client_id,null,"never invent OAuth client ID");
assert.equal(config.allowed_origin,"https://infobwd.github.io");
assert.equal(config.scope,"https://www.googleapis.com/auth/drive.readonly");
for(const id of ["pdfCanvasHost","pdfCanvas","pdfPrev","pdfNext","pdfPage","pdfTotal",
  "pdfZoomOut","pdfZoomIn","pdfFitWidth","pdfFitPage","pdfBottomBar",
  "r24gGoogle","r24gLocalPdf","r24gMap","r24gStart","r24gStatus"]) {
  assert.match(html,new RegExp('id="'+id+'"'),id+" must be in reader HTML");
}
assert.match(html,/ฉบับตรวจร่าง/);
assert.match(html,/max="155"/);
assert.match(html,/\.\/css\/pdf-viewer\.css/,"reuse existing V2/V3 interface");
assert.match(html,/booklet-unified-viewer\.js/);
assert.match(html,/drive\.google\.com\/file\/d\/1C1StUK5o1rXeOGzM4mOnvnwCgeuWdPRF\/preview/);
assert.match(html,/drive\.google\.com\/file\/d\/1C1StUK5o1rXeOGzM4mOnvnwCgeuWdPRF\/view/);
assert.match(html,/booklet-private-viewer\.html/,"previous private reader must stay");
assert.match(code,/const EXPECTED_PAGES = 155/);
assert.match(code,/legacy\/build\/pdf\.min\.mjs/);
assert.match(code,/legacy\/build\/pdf\.worker\.min\.mjs/);
assert.match(code,/crypto\.subtle\.digest/);
assert.match(code,/verifyPdfBytes\(bytes\)/);
assert.match(code,/body\.arrayBuffer\(\)/);
assert.match(code,/info\.capabilities\?\.canDownload===false/);
assert.match(code,/hasGrantedAllScopes/);
assert.match(code,/requestAccessToken/);
assert.match(code,/alt=media&supportsAllDrives=true/);
assert.match(code,/authorization|Authorization/);
assert.match(code,/r24g-selected/);
assert.match(code,/const MAP_SHA = "4ca526eb48e2e21edb72e38dc5e474429f52a3e62f8d73fd635e1329b1410e90"/);
assert.match(code,/sourceId/);
assert.match(code,/Number\(raw\)/);
assert.match(code,/touchstart/);
assert.match(code,/touchmove/);
assert.match(code,/touchend/);
assert.match(code,/setPage/);
assert.match(code,/8_000_000/,"canvas memory cap");
assert.match(css,/r24g-highlight-layer/);
assert.doesNotMatch(code,/localStorage|sessionStorage|indexedDB|document\.cookie|api[_-]?key/i);
assert.doesNotMatch(code,/\bclient_secret\b|anyoneWithLink|\bsetPermission\b/);
assert.match(oldViewer,/souvenir-2569-v2\.pdf/);
assert.match(oldViewer,/souvenir-committee-2569-v3\.pdf/);
assert.match(privateViewer,/const PDF_SHA = "a2a9f47f8bf871403c3995e6b4ebd102802e600fc20c16198eb12ab73b12e89d"/);

const events=new Map(),nodes=new Map();
function node(id){
  if(!nodes.has(id)) nodes.set(id,{
    id,hidden:false,disabled:false,style:{},value:"",textContent:"",dataset:{},
    files:[],addEventListener(type,cb){events.set(id+":"+type,cb);},
    setAttribute(){},append(){},replaceChildren(){},
    getContext(){return {};},clientWidth:420,clientHeight:750
  });
  return nodes.get(id);
}
const context={
  document:{getElementById:node,createElement(){return node("generated");},
    head:{append(){}},addEventListener(){},activeElement:{tagName:"BODY"}},
  location:{origin:"https://infobwd.github.io",search:"?page=100",href:"https://infobwd.github.io/nongkum-sports-hub/booklet-drive-viewer.html?page=100"},
  window:{addEventListener(){},devicePixelRatio:2},
  URLSearchParams,URL,Number,String,Array,ArrayBuffer,Uint8Array,TextEncoder,
  crypto:webcrypto,setTimeout,clearTimeout,console:{},history:{replaceState(){}},
  fetch:async()=>({ok:true,json:async()=>config})
};
vm.runInNewContext(code,context,{filename:"booklet-unified-viewer.js"});
const lib=context.window.NongkumUnifiedBooklet;
assert.ok(lib,"pure 155-page validators exported for QA");
for(const [input,expected] of [["1",1],["99",99],["100",100],["155",155],["156",155],["0",1],["-1",1],["abc",1],["1000",1]])
  assert.equal(lib.parsePage(input),expected,"page "+input);
assert.equal(nodes.get("pdfBack").href,undefined,"normal entry uses catalog href from HTML");
assert.equal(lib.validMap(null),false);
assert.equal(lib.validMap({schema_version:1,entries:{}}),false);
const entries={};
for(let i=0;i<486;i++)entries["v4"+i.toString(16).padStart(12,"0")]={page:100,rect:[.1,.2,.8,.22]};
const map={schema_version:1,document_status:"review_only_not_public",
 source_sha256:src.pdf_revision_sha256,page_count:155,anchor_count:486,
 coordinate_space:"normalized_top_left_cropbox",entries};
assert.equal(lib.validMap(map),true,"486 structurally valid private coordinates");
assert.equal(await lib.verifiedMap(map),false,"synthetic map must fail pinned digest");
assert.equal(lib.validMap({...map,anchor_count:485}),false);
assert.equal(lib.validMap({...map,entries:{...entries,[Object.keys(entries)[0]]:{page:156,rect:[.1,.2,.8,.22]}}}),false);
assert.equal(lib.validMap({...map,source_sha256:"f".repeat(64)}),false);
await assert.rejects(lib.verifyPdfBytes(new ArrayBuffer(200)),/not_pdf/);
const fake=new TextEncoder().encode("%PDF-"+ "x".repeat(400)).buffer;
await assert.rejects(lib.verifyPdfBytes(fake),/pdf_revision/);
console.log("R24-G PASS: V2/V3 unchanged, 155 page navigation, fallback preserved, no public PDF, SHA+486 private-map gates, OAuth disabled by default");

// R19-I: committee PDF V3 same-origin reader, routing, return focus and source integrity.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import vm from "node:vm";

const read=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
const pdf=readFileSync(new URL("../../assets/souvenir-committee-2569-v3.pdf",import.meta.url));
const sourceHash="0f0083bc349b2b0176cbeaa66a09e88e883aeb1cd4078c954582782e5e2bc1ba";
assert.equal(pdf.length,2753439);
assert.equal(createHash("sha256").update(pdf).digest("hex"),sourceHash);
assert.equal(pdf.subarray(0,5).toString(),"%PDF-");
const roster=JSON.parse(read("data/committee-2569-draft-public-review.json"));
assert.equal(roster.source_sha256,"cab4c65eb15d5480d63da00a81a2e662f8c7857e0ae39ea80475733f5bc795e0");
assert.equal(roster.editorial_correction.corrected_pdf_sha256,sourceHash);
assert.equal(roster.source_pdf_pages,"6–16");
const committeeHtml=read("committee.html");
const entryHtml=read("committee-pdf-viewer.html");
const fixtureHtml=read("pdf-viewer.html");
const pdfJs=read("js/pdf-viewer.js");
const previewJs=read("js/committee-pdf-preview.js");
const committeeJs=read("js/committee.js");
const css=read("css/committee.css");
assert.match(committeeHtml,/id="committeePdfDialog"/);
assert.match(committeeHtml,/id="committeePdfFrame"/);
assert.match(committeeHtml,/id="committeePdfContext"/);
assert.doesNotMatch(committeeHtml,/<iframe[^>]+src=/);
assert.match(entryHtml,/\.\/js\/pdf-viewer\.js\?v=r19k2/);
assert.match(fixtureHtml,/\.\/js\/pdf-viewer\.js\?v=r14-book1/);
assert.match(pdfJs,/const EXPECTED_PAGES = 41/);
assert.match(pdfJs,/const DOCUMENT_PAGES = isCommittee \? 64 : EXPECTED_PAGES/);
assert.match(pdfJs,/const PDF_URL = isCommittee \?/);
assert.match(pdfJs,/assets\/souvenir-committee-2569-v3\.pdf/);
assert.match(pdfJs,/const backUrl = new URL\(isCommittee \?/);
assert.match(pdfJs,/if \(!isCommittee && fixtureRef\.length <= 180/);
assert.doesNotMatch(pdfJs,/searchParams\.get\("file"\)/);
assert.match(committeeJs,/NongkumCommitteePdf\?\.open\(Number\(row\.pdf_page\),row\)/);
assert.match(css,/\.committee-pdf-dialog\[open\]\{display:flex/);
assert.match(css,/height:100dvh/);
new vm.Script(pdfJs);
new vm.Script(previewJs);

function element(id){
  return {id,open:false,handlers:{},value:"",href:"",src:undefined,
    isConnected:true,textContent:"",focused:0,
    addEventListener(type,callback){this.handlers[type]=callback;},
    focus(){this.focused++;},
    removeAttribute(name){delete this[name];},
    showModal(){this.open=true;},
    close(){this.open=false;this.handlers.close?.();}
  };
}
const ids=["committeePdfDialog","committeePdfFrame","committeePdfExternal","committeePdfContext","committeePdfOpen","committeePdfClose"];
const elements=Object.fromEntries(ids.map(id=>[id,element(id)]));
elements.committeePdfFrame.contentWindow={};
const events={};
const location=new URL("https://example.test/nongkum/committee.html");
const document={activeElement:elements.committeePdfOpen,getElementById(id){return elements[id]??null;}};
const window={addEventListener(type,fn){events[type]=fn;},open(){}};
const ctx=vm.createContext({window,document,location,URL,Number});
new vm.Script(previewJs).runInContext(ctx);
assert.equal(elements.committeePdfDialog.open,false);
assert.equal(elements.committeePdfFrame.src,undefined);
window.NongkumCommitteePdf.open(8);
assert.equal(elements.committeePdfDialog.open,true);
let url=new URL(elements.committeePdfFrame.src);
assert.equal(url.pathname,"/nongkum/committee-pdf-viewer.html");
assert.equal(url.searchParams.get("doc"),"committee");
assert.equal(url.searchParams.get("page"),"8");
assert.equal(url.searchParams.get("embedded"),"1");
assert.match(elements.committeePdfContext.textContent,/8 จาก 64/);
assert.match(elements.committeePdfExternal.href,/#page=8$/);
assert.equal(elements.committeePdfClose.focused,1);
events.message({origin:"https://evil.test",source:elements.committeePdfFrame.contentWindow,
  data:{type:"nongkum:close-pdf-viewer"}});
assert.equal(elements.committeePdfDialog.open,true,"reject cross-origin close");
events.message({origin:location.origin,source:{},
  data:{type:"nongkum:close-pdf-viewer"}});
assert.equal(elements.committeePdfDialog.open,true,"reject unknown iframe source");
events.message({origin:location.origin,source:elements.committeePdfFrame.contentWindow,
  data:{type:"nongkum:close-pdf-viewer"}});
assert.equal(elements.committeePdfDialog.open,false);
assert.equal(elements.committeePdfFrame.src,undefined);
assert.equal(elements.committeePdfOpen.focused,1);
window.NongkumCommitteePdf.open(16);
assert.equal(new URL(elements.committeePdfFrame.src).searchParams.get("page"),"16");
window.NongkumCommitteePdf.close();
window.NongkumCommitteePdf.open(65);
assert.equal(new URL(elements.committeePdfFrame.src).searchParams.get("page"),"1","reject invalid physical PDF page");
window.NongkumCommitteePdf.close();
console.log("R19-I PASS: V3 PDF hash, lazy iframe, direct-page navigation, secure return, preserved 41-page program reader");

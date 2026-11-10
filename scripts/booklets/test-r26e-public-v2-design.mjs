import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import vm from "node:vm";
import {assembleR26E,PDF_SHA,PDF_BYTES,PATHS} from "./r26e-pdf-bundle.mjs";
const raw=p=>readFileSync(new URL("../../"+p,import.meta.url));
const txt=p=>raw(p).toString("utf8");
const registry=JSON.parse(txt("data/booklet-versions.json"));
const pdf=assembleR26E();
assert.equal(pdf.length,PDF_BYTES);
assert.equal(createHash("sha256").update(pdf).digest("hex"),PDF_SHA);
assert.equal(PATHS.length,3);
assert.equal(registry.documents[0].pdf_revision_sha256,
 "1cd0d0166fe202b2b69e18f5ec2e1c2d80439386767a1826bf21d7d5da9e0bbf",
 "original source PDF must remain pinned");
assert.equal(createHash("sha256").update(raw("assets/souvenir-2569-v2.pdf")).digest("hex"),
 registry.documents[0].pdf_revision_sha256,"original highlight PDF must remain byte-identical");
assert.equal(registry.documents[0].viewer_route,"./pdf-viewer.html?page=1");
assert.equal(registry.documents[0].approved_at,null);
assert.equal(registry.documents[2].pdf_revision_sha256,
 "9da71db34f092a4a65a1ee2ea05984b343fc03097988854b1debe5251e2fae1a",
 "the 155-page integrated book must stay unchanged");
assert.equal(registry.audit_155.publication_approved,false);
const viewer=txt("js/pdf-v2-design-viewer.js");
const html=txt("pdf-v2-design-viewer.html");
const catalog=txt("js/booklets.js");
const catalogHtml=txt("booklets.html");
const review=txt("review.html");
const original=txt("js/pdf-viewer.js");
const program=txt("js/program.js");
const notes=txt("js/booklet-note-highlight.js");
new vm.Script(viewer);
assert.match(viewer,/const PAGE_COUNT=41/);
assert.match(viewer,/const PDF_BYTES=1271633/);
assert.match(viewer,/const PDF_SHA="40d04daba7c1b7b5d655e6973989bec54c89c84a7b2832ba4700cd81f059b84f"/);
assert.match(viewer,/crypto\.subtle\.digest\("SHA-256"/);
assert.match(viewer,/if\(digest!==PDF_SHA\)throw Error\("pdf_revision_mismatch"\)/);
assert.match(viewer,/pdfjs\.getDocument\(\{data:new Uint8Array\(source\)\}\)/);
assert.match(viewer,/if\(doc\.numPages!==PAGE_COUNT\)/);
assert.match(viewer,/fetch\(path\+"\?v=r26e1"/);
assert.match(viewer,/atob\(encoded\)/);
assert.match(viewer,/touchstart/);
assert.match(viewer,/touchend/);
assert.match(viewer,/PDF_JS=/);
assert.match(viewer,/PDF_WORKER=/);
assert.doesNotMatch(viewer,/localStorage|sessionStorage|indexedDB|Bearer |client_secret/);
assert.doesNotMatch(viewer,/NongkumProgramPdfHighlight|program-pdf-positions-v2|booklet-note-highlight/);
for(const id of ["pdfCanvas","pdfPage","pdfNext","pdfPrev","pdfZoomIn","pdfZoomOut",
"pdfFitWidth","pdfFitPage","pdfStatus","pdfFailure","designDownload","pdfRetry"]) {
 assert.match(html,new RegExp('id="'+id+'"'),"missing UI "+id);
}
assert.match(html,/ฉบับตรวจร่าง/);
assert.match(html,/\.\/pdf-viewer\.html\?page=1/,"visible original reader fallback");
assert.match(html,/\.\/js\/pdf-v2-design-viewer\.js\?v=r26e1/);
assert.match(catalog,/redesigned\?"\.\/pdf-v2-design-viewer\.html\?page=1":allowedRoutes/);
assert.match(catalog,/source\.href=allowedRoutes\[doc\.version_id\]/);
assert.match(catalogHtml,/js\/booklets\.js\?v=r26e1/);
assert.match(review,/href="\.\/pdf-v2-design-viewer\.html\?page=1"/);
assert.match(review,/href="\.\/pdf-viewer\.html\?page=1"/);
assert.match(review,/souvenir-2569-v2\.pdf/,"source PDF download remains");
assert.match(original,/assets\/souvenir-2569-v2\.pdf/);
assert.match(original,/NongkumProgramPdfHighlight\.draw/);
assert.match(original,/NongkumBookletNoteHighlight|noteHighlighter/);
assert.match(program,/\.\/pdf-viewer\.html\?page=/,"match deep links still use original SHA-pinned reader");
assert.match(notes,/1cd0d0166fe202b2b69e18f5ec2e1c2d80439386767a1826bf21d7d5da9e0bbf/);
console.log("R26-E PASS: redesigned 41-page PDF exact SHA + new general viewer; original 236 highlights and 155-page book unchanged");

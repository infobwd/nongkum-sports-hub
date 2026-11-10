import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {assembleR25E} from "./r25e-pdf-bundle.mjs";

const load=p=>readFileSync(new URL("../../"+p,import.meta.url));
const text=p=>load(p).toString("utf8");
const json=p=>JSON.parse(text(p));
const registry=json("data/booklet-versions.json");
const html=text("booklets.html");
const home=text("index.html");
const js=text("js/booklets.js");
const raw=json("data/program-from-pdf-2569-20261104-draft.json");
const roster=json("data/committee-2569-draft-public-review.json");

assert.equal(registry.schema_version,1);
assert.equal(registry.documents.length,3);
assert.deepEqual(registry.documents.map(d=>d.version_id),[
  "program-v2","committee-v3","integrated-v42i10-g2"
]);
const [v2,v3,book]=registry.documents;
assert.equal(v2.page_count,41);
assert.equal(v3.page_count,64);
assert.equal(book.page_count,155);
assert.equal(v2.viewer_route,"./pdf-viewer.html?page=1");
assert.equal(v3.viewer_route,"./committee-pdf-viewer.html?page=1");
assert.equal(book.viewer_route,"./booklet-drive-viewer.html");
assert.equal(book.source_path,"assets/r25d3-155pages/part-01.b64");
assert.equal(book.document_status,"draft_review_not_approved");
assert.equal(book.access_mode,"same_origin_reader");
assert.equal(book.availability,"available");
assert.equal(book.approved_at,null);
assert.equal(registry.audit_155.publication_approved,false);
assert.equal(registry.audit_155.anchor_count,486);
assert.equal(registry.audit_155.position_parity_against_baseline,null,"new table pages require new coordinates");
for (const d of registry.documents) {
  assert.match(d.pdf_revision_sha256,/^[a-f0-9]{64}$/);
  assert.equal(d.approved_at,null);
}
const hash=p=>createHash("sha256").update(load(p)).digest("hex");
assert.equal(hash(v2.source_path),v2.pdf_revision_sha256,"V2 exact file SHA");
assert.equal(hash(v3.source_path),v3.pdf_revision_sha256,"V3 exact file SHA");
assert.equal(createHash("sha256").update(assembleR25E()).digest("hex"),book.pdf_revision_sha256,"new Design V2 PDF must match 7-part SHA");
const active=raw.fixtures.filter(f=>f.id!=="football-p07-มัธยมหญิง-020-repeated-final");
assert.equal(raw.fixtures.length,237);
assert.equal(active.length,236);
assert.equal(roster.entries.length,250);
const ids=[...active.map(f=>f.id),...roster.entries.map(r=>r.id)];
assert.equal(new Set(ids).size,486,"all 486 source IDs unique");
const anchors=ids.map(id=>"v4"+createHash("sha1").update(id,"utf8").digest("hex").slice(0,12)).sort();
assert.equal(new Set(anchors).size,486,"no truncated SHA1 token collisions");
const tokenDigest=createHash("sha256").update(anchors.join("\n"),"utf8").digest("hex");
assert.equal(tokenDigest,registry.audit_155.anchor_ids_digest_sha256,
  "private 155-page PDF anchors must represent precisely the 236 active fixture IDs and 250 committee row IDs");

assert.match(home,/href="\.\/booklets\.html"/,"existing More menu must link to new document catalog");
assert.match(home,/<summary class="program-more-trigger">เพิ่มเติม/);
assert.match(html,/id="bookletsList"/);
assert.match(html,/id="bookletsStatus"/);
assert.match(html,/role="note"/);
assert.match(html,/js\/booklets\.js\?v=r26e1/);
assert.match(js,/textContent\s*=/,"untrusted document labels render as safe text");
assert.match(js,/const allowedRoutes/,"route allowlist, not user-provided URLs");
assert.match(js,/doc.viewer_route==="\.\/booklet-drive-viewer\.html"/,"155-page route must be an explicit allowlist");
assert.doesNotMatch(html+js+JSON.stringify(registry),/1C1StUK5o1rXeOGzM4mOnvnwCgeuWdPRF/,
  "no restricted Google Drive file ID in published source");
assert.doesNotMatch(html+js+JSON.stringify(registry),/https:\/\/drive\.google\.com\/file\/d\//,
  "do not publish the 155-page direct Drive URL before permission verification");
const viewer=text("js/pdf-viewer.js");
assert.match(viewer,/souvenir-2569-v2\.pdf/);
assert.match(viewer,/souvenir-committee-2569-v3\.pdf/);
assert.match(viewer,/NongkumProgramPdfHighlight\.draw/);
assert.match(viewer,/NongkumCommitteeHighlight\.draw/);

console.log("R24-A/B PASS: V2/V3 unchanged; 155-page public review PDF exact SHA, still draft");
console.log("R24-B source crosswalk PASS: 236 fixture + 250 committee IDs = 486 PDF anchors, digest "+tokenDigest);

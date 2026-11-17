#!/usr/bin/env node
// R42: public UI-only regression; no Supabase write or student media.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const pages=new Map([
 ["index.html","mobileProgramLink"],
 ["results.html","mobileResultsLink"],
 ["standings.html","mobileResultsLink"],
 ["activity-photos.html","mobileGalleryLink"],
 ["upload-photos.html","mobileMoreLink"],
 ["review-photos.html","mobileMoreLink"],
 ["more.html","mobileMoreLink"]
]);
for(const [file,activeId] of pages){
 const html=read(file);
 assert.match(html,/<meta name="viewport"/);
 assert.match(html,/family=Noto\+Sans\+Thai/,"Thai font needs to be requested on "+file);
 assert.match(html,/\.\/css\/base\.css/);
 assert.match(html,/\.\/css\/app-shell-r42\.css\?v=r42-1/);
 assert.equal((html.match(/id="mobileTabNav"/g)||[]).length,1,"one mobile nav on "+file);
 for(const id of ["mobileProgramLink","mobileResultsLink","mobileGalleryLink","mobileMoreLink"])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,file+" should have "+id);
 const hrefs=["index.html","results.html","activity-photos.html","more.html"];
 for(const fileName of hrefs)assert.ok(html.includes('href="./'+fileName+'"'),file+" links "+fileName);
 const nav=html.match(/<nav id="mobileTabNav"[\s\S]*?<\/nav>/)?.[0];
 assert.ok(nav,"nav exists on "+file);
 assert.equal((nav.match(/aria-current="page"/g)||[]).length,1,"single active tab on "+file);
 assert.match(nav,new RegExp('id="'+activeId+'"[^>]+aria-current="page"'),"active tab on "+file);
 assert.equal((nav.match(/<a /g)||[]).length,4,"four native anchors on "+file);
}
for(const file of ["index.html","results.html","standings.html"]){
 const s=read(file);
 assert.match(s, /id="mobileProgramLink" data-nav-view="program"/);
 assert.match(s, /id="mobileResultsLink" data-nav-view="results"/);
}
const css=read("css/app-shell-r42.css");
assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
assert.match(css,/var\(--safe-bottom\)/);
assert.match(css,/max-width:360px/);
assert.match(css,/\.gallery-shortcuts/);
assert.match(read("activity-photos.html"),/href="\.\/upload-photos\.html"/);
assert.match(read("activity-photos.html"),/href="\.\/review-photos\.html"/);
assert.match(read("more.html"),/href="\.\/review-results\.html"/);
assert.match(read("more.html"),/href="\.\/committee\.html"/);
assert.match(read("more.html"),/href="\.\/review\.html"/);
assert.match(read("js/activity-gallery-r40g.js"),/ยังไม่ระบุวันที่แข่งขัน/);
assert.doesNotMatch(read("js/activity-gallery-r40g.js"),/ยังไม่มีวันที่แข่งขันที่ยืนยัน/);
const oldNav=read("js/navigation.js");
assert.match(oldNav,/target!=="program"&&target!=="results"/,"unchanged R6 filter deep link contract");
assert.match(read("upload-photos.html"),/photoUploadForm/);
assert.match(read("review-photos.html"),/photoReviewLoginForm/);
assert.match(read("results.html"),/resultsList/);
console.log("R42 PASS: same Thai font, four mobile tabs, native links and unchanged private photo gates");

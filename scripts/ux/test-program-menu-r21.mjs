// R21: static regression of the mobile-first secondary menu and plain-language program page.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const html=read("index.html");
const css=read("css/program-more.css");
const program=read("js/program.js");
const base=read("css/base.css");
const workflow=read(".github/workflows/validate.yml");

assert.match(html,/href="\.\/css\/program-more\.css\?v=r21-1"/);
const menu=html.match(/<details class="program-more">([\s\S]*?)<\/details>/)?.[0];
assert.ok(menu,"top header must have native keyboard-accessible details menu");
assert.match(menu,/<summary class="program-more-trigger">เพิ่มเติม/);
assert.match(menu,/<nav class="program-more-panel" aria-label="เอกสารและข้อมูลเพิ่มเติม">/);
for(const [url,label] of [
 ["./review.html","สูจิบัตรและตรวจข้อมูล"],
 ["./committee.html","รายชื่อและหน้าที่กรรมการ"]
]){
 assert.match(menu,new RegExp('href="'+url.replaceAll(".","\\.")+'"'));
 assert.ok(menu.includes(label),"missing plain-language menu label: "+label);
 assert.equal((html.match(new RegExp('href="'+url.replaceAll(".","\\.")+'"','g'))||[]).length,1,
  "secondary link should appear only in the menu: "+url);
}
assert.doesNotMatch(html,/aria-labelledby="revisedPdfReviewTitle"|aria-labelledby="committeeReportLinkTitle"/,
 "large secondary panels must not be before the schedule");
assert.ok(html.indexOf('class="program-more"')<html.indexOf('id="programListing"'));
for(const id of ["school","sports","advancedFilters","scheduleDaySwitch","scheduleDateOptions",
 "refreshProgram","programRefreshStatus","cards","sharedFixture","showFullSchedule","mobileTabNav",
 "scheduleVerificationSummary","scheduleVerificationCounts"]){
 assert.ok(html.includes('id="'+id+'"'),"essential existing program control missing: "+id);
}
assert.match(html,/href="\.\/index\.html"/);
assert.match(html,/href="\.\/results\.html"/);
assert.match(html,/id="refreshProgram"[^>]*>↻ อัปเดต/);
assert.match(html,/ตัวเลือกเพิ่มเติม/);
assert.doesNotMatch(html,/ข้อมูลตรวจรับ P2|คู่มือ Google Sheets P2/);
assert.match(program,/\.\/pdf-viewer\.html\?page=/,"per-match PDF deep-link must remain");
assert.match(program,/NongkumPageRefresh/,"pull-to-refresh integration must remain");
assert.match(program,/verificationCounts:optionalElement/);
assert.match(program,/ยืนยันวันและเวลาแล้ว/);
assert.match(program,/scheduleVerificationCounts/);
assert.doesNotMatch(program,/safe\(m\.qa_flags\.join\(/,
 "raw QA codes should not leak into general public labels");
assert.match(css,/\.program-more-trigger:focus-visible/);
assert.match(css,/\.program-more-link:focus-visible/);
assert.match(css,/min-height:44px/);
assert.match(css,/@media\(max-width:690px\)/);
assert.match(css,/brand-tools>\.mode\{display:none\}/);
assert.doesNotMatch(css,/position:fixed/,"menu must not be another fixed overlay");
assert.match(base,/\.mobile-nav\{[\s\S]*position:fixed;bottom:0/);
assert.match(workflow,/test-program-menu-r21\.mjs/);
new vm.Script(program);
console.log("PASS R21: compact top menu, legacy deep links/filters/refresh/tabs, mobile focus and plain-language copy");

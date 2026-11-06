// R11D standalone read-only preview — deterministic data and UI contract tests.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const read = file => readFileSync(new URL("../../"+file,import.meta.url),"utf8");
const pdf = JSON.parse(read("data/program-from-pdf-2569-20261104-draft.json"));
const legacy = JSON.parse(read("data/draft-schedule.json"));
const diff = JSON.parse(read("data/reconciliation/r11a-program-diff-20261104.json"));
const modelJs = read("js/review-model.js");
const pageJs = read("js/review.js");
const sharedJs = read("js/shared.js");
const html = read("review.html");
const main = read("index.html");
const css = read("css/review.css");
const base = read("css/base.css");
new vm.Script(modelJs,{filename:"js/review-model.js"});
new vm.Script(pageJs,{filename:"js/review.js"});
new vm.Script(sharedJs,{filename:"js/shared.js"});
const ctx=vm.createContext({console, URL, URLSearchParams, location:new URL("https://example.test/nongkum-sports-hub/review.html")});
new vm.Script(sharedJs).runInContext(ctx);
new vm.Script(modelJs).runInContext(ctx);
const M=ctx.NongkumReviewModel, NK=ctx.Nongkum;
assert.ok(M&&NK,"review read-only model and shared helpers load in VM");
assert.equal(M.REVISION,"pdf69-20261104-draft-r11a");
assert.equal(M.SOURCE_PATH,"./data/program-from-pdf-2569-20261104-draft.json");
assert.equal(M.DIFF_PATH,"./data/reconciliation/r11a-program-diff-20261104.json");
assert.equal(M.validate(pdf),pdf);
assert.equal(pdf.metadata.all_data_approved,false);
assert.equal(pdf.metadata.website_publication_status,"not_released");
assert.equal(pdf.fixtures.length,237);
assert.equal(legacy.fixtures.length,236);
assert.equal(diff.summary.candidate_total,237);
assert.equal(diff.summary.changed_core_count,181);
const ids=new Set(pdf.fixtures.map(f=>f.id));
assert.equal(ids.size,237,"every fixture ID must be unique");
assert.ok(legacy.fixtures.every(f=>ids.has(f.id)),"all 236 legacy IDs remain, protecting existing link mapping");
assert.equal(pdf.fixtures.filter(f=>f.kind==="match").length,187);
const track=pdf.fixtures.filter(f=>f.kind==="track_event");
assert.equal(track.length,50);
assert.equal(track.reduce((n,f)=>n+(f.lanes?.length||0),0),289);
const flagged=pdf.fixtures.filter(M.hasQa);
assert.equal(flagged.length,70);
const all=M.filterItems(pdf.fixtures,{},NK.classifyLevel);
assert.equal(all.length,237);
assert.equal(M.filterItems(pdf.fixtures,{qaOnly:true},NK.classifyLevel).length,70);
assert.equal(M.filterItems(pdf.fixtures,{sport:"athletics"},NK.classifyLevel).length,50);
assert.equal(M.filterItems(pdf.fixtures,{sport:"football"},NK.classifyLevel).length,21);
assert.ok(M.filterItems(pdf.fixtures,{search:"หนองกระทุ่ม"},NK.classifyLevel).length>0);
for(const school of pdf.schools){
  const selected=M.filterItems(pdf.fixtures,{school:school.id},NK.classifyLevel);
  assert.ok(selected.length>0, "school must have one or more matches/lanes: "+school.id);
  assert.ok(selected.every(f=>M.schoolMatches(f,school.id)),
    "school filter must never infer a future winner school");
}
const athleticsWithSchool=track.find(f=>(f.lanes||[]).some(l=>l.school_id));
assert.ok(athleticsWithSchool&&M.schoolMatches(athleticsWithSchool,athleticsWithSchool.lanes[0].school_id));
const threeAnomalies=pdf.fixtures.filter(f=>f.source_pdf?.source_date_text==="17 พ.ย. 68");
assert.equal(threeAnomalies.length,3);
assert.ok(threeAnomalies.every(f=>f.draft_date===null&&M.sourceDate(f)==="17 พ.ย. 68"),
  "must show source year 2568 exactly, never auto-normalize");
const planning=pdf.fixtures.filter(M.hasConfirmedPlanning);
assert.equal(planning.length,45);
assert.deepEqual(
  [...new Set(planning.map(f=>f.planning_date))].sort(),
  ["2026-11-12","2026-11-13","2026-11-16"]
);
assert.equal(planning.filter(f=>[8,14].includes(f.source_page)).length,21);
assert.equal(pdf.fixtures.filter(f=>f.planning_venue_confirmation==="confirmed"&&f.planning_venue==="โรงเรียนบ้านหนองกระทุ่ม").length,237);
assert.ok(planning.every(f=>f.planning_venue==="โรงเรียนบ้านหนองกระทุ่ม"));
assert.equal(M.thaiDate("2026-11-12"),"12 พ.ย. 2569");
const repeated=pdf.fixtures.find(f=>f.id==="football-p07-มัธยมหญิง-020-repeated-final");
assert.ok(repeated&&M.hasQa(repeated));
const issue=M.formatIssue(repeated,"ฟุตบอล");
assert.match(issue,/รหัสรายการ: football-p07-มัธยมหญิง-020-repeated-final/);
assert.match(issue,/เลขชุดข้อมูล: pdf69-20261104-draft-r11a/);
assert.match(issue,/หน้าในสูจิบัตร: 7/);
assert.match(issue,/พบข้อมูลที่ไม่ตรง:/);
assert.match(issue,/ควรแก้เป็น:/);
assert.doesNotMatch(issue,/อนุมัติแล้ว|รับรองแล้ว/);
for(const id of [
  "reviewSchool","reviewSport","reviewLevel","reviewSearch","reviewQaOnly","reviewCount",
  "reviewCards","reviewMore","reviewDirect","reviewDirectCard","reviewDirectError",
  "reviewRefresh","reviewLoadFailure","retryReview","reviewSkeleton","reviewListing",
  "copyFallback","copyFallbackText","statMatches","statTrack","statLanes","statQa"
]){
  assert.ok(html.includes('id="'+id+'"'),"review HTML missing "+id);
}
assert.match(main,/href="\.\/review\.html"/);
assert.match(html,/ข้อมูลร่าง|ร่างเพื่อโรงเรียน/);
assert.match(html,/ไม่ใช่ประกาศแข่งขันทางการ/);
assert.match(pageJs,/URLSearchParams\(location.search\)\.get\("fixture"\)/);
assert.match(pageJs,/url.searchParams.set\("fixture",f.id\)/);
assert.match(pageJs,/ui\.cards\.replaceChildren\(fragment\)/);
assert.match(pageJs,/M\.hasConfirmedPlanning\(f\)/);
assert.match(pageJs,/M\.sourceDate\(f\)/);
assert.match(pageJs,/M\.formatIssue\(f,getSport\(f\)\)/);
assert.match(pageJs,/\.setAttribute\("aria-busy"/);
assert.match(pageJs,/loading-skeleton|skeleton\.hidden/);
assert.match(css,/review-grid/);
assert.match(css,/@media\(max-width:690px\)/);
assert.match(base,/--safe-bottom:env\(safe-area-inset-bottom/);
for(const source of [html,pageJs,modelJs,css]){
  assert.doesNotMatch(source,/script\.google\.com\/macros\/s\/|NONGKUM_OPS_SPREADSHEET_ID|ScriptApp\.getOAuthToken/,
    "no private Apps Script endpoint or credential in public UI");
}
assert.doesNotMatch(pageJs,/\.innerHTML\s*=/,"review rendering must not inject JSON via innerHTML");
assert.doesNotMatch(pageJs,/fetch\([^)]*\{\s*method\s*:\s*["']POST["']/,"no write requests");
assert.doesNotMatch(pageJs,/localStorage|sessionStorage/,"review does not locally store approvals");
assert.doesNotMatch(html,/id="approve|id="sendReview|id="submitReview/);
assert.doesNotMatch(html,/data\/public-results\.json/);
console.log("R11D PASS: 237 records, 8 schools, 9 sports, 70 QA flags, 24 confirmed-date/venue, no approval/write, safe read-only UI");

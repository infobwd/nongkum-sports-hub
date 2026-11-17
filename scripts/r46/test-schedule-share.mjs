// R46: deterministic read-only school/day LINE summaries, 8 schools × 9 sports.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const read=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
const source=JSON.parse(read("data/program-from-pdf-2569-20261104-draft.json"));
const sandbox=vm.createContext({URL,URLSearchParams,Intl,Date,console});
for(const file of ["js/program-corrections.js","js/schedule-order.js","js/schedule-link-codec.js","js/schedule-bulk-share.js"]){
  new vm.Script(read(file),{filename:file}).runInContext(sandbox);
}
const data=sandbox.NongkumProgramCorrections.apply(source);
const order=sandbox.NongkumScheduleOrder,share=sandbox.NongkumScheduleBulkShare,codec=sandbox.NongkumScheduleLinkCodec;
assert.equal(data.fixtures.length,236,"R20 corrections must retain exactly 236 rows");
assert.equal(data.schools.length,8);
assert.equal(data.sports.length,9);
const base="https://infobwd.github.io/nongkum-sports-hub/index.html";
const common={data,baseHref:base,resultMode:"all",resultsVerified:true,level:"",query:"",day:""};
const all=share.makeParts({...common,fixtures:data.fixtures,school:"",sport:""});
assert.equal(all.count,236);
assert.ok(all.parts.length>1,"full schedule must be split, never truncated");
assert.ok(all.parts.every(part=>part.includes("เปิดตารางล่าสุดในแอป:")));
assert.ok(all.parts.every(part=>part.length<3500),"LINE segments remain manageable");
assert.ok(all.parts.every(part=>!part.includes("undefined")));
const nEntries=all.rowsPerPart.reduce((n,count)=>n+count,0);
assert.equal(nEntries,236,"every record must appear exactly once across chunks");

for(const school of data.schools){
  const matches=data.fixtures.filter(f=>share.schoolInFixture(f,school.id));
  assert.ok(matches.length>0,school.id+" must have matches");
  const payload=share.makeParts({...common,fixtures:matches,school:school.id,sport:""});
  assert.equal(payload.count,matches.length);
  assert.ok(payload.parts[0].includes(school.name));
  const url=new URL(payload.url);
  assert.equal(url.pathname,"/nongkum-sports-hub/t/");
  assert.equal(codec.decode(url.searchParams.get("c")).school,school.id);
  assert.equal(codec.decode(url.searchParams.get("c")).day,"");
}
for(const sport of data.sports){
  const fixtures=data.fixtures.filter(f=>f.sport_id===sport.id);
  assert.ok(fixtures.length>0,sport.id+" has no fixtures");
  const payload=share.makeParts({...common,fixtures,sport:sport.id,school:""});
  assert.equal(payload.count,fixtures.length);
  assert.ok(payload.parts[0].includes(sport.name));
  assert.equal(codec.decode(new URL(payload.url).searchParams.get("c")).sport,sport.id);
}
const athletics=data.fixtures.filter(f=>f.kind==="track_event");
assert.equal(athletics.length,50);
const track=athletics.find(f=>f.lanes?.some(l=>!l.vacant&&l.school_id));
assert.ok(track);
const schoolId=track.lanes.find(l=>!l.vacant&&l.school_id).school_id;
const trackSample=share.makeParts({...common,fixtures:[track],school:schoolId,sport:track.sport_id});
assert.match(trackSample.parts[0],/ลู่/);
assert.match(trackSample.parts[0],new RegExp(track.name));

const day="2026-11-17";
const dayRows=data.fixtures.filter(f=>order.effectiveDay(f)===day);
assert.ok(dayRows.length);
const dayPayload=share.makeParts({...common,fixtures:dayRows,school:"",day,resultMode:"pending",resultsVerified:false});
assert.equal(dayPayload.count,dayRows.length);
assert.equal(codec.decode(new URL(dayPayload.url).searchParams.get("c")).day,day);
assert.ok(dayPayload.parts[0].includes("ไม่สามารถตรวจผลรับรองล่าสุดได้"));
const oldSourceYear=data.fixtures.filter(f=>/พ\.ย\.\s*68/.test(f.source_pdf?.source_date_text||""));
assert.equal(oldSourceYear.length,3);
assert.ok(oldSourceYear.every(f=>!order.effectiveDay(f)),"must never invent 2569 for anomalous source year");
const undated=share.makeParts({...common,fixtures:oldSourceYear,day:"unknown"});
assert.equal(codec.decode(new URL(undated.url).searchParams.get("c")).day,"unknown");
assert.match(undated.parts[0],/วันแข่งขันรอยืนยัน/);
const timeCheck=data.fixtures.find(f=>f.planning_time_confirmation==="confirmed");
const timePayload=share.makeParts({...common,fixtures:[timeCheck],sport:timeCheck.sport_id});
assert.doesNotMatch(timePayload.parts[0].split("\n").find(line=>line.includes(" | "))||"",/รอตรวจ/);
const reviewTime=data.fixtures.find(f=>f.planning_time_confirmation!=="confirmed"&&f.source_pdf?.source_time);
const reviewPayload=share.makeParts({...common,fixtures:[reviewTime],sport:reviewTime.sport_id});
assert.doesNotMatch(reviewPayload.parts[0],/\\(รอตรวจ\\)/);
assert.match(reviewPayload.parts[0],/บางรายการยังมีข้อมูลกำหนดการแข่งขันที่รอตรวจสอบในระบบ/);
assert.ok(!all.parts[0].includes("ผู้ชนะ:")&&!all.parts[0].includes("คะแนน:"));
const link=share.shortUrl({school:"wangdong",sport:"football",level:"primary",day,query:"",resultMode:"all"},base);
const params=codec.decode(new URL(link).searchParams.get("c"));
assert.equal(params.school,"wangdong");
assert.equal(params.sport,"football");
assert.equal(params.level,"primary");
assert.equal(params.day,day);
assert.equal(params.resultMode,"all");
assert.equal(share.validDay("2026-02-30"),"");
assert.equal(share.validDay("unknown"),"unknown");
const page=read("index.html"),program=read("js/program.js"),redirect=read("t/index.html");
for(const id of ["shareSchedule","scheduleShareDialog","scheduleShareSchool","scheduleSharePreview","scheduleShareNative","scheduleShareCopy"]){
  assert.ok(page.includes('id="'+id+'"'),"missing accessible share UI "+id);
}
assert.match(page,/js\/schedule-bulk-share\.js\?v=r47-1/);
assert.match(page,/js\/schedule-link-codec\.js\?v=r47-1/);
assert.match(program,/data-share-day/);
assert.match(program,/shareFixturesFor\(school\)/);
assert.match(program,/resultVisible\(m\)&&matchesFilters\(m,q,false,school\)/);
assert.match(program,/showModal/);
assert.match(redirect,/location\.replace\(target\.href\)/);

assert.match(redirect,/shareDate/);
const redirectCode=redirect.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(redirectCode,"short route must have redirect script");
function resolveShortLink(path){
  const input=new URL(path);
  const location={href:input.href,search:input.search,replace(url){this.replaced=url;}};
  const anchor={href:""};
  new vm.Script(redirectCode).runInNewContext({URL,URLSearchParams,Date,location,
    document:{getElementById:()=>anchor}});
  return new URL(location.replaced);
}
const allSchoolsRoute=resolveShortLink("https://infobwd.github.io/nongkum-sports-hub/t/?d=261117");
assert.equal(allSchoolsRoute.searchParams.get("school"),"all","all-school link overrides stored school");
assert.equal(allSchoolsRoute.searchParams.get("shareDate"),"2026-11-17");
const exactRoute=resolveShortLink("https://infobwd.github.io/nongkum-sports-hub/t/?s=wangdong&g=football&d=261117&r=a");
assert.equal(exactRoute.searchParams.get("school"),"wangdong");
assert.equal(exactRoute.searchParams.get("sport"),"football");
assert.equal(exactRoute.searchParams.get("resultMode"),"all");
for(const file of ["js/program.js","js/schedule-bulk-share.js"]){
  new vm.Script(read(file),{filename:file});
}
console.log("R46 PASS: 236 rows; 8 schools; 9 sports; 50 track; statuses; short links; multipart; UI");

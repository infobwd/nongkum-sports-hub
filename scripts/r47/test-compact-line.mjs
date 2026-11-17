// R47: compact public link stability, legacy links and organizer-confirmed LINE text.
// Read-only test: no production result, status, or database mutation.
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
const raw=JSON.parse(read("data/program-from-pdf-2569-20261104-draft.json"));
const context=vm.createContext({URL,URLSearchParams,Date,Intl,console});
const codecSource=read("js/schedule-link-codec.js");
for(const code of ["js/program-corrections.js","js/schedule-order.js","js/schedule-link-codec.js","js/schedule-bulk-share.js"])
  new vm.Script(read(code),{filename:code}).runInContext(context);
const data=context.NongkumProgramCorrections.apply(raw);
const codec=context.NongkumScheduleLinkCodec;
const share=context.NongkumScheduleBulkShare;
const order=context.NongkumScheduleOrder;
const base="https://infobwd.github.io/nongkum-sports-hub/index.html";
const oldUrl="https://infobwd.github.io/nongkum-sports-hub/t/?s=wangdong&d=261118&r=a";
const filters={school:"wangdong",sport:"",level:"",day:"2026-11-18",resultMode:"all"};
const compact=share.shortUrl(filters,base);
const code=new URL(compact).searchParams.get("c");
assert.ok(code&&code.length<=7, "short code should fit a few characters");
assert.ok(compact.length<oldUrl.length-10,"shortened URL must materially reduce length");
assert.deepEqual(JSON.parse(JSON.stringify(codec.decode(code))), filters);
assert.equal(share.shortUrl({...filters,query:"วิ่ง"},base).includes("?c="),false,
  "free text requires legacy lossless URL");
assert.ok(share.shortUrl({...filters,query:"วิ่ง"},base).includes("q="));
assert.equal(codec.decode("1___"),null);
assert.equal(codec.decode("2abc"),null);
assert.equal(codec.decode("1zzzzzzzzzz"),null);
assert.equal(codec.decode("10")?.school,"");
assert.equal(codec.encode({school:"not-in-catalog",day:"2026-11-18"}),"");
assert.equal(codec.encode({day:"2026-02-30"}),"");
assert.equal(codec.encode({day:"2050-01-01"}),"");
const catalogSchools=["",...data.schools.map(s=>s.id)];
const catalogSports=["",...data.sports.map(s=>s.id)];
const levels=["","early","primary","secondary"], days=["","unknown","2026-11-12","2026-11-17","2026-11-18","2026-11-20","2049-12-31"];
const used=new Set();
for(const school of catalogSchools){
  for(const sport of catalogSports){
    for(const level of levels){
      for(const day of days){
        for(const resultMode of ["pending","all"]){
          const arg={school,sport,level,day,resultMode};
          const encoded=codec.encode(arg);
          assert.ok(encoded,arg.school+" "+arg.sport+" "+arg.day);
          const recovered=codec.decode(encoded);
          assert.deepEqual(JSON.parse(JSON.stringify(recovered)),arg);
          assert.ok(!used.has(encoded),"token collision for filters");
          used.add(encoded);
        }
      }
    }
  }
}
assert.equal(catalogSchools.length,9,"8 schools plus all");
assert.equal(catalogSports.length,10,"9 sports plus all");
assert.equal(used.size,9*10*4*7*2);
const redirect=read("t/index.html");
assert.match(redirect,/schedule-link-codec.js\?v=r47-1/);
const inline=redirect.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(inline);
function resolve(path){
  const input=new URL(path);
  const location={href:input.href,search:input.search,replaced:null,replace(href){this.replaced=href;}};
  const anchor={href:""};
  const paragraph={textContent:""};
  const ctx=vm.createContext({URL,URLSearchParams,Date,location,
    document:{getElementById:()=>anchor,querySelector:()=>paragraph}});
  new vm.Script(codecSource).runInContext(ctx);
  new vm.Script(inline).runInContext(ctx);
  return {url:location.replaced?new URL(location.replaced):null,anchor,paragraph};
}
const opened=resolve(compact);
assert.equal(opened.url.searchParams.get("school"),"wangdong");
assert.equal(opened.url.searchParams.get("shareDate"),"2026-11-18");
assert.equal(opened.url.searchParams.get("resultMode"),"all");
const allSchool=resolve(share.shortUrl({school:"",day:"2026-11-18",resultMode:"all"},base));
assert.equal(allSchool.url.searchParams.get("school"),"all");
const legacy=resolve(oldUrl);
assert.equal(legacy.url.searchParams.get("school"),"wangdong");
assert.equal(legacy.url.searchParams.get("shareDate"),"2026-11-18");
assert.equal(legacy.url.searchParams.get("resultMode"),"all");
const invalid=resolve("https://infobwd.github.io/nongkum-sports-hub/t/?c=1zzz00000");
assert.equal(invalid.url,null,"invalid code never silently changes user filters");
assert.match(invalid.paragraph.textContent,/รหัสลิงก์นี้ไม่ถูกต้อง/);

const expected=[
 ["football-p07-12-ปี-ชาย-009","09:30"],
 ["volleyball-p11-12-ปี-ชาย-B-006","09:30"],
 ["football-p07-12-ปี-ชาย-011","11:00"],
 ["futsal-p09-10-ปี-ชาย-B-009","13:30"],
 ["takraw-p13-12-ปี-ชาย-A-015","14:00"]
];
assert.equal(data.fixtures.length,236);
assert.equal(data.metadata.r47_confirmation_count,5);
assert.equal(data.metadata.count_confirmed_schedule_rows,50);
for(const [id,time] of expected){
  const fixture=data.fixtures.find(f=>f.id===id);
  const original=raw.fixtures.find(f=>f.id===id);
  assert.ok(fixture&&original,id);
  assert.equal(fixture.planning_date,"2026-11-18");
  assert.equal(fixture.planning_time,time);
  assert.equal(fixture.planning_date_confirmation,"confirmed");
  assert.equal(fixture.planning_time_confirmation,"confirmed");
  assert.equal(fixture.planning_status,"review","bracket approval must not be invented");
  assert.ok(fixture.planning_source.includes("17 พฤศจิกายน 2569"));
  assert.deepEqual(JSON.parse(JSON.stringify(fixture.source_pdf)),JSON.parse(JSON.stringify(original.source_pdf)),
    "archived PDF source must remain intact");
}
const dateRows=data.fixtures.filter(f=>order.effectiveDay(f)==="2026-11-18"&&share.schoolInFixture(f,"wangdong"));
assert.equal(dateRows.length,5);
const payload=share.makeParts({data,fixtures:dateRows,...filters,resultsVerified:true,query:"",baseHref:base});
assert.equal(payload.count,5);
assert.match(payload.parts[0],/สนามหลัก: โรงเรียนบ้านหนองกระทุ่ม/);
assert.doesNotMatch(payload.parts[0],/ยืนยันแล้ว|\(รอตรวจ\)|\(ตามร่าง\)|^\*/m);
assert.doesNotMatch(payload.parts[0],/บางรายการยังมีข้อมูลกำหนดการแข่งขันที่รอตรวจสอบในระบบ/);
assert.ok(payload.parts[0].includes(compact));
const unresolved=data.fixtures.find(f=>f.planning_time_confirmation!=="confirmed"&&f.source_pdf?.source_time);
assert.ok(unresolved);
const unresolvedPayload=share.makeParts({data,fixtures:[unresolved],school:"",sport:"",level:"",query:"",day:"",resultMode:"all",resultsVerified:true,baseHref:base});
assert.match(unresolvedPayload.parts[0],/บางรายการยังมีข้อมูลกำหนดการแข่งขันที่รอตรวจสอบในระบบ/);
assert.doesNotMatch(unresolvedPayload.parts[0],/\(รอตรวจ\)|\(ตามร่าง\)/);
assert.equal(data.metadata.all_data_approved,false,"no global approval invented");
assert.equal(raw.metadata.all_data_approved,false);
const html=read("index.html");
assert.match(html,/js\/schedule-link-codec\.js\?v=r47-1/);
assert.match(html,/js\/program-corrections\.js\?v=r47-1/);
console.log("R47 PASS: 5040 distinct compact tokens; five explicit organizer confirmations; /t/ legacy & invalid routes; true status footer; original JSON intact.");

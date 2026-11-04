import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import vm from "node:vm";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const src=read("apps-script/PublicRequest.gs");
const html=read("apps-script/PublicRequest.html");
const privateJs=read("apps-script/Announcer.gs");
const privateHtml=read("apps-script/Announcer.html");
const catalog=JSON.parse(read("data/draft-schedule.json"));
new vm.Script(src);
const code=(html.match(/<script>([\s\S]*?)<\/script>/)||[])[1];
assert.ok(code);new vm.Script(code);
const privateCode=(privateHtml.match(/<script>([\s\S]*?)<\/script>/)||[])[1];
assert.ok(privateCode);new vm.Script(privateCode);
for(const page of [html,privateHtml]){
 for(const s of catalog.sports)assert.ok(page.includes("<option>"+s.name+"</option>"));
 for(const s of catalog.schools)assert.ok(page.includes("<option>"+s.name+"</option>"));
 assert.doesNotMatch(page,/\.innerHTML\s*=/);
 assert.match(page,/prefers-reduced-motion:reduce/);
}
assert.match(privateHtml,/id="tabQueue"/);
assert.match(privateHtml,/id="tabRequest"/);
assert.match(privateHtml,/data-mobile-view="queue"/);
assert.match(privateJs,/nkOpsRequireAnnouncer_/);
assert.doesNotMatch(src,/nkOpsBootstrap|nkOpsTransition|Session\.getActiveUser/);
const names=[...src.matchAll(/^function\s+(\w+)\s*\(/gm)].map(x=>x[1]).filter(x=>!x.endsWith("_")).sort();
assert.deepEqual(names,["doGet","nkPublicCreate"]);
const q=[["id","created_at","created_by","type","priority","sport","division","team_a","team_b","field","message","status","updated_at","updated_by","version","announced_at"]];
const h=[["log_id","occurred_at","actor","request_id","action","from_status","to_status","detail"]];
const sheets={"01_คิวประกาศ":q,"02_ประวัติประกาศ":h};
const props=new Map([["NONGKUM_OPS_SPREADSHEET_ID","private-operations-sheet-123456789"],["NONGKUM_PUBLIC_INTAKE_ENABLED","false"]]);
const cache=new Map();let locked=false,sequence=0;
function mockSheet(rows){return {
 getLastRow(){return rows.length;},
 getRange(row,col,n,width){assert.equal(row,1,"public must not read private queue rows");assert.equal(n,1);
  return {getValues(){return [rows[0].slice(col-1,col-1+width)];}};},
 appendRow(x){assert.equal(locked,true);rows.push([...x]);}
};}
const env=vm.createContext({
 Date,PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k)||"",setProperty:(k,v)=>props.set(k,v)})},
 CacheService:{getScriptCache:()=>({get:k=>cache.get(k)||null,put:(k,v,s)=>{assert.equal(s,180);cache.set(k,v);}})},
 LockService:{getScriptLock:()=>({waitLock(ms){assert.equal(ms,10000);assert.equal(locked,false);locked=true;},releaseLock(){assert.equal(locked,true);locked=false;}})},
 SpreadsheetApp:{openById(id){assert.equal(id,props.get("NONGKUM_OPS_SPREADSHEET_ID"));return {
 getSheetByName(name){assert.ok(sheets[name]);return mockSheet(sheets[name]);}
 };}},
 Utilities:{DigestAlgorithm:{SHA_256:"sha256"},Charset:{UTF_8:"utf8"},
 getUuid:()=>("00000000-0000-0000-0000-"+String(++sequence).padStart(12,"0")),
 computeDigest:(_a,str)=>Array.from(createHash("sha256").update(str).digest()).map(x=>x>127?x-256:x)},
 HtmlService:{createHtmlOutputFromFile(name){assert.equal(name,"PublicRequest");return {
 setTitle(){return this;},addMetaTag(){return this;}};}}
});
new vm.Script(src).runInContext(env);
const athlete={type:"athlete",priority:"normal",sport:"ฟุตบอล",division:"12 ปี ชาย",
 team_a:"โรงเรียนบ้านวังด้ง",team_b:"โรงเรียนบ้านเสาหงส์",field:"สนาม 1"};
assert.throws(()=>env.nkPublicCreate(athlete),/ปิดรับ/);
props.set("NONGKUM_PUBLIC_INTAKE_ENABLED","true");
const first=env.nkPublicCreate(athlete);
assert.equal(first.status,"pending");assert.match(first.reference,/^REQ-/);
assert.equal(Object.keys(first).sort().join(","),"ok,reference,status");
assert.equal(q.length,2);assert.equal(h.length,2);
assert.equal(q[1][2],"public-link");assert.equal(q[1][11],"pending");
assert.throws(()=>env.nkPublicCreate(athlete),/เข้าคิวแล้ว/);
assert.equal(q.length,2);
assert.equal(env.nkPublicCreate({...athlete,team_a:"โรงเรียนบ้านหนองกระทุ่ม",team_b:""}).status,"pending");
assert.equal(env.nkPublicCreate({type:"referee",priority:"urgent",sport:"เปตอง",field:"สนาม 2"}).status,"pending");
assert.equal(env.nkPublicCreate({type:"general",priority:"normal",message:"ขอให้ผู้พบกระเป๋าติดต่อกองอำนวยการ"}).status,"pending");
assert.equal(q.length,5);assert.equal(h.length,5);
assert.equal(q[4][11],"pending");
assert.throws(()=>env.nkPublicCreate({...athlete,sport:"กีฬาไม่รู้จัก",team_a:"โรงเรียนบ้านพุพรหม"}),/จากรายการ/);
assert.throws(()=>env.nkPublicCreate({...athlete,team_a:"โรงเรียนไม่มี"}),/จากรายการ/);
assert.throws(()=>env.nkPublicCreate({...athlete,website:"bot"}),/ไม่สามารถรับ/);
for(const value of ["=SUM(A1)","https://example.org","someone@example.com","0812345678","<script>alert(1)</script>"]){
 assert.throws(()=>env.nkPublicCreate({type:"general",message:value}),/ไม่อนุญาต/);
}
assert.throws(()=>env.nkPublicCreate({type:"general",message:"x".repeat(241)}),/ยาวเกิน/);
assert.equal(q.length,5);
props.set("NONGKUM_PUBLIC_RATE_15MIN",String(Math.floor(Date.now()/900000))+"|60");
assert.throws(()=>env.nkPublicCreate({...athlete,team_a:"โรงเรียนบ้านพุพรหม",team_b:""}),/จำนวนมาก/);
assert.equal(locked,false);
assert.equal(env.nkOpsBootstrap,undefined);
assert.equal(env.nkOpsTransition,undefined);
console.log("PASS R11: anonymous pending-only, disabled by default, dedup, rate limit, validation, separate private role gates");

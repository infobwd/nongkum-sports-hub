import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import vm from "node:vm";
const code=readFileSync(new URL("../../apps-script/Code.gs",import.meta.url),"utf8");
const results=readFileSync(new URL("../../apps-script/Results.gs",import.meta.url),"utf8");
const APPROVER="info@bwd.ac.th",NOW=new Date("2026-11-04T08:00:00Z");
const ctx=vm.createContext({
 Date,JSON,Number,String,Object,Error,
 Utilities:{
  DigestAlgorithm:{SHA_256:"SHA_256"},Charset:{UTF_8:"UTF_8"},
  computeDigest:(_a,s)=>[...createHash("sha256").update(s,"utf8").digest()].map(v=>v>127?v-256:v),
  formatDate:(d)=>new Date(d).toISOString().slice(0,19)
 },
 PropertiesService:{getScriptProperties:()=>({getProperty:()=>APPROVER})},
 Session:{getActiveUser:()=>({getEmail:()=>APPROVER})}
});
new vm.Script(code).runInContext(ctx);
new vm.Script(results).runInContext(ctx);
function pairRow(){const r=Array(19).fill("");
  r[0]="result-1";r[1]="football-1";r[2]="football";r[3]="รอบแรก";
  r[4]="nongkum";r[5]="wangdong";r[6]=2;r[7]=1;r[9]="nongkum";
  r[10]="approved";r[11]="ครูกรรมการ";r[12]=NOW;
  r[13]=APPROVER;r[14]=NOW;r[16]=1;
  r[18]=ctx.nkResultFingerprint_("pair",r);return r;}
function fixtureRow(){const r=Array(21).fill("");
  r[0]="football-1";r[2]="football";r[3]="12 ปี ชาย";r[7]="nongkum";r[8]="wangdong";
  r[13]="approved";r[14]=APPROVER;r[15]=NOW;
  r[20]=ctx.nkDigest_("04_คู่แข่งขัน",r);return r;}
const schoolRows=[
  ["nongkum","โรงเรียนบ้านหนองกุ่ม","หนองกุ่ม"],
  ["wangdong","โรงเรียนบ้านวังด้ง","วังด้ง"]
];
function ss(input){
 const rows={
  "04_คู่แข่งขัน":[input.fixture],
  "03_รายการ":input.events||[],
  "02_โรงเรียน":schoolRows,
  "07_ผลประเภททีมคู่":input.results,
  "08_ผลกรีฑา":input.track||[]
 };
 return {getSheetByName(name){
  if(!Object.hasOwn(rows,name))return null;
  const data=rows[name];
  return {getLastRow:()=>data.length+1,
   getLastColumn:()=>data.length?data[0].length:19,
   getRange:(row,col,count)=>({getValues:()=>data.slice(row-2,row-2+count)})};
 }};
}
const fixture=fixtureRow(),row=pairRow();
const good=ctx.nkBuildPublicResults_(ss({fixture,results:[row]}));
assert.equal(good.metadata.event_name,"มิตรภาพเกม");
assert.equal(good.results.length,1);
assert.equal(good.results[0].score_a,2);
assert.equal(good.results[0].result_type,"score");
assert.ok(!("approved_by" in good.results[0]));
assert.ok(!("recorded_by" in good.results[0]));
const changed=pairRow();changed[6]=3;
assert.throws(()=>ctx.nkBuildPublicResults_(ss({fixture,results:[changed]})),/เปลี่ยนหลังรับรอง/);
const missingParent=fixtureRow();missingParent[13]="review";
assert.throws(()=>ctx.nkBuildPublicResults_(ss({fixture:missingParent,results:[row]})),/ยังไม่รับรอง/);
const wrongWinner=pairRow();wrongWinner[9]="wangdong";
assert.throws(()=>ctx.nkCheckResultRow_("pair",wrongWinner),/ไม่ตรงผู้ชนะ/);
const setResult=pairRow();setResult[2]="petanque";setResult[6]="";setResult[7]="";
setResult[8]=JSON.stringify([{a:11,b:6},{a:11,b:7}]);
assert.doesNotThrow(()=>ctx.nkCheckResultRow_("pair",setResult));
const tug=pairRow();tug[2]="tugofwar";tug[6]="";tug[7]="";
assert.doesNotThrow(()=>ctx.nkCheckResultRow_("pair",tug));
const badSet=pairRow();badSet[2]="petanque";badSet[8]='not-json';
assert.throws(()=>ctx.nkCheckResultRow_("pair",badSet),/JSON array/);
assert.throws(()=>ctx.nkBuildPublicResults_(ss({fixture,results:[]})),/ยังไม่มีผลการแข่งขัน Approved/);
console.log("PASS: R3 approval digest, signed parent gate, winner/sets validation, private data redaction, empty-export refusal");

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Script, createContext } from "node:vm";
import assert from "node:assert/strict";

// Offline mock of read-only Google Apps Script APIs used by the P2 exporter.
// This is a contract regression test; the real Google sheet must be reviewed
// separately before any publication in P3.
const code = readFileSync(new URL("../../apps-script/Code.gs", import.meta.url), "utf8");
const context = createContext({
  Date, Error, Object, String, Number, JSON, RegExp,
  Utilities:{
    DigestAlgorithm:{SHA_256:"SHA_256"},Charset:{UTF_8:"UTF_8"},
    computeDigest:(algorithm, value)=>[...createHash("sha256").update(value,"utf8").digest()].map(x=>x>127?x-256:x),
    formatDate:(d,_tz,format)=>{
      const iso=new Date(d).toISOString();
      if(format==="yyyy-MM-dd")return iso.slice(0,10);
      if(format==="HH:mm")return iso.slice(11,16);
      return iso.slice(0,19).replace("T","T");
    }
  },
  PropertiesService:{getScriptProperties:()=>({getProperty:(k)=>k==="NONGKUM_APPROVER_EMAILS"?"info@bwd.ac.th":""})},
  Session:{getActiveUser:()=>({getEmail:()=>"info@bwd.ac.th"})}
});
new Script(code,{filename:"Code.gs"}).runInContext(context);
const { nkBuildApproved_, nkDigest_ } = context;
const APPROVER="info@bwd.ac.th", TS=new Date("2026-11-04T07:00:00.000Z");
const C={
  "02_โรงเรียน":{status:4,by:5,at:6,hash:8},
  "03_รายการ":{status:8,by:9,at:10,hash:13},
  "04_คู่แข่งขัน":{status:13,by:14,at:15,hash:20},
  "05_กรีฑา":{status:10,by:11,at:12,hash:16},
  "06_ประกาศ":{status:6,by:7,at:8,hash:10}
};
function row(tab,v){
  const a=v.slice();
  while(a.length<=C[tab].hash)a.push("");
  const c=C[tab];
  a[c.status]="approved";a[c.by]=APPROVER;a[c.at]=TS;
  a[c.hash]=nkDigest_(tab,a);
  return a;
}
function fixture(){
 const a={
  "02_โรงเรียน":[row("02_โรงเรียน",["a","โรงเรียน A","A","A"]),row("02_โรงเรียน",["b","โรงเรียน B","B","B"])],
  "03_รายการ":[row("03_รายการ",["S01","football","ฟุตบอลอายุ 12 ปี","12 ปี","ชาย","",1,1])],
  "04_คู่แข่งขัน":[row("04_คู่แข่งขัน",["match-1","S01","football","12 ปี ชาย",1,"A","B","a","b","รอบแรก","2026-11-18","09:00","สนาม 1"])],
  "05_กรีฑา":[],
  "06_ประกาศ":[]
 };
 return a;
}
function googleSheet(data){
 return {getSheetByName:(name)=>{
  const rows=data[name]||[];
  return {
    getLastRow:()=>rows.length+1,
    getLastColumn:()=>C[name].hash+1,
    getRange:(start,unusedCol,numRows)=>({getValues:()=>rows.slice(start-2,start-2+numRows)})
  };
 }};
}
function build(data){return nkBuildApproved_(googleSheet(data));}
const good=fixture(), out=build(good);
assert.equal(out.matches.length,1);
assert.equal(out.matches[0].date,"2026-11-18");
assert.equal(out.athletics.length,0);
assert.equal(out.schools.length,2);
assert.equal(out.metadata.approved_only,true);
assert.equal("approved_by" in out.matches[0],false,"approver email must not leak to public JSON");

const modified=fixture();
modified["04_คู่แข่งขัน"][0][12]="สนามใหม่หลังรับรอง";
assert.throws(()=>build(modified),/approval_digest|แก้หลังรับรอง/,"post-approval edits must be blocked");

const missingDate=fixture();
missingDate["04_คู่แข่งขัน"][0][10]="";
missingDate["04_คู่แข่งขัน"][0][20]=nkDigest_("04_คู่แข่งขัน",missingDate["04_คู่แข่งขัน"][0]);
assert.throws(()=>build(missingDate),/วัน เวลา หรือสนาม/,"missing schedule must be blocked");

const flagged=fixture();
flagged["04_คู่แข่งขัน"][0][16]="QA-05";
flagged["04_คู่แข่งขัน"][0][20]=nkDigest_("04_คู่แข่งขัน",flagged["04_คู่แข่งขัน"][0]);
assert.throws(()=>build(flagged),/QA flag/,"flagged row must have documented resolution");

const withheld=fixture();
withheld["04_คู่แข่งขัน"][0][13]="draft";
assert.throws(()=>build(withheld),/ยังไม่มีรายการ|ส่งออก/,"all-draft export must fail");

const unauthorised=fixture();
unauthorised["04_คู่แข่งขัน"][0][14]="unknown@example.org";
assert.throws(()=>build(unauthorised),/รายชื่ออนุญาต/,"unauthorized approver denied");

const track=fixture();
track["03_รายการ"].push(row("03_รายการ",["ath-1","athletics","วิ่ง 40 เมตร","ปฐมวัย","ชาย","",1,23]));
track["05_กรีฑา"].push(row("05_กรีฑา",["ath-1-lane1","ath-1","วิ่ง 40 เมตร","ปฐมวัย",1,"A","a","2026-11-18","10:00","ลู่ 1"]));
track["05_กรีฑา"].push(row("05_กรีฑา",["ath-1-lane2","ath-1","วิ่ง 40 เมตร","ปฐมวัย",2,"B","b","2026-11-18","10:00","ลู่ 1"]));
const approvedTrack=build(track);
assert.equal(approvedTrack.athletics.length,1);
assert.equal(approvedTrack.athletics[0].lanes.length,2);

const incompleteTrack=fixture();
incompleteTrack["03_รายการ"].push(row("03_รายการ",["ath-1","athletics","วิ่ง 40 เมตร","ปฐมวัย","ชาย","",1,23]));
incompleteTrack["05_กรีฑา"]=track["05_กรีฑา"].map(r=>r.slice());
incompleteTrack["05_กรีฑา"][1][10]="draft";
assert.throws(()=>build(incompleteTrack),/รับรองทุกลู่/,"partial athletics event must be blocked");

console.log("PASS: P2 Apps Script syntax, approved-only snapshot, 7 fail-closed cases, track grouping, private JSON redaction");

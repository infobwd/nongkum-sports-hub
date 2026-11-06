import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import vm from "node:vm";

const read=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
const correction=vm.createContext({});
new vm.Script(read("js/program-corrections.js")).runInContext(correction);
const raw=JSON.parse(read("data/program-from-pdf-2569-20261104-draft.json"));
const applied=correction.NongkumProgramCorrections.apply(raw);
assert.equal(raw.fixtures.length,237,"original PDF extraction remains auditable");
assert.equal(applied.fixtures.length,236,"one confirmed duplicate must be excluded");
assert.equal(applied.metadata.count_matches,186);
assert.equal(applied.page_inventory.find(x=>x.page===7).match_count,20);
assert.equal(applied.source_qa.find(x=>x.code==="PDF69-R01").status,"resolved");
assert.ok(!applied.fixtures.some(x=>x.id==="football-p07-มัธยมหญิง-020-repeated-final"));
const final=applied.fixtures.find(x=>x.id==="football-p07-มัธยมหญิง-007");
assert.equal(final.planning_date,"2026-11-18");
assert.equal(final.planning_date_confirmation,"confirmed");
assert.notEqual(final.planning_time_confirmation,"confirmed","kickoff must not be invented");
assert.equal(correction.NongkumProgramCorrections.apply(applied).fixtures.length,236,"correction idempotent");
for(const path of ["index.html","committee.html","forms/score-sheet.html"])
  assert.match(read(path),/program-corrections.js/,path+" must load the effective schedule");
for(const path of ["js/program.js","js/committee.js","forms/score-sheet.js"])
  assert.match(read(path),/NongkumProgramCorrections/,path+" must use corrected fixture view");

let user="recorder@example.org";
const approvedUser="approver@example.org";
const props={
  NONGKUM_RECORDER_EMAILS:user+","+approvedUser,
  NONGKUM_APPROVER_EMAILS:approvedUser
};
const now=new Date("2026-11-06T09:00:00Z");
const tables={};
function tab(name,width,rows){
  const s={name,width,rows:rows.map(r=>r.slice()),activeRow:2,activeN:1,
   getName(){return name;},
   getLastRow(){return s.rows.length+1;},
   getLastColumn(){return s.width;},
   getActiveRange(){return {getRow:()=>s.activeRow,getNumRows:()=>s.activeN};},
   getRange(row,col,n=1,w=s.width){return {
     getValues(){return Array.from({length:n},(_,i)=>
       (s.rows[row+i-2]||Array(s.width).fill("")).slice(col-1,col-1+w));},
     setValues(values){
       assert.equal(values.length,n);
       for(let i=0;i<n;i++){
         while(s.rows.length<row+i-1)s.rows.push(Array(s.width).fill(""));
         const dest=s.rows[row+i-2];
         for(let j=0;j<values[i].length;j++)dest[col+j-1]=values[i][j];
       }
     }
   };}
  };
  tables[name]=s;return s;
}
const fixture=Array(21).fill("");
fixture[0]="football-1";fixture[1]="S01";fixture[2]="football";fixture[3]="12 ปี ชาย";
fixture[7]="nongkum";fixture[8]="wangdong";fixture[9]="พบกันหมด";fixture[13]="draft";
tab("04_คู่แข่งขัน",21,[fixture]);
tab("05_กรีฑา",17,[["lane-1","event-1","วิ่ง 40 เมตร","ปฐมวัย",1,"หนองกุ่ม","nongkum"]]);
const event=Array(14).fill("");event[0]="event-1";event[1]="athletics";event[2]="วิ่ง";event[8]="draft";
tab("03_รายการ",14,[event]);
tab("02_โรงเรียน",10,[["nongkum","โรงเรียนบ้านหนองกุ่ม","หนองกุ่ม"],["wangdong","โรงเรียนบ้านวังด้ง","วังด้ง"]]);
tab("07_ผลประเภททีมคู่",19,[]);
tab("08_ผลกรีฑา",15,[]);
let active=tables["04_คู่แข่งขัน"],alertText="";
const ss={
 getActiveSheet:()=>active,getSheetByName:n=>tables[n]||null,
 setActiveSheet:s=>{active=s;},setActiveRange:r=>{},
};
const context=vm.createContext({
 Date,JSON,Number,String,Object,Error,Array,
 Utilities:{
  DigestAlgorithm:{SHA_256:"sha256"},Charset:{UTF_8:"UTF_8"},
  computeDigest:(_x,str)=>[...createHash("sha256").update(str,"utf8").digest()].map(x=>x>127?x-256:x),
  formatDate:d=>new Date(d).toISOString().slice(0,19)
 },
 PropertiesService:{getScriptProperties:()=>({getProperty:key=>props[key]||""})},
 Session:{getActiveUser:()=>({getEmail:()=>user})},
 LockService:{getDocumentLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},
 SpreadsheetApp:{getActiveSpreadsheet:()=>ss,getUi:()=>({
   alert:m=>{alertText=String(m);},
   createMenu:()=>{const menu={addItem(){return menu;},addSeparator(){return menu;},addToUi(){return menu;}};return menu;}
 })}
});
for(const path of ["apps-script/Code.gs","apps-script/Results.gs","apps-script/ResultEntry.gs"])
 new vm.Script(read(path),{filename:path}).runInContext(context);
context.onOpen();
user="stranger@example.org";
assert.throws(()=>context.nkRecorderEmail_(),/สิทธิ์/, "unknown recorder must not be allowed");
user="recorder@example.org";
context.nkStartPairResultFromSelectedFixture();
const score=tables["07_ผลประเภททีมคู่"];
assert.equal(score.rows.length,1);assert.equal(score.rows[0][1],"football-1");
assert.equal(score.rows[0][10],"draft");
assert.throws(()=>context.nkStartPairResultFromSelectedFixture(),/แท็บ|กรุณาเลือก/,"cannot create from wrong tab");
active=tables["04_คู่แข่งขัน"];
assert.throws(()=>context.nkStartPairResultFromSelectedFixture(),/มีการบันทึกผลคู่นี้/);
active=score;
assert.throws(()=>context.nkApproveResultsSelection(),/สิทธิ์/,"recorder cannot approve");
score.rows[0][6]=2;score.rows[0][7]=1;score.rows[0][9]="nongkum";
context.nkSubmitResultsForReview();
assert.equal(score.rows[0][10],"review");assert.match(alertText,/รอตรวจสอบ|ตรวจสอบแล้ว|ให้ตรวจสอบ/);
assert.equal(context.nkSubmitResultsForReview(),1,"a reviewed row can be resubmitted after correction");
user=approvedUser;
assert.throws(()=>context.nkApproveResultsSelection(),/ยังไม่ได้ยืนยัน/,"draft source not authorizable");
fixture[13]="approved";fixture[14]=approvedUser;fixture[15]=now;
tables["04_คู่แข่งขัน"].rows[0][13]="approved";
tables["04_คู่แข่งขัน"].rows[0][14]=approvedUser;
tables["04_คู่แข่งขัน"].rows[0][15]=now;
tables["04_คู่แข่งขัน"].rows[0][20]=context.nkDigest_("04_คู่แข่งขัน",tables["04_คู่แข่งขัน"].rows[0]);
context.nkApproveResultsSelection();
assert.equal(score.rows[0][10],"approved");
assert.ok(score.rows[0][18],"approval hash");
const published=context.nkBuildPublicResults_(ss);
assert.equal(published.results.length,1);
assert.equal(published.results[0].score_a,2);
assert.equal("recorded_by" in published.results[0],false,"public results must not leak editor information");
assert.throws(()=>context.nkSubmitResultsForReview(),/ยืนยันหรือปิดผลแล้ว/);
user="recorder@example.org";
active=tables["05_กรีฑา"];
context.nkStartTrackResultFromSelectedLane();
const track=tables["08_ผลกรีฑา"];
assert.equal(track.rows.length,1);
track.rows[0][3]=1;track.rows[0][4]="9.80";track.rows[0][5]="วินาที";
context.nkSubmitResultsForReview();
assert.equal(track.rows[0][6],"review");
user=approvedUser;
assert.throws(()=>context.nkApproveResultsSelection(),/ยังไม่ได้ยืนยัน/);
console.log("R20-B PASS: 18 Nov football final, no 20 Nov duplicate, accessible Sheets menu, non-duplicate direct entry, review and fail-closed approval, approved-only export");

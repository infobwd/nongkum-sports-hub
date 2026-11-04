// R10 Field Operations Console — business rules, role-gated Apps Script calls and safe UI.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const server=read("apps-script/Announcer.gs");
const html=read("apps-script/Announcer.html");
new vm.Script(server,{filename:"Announcer.gs"});
const script=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(script,"client script missing");
new vm.Script(script[1],{filename:"Announcer.html"});
for(const id of ["requestForm","type","priority","sport","division","team_a","team_b","field","message",
  "preview","queue","history","submitButton","refreshButton","filterStatus","filterText","feedback","identity"]){
 assert.ok(html.includes('id="'+id+'"'),"UI control missing: "+id);
}
assert.match(html,/google\.script\.run/);
assert.match(html,/setInterval\(function\(\).*25000/s);
assert.match(html,/prefers-reduced-motion:reduce/);
assert.match(html,/safe-area-inset-bottom/);
assert.match(html,/\.textContent/);
assert.doesNotMatch(html,/\.innerHTML\s*=/,"dynamic HTML from user data forbidden");
assert.doesNotMatch(html,/https?:\/\/infobwd\.github\.io/,"internal queue may not be published to GitHub Pages");
assert.doesNotMatch(server,/NONGKUM_APPROVER_EMAILS|06_ประกาศ/,"R10 must not reuse public approval table");
assert.doesNotMatch(server,/getActiveSpreadsheet\(/,"Ops spreadsheet must be separate from P2-bound Apps Script");
assert.match(server,/SpreadsheetApp\.openById\(id\)/);

const TAB_QUEUE="01_คิวประกาศ",TAB_HISTORY="02_ประวัติประกาศ";
const sheetId="private-operations-sheet-id-123456";
const properties={
 NONGKUM_OPS_SPREADSHEET_ID:sheetId,
 NONGKUM_OPS_ADMIN_EMAILS:"admin@example.org",
 NONGKUM_ANNOUNCER_EMAILS:"mic@example.org",
 NONGKUM_COORDINATOR_EMAILS:"field@example.org"
};
let email="outsider@example.org",uuid=0,lockCount=0;
const tables=new Map();
class MockSheet {
 constructor(name){this.name=name;this.rows=[];this.frozen=0;}
 getLastRow(){return this.rows.length;}
 getRange(firstRow,firstCol,numRows,numCols){
  const self=this;
  return {
   getValues(){return Array.from({length:numRows},(_,r)=>
     Array.from({length:numCols},(_,c)=>self.rows[firstRow+r-1]?.[firstCol+c-1]??""));},
   setValues(data){
    assert.equal(data.length,numRows);
    for(let r=0;r<numRows;r++){
     assert.equal(data[r].length,numCols);
     let index=firstRow+r-1;
     if(!self.rows[index])self.rows[index]=[];
     for(let c=0;c<numCols;c++)self.rows[index][firstCol+c-1]=data[r][c];
    }
   }
  };
 }
 appendRow(row){this.rows.push([...row]);}
 setFrozenRows(n){this.frozen=n;}
}
const spreadsheet={
 getSheetByName:name=>tables.get(name)||null,
 insertSheet(name){assert.ok(!tables.has(name));const s=new MockSheet(name);tables.set(name,s);return s;}
};
const lock={waitLock(ms){assert.equal(ms,10000);lockCount++;},releaseLock(){lockCount--;}};
const sandbox=vm.createContext({
 console,Date,
 PropertiesService:{getScriptProperties:()=>({getProperty:key=>properties[key]||""})},
 Session:{getActiveUser:()=>({getEmail:()=>email})},
 SpreadsheetApp:{openById(id){assert.equal(id,sheetId);return spreadsheet;}},
 LockService:{getDocumentLock:()=>null,getScriptLock:()=>lock},
 Utilities:{getUuid:()=>("00000000-0000-0000-0000-"+String(++uuid).padStart(12,"0"))},
 HtmlService:{
  createHtmlOutputFromFile(name){assert.equal(name,"Announcer");return {kind:"app",setTitle(t){this.title=t;return this;},addMetaTag(){return this;}};},
  createHtmlOutput(content){return {kind:"denied",content};}
 }
});
new vm.Script(server).runInContext(sandbox);
function denied(fn,msg){assert.throws(fn,msg?new RegExp(msg):undefined);}
denied(()=>sandbox.nkOpsSetup(),"ไม่ได้รับสิทธิ์");
denied(()=>sandbox.nkOpsBootstrap(),"ไม่ได้รับสิทธิ์");
assert.equal(sandbox.doGet().kind,"denied");
email="";
denied(()=>sandbox.nkOpsBootstrap(),"ยืนยันบัญชี");
email="admin@example.org";
assert.equal(sandbox.nkOpsSetup().ok,true);
assert.equal(sandbox.nkOpsSetup().ok,true,"setup must be idempotent");
assert.equal(tables.get(TAB_QUEUE).frozen,1);
assert.equal(tables.get(TAB_HISTORY).frozen,1);
assert.equal(sandbox.doGet().kind,"app");
assert.equal(sandbox.nkOpsBootstrap().queue.length,0);
assert.equal(sandbox.nkOpsBootstrap().history.length,0);
assert.equal(sandbox.nkOpsBootstrap().user.role,"admin");
const initialQueueCols=tables.get(TAB_QUEUE).rows[0].length;
assert.equal(initialQueueCols,16);

// Field coordinator creates athlete request; no implicit date/time/official schedule.
email="field@example.org";
const id1=sandbox.nkOpsCreate({type:"athlete",priority:"urgent",sport:"ฟุตบอล",division:"12 ปี ชาย",
 team_a:"โรงเรียนบ้านวังด้ง",team_b:"โรงเรียนบ้านเสาหงส์",field:"สนาม 1"});
assert.equal(id1.status,"pending");
const first=sandbox.nkOpsBootstrap().queue[0];
assert.equal(first.id,id1.id);
assert.match(first.message,/โรงเรียนบ้านวังด้ง/);
assert.match(first.message,/โรงเรียนบ้านเสาหงส์/);
assert.match(first.message,/สนาม 1/);
assert.doesNotMatch(first.message,/เวลาแข่ง|ประกาศทางการ/);
assert.equal(first.created_by,"field@example.org");
assert.equal(first.priority,"urgent");
denied(()=>sandbox.nkOpsTransition({id:id1.id,to:"ready",expected_version:1}),"เฉพาะผู้บรรยาย");
denied(()=>sandbox.nkOpsCreate({type:"general",message:"=SUM(A1:A2)"}),"ไม่อนุญาต");
denied(()=>sandbox.nkOpsCreate({type:"general",message:"โทร 0812345678"}),"ไม่อนุญาต");
denied(()=>sandbox.nkOpsCreate({type:"general",message:"test@example.org"}),"ไม่อนุญาต");
denied(()=>sandbox.nkOpsCreate({type:"general",message:"https://invalid.test"}),"ไม่อนุญาต");
denied(()=>sandbox.nkOpsCreate({type:"wrong",priority:"normal"}),"ไม่รองรับ");
denied(()=>sandbox.nkOpsCreate({type:"athlete",sport:"ฟุตบอล",team_a:"โรงเรียน A"}),"กรุณาระบุ");

// Announcer transitions with optimistic version checks, no direct announce from pending.
email="mic@example.org";
denied(()=>sandbox.nkOpsTransition({id:id1.id,to:"announced",expected_version:1}),"ไม่อนุญาต");
assert.equal(sandbox.nkOpsTransition({id:id1.id,to:"ready",expected_version:1}).version,2);
denied(()=>sandbox.nkOpsTransition({id:id1.id,to:"announced",expected_version:1}),"อีกเครื่อง");
assert.equal(sandbox.nkOpsTransition({id:id1.id,to:"announced",expected_version:2}).status,"announced");
denied(()=>sandbox.nkOpsTransition({id:id1.id,to:"cancelled",expected_version:3}),"ไม่อนุญาต");
assert.ok(sandbox.nkOpsBootstrap().queue.find(x=>x.id===id1.id).announced_at);

// Referee request and cancellation, independent of any unverified personal registry.
email="field@example.org";
const id2=sandbox.nkOpsCreate({type:"referee",priority:"normal",sport:"เปตอง",field:"สนามเปตอง"});
const txt=sandbox.nkOpsBootstrap().queue.find(x=>x.id===id2.id).message;
assert.match(txt,/กรรมการผู้รับผิดชอบ/);
assert.doesNotMatch(txt,/@|0812345678/);
email="mic@example.org";
assert.equal(sandbox.nkOpsTransition({id:id2.id,to:"cancelled",expected_version:1}).status,"cancelled");
denied(()=>sandbox.nkOpsTransition({id:id2.id,to:"ready",expected_version:2}),"ไม่อนุญาต");

// General notice: manual text only; neither submitted nor automatically publicized.
email="field@example.org";
const id3=sandbox.nkOpsCreate({type:"general",priority:"normal",message:"โปรดติดต่อโต๊ะประชาสัมพันธ์"});
const listed=sandbox.nkOpsBootstrap();
assert.equal(listed.queue.find(x=>x.id===id3.id).message,"โปรดติดต่อโต๊ะประชาสัมพันธ์");
assert.equal(listed.open_total,1);
assert.equal(listed.total,3);
assert.equal(listed.history.length,6); // 3 created + 3 transitions
assert.equal(tables.get(TAB_HISTORY).getLastRow(),7);
assert.equal(lockCount,0,"all write locks must be released");

// Unknown/unauthorized caller sees neither queue nor history.
email="outsider@example.org";
denied(()=>sandbox.nkOpsBootstrap(),"ไม่ได้รับสิทธิ์");
denied(()=>sandbox.nkOpsCreate({type:"general",message:"test"}),"ไม่ได้รับสิทธิ์");
denied(()=>sandbox.nkOpsTransition({id:id3.id,to:"ready",expected_version:1}),"ไม่ได้รับสิทธิ์");
assert.equal(sandbox.doGet().kind,"denied");
assert.equal(lockCount,0);
console.log("PASS R10: private roles, setup, queue, templates, approval gates, transitions, conflict, cancelled, audit, XSS-safe client");

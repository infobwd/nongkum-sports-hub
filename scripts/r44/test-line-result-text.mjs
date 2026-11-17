#!/usr/bin/env node
// R44: synthetic-only comprehensive LINE text QA; never submits or publishes test scores.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const common=read("js/shared.js");
const base=JSON.parse(read("data/public-results.json"));
const root="https://infobwd.github.io/nongkum-sports-hub/";
const schoolA="wangdong",schoolB="nongkum";
const approvals={
 football:"score",shootout:"score",futsal:"score",
 volleyball:"sets",takraw:"sets",petanque:"win_loss",
 tabletennis:"sets",tugofwar:"win_loss",athletics:"ranking"
};
assert.equal(base.sports.length,9);
assert.deepEqual(base.sports.map(s=>s.id).sort(),Object.keys(approvals).sort());
const makeContext=withShare=>{
 let received=null,copied=null;
 const navigator=withShare?{share:async value=>{received=value;},clipboard:{writeText:async t=>{copied=t;}}}:
   {clipboard:{writeText:async t=>{copied=t;}}};
 const context=vm.createContext({location:new URL(root+"results.html"),URL,URLSearchParams,Intl,Date,Math,
   navigator,localStorage:{getItem:()=>null,setItem:()=>{}}});
 new vm.Script(common,{filename:"js/shared.js"}).runInContext(context);
 return {api:context.Nongkum,get received(){return received;},get copied(){return copied;}};
};
const web=makeContext(true),copy=makeContext(false);
let tested=0;
for(const sport of base.sports){
 const type=approvals[sport.id];
 const result={id:"synthetic-r44-"+sport.id,status:"approved",sport_id:sport.id,
   result_type:type,division:"12 ปี หญิง",round:"รอบชิงชนะเลิศ",result_date:"2026-11-17",
   share_revision:1};
 if(type==="ranking")Object.assign(result,{event_id:"synthetic-athletics-event",
   rankings:[{rank:3,school_id:schoolA,mark:"10.1",unit:"วินาที"},
     {rank:1,school_id:schoolB,mark:0,unit:"วินาที"},
     {rank:2,school_id:schoolA}]});
 else {
   Object.assign(result,{fixture_id:"synthetic-fixture",team_a_id:schoolA,team_b_id:schoolB});
   if(type==="score")Object.assign(result,{score_a:2,score_b:1,winner_school_id:schoolA});
   if(type==="sets")Object.assign(result,{sets:[{a:25,b:20},{a:19,b:25},{a:15,b:13}],
     winner_school_id:schoolA});
   if(type==="win_loss")Object.assign(result,{winner_school_id:schoolB});
 }
 const lines=web.api.formatApprovedResultShareText(result,base.schools,base.sports,new Map());
 assert.ok(lines.startsWith("ผลการแข่งขัน · มิตรภาพเกมส์ 2569\nกีฬา: "+sport.name));
 assert.ok(lines.includes("รุ่น: 12 ปี หญิง"));
 assert.ok(lines.includes("รอบ: รอบชิงชนะเลิศ"));
 assert.ok(lines.includes("วันที่แข่งขัน: 2026-11-17"));
 assert.ok(!lines.includes("undefined")&&!lines.includes("NaN"));
 if(type==="ranking"){
   assert.ok(lines.indexOf("อันดับ 1:")<lines.indexOf("อันดับ 2:"));
   assert.ok(lines.indexOf("อันดับ 2:")<lines.indexOf("อันดับ 3:"));
   assert.match(lines,/อันดับ 1: หนองกุ่ม · 0 วินาที/);
   assert.ok(!lines.includes("ผู้ชนะ:"));
 }else{
   assert.match(lines,/วังด้ง พบ หนองกุ่ม/);
   assert.match(lines,/ผู้ชนะ: (วังด้ง|หนองกุ่ม)/);
   if(type==="score")assert.match(lines,/คะแนน: วังด้ง 2 – 1 หนองกุ่ม/);
   if(type==="sets")assert.match(lines,/เซต 1: 25 – 20[\s\S]*เซต 3: 15 – 13/);
   if(type==="win_loss")assert.ok(!lines.includes("คะแนน:")&&!lines.includes("เซต "));
 }
 assert.equal(await web.api.shareApprovedResult(result,null,base.schools,base.sports,new Map()),"shared");
 assert.equal(typeof web.received.text,"string");
 assert.equal(web.received.url,undefined,"No URL in a separate share field (LINE may suppress the message)");
 assert.equal(web.received.title,undefined);
 assert.ok(web.received.text.startsWith(lines));
 const link=web.api.resultShareUrl(result,null,base.sports);
 assert.ok(web.received.text.endsWith(link));
 assert.ok(!link.includes("synthetic")&&!link.includes("%E0"));
 assert.equal(await copy.api.shareApprovedResult(result,null,base.schools,base.sports,new Map()),"copied");
 assert.equal(copy.copied,web.received.text);
 tested++;
}
const football={id:"synthetic-draw",status:"approved",sport_id:"football",
  result_type:"score",division:"ประถม 12 ปี ชาย",fixture_id:"synthetic",
  team_a_id:schoolA,team_b_id:schoolB,score_a:0,score_b:0};
const drawText=web.api.formatApprovedResultShareText(football,base.schools,base.sports);
assert.match(drawText,/คะแนน: วังด้ง 0 – 0 หนองกุ่ม/);
assert.match(drawText,/ผลเสมอ/);
assert.ok(!drawText.includes("ผู้ชนะ:"));
const unequal={...football,score_b:1};
const unequalText=web.api.formatApprovedResultShareText(unequal,base.schools,base.sports);
assert.ok(!unequalText.includes("ผู้ชนะ:")&&!unequalText.includes("ผลเสมอ"),
  "No winner may be inferred from scored data");
assert.match(web.api.formatApprovedResultShareText({...football,winner_school_id:schoolA},
  base.schools,base.sports),/ผู้ชนะ: วังด้ง/);
for(const invalid of [
 {...football,status:"review"},
 {...football,status:"draft"},
 {...football,sport_id:"unregistered"},
 {...football,team_a_id:"not-found"},
 {...football,winner_school_id:"not-found"},
 {...football,score_a:-1},
 {...football,result_type:"win_loss",winner_school_id:null},
 {...football,result_type:"sets",sets:[]},
 {...football,result_type:"unknown"},
 {id:"test-no-ranking",sport_id:"athletics",status:"approved",
  result_type:"ranking",event_id:"ath",rankings:[]}
 ]){
 assert.throws(()=>web.api.formatApprovedResultShareText(invalid,base.schools,base.sports),
   "Never publish invalid or non-approved test result");
}
const noCatalog={...football,result_type:"ranking",event_id:"track-unnamed",
  team_a_id:undefined,team_b_id:undefined,score_a:undefined,score_b:undefined,
  rankings:[{rank:1,school_id:schoolA}]};
const generic=web.api.formatApprovedResultShareText(noCatalog,base.schools,base.sports);
assert.ok(!generic.includes("วิ่ง 40")&&!generic.includes("undefined")&&!generic.includes("ผู้ชนะ:"));
const catalog=new Map([["ath-1",{sport_id:"athletics",division:"8 ปี หญิง",name:"วิ่ง 40 เมตร"}]]);
const named={id:"synthetic-ath-1",status:"approved",result_type:"ranking",sport_id:"athletics",
 division:"8 ปี หญิง",event_id:"ath-1",rankings:[{rank:1,school_id:schoolA}]};
assert.match(web.api.formatApprovedResultShareText(named,base.schools,base.sports,catalog),
 /รายการ: วิ่ง 40 เมตร/);
assert.ok(!web.api.formatApprovedResultShareText({...named,division:"8 ปี ชาย"},base.schools,base.sports,catalog)
 .includes("รายการ: วิ่ง 40 เมตร"),"Never join an athletics title across unmatched divisions");
const noShare=vm.createContext({location:new URL(root+"results.html"),URL,URLSearchParams,Intl,Date,Math,navigator:{}});
new vm.Script(common).runInContext(noShare);
assert.equal(await noShare.Nongkum.shareApprovedResult(football,null,base.schools,base.sports),"unavailable");
console.log("PASS R44: "+tested+" sports, 4 formats, native LINE text, clipboard, draw, ranks, source checks and approved-only guard");

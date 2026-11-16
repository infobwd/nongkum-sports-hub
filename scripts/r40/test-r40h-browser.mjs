#!/usr/bin/env node
// R40-H mobile screenshots with synthetic images/data only; no production uploads.
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdirSync} from "node:fs";
import {join} from "node:path";
import {chromium} from "playwright";
const PORT=8762,ROOT="http://127.0.0.1:"+PORT;
const DEST=join(process.env.RUNNER_TEMP||"/tmp","r40h-ux-evidence");
mkdirSync(DEST,{recursive:true});
const server=spawn("python3",["-m","http.server",String(PORT),"--bind","127.0.0.1"],{stdio:"ignore"});
let browser;
const editorToken="a".repeat(64),reviewerToken="b".repeat(64);
const uploadId="11111111-2222-4333-8444-555555555555";
try{
 for(let k=0;k<40;k++){try{if((await fetch(ROOT+"/upload-photos.html")).ok)break;}catch(_){}await new Promise(r=>setTimeout(r,250));}
 browser=await chromium.launch({headless:true});
 const photoPage=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 await photoPage.route(/cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com/,route=>route.abort());
 await photoPage.addInitScript(({token})=>{
  localStorage.setItem("nongkum-r34-editor-session-v1",
    JSON.stringify({token,expires_at:new Date(Date.now()+3*60*60*1000).toISOString()}));
 },{token:editorToken});
 let uploadCount=0;
 let interruptNextUpload=false;
 const statuses=[];
 await photoPage.route("**/functions/v1/nongkum-results-editor",async route=>{
  const action=JSON.parse(route.request().postData()||"{}").action;
  await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
   ok:true,expires_at:new Date(Date.now()+3*60*60*1000).toISOString()
  })});
 });
 await photoPage.route("**/functions/v1/nongkum-activity-photos",async route=>{
  const data=JSON.parse(route.request().postData()||"{}");
  if(data.action==="mine"){
   return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,items:statuses})});
  }
  if(data.action==="upload"){
   uploadCount++;
   if(interruptNextUpload){
     interruptNextUpload=false;
     return route.abort("failed");
   }
   statuses.unshift({id:uploadId,event_id:data.event_id,sport_id:"petanque",
     division:"12 ปี ชาย",caption:data.caption,submitted_at:new Date().toISOString(),
     status:"review",publication_status:"private"});
   return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,id:uploadId,status:"review"})});
  }
  return route.fulfill({status:400,contentType:"application/json",body:JSON.stringify({ok:false,error:"invalid"})});
 });
 await photoPage.goto(ROOT+"/upload-photos.html",{waitUntil:"domcontentloaded"});
 await photoPage.locator("#photoWorkspace").waitFor({state:"visible",timeout:16000});
 await photoPage.locator("#photoSport").selectOption("petanque");
 const first=await photoPage.locator("#photoFixture option").evaluateAll(els=>els.find(x=>x.value)?.value);
 assert.ok(first,"synthetic fixture selection");
 await photoPage.locator("#photoFixture").selectOption(first);
 await photoPage.locator("#photoUploader").fill("เจ้าหน้าที่ทดสอบ");
 await photoPage.locator("#photoFixtureSummary").waitFor({state:"visible"});
 let dims=await photoPage.evaluate(()=>({width:window.innerWidth,scrollWidth:document.documentElement.scrollWidth}));
 assert.ok(dims.scrollWidth<=dims.width+1,JSON.stringify(dims));
 const b64=await photoPage.evaluate(()=>{
  const c=document.createElement("canvas");c.width=640;c.height=480;
  const ctx=c.getContext("2d");const grad=ctx.createLinearGradient(0,0,600,480);
  grad.addColorStop(0,"#62b3dd");grad.addColorStop(1,"#a2dc92");
  ctx.fillStyle=grad;ctx.fillRect(0,0,640,480);
  for(let y=0;y<480;y+=20)for(let x=0;x<640;x+=20){
   ctx.fillStyle=((x+y)%3===0)?"#b2e1d5":"#dce9c2";ctx.fillRect(x+2,y+3,11,12);
  }
  return c.toDataURL("image/webp",.84).split(",")[1];
 });
 await photoPage.locator("#photoFile").setInputFiles({name:"synthetic-field.webp",mimeType:"image/webp",buffer:Buffer.from(b64,"base64")});
 await photoPage.locator("#photoSubmit").waitFor({state:"visible",timeout:15000});
 await photoPage.waitForFunction(()=>!document.getElementById("photoSubmit").disabled,{timeout:15000});
 await photoPage.locator("#photoSubmit").click();
 await photoPage.locator("#photoSendSuccess").waitFor({state:"visible",timeout:15000});
 assert.equal(await photoPage.locator("#photoUploadForm").isVisible(),false);
 assert.equal(uploadCount,1,"must upload exactly once");
 assert.match(await photoPage.locator("#photoSuccessReceipt").innerText(),/11111111/);
 await photoPage.screenshot({path:join(DEST,"01-upload-success.png"),fullPage:true});
 await photoPage.locator("#photoMineFromSuccess").click();
 await photoPage.locator(".photo-mine-item").first().waitFor({state:"visible"});
 assert.match(await photoPage.locator(".photo-mine-item").first().innerText(),/รอผู้ตรวจ/);
 await photoPage.screenshot({path:join(DEST,"02-session-status.png"),fullPage:true});
 await photoPage.locator("#photoSendAgain").click();
 assert.equal(await photoPage.locator("#photoSendSuccess").isVisible(),false);
 assert.equal(await photoPage.locator("#photoUploadForm").isVisible(),true);
 assert.equal(await photoPage.locator("#photoSubmit").isDisabled(),true);
 dims=await photoPage.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
 assert.ok(dims.scrollWidth<=dims.width+1,"upload has horizontal overflow "+JSON.stringify(dims));
 // Interrupted upload must never claim success or allow accidental duplicate retry.
 interruptNextUpload=true;
 await photoPage.locator("#photoFile").setInputFiles({name:"synthetic-second.webp",
   mimeType:"image/webp",buffer:Buffer.from(b64,"base64")});
 await photoPage.waitForFunction(()=>!document.getElementById("photoSubmit").disabled,{timeout:15000});
 await photoPage.locator("#photoSubmit").click();
 await photoPage.waitForFunction(()=>document.getElementById("photoStatus").textContent.includes("ยังยืนยันไม่ได้"),{timeout:15000});
 assert.equal(await photoPage.locator("#photoSendSuccess").isVisible(),false);
 assert.equal(await photoPage.locator("#photoSubmit").isDisabled(),true);
 assert.equal(uploadCount,2,"one interrupted request, no automatic retry");
 await photoPage.screenshot({path:join(DEST,"02b-network-uncertain.png"),fullPage:true});
 await photoPage.locator("#photoMineOpen").click();
 await photoPage.waitForFunction(()=>!document.getElementById("photoSubmit").disabled,{timeout:12000});
 const reviewPage=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 await reviewPage.addInitScript(({token})=>{
  localStorage.setItem("nongkum-r37-reviewer-session-v1",
    JSON.stringify({token,expires_at:new Date(Date.now()+3*60*60*1000).toISOString(),reviewer_name:"ผู้ตรวจทดสอบ"}));
 },{token:reviewerToken});
 let published=false;
 await reviewPage.route("**/functions/v1/nongkum-results-reviewer",async route=>{
   await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,expires_at:new Date(Date.now()+3*60*60*1000).toISOString()})});
 });
 await reviewPage.route("**/functions/v1/nongkum-activity-photos",async route=>{
   const data=JSON.parse(route.request().postData()||"{}");
   let result;
   if(data.action==="queue"){
    result={ok:true,items:[{id:uploadId,event_id:"petanque-demo",
      sport_id:"petanque",division:"12 ปี ชาย",caption:"ภาพสนามจำลอง",
      uploaded_by:"ผู้ส่งทดสอบ",submitted_at:new Date().toISOString(),
      status:published?"approved":"review",publication_status:published?"published":"private"}]};
   }else if(data.action==="preview")result={ok:true,mime_type:"image/webp",image_b64:b64};
   else if(data.action==="publish"){published=true;result={ok:true,status:"published"};}
   else result={ok:false,error:"invalid"};
   await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(result)});
 });
 await reviewPage.goto(ROOT+"/review-photos.html",{waitUntil:"domcontentloaded"});
 await reviewPage.locator(".photo-review-card").waitFor({state:"visible",timeout:12000});
 await reviewPage.locator(".photo-review-card button").first().click();
 await reviewPage.locator(".photo-review-preview img").waitFor({state:"visible",timeout:12000});
 await reviewPage.locator(".photo-primary").last().click();
 assert.match(await reviewPage.locator("[data-card-message]").innerText(),/หลักฐาน/);
 await reviewPage.locator("[data-consent-note]").fill("ผู้จัดตรวจสิทธิ์ภาพสนามจำลองและอนุญาตเผยแพร่แล้ว");
 await reviewPage.locator("[data-public-consent]").check();
 await reviewPage.screenshot({path:join(DEST,"03-review-ready.png"),fullPage:true});
 await reviewPage.locator(".photo-review-card .photo-primary").click();
 await reviewPage.locator("#photoReviewFeedback").waitFor({state:"visible",timeout:12000});
 assert.match(await reviewPage.locator("#photoReviewFeedback").innerText(),/เผยแพร่ภาพสำเร็จ/);
 assert.match(await reviewPage.locator("#photoReviewList").innerText(),/เผยแพร่แล้ว/);
 const width=await reviewPage.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
 assert.ok(width.scrollWidth<=width.width+1,"review has horizontal overflow "+JSON.stringify(width));
 await reviewPage.screenshot({path:join(DEST,"04-review-published.png"),fullPage:true});
 await reviewPage.close();await photoPage.close();
 console.log("R40-H BROWSER PASS: success proof, no double send, private status, iOS viewport & reviewer inline consent");
}finally{if(browser)await browser.close();server.kill("SIGTERM");}

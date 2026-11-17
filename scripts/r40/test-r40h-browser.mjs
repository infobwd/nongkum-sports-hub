#!/usr/bin/env node
// R40-H mobile acceptance: all sessions, uploads, reviewers and images are synthetic.
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdirSync} from "node:fs";
import {join} from "node:path";
import {chromium} from "playwright";
const port=8765,base="http://127.0.0.1:"+port;
const out=join(process.env.RUNNER_TEMP||"/tmp","r40h-browser-evidence");
mkdirSync(out,{recursive:true});
const editorToken="a".repeat(64),reviewerToken="b".repeat(64);
const created="11111111-2222-4333-8444-555555555555";
const oldPublic="66666666-7777-4888-9999-aaaaaaaaaaaa";
const oldPrivate="77777777-8888-4999-aaaa-bbbbbbbbbbbb";
const oldDate="2026-11-16T09:00:00Z";
let eventId="",uploadCalls=0,publishCalls=0,statusCalls=0,reviewItems=[],picture="";
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],{stdio:"ignore"});
let browser;
async function exercise(){
 for(let n=0;n<40;n++){
  try{const r=await fetch(base+"/upload-photos.html");if(r.ok)break;}catch(_){}
  await new Promise(resolve=>setTimeout(resolve,200));
 }
 browser=await chromium.launch({headless:true});
 const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
 const page=await ctx.newPage();
 await page.goto("about:blank");
 const image=await page.evaluate(()=>{
   const canvas=document.createElement("canvas");
   canvas.width=420;canvas.height=270;
   const c=canvas.getContext("2d"),data=c.createImageData(420,270);
   let seed=47;
   for(let i=0;i<data.data.length;i+=4){
     seed=(seed*1664525+1013904223)>>>0;
     data.data[i]=seed&255;data.data[i+1]=(seed>>>8)&255;
     data.data[i+2]=(seed>>>16)&255;data.data[i+3]=255;
   }
   c.putImageData(data,0,0);
   return {png:canvas.toDataURL("image/png").split(",")[1],
     webp:canvas.toDataURL("image/webp",0.75).split(",")[1]};
 });
 picture=image.webp;
 assert.ok(picture.length>2000&&picture.length<470000);
 const incoming=[];
 await page.route("https://cdnjs.cloudflare.com/**",route=>route.abort());
 await page.route("**/functions/v1/**",async route=>{
  const r=route.request();
  const headers={"access-control-allow-origin":"*","access-control-allow-headers":"authorization,content-type,apikey",
    "access-control-allow-methods":"GET,POST,OPTIONS","cache-control":"no-store"};
  if(r.method()==="OPTIONS"){
    await route.fulfill({status:204,headers});return;
  }
  const json=r.postDataJSON()||{},action=json.action||"";
  incoming.push({action,headers:r.headers()});
  let result={ok:false,error:"invalid"};
  if(r.url().includes("nongkum-results-editor")){
    if(action==="unlock")result={ok:true,token:editorToken,expires_at:"2030-01-01T00:00:00Z"};
    if(action==="status")result={ok:true,expires_at:"2030-01-01T00:00:00Z"};
  }else if(r.url().includes("nongkum-results-reviewer")){
    if(action==="unlock")result={ok:true,token:reviewerToken,expires_at:"2030-01-01T00:00:00Z",reviewer_name:"ผู้ตรวจทดสอบ"};
    if(action==="status")result={ok:true,expires_at:"2030-01-01T00:00:00Z"};
  }else if(r.url().includes("nongkum-activity-photos")){
    if(action==="upload"){
      uploadCalls++;
      eventId=json.event_id;
      assert.ok(typeof json.image_b64==="string"&&json.image_b64.length>1500);
      result={ok:true,id:created,status:"review"};
    }
    if(action==="mine"){
      statusCalls++;
      result={ok:true,items:[{id:created,event_id:eventId,sport_id:"petanque",
        division:"12 ปี ชาย",caption:"ภาพบรรยากาศการแข่งขัน",
        status:"review",publication_status:"private",submitted_at:oldDate}]};
    }
    if(action==="queue")result={ok:true,items:reviewItems};
    if(action==="preview")result={ok:true,image_b64:picture,mime_type:"image/webp"};
    if(action==="publish"){
      publishCalls++;
      assert.equal(json.public_consent_checked,true);
      assert.ok(String(json.public_consent_note).length>=8);
      reviewItems=reviewItems.map(x=>x.id===created?{...x,status:"approved",publication_status:"published"}:x);
      result={ok:true,status:"published"};
    }
  }
  await route.fulfill({status:200,contentType:"application/json",headers,body:JSON.stringify(result)});
 });
 await page.goto(base+"/upload-photos.html",{waitUntil:"domcontentloaded"});
 await page.locator("#photoPin").fill("1234");
 await page.locator("#photoLoginButton").click();
 await page.locator("#photoWorkspace").waitFor({state:"visible"});
 await page.locator("#photoSport").selectOption("petanque");
 const optionValue=await page.locator("#photoFixture option").nth(1).getAttribute("value");
 assert.ok(optionValue);
 await page.locator("#photoFixture").selectOption(optionValue);
 await page.locator("#photoFixtureSelected").waitFor({state:"visible"});
 assert.match(await page.locator("#photoFixtureSelected").innerText(),/รายการที่เลือก/);
 const width=await page.evaluate(()=>({body:document.documentElement.scrollWidth,viewport:innerWidth}));
 assert.ok(width.body<=width.viewport+1,"390px upload should not overflow "+JSON.stringify(width));
 await page.locator("#photoUploader").fill("เจ้าหน้าที่ทดสอบ");
 await page.locator("#photoFile").setInputFiles({
  name:"synthetic-photo.png",mimeType:"image/png",buffer:Buffer.from(image.png,"base64")
 });
 await page.locator("#photoPreview").waitFor({state:"visible",timeout:20000});
 await page.locator("#photoConfirm").check();
 await page.locator("#photoSubmit").click();
 await page.locator("#photoSendSuccess").waitFor({state:"visible",timeout:20000});
 assert.equal(uploadCalls,1,"submit must occur once");
 assert.equal(await page.locator("#photoUploadForm").isVisible(),false,"hide original upload form");
 assert.match(await page.locator("#photoSuccessReference").innerText(),/11111111-2222/);
 assert.match(await page.locator("#photoSendSuccess").innerText(),/รอผู้ตรวจ/);
 await page.screenshot({path:join(out,"390px-upload-success.png"),fullPage:true});
 await page.locator("#photoViewMine").click();
 await page.locator("#photoMineList .photo-mine-entry").first().waitFor();
 assert.equal(statusCalls,1);
 assert.equal(await page.locator(".photo-mine-entry").count(),1);
 assert.match(await page.locator(".photo-mine-entry").first().innerText(),/รอผู้ตรวจ/);
 await page.locator("#photoSendMore").click();
 assert.equal(await page.locator("#photoUploadForm").isVisible(),true);
 assert.equal(await page.locator("#photoSport").inputValue(),"petanque");
 await page.setViewportSize({width:320,height:700});
 const narrow=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth}));
 assert.ok(narrow.page<=narrow.viewport+1,"320px viewport should not overflow "+JSON.stringify(narrow));
 // New reviewer, no actual PIN and no student photos. All queue data is mocked.
 reviewItems=[
  {id:created,event_id:optionValue,sport_id:"petanque",division:"12 ปี ชาย",
   uploaded_by:"เจ้าหน้าที่ทดสอบ",caption:"ภาพสนามกีฬา",status:"review",
   publication_status:"private",submitted_at:oldDate},
  {id:oldPublic,event_id:optionValue,sport_id:"petanque",division:"12 ปี ชาย",
   uploaded_by:"เจ้าหน้าที่ทดสอบ",caption:"ภาพเผยแพร่แล้ว",status:"approved",
   publication_status:"published",submitted_at:oldDate},
  {id:oldPrivate,event_id:optionValue,sport_id:"petanque",division:"12 ปี ชาย",
   uploaded_by:"เจ้าหน้าที่ทดสอบ",caption:"เก็บภายใน",status:"approved",
   publication_status:"private",submitted_at:oldDate}
 ];
 await page.setViewportSize({width:390,height:844});
 await page.goto(base+"/review-photos.html",{waitUntil:"domcontentloaded"});
 await page.locator("#photoReviewerName").fill("ผู้ตรวจทดสอบ");
 await page.locator("#photoReviewerPin").fill("12345678");
 await page.locator("#photoReviewLoginButton").click();
 await page.locator("#photoReviewWorkspace").waitFor({state:"visible"});
 await page.locator("#photoReviewList .photo-review-card").first().waitFor({timeout:10000});
 assert.equal(await page.locator("#photoReviewList .photo-review-card").count(),1);
 assert.match(await page.locator('[data-photo-status="review"]').innerText(),/\(1\)/);
 assert.match(await page.locator('[data-photo-status="published"]').innerText(),/\(1\)/);
 assert.match(await page.locator('[data-photo-status="private"]').innerText(),/\(1\)/);
 await page.locator("#photoReviewList .photo-review-preview img").first().waitFor({state:"visible"});
 await page.screenshot({path:join(out,"390px-review-pending.png"),fullPage:true});
 const dialogs=[];
 page.on("dialog",dialog=>{dialogs.push(dialog.message());dialog.dismiss();});
 await page.getByRole("button",{name:"อนุมัติเผยแพร่บนเว็บไซต์"}).click();
 assert.match(await page.locator(".photo-card-error").first().innerText(),/สิทธิ์เผยแพร่/);
 assert.equal(publishCalls,0);
 await page.locator("[data-public-consent]").check();
 await page.getByRole("button",{name:"อนุมัติเผยแพร่บนเว็บไซต์"}).click();
 assert.match(await page.locator(".photo-card-error").first().innerText(),/8 ตัวอักษร/);
 await page.locator("[data-consent-note]").fill("สิทธิ์เผยแพร่ภาพจำลองได้รับการอนุญาต");
 await page.getByRole("button",{name:"อนุมัติเผยแพร่บนเว็บไซต์"}).click();
 await page.locator("#photoReviewList .photo-review-card").first().waitFor({state:"detached"});
 assert.equal(publishCalls,1);
 assert.equal(dialogs.length,0,"publishing should not add a second native confirmation after explicit consent");
 await page.locator('[data-photo-status="published"]').click();
 assert.equal(await page.locator(".photo-review-card").count(),2);
 await page.locator('[data-photo-status="private"]').click();
 assert.equal(await page.locator(".photo-review-card").count(),1);
 const narrowReview=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth}));
 assert.ok(narrowReview.page<=narrowReview.viewport+1,"reviewer overflow "+JSON.stringify(narrowReview));
 assert.ok(incoming.filter(x=>x.action==="mine").every(x=>x.headers.authorization==="Bearer "+editorToken));
 console.log("R40-H BROWSER PASS: 320/390px, upload receipt, single send, own-status, reviewer tabs and explicit rights");
}
try{await exercise();}
finally{if(browser)await browser.close();server.kill("SIGTERM");}

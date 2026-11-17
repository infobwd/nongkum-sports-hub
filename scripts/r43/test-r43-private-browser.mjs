#!/usr/bin/env node
// R43-F: synthetic PIN staff login, protected gateway + mobile QA.
// No real operator, secret, live endpoint, or production database is accessed.
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium} from "playwright";
const base="http://127.0.0.1:8784";
const server=spawn("python3",["-m","http.server","8784","--bind","127.0.0.1"],{stdio:"ignore"});
let browser;
try{
 for(let i=0;i<50;i++){
   try{if((await fetch(base+"/schedule-review.html")).ok)break;}catch(_){}
   await new Promise(r=>setTimeout(r,200));
 }
 browser=await chromium.launch({headless:true});
 const ctx=await browser.newContext({viewport:{width:390,height:844}});
 const page=await ctx.newPage();
 const writes=[];
 page.on("request",req=>{if(req.method()!=="GET")writes.push(req.url());});
 for(const width of [320,375,390,430]){
   await page.setViewportSize({width,height:812});
   await page.goto(base+"/schedule-review.html",{waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>document.querySelector("#r43PrivateStatus").textContent.includes("ยังไม่ได้เปิดใช้งาน"));
   assert.equal(await page.locator("#r43PrivateLogin").isHidden(),true);
   assert.equal(await page.locator("#r43PrivateWorkspace").isHidden(),true);
   const info=await page.evaluate(()=>({
     scrollWidth:document.documentElement.scrollWidth,
     nav:document.querySelectorAll("#mobileTabNav>a").length
   }));
   assert.ok(info.scrollWidth<=width+1,"mobile horizontal overflow at "+width);
   assert.equal(info.nav,4);
 }
 assert.deepEqual(writes,[],"disabled R43 must not write");
 const domain="https://zprxvpfkvforoxrboqiv.supabase.co/functions/v1/";
 const pinEdge=domain+"nongkum-r43-pin",adminEdge=domain+"nongkum-schedule-admin";
 await page.route("**/data/r43-public-pin-config.json",route=>route.fulfill({
   status:200,contentType:"application/json",
   body:JSON.stringify({enabled:true,supabase_url:"https://zprxvpfkvforoxrboqiv.supabase.co",
     pin_edge_url:pinEdge,edge_url:adminEdge,
     publishable_key:"sb_publishable_test_only_not_a_real_key_000000000000"})
 }));
 const pinCalls=[],adminCalls=[];
 let allowSubmit=false;
 await page.route(pinEdge,route=>{
   const data=route.request().postDataJSON();
   pinCalls.push(data.action);
   const editor=data.action==="login"&&data.pin==="1234567890";
   const reviewer=data.action==="login"&&data.pin==="9999999999";
   const body=(editor||reviewer)?{
     ok:true,token:(editor?"a":"b").repeat(64),
     staff_id:"00000000-0000-4000-8000-000000000001",
     full_name:editor?"กรรมการผู้เสนอทดสอบ":"กรรมการผู้ตรวจทดสอบ",
     school_id:"wangdong",
     can_propose:editor,can_assign:false,can_review:reviewer,
     expires_at:new Date(Date.now()+3600000).toISOString()
   }:data.action==="logout"?{ok:true}:{ok:false,error:"unauthenticated"};
   return route.fulfill({status:body.ok?200:401,contentType:"application/json",
     headers:{"access-control-allow-origin":"*"},body:JSON.stringify(body)});
 });
 await page.route(adminEdge,route=>{
   const data=route.request().postDataJSON();
   adminCalls.push({action:data.action,auth:route.request().headers().authorization,data});
   const isEditor=route.request().headers().authorization==="Bearer "+"a".repeat(64);
   const isReviewer=route.request().headers().authorization==="Bearer "+"b".repeat(64);
   const reply=data.action==="status"?
     {ok:true,can_propose:isEditor,can_assign:false,can_review:isReviewer}:
     data.action==="submit"&&isEditor&&allowSubmit?
     {ok:true,id:"00000000-0000-4000-8000-000000000007"}:
     data.action==="queue"&&isReviewer?{ok:true,requests:[]}:
     data.action==="people_pending"&&isReviewer?{ok:true,people:[]}:
     data.action==="new_queue"&&isReviewer?{ok:true,candidates:[]}:
     {ok:false,error:"forbidden"};
   return route.fulfill({status:reply.ok?200:403,contentType:"application/json",
     headers:{"access-control-allow-origin":"*"},body:JSON.stringify(reply)});
 });
 await page.reload({waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>!document.querySelector("#r43PrivateLogin").hidden);
 assert.equal(await page.locator("#r43Email").count(),0,"no email form");
 assert.equal(await page.locator("#r43Password").count(),0,"no Supabase Auth password form");
 assert.equal(await page.locator("#r43EditorPinForm").count(),0,"no shared editor PIN form");
 assert.equal(await page.locator("#r43ReviewerPinForm").count(),0,"no shared reviewer PIN form");
 await page.locator("#r43PersonalPin").fill("0000000000");
 await page.locator("#r43LoginForm button[type=submit]").click();
 await page.waitForFunction(()=>document.querySelector("#r43PrivateStatus").textContent.includes("รหัสไม่ถูกต้อง"));
 assert.equal(await page.locator("#r43PrivateWorkspace").isHidden(),true);
 assert.equal(await page.locator("#r43PersonalPin").inputValue(),"","PIN cleared on failure");
 await page.locator("#r43PersonalPin").fill("1234567890");
 await page.locator("#r43LoginForm button[type=submit]").click();
 await page.waitForFunction(()=>!document.querySelector("#r43PrivateWorkspace").hidden);
 assert.match(await page.locator("#r43RoleSummary").innerText(),/กรรมการผู้เสนอทดสอบ.*wangdong.*เสนอแก้ตาราง/);
 assert.equal(await page.locator("#r43PrivateSubmit").isVisible(),true);
 assert.equal(await page.locator("#r43PrivateReview").isHidden(),true);
 assert.equal(await page.locator("#r43PersonalPin").inputValue(),"","PIN cleared on success");
 // The very same session token is checked by the independent admin gateway.
 await page.locator("#r43PrivateFixture").selectOption({index:1});
 await page.locator("#r43PrivateTime").fill("10:00");
 await page.locator("#r43PrivateEvidence").fill("SYNTHETIC-PROPOSAL-001");
 await page.locator("#r43PrivateReason").fill("SYNTHETIC proposed time correction");
 await page.locator("#r43SubmitForm button[type=submit]").click();
 await page.waitForFunction(()=>document.querySelector("#r43PrivateStatus").textContent.includes("ไม่มีสิทธิ์ดำเนินการ"));
 assert.equal(adminCalls.at(-1).action,"submit");
 assert.equal(adminCalls.at(-1).auth,"Bearer "+"a".repeat(64));
 assert.equal("staff_id" in adminCalls.at(-1).data,false,"browser must never provide an actor ID");
 assert.equal("legacy_token" in adminCalls.at(-1).data,false,"legacy shared PIN must not be sent");
 allowSubmit=true;
 await page.locator("#r43SubmitForm button[type=submit]").click();
 await page.waitForFunction(()=>document.querySelector("#r43PrivateStatus").textContent.includes("ส่งคำขอรอตรวจแล้ว"));
 assert.match(await page.locator("#r43PrivateStatus").innerText(),/ยังไม่เผยแพร่/);
 assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(x=>/r43/i.test(x)).length),0,
   "personal session must not persist in localStorage");
 await page.locator("#r43Logout").click();
 await page.waitForFunction(()=>!document.querySelector("#r43PrivateLogin").hidden);
 assert.equal(await page.locator("#r43PrivateWorkspace").isHidden(),true);
 await page.locator("#r43PersonalPin").fill("9999999999");
 await page.locator("#r43LoginForm button[type=submit]").click();
 await page.waitForFunction(()=>!document.querySelector("#r43PrivateWorkspace").hidden);
 assert.equal(await page.locator("#r43PrivateSubmit").isHidden(),true);
 assert.equal(await page.locator("#r43PrivateReview").isVisible(),true);
 assert.ok(["queue","new_queue","people_pending"].every(action=>adminCalls.some(x=>x.action===action
   &&x.auth==="Bearer "+"b".repeat(64))),"reviewer-only queue uses reviewer's session");
 assert.ok(pinCalls.includes("logout"),"logout should revoke staff session");
 console.log("R43-F STAFF PIN MOBILE PASS: 320–430px, staff identity, editor and reviewer roles, independent gateway token, no public writes");
}finally{if(browser)await browser.close();server.kill("SIGTERM");}

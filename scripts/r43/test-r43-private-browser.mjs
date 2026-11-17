#!/usr/bin/env node
// R43-E: Chromium synthetic access-control and mobile layout, never real credentials.
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium} from "playwright";
const base="http://127.0.0.1:8784";
const server=spawn("python3",["-m","http.server","8784","--bind","127.0.0.1"],{stdio:"ignore"});
let browser;
try{
 for(let i=0;i<50;i++){try{if((await fetch(base+"/schedule-review.html")).ok)break;}catch(_){}
   await new Promise(r=>setTimeout(r,200));}
 browser=await chromium.launch({headless:true});
 const ctx=await browser.newContext({viewport:{width:390,height:844}});
 const page=await ctx.newPage();
 const unexpectedWrites=[];
 page.on("request",req=>{if(req.method()!=="GET")unexpectedWrites.push(req.url());});
 for(const width of [320,375,390,430]){
   await page.setViewportSize({width,height:812});
   await page.goto(base+"/schedule-review.html",{waitUntil:"domcontentloaded"});
   await page.locator("#r43PrivateStatus").waitFor();
   await page.waitForFunction(()=>document.querySelector("#r43PrivateStatus").textContent.includes("ยังไม่ได้เปิดใช้งาน"));
   assert.equal(await page.locator("#r43PrivateLogin").isHidden(),true);
   assert.equal(await page.locator("#r43PrivateWorkspace").isHidden(),true);
   const info=await page.evaluate(()=>({
     scrollWidth:document.documentElement.scrollWidth,width:window.innerWidth,
     background:getComputedStyle(document.querySelector("header.top")).backgroundColor,
     nav:document.querySelectorAll("#mobileTabNav>a").length
   }));
   assert.ok(info.scrollWidth<=width+1,"overflow at "+width);
   assert.equal(info.background,"rgb(255, 255, 255)");
   assert.equal(info.nav,4);
 }
 assert.deepEqual(unexpectedWrites,[],"default disabled page must not attempt any writes");
 // Inject a synthetic PUBLIC (not secret) configuration, fake Auth response, and
 // fake forbidden R43 server response. No production network traffic.
 await page.route("**/data/r43-public-auth-config.json",route=>route.fulfill({
   status:200,contentType:"application/json",
   body:JSON.stringify({enabled:true,supabase_url:"https://zprxvpfkvforoxrboqiv.supabase.co",
     edge_url:"https://zprxvpfkvforoxrboqiv.supabase.co/functions/v1/nongkum-schedule-admin",
     publishable_key:"sb_publishable_test_only_not_a_real_key_000000000000"})
 }));
 await page.route("https://zprxvpfkvforoxrboqiv.supabase.co/auth/v1/token?grant_type=password",route=>route.fulfill({
   status:200,contentType:"application/json",
   headers:{"access-control-allow-origin":"*"},
   body:JSON.stringify({access_token:"synthetic_jwt_not_valid",expires_in:300})
 }));
 await page.route("https://zprxvpfkvforoxrboqiv.supabase.co/functions/v1/nongkum-schedule-admin",route=>route.fulfill({
   status:403,contentType:"application/json",
   headers:{"access-control-allow-origin":"*"},
   body:JSON.stringify({ok:false,error:"forbidden"})
 }));
 await page.reload({waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>!document.querySelector("#r43PrivateLogin").hidden);
 await page.locator("#r43Email").fill("synthetic@example.invalid");
 await page.locator("#r43Password").fill("NOT-A-REAL-PASSWORD");
 await page.locator("#r43LoginForm button[type=submit]").click();
 await page.waitForFunction(()=>document.querySelector("#r43PrivateStatus").textContent.includes("ไม่มีสิทธิ์"));
 assert.equal(await page.locator("#r43PrivateWorkspace").isHidden(),true,"forbidden accounts do not see data");
 assert.equal(await page.locator("#r43Password").inputValue(),"","password cleared after failed role check");
 assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(x=>/r43/i.test(x)).length),0,
   "no localStorage credential");
 console.log("R43-E MOBILE PASS: fail-closed, 320–430px, no writes until authenticated, 403 denied");
 // Simulate an ALLOWED Auth user, then unlock with only the existing result PINs.
 // Every token, identity and response in this test is synthetic.
 const r43Url="https://zprxvpfkvforoxrboqiv.supabase.co/functions/v1/nongkum-schedule-admin";
 const editorUrl="https://zprxvpfkvforoxrboqiv.supabase.co/functions/v1/nongkum-results-editor";
 const reviewerUrl="https://zprxvpfkvforoxrboqiv.supabase.co/functions/v1/nongkum-results-reviewer";
 const editorToken="a".repeat(64),reviewerToken="b".repeat(64);
 const expires=new Date(Date.now()+6*60*60*1000).toISOString();
 const requests=[];
 await page.unroute(r43Url);
 await page.route(r43Url,route=>{
   const body=route.request().postDataJSON();
   requests.push({action:body.action,legacy_token:body.legacy_token});
   const response=body.action==="status"?
     {ok:true,can_propose:true,can_assign:false,can_review:true}:
     body.action==="queue"?{ok:true,requests:[]}:
     body.action==="new_queue"?{ok:true,candidates:[]}:
     body.action==="people_pending"?{ok:true,people:[]}:
     {ok:false,error:"forbidden"};
   route.fulfill({status:response.ok?200:403,contentType:"application/json",
     headers:{"access-control-allow-origin":"*"},body:JSON.stringify(response)});
 });
 await page.route(editorUrl,route=>route.fulfill({
   status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},
   body:JSON.stringify({ok:true,token:editorToken,expires_at:expires})
 }));
 await page.route(reviewerUrl,route=>route.fulfill({
   status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},
   body:JSON.stringify({ok:true,token:reviewerToken,expires_at:expires,reviewer_name:"กรรมการทดสอบ"})
 }));
 await page.reload({waitUntil:"domcontentloaded"});
 await page.locator("#r43Email").fill("authorized-person@example.invalid");
 await page.locator("#r43Password").fill("SYNTHETIC-ONLY");
 await page.locator("#r43LoginForm button[type=submit]").click();
 await page.waitForFunction(()=>!document.querySelector("#r43PrivateWorkspace").hidden);
 assert.equal(await page.locator("#r43EditorPinForm").isVisible(),true);
 assert.equal(await page.locator("#r43ReviewerPinForm").isVisible(),true);
 assert.equal(requests.some(r=>r.action==="status"&&r.legacy_token),false,
   "Auth-only role status must not require or leak a legacy token");
 await page.locator("#r43EditorPin").fill("1111");
 await page.locator("#r43EditorPinForm button[type=submit]").click();
 await page.waitForFunction(()=>document.querySelector("#r43EditorPinStatus").textContent.includes("ใช้สิทธิ์รหัสเดิม"));
 await page.locator("#r43ReviewerName").fill("กรรมการทดสอบ");
 await page.locator("#r43ReviewerPin").fill("12345678");
 await page.locator("#r43ReviewerPinForm button[type=submit]").click();
 await page.waitForFunction(()=>document.querySelector("#r43ReviewerPinStatus").textContent.includes("ใช้สิทธิ์รหัสเดิม"));
 for(const r of requests.filter(r=>["queue","new_queue","people_pending"].includes(r.action))){
   assert.equal(r.legacy_token,reviewerToken,"review actions must use the reviewer session only");
 }
 const stored=await page.evaluate(()=>({
   editor:JSON.parse(localStorage.getItem("nongkum-r34-editor-session-v1")),
   reviewer:JSON.parse(localStorage.getItem("nongkum-r37-reviewer-session-v1")),
   r43Keys:Object.keys(localStorage).filter(x=>/r43/i.test(x))
 }));
 assert.equal(stored.editor.token,editorToken);
 assert.equal(stored.reviewer.token,reviewerToken);
 assert.deepEqual(stored.r43Keys,[],"no separate R43 credential is stored");
 assert.equal(await page.locator("#r43EditorPin").inputValue(),"");
 assert.equal(await page.locator("#r43ReviewerPin").inputValue(),"");
 console.log("R43-F MOBILE PASS: Auth identity + reused 6h R34/R37 sessions, reviewer-specific actions, no PIN stored");
}finally{if(browser)await browser.close();server.kill("SIGTERM");}

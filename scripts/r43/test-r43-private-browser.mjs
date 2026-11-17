#!/usr/bin/env node
// R43-F: synthetic PIN-only identity phase and fail-closed mobile browser QA.
// NEVER uses real staff, PINs, production services, or accepted schedule writes.
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
 const calls=[];
 page.on("request",req=>{if(req.method()!=="GET")calls.push(req.url());});
 for(const width of [320,375,390,430]){
   await page.setViewportSize({width,height:812});
   await page.goto(base+"/schedule-review.html",{waitUntil:"domcontentloaded"});
   await page.locator("#r43PrivateStatus").waitFor();
   await page.waitForFunction(()=>document.querySelector("#r43PrivateStatus").textContent.includes("ยังไม่ได้เปิดใช้งาน"));
   assert.equal(await page.locator("#r43PrivateLogin").isHidden(),true);
   assert.equal(await page.locator("#r43PrivateWorkspace").isHidden(),true);
   const info=await page.evaluate(()=>({
     scrollWidth:document.documentElement.scrollWidth,width:window.innerWidth,
     nav:document.querySelectorAll("#mobileTabNav>a").length
   }));
   assert.ok(info.scrollWidth<=width+1,"mobile overflow at "+width);
   assert.equal(info.nav,4);
 }
 assert.deepEqual(calls,[],"default disabled R43 page must not POST");
 const edge="https://zprxvpfkvforoxrboqiv.supabase.co/functions/v1/nongkum-r43-pin";
 await page.route("**/data/r43-public-pin-config.json",route=>route.fulfill({
   status:200,contentType:"application/json",
   body:JSON.stringify({enabled:true,supabase_url:"https://zprxvpfkvforoxrboqiv.supabase.co",
     pin_edge_url:edge,publishable_key:"sb_publishable_test_only_not_a_real_key_000000000000"})
 }));
 const actions=[];
 await page.route(edge,route=>{
   const data=route.request().postDataJSON();
   actions.push({action:data.action,pin:data.pin,token:data.token});
   const successful=data.action==="login"&&data.pin==="1234567890";
   const body=successful?{
     ok:true,token:"a".repeat(64),full_name:"กรรมการทดสอบ",school_id:"wangdong",
     can_propose:true,can_assign:false,can_review:false,
     expires_at:new Date(Date.now()+3600000).toISOString()
   }:data.action==="logout"?{ok:true}:{ok:false,error:"unauthenticated"};
   return route.fulfill({status:body.ok?200:401,contentType:"application/json",
     headers:{"access-control-allow-origin":"*"},body:JSON.stringify(body)});
 });
 await page.reload({waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>!document.querySelector("#r43PrivateLogin").hidden);
 assert.equal(await page.locator("#r43Email").count(),0,"email login must be removed");
 assert.equal(await page.locator("#r43Password").count(),0,"password account must be removed");
 await page.locator("#r43PersonalPin").fill("0000000000");
 await page.locator("#r43LoginForm button[type=submit]").click();
 await page.waitForFunction(()=>document.querySelector("#r43PrivateStatus").textContent.includes("รหัสไม่ถูกต้อง"));
 assert.equal(await page.locator("#r43PrivateWorkspace").isHidden(),true);
 assert.equal(await page.locator("#r43PersonalPin").inputValue(),"","PIN cleared on failure");
 await page.locator("#r43PersonalPin").fill("1234567890");
 await page.locator("#r43LoginForm button[type=submit]").click();
 await page.waitForFunction(()=>!document.querySelector("#r43PrivateWorkspace").hidden);
 assert.match(await page.locator("#r43RoleSummary").innerText(),/กรรมการทดสอบ.*wangdong.*เสนอแก้ตาราง/);
 assert.equal(await page.locator("#r43PrivateSubmit").isHidden(),true,"phase 1 cannot modify schedules");
 assert.equal(await page.locator("#r43PrivateReview").isHidden(),true,"phase 1 cannot approve");
 assert.equal(await page.locator("#r43PrivateNew").isHidden(),true,"phase 1 cannot create fixtures");
 assert.equal(await page.locator("#r43PersonalPin").inputValue(),"","PIN cleared on success");
 assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(x=>/r43/i.test(x)).length),0,
   "R43 secrets must not persist in localStorage");
 assert.equal(calls.every(url=>url===edge),true,"no request to old R43 mutation gateway");
 await page.locator("#r43Logout").click();
 await page.waitForFunction(()=>!document.querySelector("#r43PrivateLogin").hidden);
 assert.equal(await page.locator("#r43PrivateWorkspace").isHidden(),true);
 assert.equal(actions.map(x=>x.action).join(","),"login,login,logout");
 assert.equal(actions[2].token,"a".repeat(64),"only active session revoked");
 console.log("R43-F PIN PHASE-1 MOBILE PASS: one-field login, identity/roles, failed access, logout, no schedule writes");
}finally{if(browser)await browser.close();server.kill("SIGTERM");}

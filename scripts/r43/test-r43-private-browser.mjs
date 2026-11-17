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
}finally{if(browser)await browser.close();server.kill("SIGTERM");}

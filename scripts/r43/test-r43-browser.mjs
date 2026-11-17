#!/usr/bin/env node
/* R43-A synthetic UI QA: local-only proposals, never a production write. */
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {readFileSync,mkdirSync} from "node:fs";
import {join} from "node:path";
import {chromium} from "playwright";
const base="http://127.0.0.1:8783",out=join(process.env.RUNNER_TEMP||"/tmp","r43-mobile-evidence");
mkdirSync(out,{recursive:true});
const server=spawn("python3",["-m","http.server","8783","--bind","127.0.0.1"],{stdio:"ignore"});
let browser;
try{
 for(let i=0;i<45;i++){try{if((await fetch(base+"/schedule-manager.html")).ok)break;}catch(_){}
   await new Promise(r=>setTimeout(r,180));}
 browser=await chromium.launch({headless:true});
 const ctx=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
 const page=await ctx.newPage();
 const writes=[];
 page.on("request",req=>{if(req.method()!=="GET")writes.push(req.url());});
 for(const width of [320,375,390,430]){
  await page.setViewportSize({width,height:812});
  await page.goto(base+"/schedule-manager.html",{waitUntil:"domcontentloaded"});
  await page.locator(".r43-match").first().waitFor();
  const metrics=await page.evaluate(()=>{
   const h=document.querySelector("header.top"),nav=document.querySelector("#mobileTabNav");
   return {scrollWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth,
    headerColor:getComputedStyle(h).backgroundColor,position:getComputedStyle(h).position,
    hero:getComputedStyle(h.querySelector(".hero")).display,
    navLinks:nav.querySelectorAll("a").length,
    active:nav.querySelectorAll('a[aria-current="page"]').length,
    bodyHasPIIStorage:(localStorage.getItem("r43-proposals")!==null)};
  });
  assert.ok(metrics.scrollWidth<=width+1,"no horizontal overflow at "+width+": "+JSON.stringify(metrics));
  assert.equal(metrics.headerColor,"rgb(255, 255, 255)","same white header as results");
  assert.equal(metrics.position,"sticky");
  assert.equal(metrics.hero,"none");
  assert.equal(metrics.navLinks,4);
  assert.equal(metrics.active,1);
  assert.equal(metrics.bodyHasPIIStorage,false);
 }
 await page.setViewportSize({width:390,height:844});
 await page.goto(base+"/schedule-manager.html",{waitUntil:"domcontentloaded"});
 await page.locator(".r43-match").first().click();
 assert.equal(await page.locator("#r43EditorPanel").isVisible(),true);
 await page.locator("#r43Date").fill("2026-11-19");
 await page.locator("#r43Time").fill("10:30");
 await page.locator("#r43Field").fill("สนามทดสอบ 2");
 await page.locator("#r43Person").fill("ครูข้อมูลทดสอบ ไม่ใช่บุคคลจริง");
 await page.locator("#r43PersonSchool").selectOption({index:1});
 await page.locator("#r43Role").selectOption({label:"ผู้ตัดสิน"});
 await page.locator("#r43DutyStart").fill("10:30");
 await page.locator("#r43DutyEnd").fill("11:30");
 await page.locator("#r43AddPerson").click();
 assert.equal(await page.locator(".r43-staff-list li").count(),1);
 await page.locator("#r43Reason").fill("คำขอแก้จากข้อมูลสังเคราะห์เพื่อตรวจระบบ");
 await page.locator("#r43ScheduleForm button[type='submit']").click();
 assert.match(await page.locator("#r43Count").textContent(),/1 คำขอ/);
 await page.screenshot({path:join(out,"r43-synthetic-390.png"),fullPage:true});
 const [download]=await Promise.all([page.waitForEvent("download"),page.locator("#r43Download").click()]);
 const bytes=readFileSync(await download.path(),"utf8");
 const pkg=JSON.parse(bytes);
 assert.equal(pkg.publication_status,"not_published");
 assert.equal(pkg.requests.length,1);
 assert.equal(pkg.requests[0].assignment_proposals[0].appointment_status,"draft_not_appointed");
 assert.equal(pkg.requests[0].changes.field,"สนามทดสอบ 2");
 assert.equal(pkg.requests[0].original.field!=="สนามทดสอบ 2",true);
 await page.reload({waitUntil:"domcontentloaded"});
 await page.locator(".r43-match").first().waitFor();
 assert.equal(await page.locator("#r43Download").isDisabled(),true,"no persisted private draft");
 assert.equal((await page.locator("#r43Pending article").count()),0);
 assert.deepEqual(writes,[],"operator UI must not call any write endpoint");
 console.log("R43-A BROWSER PASS: four mobile widths, white sticky header, local assignment+draft download, no persistence/writes");
}finally{
 if(browser)await browser.close();
 server.kill("SIGTERM");
}

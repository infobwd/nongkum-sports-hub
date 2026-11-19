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
 await page.locator(".r43-match").first().waitFor();
 assert.match(await page.locator("#r43SourceInfo").textContent(),/R52/);
 assert.match(await page.locator("#r43SourceInfo").textContent(),/ไฟล์คำขอยังอ้างอิงรุ่นข้อมูลเดิม/);
 await page.locator("#r43Sport").selectOption("petanque");
 for(const row of [
  {id:"petanque-p17-10-ปี-ชาย-010",teams:"รางขาม — ทุ่งมะสังฯ"},
  {id:"petanque-p17-10-ปี-ชาย-030",teams:"วังเขาแก้ว — หนองกุ่ม"},
  {id:"petanque-p18-12-ปี-หญิง-042",teams:"เสาหงส์ — วังด้ง"},
  {id:"petanque-p17-8-ปี-หญิง-027",teams:"หนองกุ่ม — หนองกระทุ่ม"}
 ]){
  await page.locator("#r43Search").fill(row.id);
  const match=page.locator('[data-id="'+row.id+'"]');
  await match.waitFor();
  await match.click();
  assert.ok((await page.locator("#r43SelectedDetail").textContent()).includes(row.teams),
    "verified R52 participants visible in R43: "+row.id);
 }
 // Return to the normal draft request flow. R53 must preserve local-only editing.
 await page.goto(base+"/schedule-manager.html",{waitUntil:"domcontentloaded"});
 await page.locator(".r43-match").first().waitFor();
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
 assert.equal(pkg.source_key,"r33-20261116-7ba60be1-fa3269b5",
   "R53 display only, do not silently change source contract for private draft");
 assert.equal(pkg.schema,"nongkum-schedule-proposal-v1");
 assert.equal(pkg.requests.length,1);
 assert.equal(pkg.requests[0].assignment_proposals[0].appointment_status,"draft_not_appointed");
 assert.equal(pkg.requests[0].changes.field,"สนามทดสอบ 2");
 assert.equal(pkg.requests[0].original.field!=="สนามทดสอบ 2",true);
 await page.reload({waitUntil:"domcontentloaded"});
 await page.locator(".r43-match").first().waitFor();
 assert.equal(await page.locator("#r43Download").isDisabled(),true,"no persisted private draft");
 assert.equal((await page.locator("#r43Pending article").count()),0);
 assert.deepEqual(writes,[],"operator UI must not call any write endpoint");
 // If an overlay is missing or stale, the editor must fail closed instead of using old pairs.
 await page.route("**/js/program-approved-pairs-r52.js*",route=>route.abort());
 await page.goto(base+"/schedule-manager.html",{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>document.querySelector("#r43Status")?.textContent?.includes("เปิดข้อมูลตารางไม่ได้"));
 assert.equal(await page.locator(".r43-match").count(),0,"missing R52 prevents stale drafts");
 assert.match(await page.locator("#r43SourceInfo").textContent(),/ยังไม่ผ่านการตรวจรุ่น R52/);
 await page.unroute("**/js/program-approved-pairs-r52.js*");
 assert.deepEqual(writes,[],"missing overlay never sends writes");
 console.log("R53/R43-A BROWSER PASS: R52 pairs, original draft JSON, fail-closed loading, four mobile widths, no persistence/writes");
}finally{
 if(browser)await browser.close();
 server.kill("SIGTERM");
}

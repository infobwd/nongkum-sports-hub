#!/usr/bin/env node
/* R42: synthetic mobile menu navigation without private accounts or student images. */
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdirSync} from "node:fs";
import {join} from "node:path";
import {chromium} from "playwright";
const port=8770,base="http://127.0.0.1:"+port;
const out=join(process.env.RUNNER_TEMP||"/tmp","r42-mobile-evidence");
mkdirSync(out,{recursive:true});
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],{stdio:"ignore"});
let browser;
const pages=[
 ["index.html","mobileProgramLink"],["results.html","mobileResultsLink"],
 ["standings.html","mobileResultsLink"],["activity-photos.html","mobileGalleryLink"],
 ["upload-photos.html","mobileMoreLink"],["review-photos.html","mobileMoreLink"],["more.html","mobileMoreLink"]
];
try{
 for(let i=0;i<40;i++){
  try{const r=await fetch(base+"/more.html");if(r.ok)break;}catch(_){}
  await new Promise(resolve=>setTimeout(resolve,200));
 }
 browser=await chromium.launch({headless:true});
 const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
 const page=await ctx.newPage();
 await page.route("**/functions/v1/nongkum-activity-photos",r=>r.fulfill({
   status:200,contentType:"application/json",headers:{"Access-Control-Allow-Origin":"*"},
   body:JSON.stringify({ok:true,items:[]})
 }));
 for(const width of [320,375,390,430]){
  await page.setViewportSize({width,height:812});
  for(const [file,active] of pages){
   await page.goto(base+"/"+file,{waitUntil:"domcontentloaded"});
   const data=await page.evaluate(()=>{
    const nav=document.querySelector("#mobileTabNav");
    const rect=nav.getBoundingClientRect();
    const links=[...nav.querySelectorAll("a")];
    const active=links.filter(x=>x.getAttribute("aria-current")==="page");
    const css=getComputedStyle(nav);
    return {
      sw:document.documentElement.scrollWidth,inner:innerWidth,
      position:css.position,visible:css.display!=="none",
      rect:{left:rect.left,right:rect.right,bottom:rect.bottom},
      active:active.map(x=>x.id),links:links.length,
      family:getComputedStyle(document.body).fontFamily,
      lineHeight:getComputedStyle(document.body).lineHeight
    };
   });
   assert.ok(data.sw<=width+1,file+" "+width+" horizontal overflow "+JSON.stringify(data));
   assert.equal(data.visible,true,file+" nav visible");
   assert.equal(data.position,"fixed",file+" nav fixed");
   assert.equal(data.links,4,file+" four tabs");
   assert.equal(data.active.length,1,file+" active exactly one");
   assert.equal(data.active[0],active,file+" correct active tab");
   assert.ok(data.rect.left>=-1&&data.rect.right<=width+1,file+" nav within viewport");
   assert.ok(data.family.includes("Noto Sans Thai"),file+" font aligned");
  }
  if(width===390){
   await page.goto(base+"/activity-photos.html",{waitUntil:"domcontentloaded"});
   await page.screenshot({path:join(out,"390px-gallery.png"),fullPage:true});
   await page.locator("#mobileMoreLink").click();
   await page.waitForURL("**/more.html");
   await page.screenshot({path:join(out,"390px-more.png"),fullPage:true});
   await page.locator('.more-hub a[href="./upload-photos.html"]').click();
   await page.waitForURL("**/upload-photos.html");
   await page.screenshot({path:join(out,"390px-upload-entry.png"),fullPage:true});
   await page.locator("#mobileGalleryLink").click();
   await page.waitForURL("**/activity-photos.html");
   await page.locator('.gallery-shortcuts a[href="./review-photos.html"]').click();
   await page.waitForURL("**/review-photos.html");
   assert.equal(await page.locator("#photoReviewLoginForm").count(),1,"review remains gated");
   await page.locator("#mobileProgramLink").click();
   await page.waitForURL("**/index.html");
  }
 }
 const noJS=await browser.newContext({viewport:{width:390,height:812},javaScriptEnabled:false});
 const p=await noJS.newPage();
 await p.goto(base+"/more.html",{waitUntil:"domcontentloaded"});
 await p.locator("#mobileGalleryLink").click();
 await p.waitForURL("**/activity-photos.html");
 assert.equal(await p.locator("#mobileTabNav a").count(),4,"native nav without JS");
 await noJS.close();
 console.log("R42 BROWSER PASS: 7 pages x 4 mobile widths, tab links, More/photo shortcuts, no JS fallback");
}finally{
 if(browser)await browser.close();
 server.kill("SIGTERM");
}

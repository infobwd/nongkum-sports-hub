#!/usr/bin/env node
/* R40-G browser acceptance with synthetic Canvas WebP; never contacts production endpoints. */
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdirSync} from "node:fs";
import {join} from "node:path";
import {chromium} from "playwright";
const port=8761,root="http://127.0.0.1:"+port;
const uuid1="11111111-2222-4333-8444-555555555555";
const uuid2="66666666-7777-4888-9999-aaaaaaaaaaaa";
const items=[
 {id:uuid1,event_id:"test-fixture",sport_id:"petanque",division:"12 ปี ชาย",
 caption:"ภาพจำลองสนามกีฬา ไม่มีบุคคล",event_date:"2026-11-16",
 published_at:"2026-11-16T07:00:00Z",object_path:"media/"+uuid1+".webp",mime_type:"image/webp"},
 {id:uuid2,event_id:"test-fixture",sport_id:"petanque",division:"12 ปี ชาย",
 caption:"ภาพจำลองสนามกีฬา ภาพที่สอง",event_date:"2026-11-16",
 published_at:"2026-11-16T08:00:00Z",object_path:"media/"+uuid2+".webp",mime_type:"image/webp"}
];
const out=process.env.RUNNER_TEMP||"/tmp";
const artifacts=join(out,"r40g-browser-evidence");mkdirSync(artifacts,{recursive:true});
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],{stdio:"ignore"});
let browser;
try{
 for(let attempt=0;attempt<30;attempt++){
  try{const r=await fetch(root+"/activity-photos.html");if(r.ok)break;}
  catch(_){}
  await new Promise(resolve=>setTimeout(resolve,250));
 }
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 await page.goto("about:blank");
 const dataUrl=await page.evaluate(()=>{
  const canvas=document.createElement("canvas");canvas.width=320;canvas.height=180;
  const ctx=canvas.getContext("2d");ctx.fillStyle="#d4e5fa";ctx.fillRect(0,0,320,180);
  ctx.fillStyle="#3d78a9";ctx.fillRect(0,120,320,60);
  ctx.fillStyle="#e6a745";ctx.beginPath();ctx.arc(90,75,32,0,Math.PI*2);ctx.fill();
  return canvas.toDataURL("image/webp",0.75);
 });
 assert.match(dataUrl,/^data:image\/webp;base64,/);
 const photoBytes=Buffer.from(dataUrl.slice(dataUrl.indexOf(",")+1),"base64");
 await page.route("**/functions/v1/nongkum-activity-photos",route=>
   route.fulfill({status:200,contentType:"application/json",
     headers:{"Access-Control-Allow-Origin":"*","Cache-Control":"no-store"},
     body:JSON.stringify({ok:true,items})}));
 await page.route("**/storage/v1/object/public/nongkum-activity-public/media/*.webp",route=>
   route.fulfill({status:200,contentType:"image/webp",body:photoBytes}));
 await page.goto(root+"/activity-photos.html?event=test-fixture",{waitUntil:"domcontentloaded"});
 await page.locator(".gallery-card").first().waitFor({timeout:10000});
 assert.equal(await page.locator(".gallery-card").count(),2);
 await page.waitForFunction(()=>[...document.querySelectorAll(".gallery-card img")].every(img=>img.complete&&img.naturalWidth>0));
 await page.screenshot({path:join(artifacts,"mobile-gallery.webp.png"),fullPage:true});
 await page.locator(".gallery-card button").first().click();
 assert.equal(await page.locator("#galleryViewer").evaluate(el=>el.open),true);
 await page.locator("#galleryNext").click();
 assert.match(await page.locator("#galleryViewerCount").innerText(),/2 \/ 2/);
 await page.locator("#galleryClose").click();
 await page.goto(root+"/results.html",{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>Boolean(window.NongkumResultsRender),{timeout:10000});
 const html=await page.evaluate(({uuid1,uuid2})=>{
   const base="https://zprxvpfkvforoxrboqiv.supabase.co/storage/v1/object/public/nongkum-activity-public/media/";
   const image1={src:base+uuid1+".webp",caption:"ภาพจำลองสนามกีฬา ไม่มีบุคคล"};
   const image2={src:base+uuid2+".webp",caption:"ภาพจำลองสนามกีฬา ภาพที่สอง"};
   const media=new Map([["test-fixture",{sport_id:"petanque",division:"12 ปี ชาย",...image1,photos:[image1,image2]}]]);
   const result={id:"test-result",event_id:"test-fixture",sport_id:"petanque",division:"12 ปี ชาย",
     status:"approved",result_type:"ranking",rankings:[{rank:1,school_id:"a"}]};
   const card=window.NongkumResultsRender.card(result,[{id:"a",short:"โรงเรียนทดสอบ"}],
     [{id:"petanque",name:"เปตอง",emoji:""}],new Map(),media);
   const host=document.createElement("div");host.id="r40g-synthetic-card";host.innerHTML=card;
   document.body.prepend(host);
   return card;
 },{uuid1,uuid2});
 assert.match(html,/result-activity-photo/);
 assert.match(html,/ดูอีก 1 ภาพ/);
 await page.locator("#r40g-synthetic-card img").waitFor();
 await page.waitForFunction(()=>{const img=document.querySelector("#r40g-synthetic-card img");return img&&img.complete&&img.naturalWidth>0});
 await page.locator("#r40g-synthetic-card").screenshot({path:join(artifacts,"mobile-result-card.webp.png")});
 assert.equal((await page.locator("#r40g-synthetic-card a").getAttribute("href")),
  "./activity-photos.html?event=test-fixture");
 console.log("R40-G BROWSER PASS: synthetic WebP displayed in daily gallery and approved result card, 2-image viewer");
}finally{
 if(browser)await browser.close();
 server.kill("SIGTERM");
}

#!/usr/bin/env node
/* R24-E1: Chromium emulation smoke only; not Safari/LINE/physical device acceptance. */
import assert from "node:assert/strict";
import {mkdirSync} from "node:fs";
import {chromium} from "playwright";
const base=new URL(process.env.R24E_BASE_URL||"http://127.0.0.1:8765/");
assert.equal(base.hostname,"127.0.0.1","R24-E smoke must use local site, never private Drive");
const target=p=>new URL(p,base).toString();
const screenshotRoot="r24e-browser-artifacts";
mkdirSync(screenshotRoot,{recursive:true});

async function verifyAssets(request){
 for(const path of [
  "index.html","booklets.html","booklet-comparison.html","booklet-private-viewer.html",
  "pdf-viewer.html","committee-pdf-viewer.html",
  "assets/souvenir-2569-v2.pdf","assets/souvenir-committee-2569-v3.pdf",
  "data/booklet-versions.json","data/program-pdf-positions-v2.json",
  "data/committee-pdf-positions-v3.json","js/booklet-comparison.js",
  "js/booklet-private-viewer.js","js/booklets.js"
 ]) {
  const r=await request.get(target(path));
  assert.equal(r.status(),200,path+" missing from local static server");
  if(path.endsWith(".pdf"))assert.match(r.headers()["content-type"]||"",/application\/pdf/i,path);
 }
 const catalog=await (await request.get(target("data/booklet-versions.json"))).json();
 assert.deepEqual(catalog.documents.map(d=>d.page_count),[41,64,155]);
 assert.equal(catalog.documents[2].viewer_route,null);
 assert.equal(catalog.documents[2].availability,"pending_permission");
 assert.equal(catalog.audit_155.publication_approved,false);
}
async function verifyViewport(browser,profile){
 const ctx=await browser.newContext({
  viewport:profile.viewport,hasTouch:profile.touch,isMobile:profile.mobile,
  deviceScaleFactor:profile.mobile?2:1,locale:"th-TH",
  permissions:["clipboard-read","clipboard-write"]
 });
 const page=await ctx.newPage(),errors=[],requests=[];
 page.on("pageerror",e=>errors.push(e.message));
 page.on("request",r=>requests.push({method:r.method(),url:r.url()}));
 try {
  await page.goto(target("booklets.html"),{waitUntil:"domcontentloaded"});
  await page.locator("#bookletsList .document-card").first().waitFor();
  const cards=page.locator("#bookletsList .document-card");
  assert.equal(await cards.count(),3,profile.name+" edition cards");
  assert.equal(await page.locator('#bookletsList [data-restricted="true"]').count(),1);
  const oldLinks=await page.locator(".document-card:not([data-restricted='true']) .document-link")
    .evaluateAll(list=>list.map(a=>a.getAttribute("href")));
  assert.deepEqual(oldLinks,["./pdf-viewer.html?page=1","./committee-pdf-viewer.html?page=1"]);
  assert.equal(await page.locator(".document-card[data-restricted='true'] a").getAttribute("href"),"./booklet-private-viewer.html");
  assert.match(await page.locator("body").innerText(),/รอตรวจสิทธิ์/);
  let overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(overflow<=4,profile.name+" catalog overflow "+overflow);
  await page.screenshot({path:screenshotRoot+"/"+profile.name+"-catalog.png",fullPage:true});

  await page.goto(target("booklet-private-viewer.html?fixture=football-p07-12-ปี-ชาย-006"),{waitUntil:"domcontentloaded"});
  await page.locator("#privateOpen").click();
  assert.match(await page.locator("#privateStatus").innerText(),/เลือกทั้งไฟล์ PDF/);
  await page.locator("#privatePdf").setInputFiles({
   name:"mismatched-test.pdf",mimeType:"application/pdf",
   buffer:Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF")
  });
  await page.locator("#privateMap").setInputFiles({
   name:"mismatched-test.json",mimeType:"application/json",
   buffer:Buffer.from('{"schema_version":1,"entries":{}}')
  });
  await page.locator("#privateOpen").click();
  await page.locator('#privateStatus[data-error="true"]').waitFor();
  assert.match(await page.locator("#privateStatus").innerText(),/ยังเปิดเอกสารไม่ได้/);
  assert.equal(await page.locator("#privateHost").isHidden(),true);
  await page.screenshot({path:screenshotRoot+"/"+profile.name+"-private-gate.png"});

  await page.goto(target("booklet-comparison.html"),{waitUntil:"domcontentloaded"});
  await page.locator("#compareSummary:not([hidden])").waitFor();
  const values=await Promise.all(["compareFixtures","compareCommittee","compareIntegrated","compareNeedsReview"]
   .map(id=>page.locator("#"+id).innerText()));
  assert.deepEqual(values,["236","250","486","486"]);
  assert.match(await page.locator("#compareStatus").innerText(),/ยังไม่มีรายการใดรับรอง/);
  assert.match(await page.locator("#compareCount").innerText(),/จาก 236 รายการ/);
  const first=page.locator(".compare-record").first();
  assert.equal(await first.locator("a").count(),2);
  assert.match(await first.locator("a").first().getAttribute("href"),/^\.\/pdf-viewer\.html\?page=\d+&from=program&fixture=/);
  assert.match(await first.locator("a").nth(1).getAttribute("href"),/^\.\/booklet-private-viewer\.html\?fixture=/);
  await page.locator("#compareSport").selectOption("football");
  assert.match(await page.locator("#compareCount").innerText(),/จาก 20 รายการ/);
  await page.locator("#compareSport").selectOption("");
  await page.locator("#compareQuery").fill("ZZ_NO_SUCH_FIXTURE_000");
  assert.match(await page.locator("#compareCount").innerText(),/จาก 0 รายการ/);
  await page.locator("#compareQuery").fill("");
  await page.locator(".compare-record button").first().click();
  assert.match(await page.locator("#compareStatus").innerText(),/คัดลอก|กรุณาคัดลอก/);
  overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(overflow<=4,profile.name+" comparison overflow "+overflow);

  await page.goto(target("index.html"),{waitUntil:"domcontentloaded"});
  const more=page.locator("details.program-more summary").first();
  await more.waitFor();await more.click();
  assert.equal(await page.locator('details.program-more a[href="./booklets.html"]').count(),1);
  assert.ok(requests.every(r=>!r.url.includes("drive.google.com/file/d/")),profile.name+" unexpected Drive request");
  assert.ok(requests.every(r=>r.method==="GET"),profile.name+" unexpected write request");
  assert.deepEqual(errors,[],profile.name+" JS runtime errors");
  console.log("PASS "+profile.name+": 3 edition cards, private fail-closed, comparison 236+250+486, viewport");
 } finally {await ctx.close();}
}
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage"]});
try{
 const ctx=await browser.newContext();
 await verifyAssets(ctx.request);await ctx.close();
 for(const profile of [
  {name:"iphone-sized-chromium",viewport:{width:390,height:844},touch:true,mobile:true},
  {name:"android-sized-chromium",viewport:{width:412,height:915},touch:true,mobile:true},
  {name:"desktop-chromium",viewport:{width:1280,height:800},touch:false,mobile:false}
 ])await verifyViewport(browser,profile);
 console.log("R24-E1 PASS — Chromium emulation only; Safari/LINE/production HTTP/physical devices remain UNVERIFIED");
}finally{await browser.close();}

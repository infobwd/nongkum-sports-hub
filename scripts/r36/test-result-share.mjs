#!/usr/bin/env node
// R36 guards: short OG previews may only be built from published, reviewed rows.
import assert from "node:assert/strict";
import {readFileSync,mkdtempSync,writeFileSync,existsSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {execFileSync,spawnSync} from "node:child_process";
import vm from "node:vm";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const source=JSON.parse(read("data/result-share-source.json"));
const index=JSON.parse(read("data/result-share-index.json"));
const jobs=JSON.parse(read("data/r36-card-jobs.json"));
const shared=read("js/shared.js");
const r32=read("js/results-source-r32.js");
const results=read("js/results.js");
const page=read("results.html");
const first=source.rows[0];
const root="https://infobwd.github.io/nongkum-sports-hub/";
assert.ok(source.approved_only && source.rows.length>=1);
assert.ok(index.approved_only && jobs.approved_only);
for(const code of [shared,r32,results])new vm.Script(code);
assert.match(r32,/share_revision:row\.revision/);
assert.match(results,/result-share-index\.json/);
assert.match(results,/shareApprovedResult/);
assert.match(page,/results\.js\?v=r(?:36|38|39|41|44|45)-1/);
assert.match(page,/shared\.js\?v=r(?:36-2|39-1|41-1|44-1)/);
assert.match(page,/results-source-r32\.js\?v=r(?:36|45)-1/);
assert.ok(!Object.keys(source).includes("draft"));
const temp=mkdtempSync(join(tmpdir(),"r36-share-test-"));
try {
 const validate=fixture=>{
   const path=join(temp,"case.json");
   writeFileSync(path,JSON.stringify(fixture));
   return spawnSync(process.execPath,[new URL("build-result-share-pages.mjs",import.meta.url).pathname,"--validate-input",path],{encoding:"utf8"});
 };
 assert.equal(validate(source).status,0);
 const notApproved=structuredClone(source);
 notApproved.rows[0].result.status="review";
 assert.notEqual(validate(notApproved).status,0,"must reject unreviewed results");
 const wrongRevision=structuredClone(source);
 wrongRevision.rows[0].revision=0;
 assert.notEqual(validate(wrongRevision).status,0,"must reject unversioned results");
 const mismatched=structuredClone(source);
 mismatched.rows[0].result.id="result-not-matching-db";
 assert.notEqual(validate(mismatched).status,0,"must reject mismatching result IDs");
 // Sorted R32 results can start with athletics rankings. Test fixture-level security with a real pair row.
 const pairIndex=source.rows.findIndex(x=>["win_loss","score","sets"].includes(x.result?.result_type));
 assert.ok(pairIndex>=0,"approved fixture-level result required for pair security checks");
 const fakeWinner=structuredClone(source);
 fakeWinner.rows[pairIndex].result.winner_school_id="not-in-fixture";
 assert.notEqual(validate(fakeWinner).status,0,"must reject invented pair winners");
 const fakeScore=structuredClone(source);
 const pair=fakeScore.rows[pairIndex].result;
 if(pair.result_type==="win_loss")pair.score_a=13;
 else if(pair.result_type==="score")pair.score_a=-1;
 else pair.sets=[{a:-1,b:0}];
 assert.notEqual(validate(fakeScore).status,0,"must reject invalid or invented scores");
 const rankingIndex=source.rows.findIndex(x=>x.result?.result_type==="ranking");
 if(rankingIndex>=0){
   const invalidRanking=structuredClone(source);
   invalidRanking.rows[rankingIndex].result.winner_school_id="wangdong";
   assert.notEqual(validate(invalidRanking).status,0,"ranking must not have invented pair winner");
   const fakeRankingSchool=structuredClone(source);
   fakeRankingSchool.rows[rankingIndex].result.rankings[0].school_id="not-a-school";
   assert.notEqual(validate(fakeRankingSchool).status,0,"ranking must reject unknown school");
 }
}finally{rmSync(temp,{recursive:true,force:true});}
let nativePayload=null,copied="";
const context=vm.createContext({location:new URL(root+"results.html"),URL,URLSearchParams,Intl,Date,Math,
 navigator:{share:async payload=>{nativePayload=payload;},clipboard:{writeText:async value=>{copied=value;}}},
 localStorage:{getItem:()=>null,setItem:()=>{}}
});
new vm.Script(shared).runInContext(context);
const api=context.Nongkum;
for(const row of source.rows){
 assert.equal(row.result.status,"approved");
 const slug=api.resultShareCode(row.result_id,row.revision);
 assert.match(slug,/^r[0-9a-f]{8}-v[1-9]\d*-p2$/);
 assert.equal(index.results[row.result_id].slug,slug);
 assert.equal(index.results[row.result_id].revision,row.revision);
 const file="r/"+slug+"/index.html";
 assert.ok(existsSync(new URL("../../"+file,import.meta.url)),"Published page missing");
 const html=read(file);
 assert.match(html,/property="og:title"/);
 assert.match(html,/property="og:description"/);
 assert.match(html,/property="og:image"/);
 assert.match(html,/og:image:width" content="1200"/);
 assert.match(html,/og:image:height" content="630"/);
 assert.match(html,/twitter:card" content="summary_large_image"/);
 assert.match(html,/results\.html\?result=/);
 assert.ok(html.includes('property="og:url" content="'+root+"r/"+slug+'/'));
 assert.ok(!html.includes("ข้อมูลร่าง"));
 assert.ok(html.includes("ผลการแข่งขัน"));
 assert.ok(!html.includes("ผลการแข่งขันที่ผ่านการรับรอง"),"Public OG text must be concise");
 assert.ok(!html.includes("13–0"),"do not invent Petanque numeric score");
 const image=readFileSync(new URL("../../r/"+slug+"/card.png",import.meta.url));
 assert.equal(image.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
 assert.equal(image.readUInt32BE(16),1200);
 assert.equal(image.readUInt32BE(20),630);
 const userResult={...row.result,share_revision:row.revision};
 const url=api.resultShareUrl(userResult,index);
 assert.equal(url,root+"r/"+slug+"/");
 assert.equal(await api.shareApprovedResult(userResult,index,
     JSON.parse(read("data/public-results.json")).schools,
     JSON.parse(read("data/public-results.json")).sports),"shared");
 assert.equal(nativePayload.url,undefined,"R44 sends one text payload");
 assert.ok(nativePayload.text.endsWith(url));
 assert.match(nativePayload.text,/เปตอง|กีฬา|กรีฑา/);
 assert.match(nativePayload.text,/ผลการแข่งขัน · มิตรภาพเกมส์ 2569/);
 assert.match(nativePayload.text,/ผู้ชนะ|พบ|รายการ|กรีฑา|อันดับ/);
 const sportList=JSON.parse(read("data/public-results.json")).sports;
 assert.equal(api.resultShareUrl({...userResult,share_revision:row.revision+1},index,sportList),
    root+"s/"+userResult.sport_id+"/?ref="+api.fixtureShareCode(row.result_id),
    "revision mismatch must use short neutral sport preview");
 assert.equal(api.resultShareUrl({...userResult,status:"review"},index),"");
 const fallbackContext=vm.createContext({location:new URL(root+"results.html"),URL,URLSearchParams,Intl,Date,Math,
  navigator:{clipboard:{writeText:async value=>{copied=value;}}},localStorage:{getItem:()=>null,setItem:()=>{}}
 });
 new vm.Script(shared).runInContext(fallbackContext);
 const result=await fallbackContext.Nongkum.shareApprovedResult(userResult,index,
     JSON.parse(read("data/public-results.json")).schools,
     JSON.parse(read("data/public-results.json")).sports);
 assert.equal(result,"copied");
 assert.match(copied,/มิตรภาพเกมส์ 2569/);
 assert.match(copied,/https:\/\/infobwd\.github\.io\/nongkum-sports-hub\/r\//);
}
// R41: every public sport has a neutral, prepublished LINE preview that
// never invents a winner or score when R36 per-result images are not ready.
const publicSports=JSON.parse(read("data/public-results.json")).sports;
assert.equal(publicSports.length,9,"Sport catalog changed — verify new preview coverage");
for(const sport of publicSports){
 const path="s/"+sport.id+"/index.html";
 assert.ok(existsSync(new URL("../../"+path,import.meta.url)),"Missing neutral sport preview "+sport.id);
 const html=read(path);
 assert.ok(html.includes("ผลการแข่งขัน"+sport.name),"Sport name missing in OG");
 assert.match(html,/property="og:title"/);
 assert.match(html,/property="og:image"/);
 assert.match(html,/property="og:image:width" content="1200"/);
 assert.match(html,/property="og:image:height" content="630"/);
 assert.match(html,/new URLSearchParams\(location\.search\)\.get\("ref"\)/);
 assert.ok(!html.includes("ข้อมูลร่าง")&&!html.includes("อันดับ 1 ")&&!html.includes(" ชนะ "));
 const png=readFileSync(new URL("../../s/"+sport.id+"/card.png",import.meta.url));
 assert.equal(png.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
 assert.equal(png.readUInt32BE(16),1200);
 assert.equal(png.readUInt32BE(20),630);
 const sample={id:"result-test-กีฬา-2569-"+sport.id,status:"approved",sport_id:sport.id,share_revision:1};
 const url=api.resultShareUrl(sample,null,publicSports);
 assert.equal(url,root+"s/"+sport.id+"/?ref="+api.fixtureShareCode(sample.id));
 assert.ok(!url.includes("%E0"),"Fallback must not contain percent-encoded Thai IDs");
 assert.equal(api.findApprovedResultByRef([sample],api.fixtureShareCode(sample.id)),sample);
 assert.equal(api.findApprovedResultByRef([{...sample,status:"review"}],api.fixtureShareCode(sample.id)),null);
 assert.equal(api.findApprovedResultByRef([sample,sample],api.fixtureShareCode(sample.id)),null,"Hash collision must fail closed");
}
assert.equal(api.findApprovedResultByRef([{id:"legacy-result",status:"approved"}],"badcode"),null);
const unknown={id:"result-extra-sport-001",status:"approved",sport_id:"unlisted",share_revision:1};
assert.equal(api.resultShareUrl(unknown,null,publicSports),
 root+"results.html?ref="+api.fixtureShareCode(unknown.id),"Unknown future sport must still get a short link");
assert.equal(api.resultShareUrl({...unknown,status:"review"},null,publicSports),"","Never share unapproved results");
assert.match(results,/findApprovedResultByRef\(data\.results,requestedRef\)/);
assert.match(results,/requestedResult\|\|requestedRef/);
assert.match(results,/url\.searchParams\.delete\("ref"\)/);
const approved=source.rows.find(x=>x.result_id==="result-petanque-p17-12-ปี-ชาย-020");
if(approved){
 const code=api.resultShareCode(approved.result_id,approved.revision);
 const html=read("r/"+code+"/index.html");
 assert.ok(html.includes("วังด้ง ชนะ เสาหงส์"),"Use approved winner only");
 assert.ok(!html.includes("รับรอง"),"No certification wording in public OG preview");
 assert.ok(!html.includes("15–10"),"Never invent set or point scores");
 assert.equal(jobs.jobs.find(x=>x.slug===code).winner,"วังด้ง");
}
console.log("R36 approved-only short LINE previews, revision cache, PNG metadata, fallback and copy tested");

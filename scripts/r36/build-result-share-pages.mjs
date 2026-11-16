#!/usr/bin/env node
// R36: static LINE previews generated ONLY from public, human-approved results.
// --refresh reads Supabase published-results read-only feed and stages a snapshot.
// --build renders versioned HTML, PNG jobs and a published index from that snapshot.
// --check ensures source-controlled previews and PNGs match the approved snapshot.
// No service-role key, PIN, draft submissions, score inference or DB writes.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from "node:fs";
import {dirname} from "node:path";
import assert from "node:assert/strict";
import vm from "node:vm";

const root=new URL("../../",import.meta.url);
const pathTo=url=>new URL(url,root);
const read=path=>readFileSync(pathTo(path),"utf8");
const sourcePath="data/result-share-source.json";
const indexPath="data/result-share-index.json";
const jobsPath="data/r36-card-jobs.json";
const site="https://infobwd.github.io/nongkum-sports-hub/";
const check=process.argv.includes("--check");
const refresh=process.argv.includes("--refresh");
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const hash=id=>{let h=2166136261;for(let i=0;i<id.length;i++)h=Math.imul(h^id.charCodeAt(i),16777619)>>>0;return "r"+h.toString(16).padStart(8,"0");};
// Preview presentation v2: distinct OG URL even when approved result revision is unchanged.
const slug=(id,rev)=>hash(id)+"-v"+rev+"-p2";
const allowed=new Set(["id","status","sport_id","result_type","fixture_id","event_id","team_a_id","team_b_id","score_a","score_b","sets","winner_school_id","rankings","division","round","name","result_date","team_a_cards","team_b_cards"]);
const number=n=>Number.isInteger(n)&&n>=0;
const goodId=x=>typeof x==="string"&&x.length>0&&x.length<=160;
const validText=r=>["division","round","name","result_date"].every(k=>r[k]===undefined||typeof r[k]==="string"&&r[k].length<=200);
const keys=o=>o&&typeof o==="object"&&!Array.isArray(o)?Object.keys(o):[];
// Match the same corrected 236-fixture competition source as the R38 public cards.
// This catalog supplies display titles only. It is never a source of winners, scores or approval.
function loadAthleticsCatalog(){
 const sandbox={globalThis:{}};
 new vm.Script(read("js/program-corrections.js")).runInNewContext(sandbox);
 const source=JSON.parse(read("data/program-from-pdf-2569-20261104-draft.json"));
 const corrected=sandbox.globalThis.NongkumProgramCorrections.apply(source);
 assert.ok(corrected?.fixtures?.length===236&&corrected?.metadata?.all_data_approved===false,
   "R39 athletics catalog source changed — organizer review required");
 const result=new Map();
 for(const f of corrected.fixtures){
   if(f.kind!=="track_event"||f.sport_id!=="athletics"||!f.name?.trim())continue;
   assert.ok(!result.has(f.id),"Duplicate athletics event ID");
   result.set(f.id,{sport_id:f.sport_id,division:f.division,name:f.name.trim()});
 }
 return result;
}
const athleticsCatalog=loadAthleticsCatalog();
function validateResult(r,schools,sports){
 if(!r||typeof r!=="object"||Array.isArray(r)||!keys(r).every(k=>allowed.has(k))||
    !goodId(r.id)||r.status!=="approved"||!sports.has(r.sport_id)||
    !["score","sets","win_loss","ranking"].includes(r.result_type)||!validText(r))return false;
 if(r.result_type==="ranking")return !r.winner_school_id&&!r.team_a_id&&!r.team_b_id&&r.score_a==null&&r.score_b==null&&r.sets==null&&
   goodId(r.event_id)&&Array.isArray(r.rankings)&&r.rankings.length>0&&
   r.rankings.every(x=>number(x.rank)&&x.rank>0&&schools.has(x.school_id)&&
      keys(x).every(k=>["rank","school_id","mark","unit"].includes(k)) &&
      (x.mark===undefined||["number","string"].includes(typeof x.mark)) &&
      (x.unit===undefined||typeof x.unit==="string"));
 if(!goodId(r.fixture_id)||!schools.has(r.team_a_id)||!schools.has(r.team_b_id)||r.team_a_id===r.team_b_id)return false;
 if(r.winner_school_id&&![r.team_a_id,r.team_b_id].includes(r.winner_school_id))return false;
 if(r.result_type==="score")return number(r.score_a)&&number(r.score_b);
 if(r.result_type==="sets")return Array.isArray(r.sets)&&r.sets.length>0&&r.sets.length<=7&&r.sets.every(s=>number(s.a)&&number(s.b)&&keys(s).every(k=>["a","b"].includes(k)));
 return r.result_type==="win_loss"&&r.score_a===undefined&&r.score_b===undefined&&r.sets===undefined&&
   [r.team_a_id,r.team_b_id].includes(r.winner_school_id);
}
function validateSource(source){
 assert.equal(source.schema_version,1);
 assert.equal(source.approved_only,true);
 assert.ok(Array.isArray(source.rows));
 assert.ok(source.rows.length<=500);
 const base=JSON.parse(read("data/public-results.json"));
 assert.equal(base.metadata.approved_only,true);
 const schools=new Set(base.schools.map(x=>x.id));
 const sports=new Set(base.sports.map(x=>x.id));
 const seen=new Set(),codes=new Set();
 for(const row of source.rows){
  assert.ok(row&&goodId(row.result_id)&&Number.isInteger(row.revision)&&row.revision>=1&&
    row.revision<=1000000&&typeof row.published_at==="string"&&Number.isFinite(Date.parse(row.published_at)),"Bad public row");
  assert.ok(validateResult(row.result,schools,sports),"Non-approved or invalid public result");
  assert.equal(row.result.id,row.result_id);
  assert.ok(!seen.has(row.result_id),"Repeated result id");
  const code=slug(row.result_id,row.revision);
  assert.ok(!codes.has(code),"Hash collision");
  seen.add(row.result_id);codes.add(code);
 }
 return {schools:base.schools,sports:base.sports};
}
function ensure(path,data){
 const filepath=pathTo(path);
 if(check){
   assert.ok(existsSync(filepath),"Missing "+path);
   assert.equal(read(path),data,"Stale "+path);
 }else{
   mkdirSync(dirname(filepath.pathname),{recursive:true});
   writeFileSync(filepath,data,"utf8");
 }
}
function display(row,base){
 const result=row.result;
 const sport=base.sports.find(s=>s.id===result.sport_id)?.name||"กีฬา";
 const get=id=>base.schools.find(s=>s.id===id)?.short||"";
 const division=result.division||"";
 const a=get(result.team_a_id),b=get(result.team_b_id),winner=get(result.winner_school_id);
 let line="",title="",summary="";
 if(result.result_type==="ranking"){
   const first=result.rankings.find(x=>x.rank===1);
   const candidate=athleticsCatalog.get(result.event_id);
   const sourceName=candidate?.sport_id===result.sport_id&&candidate.division===result.division?
     candidate.name:"";
   // If the public result has no event name, use only the exact event + division source.
   // A mismatch blocks a preview PR; never make up athletics discipline/distance.
   line=result.name||sourceName;
   if(!line)throw Error("R39 athletics event title unmatched: "+result.event_id+
     " / "+result.division+" — manual source review required");
   summary=first?"อันดับ 1 "+get(first.school_id):"ผลจัดอันดับ";
   title=(line.includes(division)?sport:sport+" "+division)+" · "+line+" · "+summary;
 }else{
   line=a+" พบ "+b;
   summary=winner?winner+" ชนะ":(result.result_type==="score"&&result.score_a===result.score_b?"ผลเสมอ":"ผลการแข่งขัน");
   title=sport+" "+division+" · "+(winner?winner+" ชนะ "+(winner===a?b:a):line);
 }
 const detail=(result.result_type==="score"?" · คะแนน "+result.score_a+"–"+result.score_b:
   result.result_type==="sets"?" · ผลรายเซ็ต "+result.sets.map(s=>s.a+"–"+s.b).join(", "):"");
 return {sport,sport_id:result.sport_id,division,a,b,winner,line,summary,title,
         description:"ผลการแข่งขัน · "+(line.includes(division)?sport:sport+" "+division)+" · "+line+" · "+summary+detail,
         result_id:row.result_id,revision:row.revision,published_at:row.published_at};
}
function htmlPage(item,revisionCode,archived=false) {
 const url=site+"r/"+revisionCode+"/";
 const real="../../results.html?result="+encodeURIComponent(item.result_id);
 const title=(archived?"มีการปรับปรุงผลการแข่งขัน · กรุณาตรวจผลล่าสุด":item.title)+" | มิตรภาพเกมส์ 2569";
 const description=archived?"ลิงก์นี้เป็นผลฉบับก่อนหน้า กรุณาเปิดดูผลการแข่งขันล่าสุด":
   item.description;
 const image=url+"card.png";
 const heading=archived?"ผลฉบับเดิม · โปรดดูฉบับล่าสุด":item.title;
 return '<!doctype html>\n<html lang="th"><head>\n'+
  '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'+
  '<meta name="theme-color" content="#183762"><meta name="robots" content="noindex,follow">\n'+
  '<title>'+esc(title)+'</title>\n'+
  '<meta name="description" content="'+esc(description)+'">\n'+
  '<meta property="og:locale" content="th_TH"><meta property="og:type" content="article">\n'+
  '<meta property="og:site_name" content="มิตรภาพเกมส์ 2569">\n'+
  '<meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(description)+'">\n'+
  '<meta property="og:url" content="'+esc(url)+'">\n'+
  '<meta property="og:image" content="'+esc(image)+'"><meta property="og:image:secure_url" content="'+esc(image)+'">\n'+
  '<meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">\n'+
  '<meta property="og:image:alt" content="'+esc(archived?"โปรดตรวจผลรับรองฉบับล่าสุด":item.title)+'">\n'+
  '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="'+esc(title)+'">\n'+
  '<meta name="twitter:description" content="'+esc(description)+'"><meta name="twitter:image" content="'+esc(image)+'">\n'+
  '<link rel="canonical" href="'+esc(url)+'">\n'+
  '<style>body{margin:0;background:#eef3f9;color:#173459;font:18px system-ui,"Noto Sans Thai",sans-serif}main{max-width:620px;margin:12vh auto 3rem;padding:2rem;background:#fff;border-radius:20px;box-shadow:0 5px 24px #c8d5e6}h1{font-size:1.4rem;line-height:1.6}p{line-height:1.7}a{display:inline-block;background:#193f70;color:white;padding:14px 20px;border-radius:12px;text-decoration:none}small{color:#55718b}@media(max-width:650px){main{margin:2rem 1rem;padding:1.5rem}}</style>\n'+
  '</head><body><main><small>มิตรภาพเกมส์ 2569 · '+(archived?"ฉบับเก่า":"ผลการแข่งขัน")+'</small>'+
  '<h1>'+esc(heading)+'</h1><p>'+(archived?"ผลฉบับนี้มีรุ่นใหม่แล้ว กรุณาตรวจผลการแข่งขันล่าสุดก่อนแชร์ต่อ":
  "เปิดหน้าผลการแข่งขันเพื่อดูรายละเอียดล่าสุด")+'</p>'+
  '<a href="'+esc(real)+'">ดูผลการแข่งขันล่าสุด</a><p><small>หน้าแสดงผลสดจะตรวจข้อมูลล่าสุดอีกครั้งก่อนแสดงผล</small></p></main>'+
  '<script>location.replace('+JSON.stringify(real)+')</script></body></html>\n';
}
// R41: a stable sport-level preview exists even before the per-result R36 PR
// has been reviewed and merged. It never claims a score, winner or fixture.
function neutralSportPage(sport){
 assert.ok(/^[a-z][a-z0-9-]{0,39}$/.test(sport.id),"Unsafe sport path");
 assert.ok(typeof sport.name==="string"&&sport.name.length>0&&sport.name.length<=100,"Bad sport name");
 const url=site+"s/"+sport.id+"/";
 const title="ผลการแข่งขัน"+sport.name+" | มิตรภาพเกมส์ 2569";
 const description="เปิดดูผลการแข่งขัน"+sport.name+"ล่าสุด · รายละเอียดจะแสดงจากผลที่ผ่านการรับรองแล้ว";
 const image=url+"card.png";
 return '<!doctype html>\n<html lang="th"><head>\n'+
  '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'+
  '<meta name="theme-color" content="#183762"><meta name="robots" content="noindex,follow">\n'+
  '<title>'+esc(title)+'</title><meta name="description" content="'+esc(description)+'">\n'+
  '<meta property="og:locale" content="th_TH"><meta property="og:type" content="website">\n'+
  '<meta property="og:site_name" content="มิตรภาพเกมส์ 2569">\n'+
  '<meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(description)+'">\n'+
  '<meta property="og:url" content="'+esc(url)+'">\n'+
  '<meta property="og:image" content="'+esc(image)+'"><meta property="og:image:secure_url" content="'+esc(image)+'">\n'+
  '<meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">\n'+
  '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="'+esc(title)+'">\n'+
  '<meta name="twitter:description" content="'+esc(description)+'"><meta name="twitter:image" content="'+esc(image)+'">\n'+
  '<link rel="canonical" href="'+esc(url)+'">\n'+
  '<style>body{margin:0;background:#eef3f9;color:#173459;font:18px system-ui,"Noto Sans Thai",sans-serif}main{max-width:620px;margin:12vh auto 3rem;padding:2rem;background:#fff;border-radius:20px;box-shadow:0 5px 24px #c8d5e6}h1{font-size:1.5rem}p{line-height:1.7}a{display:inline-block;background:#193f70;color:white;padding:14px 20px;border-radius:12px;text-decoration:none}</style>\n'+
  '</head><body><main><small>มิตรภาพเกมส์ 2569</small><h1>'+esc(title)+'</h1>'+
  '<p>ลิงก์นี้จะแสดงผลการแข่งขันที่รับรองแล้วล่าสุดเมื่อเปิดดูบนเว็บไซต์</p>'+
  '<a id="openResult" href="../../results.html">ดูผลการแข่งขัน</a></main>\n'+
  '<script>(function(){var ref=new URLSearchParams(location.search).get("ref");'+
  'if(!/^f[0-9a-f]{8}$/.test(ref||""))return;'+
  'var target=new URL("../../results.html",location.href);target.searchParams.set("ref",ref);'+
  'document.getElementById("openResult").href=target.href;location.replace(target.href);})();</script>\n'+
  '</body></html>\n';
}
// Test-only validate mode, with no generated writes or database access.
const validateArg=process.argv.indexOf("--validate-input");
if(validateArg!==-1){
  const filename=process.argv[validateArg+1];
  assert.ok(filename&&filename!=="--build");
  validateSource(JSON.parse(readFileSync(filename,"utf8")));
  console.log("R36 approved-only source validation passed");
  process.exit(0);
}
async function refreshPublic(){
 const reader=read("js/results-source-r32.js");
 const key=reader.match(/const publishableKey="([^"]+)"/)?.[1];
 const url=reader.match(/const url="([^"]+)"/)?.[1];
 assert.ok(key&&key.startsWith("sb_publishable_")&&url&&url.includes("/nongkum_published_results?"),"R32 public read source changed");
 const response=await fetch(url,{headers:{"apikey":key,"Accept":"application/json"},signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error("Public approved feed unavailable: HTTP "+response.status);
 const rows=await response.json();
 assert.ok(Array.isArray(rows)&&rows.length<=500,"Invalid approved-only response");
 const old=JSON.parse(read(sourcePath));
 if(!rows.length&&old.rows.length)throw Error("Refusing unexpected empty live feed while approved snapshot exists");
 const previous=new Map(old.rows.map(x=>[x.result_id,x.revision]));
 for(const id of previous.keys()){if(!rows.some(x=>x.result_id===id))throw Error("An approved result disappeared from the public feed: "+id+"; requires operator review");}
 for(const row of rows){if(previous.has(row.result_id)&&row.revision<previous.get(row.result_id))throw Error("Approved result revision went backwards: "+row.result_id);}
 const updated={schema_version:1,approved_only:true,rows:rows.sort((a,b)=>a.result_id.localeCompare(b.result_id,"th"))};
 validateSource(updated);
 const next=JSON.stringify(updated,null,2)+"\n";
 if(next!==read(sourcePath))ensure(sourcePath,next);
 console.log("R36 public feed checked: "+rows.length+" approved result(s)");
}
if(refresh){
 if(check)throw Error("--refresh and --check may not be combined");
 await refreshPublic();
}else{
 const data=JSON.parse(read(sourcePath));
 const base=validateSource(data);
 // R41 sport-level share pages use only public sport names, never draft schedule or results.
 for(const sport of JSON.parse(read("data/public-results.json")).sports){
   ensure("s/"+sport.id+"/index.html",neutralSportPage(sport));
   if(check){
     const image=pathTo("s/"+sport.id+"/card.png");
     assert.ok(existsSync(image),"Missing sport preview PNG: "+sport.id);
     const png=readFileSync(image);
     assert.equal(png.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
     assert.equal(png.readUInt32BE(16),1200);
     assert.equal(png.readUInt32BE(20),630);
   }
 }
 let previous={schema_version:1,approved_only:true,results:{}};
 if(existsSync(pathTo(indexPath))){try{previous=JSON.parse(read(indexPath));}catch(_){}}
 const current={},jobs=[],expected=new Set();
 for(const row of data.rows){
  const item=display(row,base);
  const id=slug(row.result_id,row.revision);
  current[row.result_id]={revision:row.revision,slug:id,published_at:row.published_at};
  const file="r/"+id+"/index.html";
  ensure(file,htmlPage(item,id));
  expected.add(id);
  jobs.push({slug:id,...item,archived:false});
  const png=pathTo("r/"+id+"/card.png");
  if(check){
    assert.ok(existsSync(png),"Missing preview PNG for "+id);
    const h=readFileSync(png);
    assert.equal(h.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
    assert.equal(h.readUInt32BE(16),1200);
    assert.equal(h.readUInt32BE(20),630);
  }
 }
 // Preserve old revision URLs and keep history, but do not label old data current.
 for(const [id,prev] of Object.entries(previous.results||{})){
  // A presentation-only update must not mark the unchanged result revision as obsolete.
  if(current[id]&&prev.slug!==current[id].slug&&prev.revision!==current[id].revision){
    const row=data.rows.find(x=>x.result_id===id);
    const item=display(row,base);
    const oldFile="r/"+prev.slug+"/index.html";
    ensure(oldFile,htmlPage(item,prev.slug,true));
  }
 }
 const index={schema_version:1,approved_only:true,source:"Meeting Supabase published results — reviewed",results:current};
 ensure(indexPath,JSON.stringify(index,null,2)+"\n");
 ensure(jobsPath,JSON.stringify({schema_version:1,approved_only:true,jobs},null,2)+"\n");
 console.log((check?"R36 verified ":"R36 generated ")+data.rows.length+" published-only previews");
}

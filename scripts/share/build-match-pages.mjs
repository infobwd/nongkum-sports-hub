// Regenerate static, LINE-readable match previews after any fixture data change.
// Usage: node scripts/share/build-match-pages.mjs [--check]
import {readFileSync,writeFileSync,mkdirSync,existsSync} from "node:fs";
import {dirname} from "node:path";
const code=function code(id){let h=2166136261;for(let i=0;i<id.length;i++)h=Math.imul(h^id.charCodeAt(i),16777619)>>>0;return "f"+h.toString(16).padStart(8,"0");};
const esc=function esc(value){return String(value==null?"":value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));};
const ddate=function ddate(iso){if(!iso)return "";const v=iso.split("-").map(Number);if(v.length!==3||!v[0])return iso;const months=["","ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];return v[2]+" "+months[v[1]]+" "+(v[0]+543);};
const makePage=function makePage(f,data){
  const getSchool=id=>data.schools.find(s=>s.id===id);
  const sport=data.sports.find(s=>s.id===f.sport_id);
  const name=sport?sport.name:f.sport_id,emoji=sport?sport.emoji:"🏅";
  const track=f.kind==="track_event";
  const schoolName=(id,label)=>(getSchool(id)?.short||label||"รอระบุทีม");
  const teamA=schoolName(f.team_a_id,f.source_team_a_label);
  const teamB=schoolName(f.team_b_id,f.source_team_b_label);
  const category=track?(f.name||"รายการกรีฑา"):(teamA+" พบ "+teamB);
  const label=(track?"รายการ ":"คู่ที่ ")+(f.source_match_no||"-");
  const title=name+" "+(f.division||"")+" · "+category+" | มิตรภาพเกมส์ 2569 (ข้อมูลร่าง)";
  const day=f.planning_date?(ddate(f.planning_date)+(f.planning_date_confirmation==="confirmed"?" · วันยืนยันแล้ว":" · รอตรวจรับ")):"วันแข่งขันรอยืนยัน";
  const time=f.time?"เวลาใน PDF "+f.time+" น. (รอยืนยัน)":"เวลาแข่งขันรอยืนยัน";
  const field=f.planning_venue_confirmation==="confirmed"&&f.planning_venue?
    f.planning_venue+" (ยืนยันแล้ว)":f.field?f.field+" (ตาม PDF)":"สนามรอยืนยัน";
  const description="ข้อมูลร่าง · "+name+" "+(f.division||"")+" · "+label+" · "+category+" · "+day+" · "+time+" · "+field;
  const short=code(f.id),url="https://infobwd.github.io/nongkum-sports-hub/m/"+short+"/";
  const full="../../index.html?fixture="+encodeURIComponent(f.id);
  const row=track?`<p class="event">${esc(f.name||"รายการกรีฑา")}</p><p class="teams">จำนวนลู่ตามสูจิบัตร: ${(f.lanes||[]).length}</p>`:
   `<div class="teams"><strong>${esc(teamA)}</strong><span>VS</span><strong>${esc(teamB)}</strong></div>`;
  return `<!doctype html>
<html lang="th"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#183762"><meta name="robots" content="noindex,follow">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:locale" content="th_TH"><meta property="og:type" content="website">
<meta property="og:site_name" content="มิตรภาพเกมส์ 2569">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<link rel="stylesheet" href="../../css/base.css"><link rel="stylesheet" href="../../css/match-share.css">
</head><body>
<header class="top"><div class="shell"><div class="brand"><div class="logo"><span class="logoIcon" aria-hidden="true">🏆</span><span>มิตรภาพเกมส์</span></div><span class="mode">ข้อมูลร่าง · ไม่ใช่ประกาศทางการ</span></div><div class="hero"><h1>คู่แข่งขันที่แชร์มา</h1></div></div></header>
<main class="shell share-main">
<article class="share-match" data-fixture-id="${esc(f.id)}">
<div class="share-kicker">${esc(emoji)} ${esc(name)} · ${esc(f.division||"")} · ${esc(label)}</div>
${row}
<div class="share-tags"><div>📅 ${esc(day)}</div><div>🕒 ${esc(time)}</div><div>📍 ${esc(field)}</div></div>
<p class="share-source">อ้างอิงสูจิบัตรหน้า ${esc(f.source_page)} · ยังไม่ได้รับรองผลการแข่งขัน</p>
</article>
<div class="share-actions"><a class="share-primary" href="${esc(full)}">ดูรายละเอียดคู่แข่งขันและสูจิบัตร</a><a class="share-secondary" href="../../index.html">ดูโปรแกรมการแข่งขันทั้งหมด</a></div>
<p class="share-notice">ข้อมูลนี้เป็นร่างจากสูจิบัตร ไม่ใช้แทนประกาศวัน เวลา หรือสนามแข่งขันอย่างเป็นทางการ</p>
</main><footer class="shell">มิตรภาพเกมส์ 2569 · โปรแกรมฉบับร่างสำหรับตรวจทาน</footer>
</body></html>
`;
};
const data=JSON.parse(readFileSync(new URL("../../data/draft-schedule.json",import.meta.url),"utf8"));
const check=process.argv.includes("--check");
const seen=new Set(),links={};
let count=0;
function ensure(path,content){
 const file=new URL("../../"+path,import.meta.url);
 if(check){
  if(!existsSync(file)||readFileSync(file,"utf8")!==content)throw Error("Missing or stale "+path);
 }else{
  mkdirSync(dirname(file.pathname),{recursive:true});
  writeFileSync(file,content,"utf8");
 }
}
for(const f of data.fixtures){
 const slug=code(f.id);
 if(seen.has(slug))throw Error("Code collision: "+slug);
 seen.add(slug);links[slug]=f.id;
 ensure("m/"+slug+"/index.html",makePage(f,data));count++;
}
const index=JSON.stringify({schema_version:1,event:"มิตรภาพเกมส์",source:"data/draft-schedule.json",count,links},null,2)+"\n";
ensure("data/share-index.json",index);
console.log((check?"PASS checked ":"Generated ")+count+" unique per-fixture LINE preview pages");

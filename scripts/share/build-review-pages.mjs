// R14: deterministic LINE Open Graph previews derived from candidate schedule.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname as pathDirname} from "node:path";

function hashId(id){let h=2166136261;for(let i=0;i<id.length;i++)h=Math.imul(h^id.charCodeAt(i),16777619)>>>0;return "f"+h.toString(16).padStart(8,"0")}
function escapeText(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function dateLabel(f){const raw=String(f.source_pdf?.source_date_text||"");if(/(?:พ\.ย\.\s*68|2568)/.test(raw))return "วันรอยืนยัน";const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(f.source_pdf?.source_date_iso||""));return m?Number(m[3])+" "+["","ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."][Number(m[2])]+" "+(Number(m[1])+543):(raw||"รอกำหนด")}
function buildPage(f,data){
  const sport=data.sports.find(s=>s.id===f.sport_id)||{name:f.sport_id,emoji:"🏅"};
  const track=f.kind==="track_event",number=(track?"รายการที่ ":"คู่ที่ ")+String(f.source_match_no||"—");
  const topic=(sport.emoji?sport.emoji+" ":"")+sport.name+(f.division?" "+f.division:"");
  const teamA=f.source_team_a_label||"รอคู่แข่งขัน",teamB=f.source_team_b_label||"รอคู่แข่งขัน";
  const pairing=track?(f.name||f.source_title||"รายการกรีฑา"):(teamA+" พบ "+teamB);
  const date=dateLabel(f),time=f.source_pdf?.source_time||"รอกำหนด",field=f.source_pdf?.source_field||"รอกำหนด";
  const page=f.source_pdf?.page||f.source_page||"ไม่ระบุ",slug=hashId(f.id);
  const url="https://infobwd.github.io/nongkum-sports-hub/r/"+slug+"/?v=14";
  const href="../../index.html?fixture="+encodeURIComponent(f.id);
  const title=topic+" · "+number;
  const description=pairing+" · "+date+" · "+time+(time==="รอกำหนด"?"":" น.")+" · "+field+" · โปรแกรมระหว่างเตรียมงาน";
  const body=track?`<p class="event">${escapeText(pairing)}</p>`:`<div class="teams"><strong>${escapeText(teamA)}</strong><span>พบ</span><strong>${escapeText(teamB)}</strong></div>`;
  return `<!doctype html>
<html lang="th"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex,follow"><meta name="theme-color" content="#183762">
<title>${escapeText(title)} | มิตรภาพเกมส์ 2569</title>
<meta name="description" content="${escapeText(description)}">
<meta property="og:locale" content="th_TH"><meta property="og:type" content="website">
<meta property="og:site_name" content="มิตรภาพเกมส์ 2569 · ตารางแข่งขัน">
<meta property="og:title" content="${escapeText(title)}">
<meta property="og:description" content="${escapeText(description)}">
<meta property="og:url" content="${escapeText(url)}">
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escapeText(title)}">
<meta name="twitter:description" content="${escapeText(description)}">
<link rel="canonical" href="${escapeText(url)}">
<link rel="stylesheet" href="../../css/base.css"><link rel="stylesheet" href="../../css/match-share.css">
</head><body>
<header class="top"><div class="shell"><div class="brand"><div class="logo"><span class="logoIcon" aria-hidden="true">🏆</span><span>มิตรภาพเกมส์</span></div><span class="mode">ตารางแข่งขันระหว่างเตรียมงาน</span></div><div class="hero"><h1>ข้อมูลคู่แข่งขัน</h1></div></div></header>
<main class="shell share-main">
<article class="share-match" data-fixture-id="${escapeText(f.id)}">
<div class="share-kicker">${escapeText(topic)} · ${escapeText(number)}</div>
${body}
<div class="share-tags"><div>วันแข่งขัน: ${escapeText(date)}</div><div>เวลา: ${escapeText(time)}${time==="รอกำหนด"?"":" น."}</div><div>สนาม: ${escapeText(field)}</div></div>
<p class="share-source">สูจิบัตร หน้า ${escapeText(page)}</p>
</article>
<div class="share-actions"><a id="openProgram" class="share-primary" href="${escapeText(href)}">เปิดคู่แข่งขันในตาราง</a><a class="share-secondary" href="../../index.html">ดูตารางแข่งขันทั้งหมด</a></div>
<p class="share-notice">โปรแกรมอยู่ระหว่างเตรียมงาน ยังไม่ใช่ประกาศการแข่งขันที่รับรองแล้ว โปรดตรวจสอบกำหนดการล่าสุดก่อนเดินทาง</p>
</main><footer class="shell">มิตรภาพเกมส์ 2569 · ตารางแข่งขัน</footer>
<script>window.location.replace(document.getElementById("openProgram").href);</script>
</body></html>
`;
}

const data=JSON.parse(readFileSync(new URL("../../data/program-from-pdf-2569-20261104-draft.json",import.meta.url),"utf8"));
if(data.metadata?.all_data_approved!==false||data.metadata?.website_publication_status!=="not_released")
  throw Error("Unexpected approval status; review publication workflow first");
const check=process.argv.includes("--check"),seen=new Set(),links={};
function ensure(path,content){
 const file=new URL("../../"+path,import.meta.url);
 if(check){
   if(!existsSync(file)||readFileSync(file,"utf8")!==content)throw Error("Missing/stale: "+path);
 }else{
   mkdirSync(pathDirname(fileURLToPath(file)),{recursive:true});
   writeFileSync(file,content,"utf8");
 }
}
for(const f of data.fixtures){
 const key=hashId(f.id);if(seen.has(key))throw Error("Code collision "+key);
 seen.add(key);links[key]=f.id;ensure("r/"+key+"/index.html",buildPage(f,data));
}
ensure("data/review-share-index.json",JSON.stringify({
 schema_version:1,source:"data/program-from-pdf-2569-20261104-draft.json",
 status:"draft_not_approved",count:data.fixtures.length,links
},null,2)+"\n");
console.log((check?"PASS verified ":"Generated ")+data.fixtures.length+" LINE-ready OG previews");

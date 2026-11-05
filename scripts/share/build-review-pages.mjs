// R12: deterministic per-fixture Open Graph previews for the read-only PDF candidate.
// node scripts/share/build-review-pages.mjs [--check]
import {readFileSync,writeFileSync,mkdirSync,existsSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname as pathDirname} from "node:path";
function hashId(id){let h=2166136261;for(let i=0;i<id.length;i++)h=Math.imul(h^id.charCodeAt(i),16777619)>>>0;return "f"+h.toString(16).padStart(8,"0")}
function escapeText(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function buildPage(f,data){
  const sport=data.sports.find(s=>s.id===f.sport_id)||{name:f.sport_id,emoji:"🏅"};
  const track=f.kind==="track_event";
  const number=(track?"รายการ ":"คู่ ")+String(f.source_match_no||"—");
  const topic=(sport.emoji?sport.emoji+" ":"")+sport.name+(f.division?" "+f.division:"");
  const teamA=f.source_team_a_label||"รอผลคู่ก่อนหน้า",teamB=f.source_team_b_label||"รอผลคู่ก่อนหน้า";
  const pairing=track?(f.name||f.source_title||"รายการกรีฑา"):(teamA+" พบ "+teamB);
  const date=f.source_pdf?.source_date_text||"ไม่ระบุ";
  const time=f.source_pdf?.source_time||"ไม่ระบุ";
  const field=f.source_pdf?.source_field||"ไม่ระบุ";
  const page=f.source_pdf?.page||f.source_page||"ไม่ระบุ";
  const slug=hashId(f.id);
  const url="https://infobwd.github.io/nongkum-sports-hub/r/"+slug+"/";
  const href="../../review.html?fixture="+encodeURIComponent(f.id);
  const title=topic+" · "+number+" · "+pairing;
  const description=number+" · "+pairing+" · วันที่ตาม PDF "+date+" · เวลา "+time+" · "+field+" · สูจิบัตรหน้า "+page+" · ข้อมูลร่าง ยังไม่ใช่ประกาศทางการ";
  const row=track?`<p class="event">${escapeText(pairing)}</p><p class="share-source">แถวลู่กรีฑา ${Number(f.lanes?.length||0)} ลู่</p>`:`<div class="teams"><strong>${escapeText(teamA)}</strong><span>พบ</span><strong>${escapeText(teamB)}</strong></div>`;
  return `<!doctype html>
<html lang="th"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex,follow"><meta name="theme-color" content="#183762">
<title>${escapeText(title)} | ตรวจสูจิบัตรมิตรภาพเกม 2569 (ร่าง)</title>
<meta name="description" content="${escapeText(description)}">
<meta property="og:locale" content="th_TH"><meta property="og:type" content="website">
<meta property="og:site_name" content="ตรวจสูจิบัตรมิตรภาพเกม 2569 (ร่าง)">
<meta property="og:title" content="${escapeText(title)}">
<meta property="og:description" content="${escapeText(description)}">
<meta property="og:url" content="${escapeText(url)}">
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escapeText(title)}">
<meta name="twitter:description" content="${escapeText(description)}">
<link rel="canonical" href="${escapeText(url)}">
<link rel="stylesheet" href="../../css/base.css"><link rel="stylesheet" href="../../css/match-share.css">
</head><body>
<header class="top"><div class="shell"><div class="brand"><div class="logo"><span class="logoIcon" aria-hidden="true">🏆</span><span>มิตรภาพเกม</span></div><span class="mode">ฉบับตรวจสอบ · ไม่ใช่ประกาศทางการ</span></div><div class="hero"><h1>รายการที่แชร์จากสูจิบัตรฉบับใหม่</h1></div></div></header>
<main class="shell share-main">
<article class="share-match" data-fixture-id="${escapeText(f.id)}">
<div class="share-kicker">${escapeText(topic)} · ${escapeText(number)}</div>
${row}
<div class="share-tags"><div>📅 วันที่ตามสูจิบัตร: ${escapeText(date)}</div><div>🕒 เวลาในสูจิบัตร: ${escapeText(time)}${time==="ไม่ระบุ"?"":" น."}</div><div>📍 สนามตามสูจิบัตร: ${escapeText(field)}</div></div>
<p class="share-source">เอกสาร PDF ฉบับตรวจสอบ หน้า ${escapeText(page)} · วัน เวลา และสนามรอการตรวจยืนยัน</p>
</article>
<div class="share-actions"><a id="openReview" class="share-primary" href="${escapeText(href)}">เปิดรายการนี้ในหน้าตรวจสูจิบัตร</a><a class="share-secondary" href="../../review.html">ดูฉบับตรวจสอบทั้งหมด</a></div>
<p class="share-notice">ข้อมูลนี้เป็นร่างจากสูจิบัตรเพื่อการตรวจสอบ ไม่ใช่กำหนดการแข่งขันอย่างเป็นทางการ หรือผลการแข่งขันที่รับรองแล้ว</p>
</main><footer class="shell">มิตรภาพเกม ปี 2569 · สูจิบัตรฉบับใหม่สำหรับตรวจทาน</footer>
<script>window.location.replace(document.getElementById("openReview").href);</script>
</body></html>
`;
}
const data=JSON.parse(readFileSync(new URL("../../data/program-from-pdf-2569-20261104-draft.json",import.meta.url),"utf8"));
if(data.metadata?.all_data_approved!==false||data.metadata?.website_publication_status!=="not_released")
  throw Error("Only an unpublished PDF candidate can be shared from /r/");
const check=process.argv.includes("--check"),seen=new Set(),links={};
function ensure(path,content){
  const url=new URL("../../"+path,import.meta.url);
  if(check){
    if(!existsSync(url)||readFileSync(url,"utf8")!==content)throw Error("Missing or stale: "+path);
  }else{
    mkdirSync(pathDirname(fileURLToPath(url)),{recursive:true});
    writeFileSync(url,content,"utf8");
  }
}
for(const f of data.fixtures){
  const slug=hashId(f.id);
  if(seen.has(slug))throw Error("Review share code collision "+slug);
  seen.add(slug);links[slug]=f.id;
  ensure("r/"+slug+"/index.html",buildPage(f,data));
}
const index=JSON.stringify({schema_version:1,source:"data/program-from-pdf-2569-20261104-draft.json",status:"draft_not_approved",count:data.fixtures.length,links},null,2)+"\n";
ensure("data/review-share-index.json",index);
console.log((check?"PASS verified ":"Generated ")+data.fixtures.length+" candidate-only share preview pages");

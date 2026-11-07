#!/usr/bin/env python3
"""R11C-V4 deterministic full-draft builder from existing public PDF/JSON.
NEVER an automatic official release; no changes to the live PDF reader.
"""
from __future__ import annotations
import argparse,collections,datetime,hashlib,html,json,re
from pathlib import Path
import fitz
from weasyprint import HTML
from v41_editorial import (formal_font_css, colors_and_oath, special_observations, extra_css)
from v42_ceremony import render as render_ceremony, css as ceremony_css
from v42_rules import render as render_rules, css as rules_css
from v42_matchday import render as render_matchday, css as matchday_css
from v42_brackets import render as render_brackets, css as brackets_css
from v42_organizer_review import render as render_organizer_review, css as organizer_review_css
from v42_cover import cover_html, cover_css
from v42_notice_pr82 import render_official_notice_v2
from v42_official import (build_source_model, official_full_html,
    source_audit, official_css as v42_official_css)

SPORTS=["football","shootout","futsal","volleyball","takraw","petanque","tabletennis","tugofwar"]
MONTHS=["","มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"]
EXCLUDE="football-p07-มัธยมหญิง-020-repeated-final"
KEEP="football-p07-มัธยมหญิง-007"
def esc(x):return html.escape(str(x if x is not None else ""))
def get(path):return json.loads(path.read_text("utf-8"))
def iso(d):
 if not d:return "รอตรวจ"
 try:
  x=datetime.date.fromisoformat(d);return f"{x.day} {MONTHS[x.month]} {x.year+543}"
 except ValueError:return str(d)
def selected_date(f):
 return f.get("planning_date") if f.get("planning_date_confirmation")=="confirmed" else f.get("draft_date")
def selected_time(f):
 return f.get("planning_time") if f.get("planning_time_confirmation")=="confirmed" else f.get("draft_time")
def state(f):
 if f.get("planning_date_confirmation")=="confirmed" and f.get("planning_time_confirmation")=="confirmed":return ("ยืนยันวัน–เวลา","yes")
 if f.get("planning_date_confirmation")=="confirmed":return ("ยืนยันวัน / เวลาอยู่ระหว่างตรวจ","partial")
 return ("ตามสูจิบัตรร่าง / รอตรวจ","pending")
def token(id):
 return "v4"+hashlib.sha1(id.encode("utf-8")).hexdigest()[:12]
def sec(title,tag,body,subtitle=""):
 return f'<section class="chapter"><p class="eyebrow">{esc(tag)}</p><h1>{esc(title)}</h1><p class="subtitle">{esc(subtitle)}</p>{body}</section>'
def sheetrows(title,heads,rows,classname=""):
 h="".join(f"<th>{esc(x)}</th>" for x in heads)
 body="".join("<tr>"+"".join(f"<td>{x}</td>" for x in rr)+"</tr>" for rr in rows)
 return f'<div class="block{" score-block" if classname=="score" else ""}"><h2>{esc(title)}</h2><table class="data {classname}"><thead><tr>{h}</tr></thead><tbody>{body}</tbody></table></div>'
def marked(id,text):
 return esc(text)+f'<span class="anchor-id">{token(id)}</span>'
def read_source(pdf,p):
 raw=pdf[p-1].get_text("text",sort=True).replace("\uf02a","☐")
 raw=re.sub(r"^\s*-\s*"+str(p)+r"\s*-\s*","",raw)
 lines=[re.sub(r"\s+"," ",x).strip() for x in raw.splitlines()]
 return "\n".join(x for x in lines if x and not re.fullmatch(r"[-–—.·… ]{8,}",x))
def excerpt(pdf,p,cap=""):
 txt=read_source(pdf,p)
 return f'<div class="source"><h3>{esc(cap or ("ข้อความอ้างอิง V3 หน้า "+str(p)))}</h3><p>{esc(txt).replace(chr(10),"<br>")}</p><p class="source-foot">ข้อความถอดจาก PDF V3 หน้า {p} • ยังเป็นร่าง</p></div>'
def style(font):
 uri=font.as_uri()
 bold=font.with_name("NotoSansThai-Bold.ttf").as_uri() if font.with_name("NotoSansThai-Bold.ttf").exists() else uri
 return """@font-face{font-family:NotoThai;src:url('@@FONT@@');font-weight:400}
@font-face{font-family:NotoThai;src:url('@@BOLD@@');font-weight:700}
@page{size:A4;margin:17mm 15.5mm 16.5mm 15.5mm;
 @top-left{content:"มิตรภาพเกมส์ 2569 | สูจิบัตร V4 (ร่าง)";font-size:8pt;color:#647e98}
 @top-right{content:"ร่างสำหรับตรวจ ไม่ใช่ประกาศรับรอง";font-size:8pt;color:#8c6a31}
 @bottom-left{content:"R11C-V4 • จากข้อมูลปัจจุบัน";font-size:7pt;color:#8594a7}
 @bottom-right{content:counter(page);font-size:8pt;color:#3c6081}}
@page:first{margin:0;@top-left{content:none}@top-right{content:none}@bottom-left{content:none}@bottom-right{content:none}}
*{box-sizing:border-box}
html,body{margin:0;padding:0;color:#18324b;font:9pt/1.62 NotoThai,sans-serif}
h1,h2,h3,p{margin-top:0}h1{font-size:22pt;line-height:1.25;margin-bottom:4mm;border-bottom:2px solid #e2b955;padding-bottom:3mm}
h2{font-size:12pt;break-after:avoid;margin:5mm 0 2.5mm}h3{font-size:9.5pt;break-after:avoid}
p{margin-bottom:2.3mm}
.chapter{break-before:page}.eyebrow{font-size:8pt;font-weight:700;color:#b3924e;margin:0 0 2mm}
.subtitle{font-size:8.5pt;color:#728aa0;margin-bottom:5mm}
.block{margin:4mm 0 8mm;break-inside:auto}
.data{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8pt;margin-bottom:4mm}
.data th{text-align:left;background:#1b4167;color:white;padding:2mm 1.7mm}
.data td{padding:1.6mm 1.6mm;border-bottom:1px solid #dfe7f0;vertical-align:top;overflow-wrap:anywhere;line-height:1.55}
.data tbody tr:nth-child(even){background:#f6f9fc}
.data thead{display:table-header-group}.data tr,.item{break-inside:avoid}
.data td:first-child{color:#38618b;font-weight:700}
.match th:nth-child(1){width:8%}.match th:nth-child(2){width:15%}.match th:nth-child(3){width:17%}.match th:nth-child(4){width:11%}.match th:nth-child(5){width:31%}.match th:nth-child(6){width:18%}
.committee th:nth-child(1){width:13%}.committee th:nth-child(2){width:29%}.committee th:nth-child(3){width:35%}.committee th:nth-child(4){width:23%}
.lane th:nth-child(1){width:9%}.lane th:nth-child(2){width:38%}.lane th:nth-child(3){width:34%}.lane th:nth-child(4){width:10%}.lane th:nth-child(5){width:9%}
.anchor-id{display:block;font-family:monospace;font-size:5.2pt;color:#9aaabc;white-space:nowrap;line-height:1.2}
.st{display:inline-block;font-size:7pt;padding:.45mm 1.5mm;border-radius:4px;line-height:1.35}
.st.yes{background:#e4f4e9;color:#2f6e51}.st.partial{background:#fff1d2;color:#816322}.st.pending{background:#eef3f8;color:#688097}
.warning{padding:2.5mm 3mm;background:#fff5de;border-left:3px solid #dfb85b;font-size:8.5pt;margin:3mm 0 4mm}
.info{padding:2.5mm 3mm;background:#edf4fa;border-left:3px solid #6289b0;font-size:8.5pt;margin:3mm 0 4mm}
.source{border:1px solid #dce7f0;background:#fafcfe;padding:3.5mm;margin:3mm 0 6mm;break-inside:auto}
.source p{line-height:1.75}.source-foot{font-size:7pt;color:#7f8d9b;margin-top:3mm}
.source h3{color:#42668c}
.item{border:1px solid #d9e5ef;padding:3mm;margin:4mm 0 5mm;border-radius:5px}
.item-head{font-weight:700;font-size:10pt;color:#244b73}
.item .data{margin-top:2.5mm}.muted{font-size:7.5pt;color:#74869b}
.blank td{height:9mm}
.cover{position:relative;width:210mm;height:297mm;break-after:page;background:#132f50;color:white;padding:35mm 20mm}
.cover:before{content:"";height:5mm;background:#eec65b;position:absolute;top:0;left:0;right:0}
.cover:after{content:"";position:absolute;border:3px solid rgba(236,201,106,.25);border-radius:50%;width:170mm;height:170mm;right:-45mm;top:30mm}
.cover-main{position:relative;z-index:2}.cover .over{font-size:11pt;letter-spacing:1px;color:#e1cf83}
.cover h1{margin:20mm 0 0;border:0;color:white;font-size:40pt}.cover .year{font-size:57pt;color:#efca5f;font-weight:700}
.cover-bottom{position:absolute;bottom:0;left:0;right:0;background:#f2f5f8;color:#173b5c;padding:13mm 20mm}
.cover-bottom strong{font-size:12pt}.cover-bottom p{font-size:9pt;color:#536f87}
.cover .seal{display:inline-block;background:#ffe6a2;color:#72521d;padding:1mm 3mm;border-radius:5px;font-size:8pt;margin-bottom:4mm}
.score td{height:13mm}
.score-block{break-inside:avoid}
""".replace("@@FONT@@",uri).replace("@@BOLD@@",bold)
def pick_font():
 from pathlib import Path
 for p in (Path("/usr/share/fonts/truetype/noto/NotoSansThai-Regular.ttf"),
           Path("/usr/share/fonts/opentype/noto/NotoSansThai-Regular.ttf")):
  if p.exists():return p
 found=list(Path("/usr/share/fonts").rglob("NotoSansThai-Regular.ttf"))
 if not found:raise RuntimeError("Noto Sans Thai font not installed on build runner")
 return found[0]
def build(root,out):
 raw=get(root/"data/program-from-pdf-2569-20261104-draft.json")
 roster=get(root/"data/committee-2569-draft-public-review.json")
 policy=get(root/"data/standings-rules.json")
 pdfpath=root/"assets/souvenir-committee-2569-v3.pdf"
 pdf=fitz.open(pdfpath)
 if len(pdf)!=64 or len(raw.get("fixtures",[]))!=237 or len(roster.get("entries",[]))!=250:
  raise ValueError("Source inventory changed; halt until revised")
 sha=hashlib.sha256(pdfpath.read_bytes()).hexdigest()
 approved_sha=roster.get("editorial_correction",{}).get("corrected_pdf_sha256") or roster["source_sha256"]
 if sha!=approved_sha:raise ValueError("PDF/roster revision mismatch")
 original=raw["fixtures"]
 if len([x for x in original if x["id"]==EXCLUDE])!=1 or len([x for x in original if x["id"]==KEEP])!=1:
  raise ValueError("R20-B duplicate mapping changed")
 fixtures=[]
 for x in original:
  if x["id"]==EXCLUDE:continue
  x=dict(x)
  if x["id"]==KEEP:
   if x.get("draft_date")!="2026-11-18":raise ValueError("Confirmed women's football date changed")
   x["planning_date"]="2026-11-18";x["planning_date_confirmation"]="confirmed"
  fixtures.append(x)
 matches=[x for x in fixtures if x["kind"]=="match"]
 athletics=[x for x in fixtures if x["kind"]=="track_event"]
 if (len(matches),len(athletics),sum(len(x.get("lanes",[])) for x in athletics))!=(186,50,289):
  raise ValueError("Fixture or lane count changed")
 status_verified=sum(1 for x in matches if x.get("planning_date_confirmation")=="confirmed" and x.get("planning_time_confirmation")=="confirmed")
 if status_verified!=45:raise ValueError("Confirmed scheduling rows changed")
 names={x["id"]:x["name"] for x in raw["sports"]}
 pages=[]
 pages.append(cover_html())
 pages.append(sec("ข้อมูลสำหรับผู้อ่าน","บทนำ / สถานะข้อมูล",
 """<div class="warning"><b>สถานะเอกสาร:</b> V4.2-H ร่างจัดหน้า โดยใช้ข้อมูลที่มี ณ 6 พฤศจิกายน 2569 ระบุสถานะการยืนยันวัน–เวลาแยกตามรายการ ห้ามใช้เป็นเอกสารคำสั่งหรือผลรับรอง</div>
 <p>ข้อมูลทั้งหมด 236 รายการ: กีฬาเป็นคู่ 186 คู่ และกรีฑา 50 รายการ (289 ลู่) พร้อมรายชื่อหน้าที่กรรมการรอตรวจ 250 แถว</p>
 <p>วัน–เวลาได้รับการยืนยัน 45 คู่ • สนามหลักยืนยันโรงเรียนบ้านหนองกระทุ่ม • ฟุตบอลมัธยมหญิงชิงวันที่ 18 พฤศจิกายน ไม่ใช้รายการซ้ำวันที่ 20 พฤศจิกายน</p>
 <p>รายชื่อกรรมการอยู่ระหว่างตรวจโรงเรียน จึงมิใช่คำสั่งแต่งตั้งที่ได้รับการลงนาม และไม่มีการพิมพ์ผลการแข่งขันสมมติ</p>
 <div class="info">เพื่อรักษาผังสายจากต้นฉบับ V3 เอกสารส่วนท้ายมีภาคผนวกหน้าผังสายเดิมสำหรับอ้างอิง ซึ่งยังไม่รับรองเช่นกัน</div>"""))
 opening_html,opening_qa=render_ceremony(pdf,3)
 closing_html,closing_qa=render_ceremony(pdf,4)
 pages.append(sec("กำหนดการพิธีเปิดการแข่งขัน","MAGAZINE / พิธีการ",
  opening_html,"กิจกรรมช่วง 08.45 น. แยกเป็นขั้นตอนโดยไม่เพิ่มเวลาใหม่ · รอตรวจ"))
 pages.append(sec("กำหนดการพิธีปิดการแข่งขัน","MAGAZINE / พิธีการ",
  closing_html,"กำหนดการตาม V3 หน้า 4 · รอตรวจ"))
 pages.append(sec("สีประจำโรงเรียนและคำปฏิญาณนักกีฬา","MAGAZINE / SCHOOL SPIRIT",
  colors_and_oath(read_source(pdf,5)),"ข้อมูลสีจาก V3 หน้า 5 · การ์ดสีเป็นตัวอย่าง"))
 official_model=build_source_model(pdf)
 official_html=official_full_html(official_model)
 official_report=source_audit(official_model,official_html)
 # V42-N3-B: keep audited 341 V3 source-line IDs, but do not print the
 # N1 opening or N2 magazine-styled announcement. The accepted PR82
 # 11-page PDF is inserted before committee review tables after render.
 if not (official_report["total_source_lines"]==official_report["rendered_source_lines"]==341):
  raise ValueError("V3 official announcement source not complete")
 heads=["ข้อ","ชื่อ–สกุล","สังกัด","ตำแหน่งในคณะ"]
 section_titles={str(x["id"]):x["title"] for x in roster["sections"]}
 group=collections.defaultdict(list)
 for x in roster["entries"]:group[str(x["section"])].append(x)
 for sid,rows in sorted(group.items(),key=lambda x:int(x[0])):
  rr=[]
  for x in rows:
   rr.append([esc(x.get("number") or "—"),marked(x["id"],x["name"]),
      esc(x.get("affiliation") or "—"),esc(x.get("role") or "—")])
  body='<div class="warning">รายชื่อและสังกัดตามร่างฉบับแก้สะกดล่าสุด ยังรอโรงเรียนตรวจ ไม่ใช่คำสั่งแต่งตั้ง</div>'
  body+=sheetrows(section_titles.get(sid,"หมวด "+sid)+f" ({len(rows)} รายการ)",heads,rr,"committee")
  pages.append(sec("คณะกรรมการ / หมวด "+sid,"ข้อมูลกรรมการ • รอตรวจรายชื่อ",body))
 rules_html,rules_qa=render_rules(pdf,policy)
 pages.append(sec("หลักเกณฑ์การแข่งขันและคะแนนรวม","V42-C · กติกาและคะแนนถ้วย",
   rules_html,"คะแนนถ้วยรวมกับคะแนนฟุตบอลแยกกัน · สถานะรับรองดูตามหมวด"))
 brackets_html,brackets_qa=render_brackets(matches,raw["sports"])
 pages.append(sec("ผังสายและการประกบคู่ใหม่","V42-E · โครงสร้างจากคู่แข่งขันจริง",
   brackets_html,"โยงผู้ชนะเฉพาะเลขคู่ที่อ้างอิงได้ชัด • ข้อผิดพลาดต้นฉบับติดป้ายรอตรวจ"))
 matchday_audits=[]
 for sport in SPORTS:
  rows=[x for x in matches if x["sport_id"]==sport]
  if not rows:continue
  bydate=collections.OrderedDict()
  for x in rows:bydate.setdefault(selected_date(x) or "รอตรวจวัน",[]).append(x)
  body=f'<div class="info">จำนวน {len(rows)} คู่ • สนามหลัก โรงเรียนบ้านหนองกระทุ่ม • วันเวลาที่ไม่รับรองแสดงตามร่าง</div>'
  matchday_html,matchday_qa=render_matchday(rows,raw["schools"],names.get(sport,sport))
  matchday_audits.append(matchday_qa)
  body+=matchday_html
  for day,rr in bydate.items():
   r=[]
   for x in rr:
    st,klass=state(x)
    field=x.get("draft_field") or x.get("field") or "—"
    if field!="—":field+=" (ตามร่าง)"
    r.append([esc(x.get("source_match_no") or "—"),esc(x.get("division") or "—"),
      esc(iso(selected_date(x))),esc(selected_time(x) or "รอตรวจ"),
      marked(x["id"],x.get("source_pair_text") or "—"),
      esc(field)+'<br><span class="st '+klass+'">'+esc(st)+'</span>'])
   body+=sheetrows(iso(day)+f" • {len(rr)} คู่",["คู่","รุ่น","วันที่","เวลา","คู่แข่งขัน / อ้างอิง","สนามและสถานะ"],r,"match")
  pages.append(sec("โปรแกรมการแข่งขัน "+names.get(sport,sport),"กีฬาเป็นคู่ / จัดหน้าใหม่",body,
    "ข้อมูลสถานะยืนยันแยกรายช่อง • สนามย่อยที่ยังไม่รับรองระบุว่าเป็นข้อมูลร่าง"))
 ach='<div class="warning">รายการกรีฑา 50 รายการและลู่ 289 ลู่ ตามต้นฉบับ; ชื่อนักกีฬาและผลยังเว้นว่าง ไม่สร้างรายชื่อใหม่</div>'
 for x in athletics:
  lanes=x.get("lanes") or []
  r=[[esc(k.get("lane") or "—"),esc(k.get("source_school_label") or "—"),
      "................................", "",""] for k in lanes]
  ach+='<div class="item"><div class="item-head">'+marked(x["id"],"รายการ "+str(x.get("source_match_no") or "")+" • "+str(x.get("name") or x.get("source_title") or ""))+'</div><p class="muted">'+esc(x.get("division") or "")+' | วันที่ตามร่าง '+esc(iso(x.get("draft_date")))+' • เวลาไม่รับรอง</p>'
  ach+=sheetrows("",["ลู่","ศูนย์ / โรงเรียน","ชื่อผู้แข่งขัน","อันดับ","หมายเหตุ"],r,"lane")+'</div>'
 pages.append(sec("กรีฑาและลู่แข่งขัน","รายการกรีฑา 50 รายการ",ach))
 roster_rows=[[str(i),"","","",""] for i in range(1,16)]
 pages.append(sec("แบบรายชื่อนักกีฬา","แบบฟอร์มว่าง",
   '<p>โรงเรียน ......................................... ชนิดกีฬา .............................. รุ่น ..............................</p>'+
   sheetrows("ทะเบียนผู้เข้าร่วม",["ลำดับ","ชื่อ–สกุล","ชั้น","วันเดือนปีเกิด","หมายเหตุ"],roster_rows,"blank")+
   '<p style="margin-top:10mm">ลงชื่อครูผู้ควบคุมทีม ..........................................................</p>'))
 pages.append(sec("ใบบันทึกผลการแข่งขัน","แบบฟอร์มว่าง",
  '<p>ชนิดกีฬา ....................................... รุ่น ................................ คู่ที่ .......... วันที่ ...........................</p>'+
  '<p>ทีม A .............................................................. ทีม B ..............................................................</p>'+
  sheetrows("บันทึกผลรายเซตหรือช่วงเวลา",["ทีม","ช่วงที่ 1","ช่วงที่ 2","ช่วงที่ 3","ผลรวม"],[["A","","","",""],["B","","","",""]],"score")+
  '<h2>บันทึกเหตุการณ์ / หมายเหตุ</h2><div style="border:1px solid #bdcbd8;height:42mm;margin:4mm 0"></div>'+
  '<p>ผู้ชนะ ............................................... ผล .................................................</p>'+
  '<p style="margin-top:14mm">ลงชื่อผู้ตัดสิน ..................................... ลงชื่อผู้ตรวจสอบ ....................................</p>'+
  '<div class="warning">แบบบันทึกทั่วไปนี้ยังต้องแยกชนิดกีฬาเมื่อใช้จริง ไม่แสดงคะแนนสมมติ</div>'))
 schools=raw["schools"]
 schoolnames=[esc(x.get("short") or x["name"]) for x in schools]
 body='<div class="info">ช่องคะแนนว่างจนกว่าจะได้รับรองผลจากกรรมการ</div>'
 for title,cols in [("ปฐมวัย",["เปตอง","ชักเย่อ"]),("ประถมศึกษา",["ฟุตบอล","ฟุตซอล","วอลเลย์บอล","เปตอง","ตะกร้อ","ปิงปอง","ชักเย่อ"]),("มัธยมศึกษา",["ฟุตบอล","ฟุตซอล","วอลเลย์บอล","เปตอง","ตะกร้อ","ปิงปอง","ชักเย่อ"]),("กรีฑา",["ประเภทลู่","วิ่งผลัด","บุคคล"])]:
  rows=[[s]+[""]*(len(cols)+2) for s in schoolnames]
  body+=sheetrows("แบบสรุปคะแนน "+title,["โรงเรียน"]+cols+["รวม","ลำดับ"],rows,"score")
 pages.append(sec("ตารางสรุปคะแนน","แบบฟอร์มว่าง • ไม่ใช่ผลการแข่งขัน",body))
 r12_screen=get(root/"data/analysis/r12a-school-time-risk-20261104.json")
 pages.append(sec("ข้อสังเกตและสิ่งที่ควรตรวจเป็นพิเศษ","SAFETY & SCHEDULE QA",
   special_observations(r12_screen),
   "คัดกรองก่อนแข่งขัน • แยกความเสี่ยงระดับโรงเรียนจากการชนจริงของนักกีฬา"))
 organizer_html,organizer_qa=render_organizer_review(fixtures)
 pages.append(sec("รายการตรวจผังสาย 6 กลุ่มสำหรับผู้จัด","ORGANIZER REVIEW • V4.2-H",organizer_html,
   "จากสูจิบัตร V2/V3 และตารางต้นทาง • ข้อเสนอแก้ยังต้องมีมติผู้จัดก่อนใช้จริง"))
 official_css,official_font_used=formal_font_css()
 html_body='<!doctype html><html lang="th"><head><meta charset="utf-8"><title>มิตรภาพเกมส์ สูจิบัตร V4.2-H ฉบับร่างจัดหน้า</title><style>'+style(pick_font())+official_css+extra_css()+v42_official_css()+ceremony_css()+rules_css() +matchday_css()+brackets_css()+organizer_review_css()+cover_css()+'''@page{@top-left{content:"มิตรภาพเกมส์ 2569 • V4.2-H ร่าง";font-size:8pt;color:#647e98}@bottom-left{content:"R11C-V42H • ตรวจรับก่อนเผยแพร่";font-size:7pt;color:#8594a7}}'''+'</style></head><body>'+''.join(pages)+'</body></html>'
 if any(k not in html_body for k in ("ข้อสังเกตและรายการตรวจเป็นพิเศษ","คำปฏิญาณนักกีฬา","v42-ceremony","v42-rules","v42-match-day","v42-new-brackets","รายการตรวจผังสาย 6 กลุ่มสำหรับผู้จัด")):
  raise ValueError("V4.1 required editorial or risk section missing")
 out.mkdir(parents=True,exist_ok=True)
 (out/"souvenir-v4-full-draft.html").write_text(html_body,"utf-8")
 stage_qa={"schema_version":1,"release_state":"review_only","cover_status":"layout_approved_hero_rights_pending","cover_typography_status":"G1_sport_masthead_review_only",
     "notice_pr82":{"revision":"PR82-V2-N3B","status":"draft_review_only","source_pages":[6,16],"full_source_retained":official_report["total_source_lines"]==official_report["rendered_source_lines"]==341},
     "ceremony":{"opening":opening_qa,"closing":closing_qa},
     "rules":rules_qa,"matchday":matchday_audits,"brackets":brackets_qa,"organizer_review":organizer_qa}
 (out/"souvenir-v42f-stage-qa.json").write_text(json.dumps(stage_qa,ensure_ascii=False,indent=2)+"\n","utf-8")
 (out/"souvenir-v42a-official-source-qa.json").write_text(
  json.dumps(official_report,ensure_ascii=False,indent=2)+"\n","utf-8")
 main=out/"souvenir-v4-main.pdf"
 # NotoSansThai PDF text layer can extract U+0E33 as a stray ASCII ';' with some shaping engines.
 # Render only in compatibility-equivalent Thai nikhahit + sara aa; retain original source/HTML.
 pdf_render_html=html_body.replace("\u0e33","\u0e4d\u0e32")
 HTML(string=pdf_render_html,base_url=str(root)).write_pdf(main)
 document=fitz.open(main)
 # Identify the first numbered public-review committee chapter from its own
 # text, never by a hard-coded page. Insert PR #82 *before* that chapter.
 import re as _re
 first_committee_pages=[i for i,page in enumerate(document)
   if "ข้อมูลกรรมการ" in page.get_text()
   and _re.search(r"คณะกรรมการ\s*/\s*หมวด\s*1(?:\s|$)",page.get_text())]
 if len(first_committee_pages)!=1:
  raise ValueError("Expected one first committee chapter insertion point: "+str(first_committee_pages))
 insert_at=first_committee_pages[0]
 if insert_at<1 or "คำปฏิญาณ" not in document[insert_at-1].get_text():
  raise ValueError("PR82 notice should be inserted directly after athlete oath")
 pr82=render_official_notice_v2(official_model,Path("/tmp/v41-fonts"),out)
 pr82_pdf=fitz.open(pr82["pdf"])
 if len(pr82_pdf)!=11 or pr82["qa"]["source_lines"]!=341 or pr82["qa"]["sections"]!=20 or pr82["qa"]["duty_paragraphs"]!=20:
  raise ValueError("PR82 11-page golden notice gate failed")
 document.insert_pdf(pr82_pdf,start_at=insert_at)
 pr82_pdf.close()
 notice_start=insert_at+1 # one-based PDF page number
 notice_end=insert_at+11
 if "ข้อมูลกรรมการ" not in document[notice_end].get_text():
  raise ValueError("Committee chapter did not follow 11-page PR82 announcement")
 original_appendix=[17,18,19,20,21,22,23,24,26,27,28,30,33,34,35,38,40]
 for n in original_appendix:
  document.insert_pdf(pdf,from_page=n-1,to_page=n-1)
  page=document[-1]
  page.draw_rect(fitz.Rect(14,12,page.rect.width-14,40),color=None,fill=(1,.96,.81),overlay=True)
  page.insert_text((21,30),"V3 DRAFT REFERENCE ONLY - CHECK MAIN V4 PROGRAM",fontsize=8,fontname="helv",color=(.43,.27,.09),overlay=True)
 final=out/"souvenir-v4-full-draft.pdf"
 document.set_metadata({"title":"มิตรภาพเกมส์ 2569 - สูจิบัตร V4.2-H ร่างจัดหน้า","subject":"Draft only; 236 fixtures and 250 committee rows"})
 document.save(final,garbage=3,deflate=True)
 document.close()
 chk=fitz.open(final)
 all_ids=[x["id"] for x in fixtures]+[x["id"] for x in roster["entries"]]
 tokens={id:token(id) for id in all_ids}
 if len(set(tokens.values()))!=len(tokens):raise ValueError("Identifier token collision")
 pages_by_id={}; missing=[]
 for id,t in tokens.items():
  matches_=[]
  for page_no in range(len(chk)-len(original_appendix)):
   rects=chk[page_no].search_for(t)
   if rects:matches_.append((page_no+1,rects[0]))
  if len(matches_)!=1:missing.append({"id":id,"found":len(matches_)})
  else:
   n,r=matches_[0];pg=chk[n-1];pages_by_id[id]={"page":n,"rect":[round(r.x0/pg.rect.width,6),round(r.y0/pg.rect.height,6),round(r.x1/pg.rect.width,6),round(r.y1/pg.rect.height,6)]}
 if missing:raise ValueError(f"Missing or ambiguous PDF anchors: {len(missing)} "+str(missing[:6]))
 if not all(abs(p.rect.width-595.3)<2 and abs(p.rect.height-841.9)<2 for p in chk):
  raise ValueError("Unexpected non-A4 pages")
 result={"schema_version":1,"status":"draft_not_approved","source_pdf_sha256":sha,
  "layout_revision":"R11C-V4.2-H", "formal_font":official_font_used,
  "cover_image_status":"approved_design_pending_publication_rights","cover_typography_revision":"V42-G1",
  "selected_cover_design":"full_photo_v2","rendered_cover_design":"g1_text_only_fallback",
  "notice_layout_revision":"PR82-V2-N3B","notice_visual_reference":"PR82-V2",
   "notice_inserted_start_page":notice_start,"notice_inserted_end_page":notice_end,
   "notice_rendered_pages":11,"notice_golden_pdf_sha256":pr82["qa"]["sha256"],
   "notice_golden_page_text_hashes_checked":11,"notice_golden_page_pixel_hashes_checked":11,
  "ceremony_opening_events":opening_qa["events"],"ceremony_closing_events":closing_qa["events"],
  "rules_rank_points":rules_qa["award_rank_points"],
  "bracket_verified_edges":brackets_qa["verified_edges"],
  "bracket_groups_needing_review":brackets_qa["groups_with_source_ambiguity"],
  "organizer_review_rows":organizer_qa["item_count"],
  "organizer_review_gate_counts":organizer_qa["gate_counts"],
  "matchday_card_count":sum(x["cards"] for x in matchday_audits),
  "official_source_pages":official_report["source_pages"],
  "official_source_lines":official_report["total_source_lines"],
  "official_rendered_lines":official_report["rendered_source_lines"],
  "official_section_count":len(official_report["verified_section_ids"]),
  "official_source_sha256":official_report["full_text_sha256"],
  "official_duty_paragraphs":official_html.count('class="v42-duty-paragraph"'),
  "official_duty_wrapped_lines":official_html.count('class="v42-duty-continuation"'),
  "editorial_sections":["pr82_official_announcement","opening_timeline","closing_timeline","school_colors","athlete_oath","rules_infographics","school_color_matchups","source_verified_brackets","schedule_conflict_review","organizer_six_group_review"],
  "risk_source_revision":r12_screen["source"]["revision"],
  "committee_revision":roster["revision"],"source_pdf_pages":64,"pdf_pages":len(chk),
  "program_items":len(fixtures),"matches":len(matches),"athletics":len(athletics),
  "athletics_lanes":sum(len(x["lanes"]) for x in athletics),"committee_entries":len(roster["entries"]),
  "confirmed_date_and_time":status_verified,"anchors":len(pages_by_id),"appendix_pages":len(original_appendix),
  "pdf_sha256":hashlib.sha256(final.read_bytes()).hexdigest(),"name":"souvenir-v4-full-draft.pdf"}
 (out/"souvenir-v4-qa.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n","utf-8")
 (out/"souvenir-v4-page-map.json").write_text(json.dumps({"schema_version":1,"source_pdf_sha256":result["pdf_sha256"],"entries":pages_by_id},ensure_ascii=False,indent=2)+"\n","utf-8")
 print(json.dumps(result,ensure_ascii=False,indent=2))
 return result
def main():
 p=argparse.ArgumentParser();p.add_argument("--root",type=Path,default=Path(__file__).resolve().parents[2]);p.add_argument("--out",type=Path,default=None)
 a=p.parse_args();build(a.root,a.out or a.root/"build/v4-review")
if __name__=="__main__":main()

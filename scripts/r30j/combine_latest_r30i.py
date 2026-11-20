#!/usr/bin/env python3
"""R30-J: integrate latest committee booklet (R30-I) with approved-results bracket/tables (R30-E).
Do not modify source PDF files, published results, names or Supabase data.
"""
from pathlib import Path
import fitz,hashlib,json,re
from weasyprint import HTML
from html import escape
ROOT=Path('/mnt/data/r30e_work')
COMMITTEE=Path('/mnt/data/R30I_MittraphapGames_2569_LargeType_Detailed_Committee_Index_REVIEW_ONLY.pdf')
RESULTS=ROOT/'MittraphapGames_2569_R30E_Approved_Results_DRAFT.pdf'
OUTPUT=ROOT/'MittraphapGames_2569_R30J_Complete_Booklet_Approved_Results_DRAFT.pdf'
FONT='/usr/share/fonts/truetype/noto/NotoSansThai-Regular.ttf'
FONT_BOLD='/usr/share/fonts/truetype/noto/NotoSansThai-Bold.ttf'
assert COMMITTEE.exists() and RESULTS.exists()
committee_sha=hashlib.sha256(COMMITTEE.read_bytes()).hexdigest()
results_sha=hashlib.sha256(RESULTS.read_bytes()).hexdigest()
assert committee_sha=='53cc71e6f189c29813ee3ca2e1e1c67874ca61e01d560c2df4b1c4357bbf99c3'
assert results_sha=='ad581221d821eff51ac507b643cfc02a65b7d0f5117ee4e6954f04af7001f59c'

sports=[
 ('ฟุตบอล',6,50),('ยิงจุดโทษ',9,53),('ฟุตซอล',10,55),('วอลเลย์บอล',15,57),
 ('เซปักตะกร้อ',23,60),('เปตอง',31,63),('เทเบิลเทนนิส',41,68),('ชักเย่อ',45,70)
]
# Original R30-E page n becomes combined page n+44 for pages 6–93.
def newpage(n):return n+44

# Styled clean A4 ToC with positions known and clickable PDF links added separately.
rows=''
for i,(name,bracket,table) in enumerate(sports):
 y=206+i*55
 shade='#f4f7fa' if i%2==0 else '#ffffff'
 rows+=f'''<div class="sportrow" style="top:{y}pt;background:{shade};">
 <div class="name">{escape(name)}</div><div class="bracket">ผังหน้า {newpage(bracket)}</div><div class="table">ตารางหน้า {newpage(table)}</div></div>'''
html=f'''<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"/><style>
@page{{size:A4;margin:0}}@font-face{{font-family:Noto;src:url("file://{FONT}")}}@font-face{{font-family:Noto;src:url("file://{FONT_BOLD}");font-weight:700}}
html,body{{margin:0;padding:0;font-family:Noto,sans-serif;color:#143b5a}}
.top{{position:absolute;top:0;left:0;width:100%;height:14pt;background:#133957}}
.gold{{position:absolute;top:14pt;left:0;width:100%;height:3pt;background:#b78c40}}
.title{{position:absolute;top:49pt;left:48pt;font-size:22pt;font-weight:700;line-height:28pt}}
.subtitle{{position:absolute;top:89pt;left:48pt;font-size:10pt;color:#536c7e}}
.notice{{position:absolute;top:123pt;left:48pt;width:496pt;height:58pt;background:#f4efe4;border-left:4pt solid #bb914a;padding:10pt 13pt;box-sizing:border-box;font-size:9.5pt;line-height:17pt}}
.hrow{{position:absolute;top:186pt;font-size:10pt;font-weight:700;color:#8b5a1e;}}
.sportrow{{position:absolute;left:48pt;width:500pt;height:43pt;border-bottom:0.6pt solid #dce4e8;box-sizing:border-box;font-size:11pt;}}
.sportrow .name{{position:absolute;left:13pt;top:8pt;font-weight:700}}
.sportrow .bracket{{position:absolute;left:238pt;top:8pt;color:#14628b;font-size:10pt}}
.sportrow .table{{position:absolute;left:364pt;top:8pt;color:#14628b;font-size:10pt}}
.track{{position:absolute;top:660pt;left:48pt;width:500pt;height:46pt;background:#e9f0f5;border-left:4pt solid #133957;box-sizing:border-box;padding:9pt 13pt;font-size:11pt;font-weight:700}}
.bottom{{position:absolute;top:752pt;left:48pt;font-size:9.5pt;color:#46657a}}
.footer{{position:absolute;left:48pt;top:809pt;width:500pt;font-size:8pt;color:#597183;border-top:0.5pt solid #d7e0e7;padding-top:6pt}}
</style></head><body>
<div class="top"></div><div class="gold"></div>
<div class="title">สารบัญการแข่งขันและผลรับรอง</div>
<div class="subtitle">มิตรภาพเกมส์ 2569 • สูจิบัตรฉบับรวม • หน้า 49 / 137</div>
<div class="notice">ผลการแข่งขันที่ผ่านการรับรองแล้ว: <b>43 คู่</b> และกรีฑา <b>40 รายการ</b> (มีอันดับ 109 ช่อง)<br/>ผลที่ยังไม่รับรองเว้นไว้ และผังหรือวันเวลาที่เป็นร่างยังต้องตรวจสอบก่อนใช้งาน</div>
<div class="hrow" style="left:60pt">ชนิดกีฬา</div>
<div class="hrow" style="left:286pt">เปิดผังการแข่งขัน</div>
<div class="hrow" style="left:410pt">เปิดตาราง/ผล</div>
{rows}
<div class="track">กรีฑา — ตารางลู่และอันดับที่รับรองแล้ว (เริ่มหน้า 117)</div>
<div class="bottom">กลับสารบัญกรรมการ (หน้า 3) · ผลรับรองล่าสุดเผยแพร่ 17 พฤศจิกายน 2569</div>
<div class="footer">ฉบับตรวจร่าง · ผลเฉพาะแถวที่มีป้าย “ผลรับรอง” เท่านั้น</div>
</body></html>'''
(ROOT/'toc_competition.html').write_text(html,encoding='utf-8')
TOC=ROOT/'toc_competition.pdf'
HTML(string=html,base_url=str(ROOT)).write_pdf(str(TOC))
with fitz.open(TOC) as t:assert len(t)==1

def add_link(page,rect,target_page_number):
 page.insert_link({'kind':fitz.LINK_GOTO,'from':fitz.Rect(*rect),'page':int(target_page_number)-1})

def footer_replace(p,number,final_total,book_section):
 # Redact *only* the old page-count text, not names, venues or schedules.
 orig=[]
 for b in p.get_text('dict')['blocks']:
  for line in b.get('lines',[]):
   for s in line.get('spans',[]):
    if re.fullmatch(r'\d{2}\s*/\s*\d{2,3}',s['text'].strip()) and s['bbox'][1]>802:
     orig.append(fitz.Rect(s['bbox']))
 if number>1 and len(orig)!=1:
  raise RuntimeError(f'Expected one footer number on page {number}, saw {len(orig)}')
 if not orig:return
 rect=orig[0]
 # Keep same horizontal alignment and white footer background; text removed from copy/search.
 blot=fitz.Rect(rect.x0-3,rect.y0-1, min(rect.x1+19,rect.x0+66),rect.y1+3)
 p.add_redact_annot(blot,fill=(1,1,1))
 p.apply_redactions(images=0,graphics=0,text=0)
 # Use page-space x0 and a stable baseline; source numeral is simple ASCII.
 p.insert_text((rect.x0,rect.y1-1.2),f'{number:02d} / {final_total}',fontsize=8.3,fontname='helv',color=(0.25,0.36,0.45))

with fitz.open(COMMITTEE) as d, fitz.open(RESULTS) as src:
 original_toc=d.get_toc()
 orig_links=sum(len(p.get_links()) for p in d)
 assert len(d)==48 and len(src)==94
 with fitz.open(TOC) as t:d.insert_pdf(t,links=False,annots=False)
 d.insert_pdf(src,from_page=5,to_page=92,links=False,annots=False)
 assert len(d)==137
 # PDF actual navigation on the new competition index.
 toc=d[48]
 for i,(sport,bp,tp) in enumerate(sports):
  y=206+i*55
  add_link(toc,(283,y+3,392,y+40),newpage(bp))
  add_link(toc,(405,y+3,544,y+40),newpage(tp))
 add_link(toc,(50,660,544,705),newpage(73))
 add_link(toc,(46,745,350,774),3)
 # Add a visibly labeled and clickable road from latest committee sub-TOC to competition index.
 page4=d[3];box=fitz.Rect(54,649,538,695)
 page4.draw_rect(box,fill=(0.91,0.95,0.98),color=(0.68,0.78,0.85),width=.7,overlay=True)
 # WeasyPrint fragment keeps Thai Unicode copy/search correct; direct insert_htmlbox
 # can silently emit broken ToUnicode for Thai despite looking correct.
 nav_html=f'''<html lang="th"><meta charset="utf-8"/><style>@page{{size:460pt 26pt;margin:0}}
 @font-face{{font-family:Noto;src:url("file://{FONT}")}}body{{font:11pt Noto;margin:0;padding:0;color:#133957;}}</style>
 <body>เปิดตารางแข่งขันและผลรับรอง — หน้า 49</body></html>'''
 navfile=ROOT/'nav_competition.pdf'
 HTML(string=nav_html).write_pdf(str(navfile))
 with fitz.open(navfile) as frag:
  page4.show_pdf_page(fitz.Rect(67,660,530,686),frag,0,overlay=True,keep_proportion=False)
 add_link(page4,(54,649,538,695),49)
 # Every copied competition page has a fresh return link to *competition* TOC, not old p3.
 for num in range(50,138):
  add_link(d[num-1],(482,806,554,835),49)
 # Re-number footer numbers throughout; all core content is unchanged.
 for num in list(range(1,49))+list(range(50,138)):
  footer_replace(d[num-1],num,137,'committee' if num<=48 else 'competition')
 # Compose hierarchical bookmarks while preserving all original committee bookmarks.
 new_toc=original_toc+[[1,'ตารางแข่งขันและผลที่ผ่านการรับรอง',49],[2,'สารบัญการแข่งขัน',49],[2,'ผังการแข่งขัน',50]]
 for sport,bp,tp in sports:new_toc.append([3,'ผัง '+sport,newpage(bp)])
 new_toc.append([2,'ตารางกีฬาและผลที่รับรอง',94])
 for sport,bp,tp in sports:new_toc.append([3,'ตาราง '+sport,newpage(tp)])
 new_toc.append([2,'กรีฑาและอันดับที่รับรอง',117])
 d.set_toc(new_toc)
 d.set_metadata({**d.metadata,'title':'มิตรภาพเกมส์ 2569 สูจิบัตรรวม R30-J พิธีการ กรรมการ ผัง ตารางและผลรับรอง','subject':'DRAFT; R30-I 48 pages + clickable results index + R30-E approved sports and athletics tables; 137 pages'})
 d.save(str(OUTPUT),garbage=4,deflate=True)
 m={'status':'draft_qa_pending','source_committee_file':COMMITTEE.name,'source_committee_sha256':committee_sha,'source_results_file':RESULTS.name,'source_results_sha256':results_sha,'new_pdf':OUTPUT.name,'sha256':hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),'pages':len(d),'navigation':{'original_committee_links':orig_links,'final_links':sum(len(p.get_links()) for p in d),'original_committee_toc':len(original_toc),'final_toc':len(d.get_toc()),'competition_toc_page':49},'source_map':{'committee_source_pages':'1–48','competition_toc_page':49,'results_source_pages':'6–93','combined_results_pages':'50–137','map_formula':'combined_page = source_results_page + 44'},'approved_results':{'fixtures':43,'athletics_events':40,'rank_cells':109}}
 (ROOT/'R30J_BUILD_REPORT.json').write_text(json.dumps(m,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps(m,ensure_ascii=False))

#!/usr/bin/env python3
"""R30-K: add clickable *approved results* index to R30-J's component source PDFs.
R30-I (committee) and R30-E (results) are read-only. No scores, teams, dates or venues change.
"""
from pathlib import Path
import fitz, hashlib, json, re
from html import escape
from weasyprint import HTML

ROOT=Path('/mnt/data/r30k')
COMMITTEE=Path('/mnt/data/R30I_MittraphapGames_2569_LargeType_Detailed_Committee_Index_REVIEW_ONLY.pdf')
RESULTS=Path('/mnt/data/r30e_work/MittraphapGames_2569_R30E_Approved_Results_DRAFT.pdf')
PRIOR=Path('/mnt/data/R30J_MittraphapGames_2569_R30J_Complete_Booklet_Approved_Results_DRAFT.pdf')
OUT=ROOT/'MittraphapGames_2569_R30K_Results_TOC_DRAFT.pdf'
FONT='/usr/share/fonts/truetype/noto/NotoSansThai-Regular.ttf'
FONT_BOLD='/usr/share/fonts/truetype/noto/NotoSansThai-Bold.ttf'
ROOT.mkdir(parents=True,exist_ok=True)
for f,h in [(COMMITTEE,'53cc71e6f189c29813ee3ca2e1e1c67874ca61e01d560c2df4b1c4357bbf99c3'),(RESULTS,'ad581221d821eff51ac507b643cfc02a65b7d0f5117ee4e6954f04af7001f59c'),(PRIOR,'09d57db76433cda6fb31161eaa365abd085fed9b481305b015e2c59a548581c5')]:
 assert f.exists() and hashlib.sha256(f.read_bytes()).hexdigest()==h,f'Wrong or absent source file: {f.name}'

SPORTS=[('ฟุตบอล',6,50),('ยิงจุดโทษ',9,53),('ฟุตซอล',10,55),('วอลเลย์บอล',15,57),('เซปักตะกร้อ',23,60),('เปตอง',31,63),('เทเบิลเทนนิส',41,68),('ชักเย่อ',45,70)]
# New combined page: R30-E source page 6 becomes page 51 in R30-K.
def combined(src_page):return src_page+45
RESULT_LINKS=[('ฟุตบอล',6,[50]),('ฟุตซอล',5,[55]),('วอลเลย์บอล',6,[57]),('เซปักตะกร้อ',8,[60]),('เปตอง',10,[63,65,66]),('เทเบิลเทนนิส',8,[68])]
ATHLETICS=[('ปฐมวัย',76),('8 ปี',79),('10 ปี',81),('12 ปี',83),('มัธยม',86)]
# 1st track result page per age, see results snapshot and page text.
NO_RESULTS=['ยิงจุดโทษ','ชักเย่อ']

BASE_CSS=f'''@page{{size:A4;margin:0}}@font-face{{font-family:Noto;src:url("file://{FONT}")}}
@font-face{{font-family:Noto;src:url("file://{FONT_BOLD}");font-weight:700}}
html,body{{margin:0;padding:0;font-family:Noto,sans-serif;color:#143b5a}}
.top{{position:absolute;top:0;left:0;width:100%;height:14pt;background:#133957}}
.gold{{position:absolute;top:14pt;left:0;width:100%;height:3pt;background:#b78c40}}
.title{{position:absolute;top:43pt;left:48pt;font-size:22pt;font-weight:700;line-height:30pt}}
.subtitle{{position:absolute;top:83pt;left:48pt;font-size:10pt;color:#536c7e}}
.notice{{position:absolute;top:116pt;left:48pt;width:500pt;box-sizing:border-box;background:#f4efe4;border-left:4pt solid #bb914a;padding:10pt 14pt;font-size:9.6pt;line-height:17pt}}
.footer{{position:absolute;left:48pt;top:810pt;width:500pt;font-size:8pt;color:#597183;border-top:0.5pt solid #d7e0e7;padding-top:6pt}}
'''

def render_html(content, output):
 HTML(string=content,base_url=str(ROOT)).write_pdf(str(output))
 with fitz.open(output) as d:assert len(d)==1

def old_contents_html():
 rows=''
 for i,(name,bracket,table) in enumerate(SPORTS):
  y=205+i*54
  bg='#f4f7fa' if i%2==0 else '#fff'
  rows+=f'''<div class="sportrow" style="top:{y}pt;background:{bg};"><div class="name">{escape(name)}</div><div class="bracket">ผังหน้า {combined(bracket)}</div><div class="table">ตารางหน้า {combined(table)}</div></div>'''
 return f'''<!DOCTYPE html><html lang="th"><meta charset="utf-8"/><style>{BASE_CSS}
 .hrow{{position:absolute;top:183pt;font-size:10pt;font-weight:700;color:#8b5a1e}}
 .sportrow{{position:absolute;left:48pt;width:500pt;height:43pt;border-bottom:.6pt solid #dce4e8;box-sizing:border-box;font-size:11pt}}
 .sportrow .name{{position:absolute;left:13pt;top:8pt;font-weight:700}}
 .sportrow .bracket{{position:absolute;left:237pt;top:8pt;color:#14628b;font-size:10pt}}
 .sportrow .table{{position:absolute;left:364pt;top:8pt;color:#14628b;font-size:10pt}}
 .track{{position:absolute;top:650pt;left:48pt;width:500pt;height:42pt;background:#e9f0f5;border-left:4pt solid #133957;padding:7pt 13pt;box-sizing:border-box;font-size:11pt;font-weight:700}}
 .resultbutton{{position:absolute;top:707pt;left:48pt;width:500pt;height:39pt;box-sizing:border-box;border:1pt solid #b78c40;background:#fff8eb;color:#123a59;font-size:12pt;font-weight:700;padding:6pt 15pt}}
 .bottom{{position:absolute;top:773pt;left:48pt;font-size:8.5pt;color:#597183}}
 </style><body><div class="top"></div><div class="gold"></div>
 <div class="title">สารบัญการแข่งขันและผลรับรอง</div>
 <div class="subtitle">มิตรภาพเกมส์ 2569 • สูจิบัตรฉบับรวม • หน้า 49 / 138</div>
 <div class="notice">ผลรับรองในเล่ม: <b>43 คู่</b> และกรีฑา <b>40 รายการ</b> (109 ช่องอันดับ)<br/>ผลที่ยังไม่รับรองเว้นไว้ และสถานะตาราง/ผังต้องตรวจแยกจากผลการแข่งขัน</div>
 <div class="hrow" style="left:60pt">ชนิดกีฬา</div><div class="hrow" style="left:286pt">เปิดผังการแข่งขัน</div><div class="hrow" style="left:407pt">เปิดตาราง/ผล</div>
 {rows}
 <div class="track">กรีฑา — ตารางลู่และอันดับที่รับรองแล้ว (เริ่มหน้า {combined(73)})</div>
 <div class="resultbutton">เปิดสารบัญผลรับรองแยกตามกีฬาและรุ่นอายุ — หน้า 50</div>
 <div class="bottom">กลับสารบัญคณะกรรมการ (หน้า 3) · ผลรับรองในเล่มถึง 17 พฤศจิกายน 2569</div>
 <div class="footer">ฉบับตรวจร่าง · ผลเฉพาะแถวที่ระบุ “ผลรับรอง” เท่านั้น</div>
 </body></html>'''

def results_toc_html():
 rows=''
 for i,(name,count,pages) in enumerate(RESULT_LINKS):
  y=222+i*43
  bgcolor='#f4f7fa' if i%2==0 else '#fff'
  pn=', '.join(str(combined(p)) for p in pages)
  rows+=f'''<div class="resultrow" style="top:{y}pt;background:{bgcolor}"><span class="sport">{escape(name)}</span><span class="count">{count} คู่</span><span class="page">{('หน้าที่ '+pn) if len(pages)>1 else ('หน้า '+pn)}</span></div>'''
 ages=''
 for i,(name,page) in enumerate(ATHLETICS):
  left=48+i*101
  ages+=f'''<div class="age" style="left:{left}pt"><span>{name}</span><small>หน้า {combined(page)}</small></div>'''
 return f'''<!DOCTYPE html><html lang="th"><meta charset="utf-8"/><style>{BASE_CSS}
 .h1{{position:absolute;left:48pt;top:190pt;font-size:12pt;font-weight:700;color:#82551e}}
 .resultrow{{position:absolute;left:48pt;width:500pt;height:40pt;border-bottom:.6pt solid #dce4e8;box-sizing:border-box;font-size:11.4pt}}
 .resultrow span{{position:absolute;top:8pt}}
 .sport{{left:14pt;font-weight:700}}.count{{left:240pt;color:#53697c}}.page{{right:18pt;color:#15618c;font-weight:700}}
 .notyet{{position:absolute;top:489pt;left:48pt;width:500pt;background:#f1f4f6;border-left:3pt solid #8d9eaa;box-sizing:border-box;padding:9pt 12pt;font-size:9.7pt;line-height:16pt;color:#536b7c}}
 .athh{{position:absolute;top:563pt;left:48pt;font-size:12pt;font-weight:700;color:#82551e}}
 .age{{position:absolute;top:603pt;width:95pt;height:63pt;background:#e9f0f5;border:1pt solid #cedde6;box-sizing:border-box;border-radius:4pt;text-align:center;padding:7pt 1pt;font-size:10.8pt;font-weight:700;color:#133957}}
 .age small{{display:block;font-size:9.5pt;color:#13608b;font-weight:400}}
 .hint{{position:absolute;top:689pt;left:48pt;width:500pt;font-size:9.4pt;line-height:16pt;color:#536b7c}}
 .back1{{position:absolute;top:757pt;left:48pt;background:#133957;color:#fff;padding:6pt 16pt;font-size:9.5pt;border-radius:3pt}}
 .back2{{position:absolute;top:757pt;left:270pt;background:#e9f0f5;color:#123957;padding:6pt 16pt;font-size:9.5pt;border-radius:3pt}}
 </style><body>
 <div class="top"></div><div class="gold"></div>
 <div class="title">สารบัญผลการแข่งขันที่ผ่านการรับรอง</div>
 <div class="subtitle">มิตรภาพเกมส์ 2569 · เปิดผลตามชนิดกีฬาและรุ่นอายุ · หน้า 50 / 138</div>
 <div class="notice">ข้อมูลถึง 17 พ.ย. 2569: <b>43 คู่</b> และ <b>กรีฑา 40 รายการ</b> (109 ช่องอันดับ)<br/>กดชื่อกีฬาหรือเลขหน้าเพื่อดูผลที่ผ่านการรับรองโดยตรง</div>
 <div class="h1">ผลการแข่งขันรายคู่</div>{rows}
 <div class="notyet">ยิงจุดโทษ และชักเย่อ: ยังไม่มีผลการแข่งขันที่ผ่านการรับรองในไฟล์ฉบับนี้</div>
 <div class="athh">ผลกรีฑา — เลือกรุ่นอายุเพื่อเปิดรายการที่มีอันดับรับรอง</div>{ages}
 <div class="hint">รายการกรีฑามีอันดับที่รับรองแล้วตามข้อมูลต้นทาง ไม่เติมอันดับที่ไม่มีผลรับรอง และไม่ถือว่าวันเวลา/ผังที่เป็นร่างได้รับการยืนยันจากการมีผลแข่งขัน</div>
 <div class="back1">กลับสารบัญการแข่งขัน — หน้า 49</div><div class="back2">กลับสารบัญหลัก — หน้า 3</div>
 <div class="footer">ฉบับตรวจร่าง · ลิงก์ภายในสามารถเปิดใช้ในโปรแกรมอ่าน PDF ที่รองรับ</div>
 </body></html>'''

idx1=ROOT/'toc_competition_r30k.html';idx2=ROOT/'toc_results_r30k.html'
idx1.write_text(old_contents_html(),encoding='utf-8');idx2.write_text(results_toc_html(),encoding='utf-8')
render_html(idx1.read_text(encoding='utf-8'),ROOT/'toc_competition_r30k.pdf')
render_html(idx2.read_text(encoding='utf-8'),ROOT/'toc_results_r30k.pdf')

def add_link(page,rect,page_number):
 page.insert_link({'kind':fitz.LINK_GOTO,'from':fitz.Rect(*rect),'page':page_number-1})

def footer_replace(p,number,total):
 orig=[]
 for b in p.get_text('dict')['blocks']:
  for line in b.get('lines',[]):
   for span in line.get('spans',[]):
    if re.fullmatch(r'\d{2}\s*/\s*\d{2,3}',span['text'].strip()) and span['bbox'][1]>802:
     orig.append(fitz.Rect(span['bbox']))
 if number>1 and len(orig)!=1: raise RuntimeError(f'Missing or duplicate footer on {number}: {orig}')
 if not orig:return
 rect=orig[0]
 # Redact one page-number token, not adjacent text/table data.
 blot=fitz.Rect(rect.x0-3,rect.y0-1,min(rect.x1+24,rect.x0+70),rect.y1+3)
 p.add_redact_annot(blot,fill=(1,1,1));p.apply_redactions(images=0,graphics=0,text=0)
 p.insert_text((rect.x0,rect.y1-1.2),f'{number:02d} / {total}',fontsize=8.3,fontname='helv',color=(0.25,0.36,0.45))

with fitz.open(COMMITTEE) as d,fitz.open(RESULTS) as src:
 assert len(d)==48 and len(src)==94
 old_toc=d.get_toc()
 for path in (ROOT/'toc_competition_r30k.pdf',ROOT/'toc_results_r30k.pdf'):
  with fitz.open(path) as extra:d.insert_pdf(extra,links=False,annots=False)
 d.insert_pdf(src,from_page=5,to_page=92,links=False,annots=False)
 assert len(d)==138
 p=d[48]
 for i,(_,bp,tp) in enumerate(SPORTS):
  y=205+i*54
  add_link(p,(280,y+2,399,y+42),combined(bp));add_link(p,(400,y+2,548,y+42),combined(tp))
 add_link(p,(48,650,548,692),combined(73))
 add_link(p,(48,707,548,746),50)
 add_link(p,(48,768,351,795),3)
 # Results index: one or more directly clickable pages with approved results.
 p=d[49]
 for i,(_,_,pages) in enumerate(RESULT_LINKS):
  y=222+i*43
  if len(pages)==1: add_link(p,(48,y,548,y+40),combined(pages[0]))
  else:
   add_link(p,(48,y,390,y+40),combined(pages[0]))
   # 3 narrow destinations for rows with results spread across 3 pages.
   for j,pn in enumerate(pages):add_link(p,(400+j*48,y+2,444+j*48,y+38),combined(pn))
 for i,(_,pn) in enumerate(ATHLETICS):add_link(p,(48+i*101,603,143+i*101,666),combined(pn))
 add_link(p,(48,757,264,794),49);add_link(p,(270,757,499,794),3)
 # Page 4: accessible shortcut to both indexes in unused area.
 page4=d[3]
 for top,bottom,color in [(648,684,(.91,.95,.98)),(690,727,(.97,.94,.87))]:
  box=fitz.Rect(54,top,538,bottom);page4.draw_rect(box,fill=color,color=(.68,.78,.85),width=.7,overlay=True)
 nav_markup=f'''<!DOCTYPE html><html lang="th"><meta charset="utf-8"><style>@page{{size:470pt 66pt;margin:0}}
 @font-face{{font-family:Noto;src:url("file://{FONT}")}}body{{font:10.5pt Noto;margin:0;padding:0;color:#133957}}
 .item{{height:33pt;display:flex;align-items:center;padding-left:8pt}}</style><body>
 <div class="item">เปิดตารางแข่งขันและผัง — หน้า 49</div>
 <div class="item">เปิดสารบัญผลการแข่งขันที่รับรอง — หน้า 50</div></body></html>'''
 nav=ROOT/'nav_shortcuts.pdf';render_html(nav_markup,nav)
 with fitz.open(nav) as frag:page4.show_pdf_page(fitz.Rect(65,652,528,723),frag,0,overlay=True,keep_proportion=False)
 add_link(page4,(54,648,538,684),49);add_link(page4,(54,690,538,727),50)
 # All source competition pages retain a back button, destination is R30-K page 49.
 for number in range(51,139):add_link(d[number-1],(482,806,554,835),49)
 for number in list(range(1,49))+list(range(51,139)):footer_replace(d[number-1],number,138)
 # Bookmarks keep original committee refs unchanged and explicitly link result index.
 toc=old_toc+[[1,'การแข่งขันและผลที่ผ่านการรับรอง',49],[2,'สารบัญการแข่งขันและผัง',49],[2,'สารบัญผลการแข่งขันที่รับรอง',50],[2,'ผังการแข่งขัน',51]]
 for name,bp,tp in SPORTS:toc.append([3,'ผัง '+name,combined(bp)])
 toc.append([2,'ตารางแข่งขันรายกีฬา',combined(50)])
 for name,bp,tp in SPORTS:toc.append([3,'ตาราง '+name,combined(tp)])
 toc.append([2,'ผลการแข่งขันที่รับรองแยกกีฬา',50])
 for name,_,pages in RESULT_LINKS:toc.append([3,'ผล'+name,combined(pages[0])])
 toc.append([2,'ผลกรีฑาแยกช่วงอายุ',combined(76)])
 for name,pn in ATHLETICS:toc.append([3,'กรีฑา '+name,combined(pn)])
 d.set_toc(toc)
 d.set_metadata({**d.metadata,'title':'มิตรภาพเกมส์ 2569 สูจิบัตร R30-K สารบัญผลรับรองรายกีฬาและกรีฑา (ตรวจร่าง)','subject':'137-page R30-J content preserved + 1 page approved-result index; draft 138 pages'})
 d.save(str(OUT),garbage=4,deflate=True)
 print(json.dumps({'output':str(OUT),'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),'pages':len(d),'toc':len(d.get_toc()),'links':sum(len(x.get_links()) for x in d)},ensure_ascii=False))

#!/usr/bin/env python3
"""R30-L: early navigation plus 17 new R32 approved match results; preserve unresolved bracket opponents."""
from pathlib import Path
import fitz, re, json, hashlib
from collections import Counter
from weasyprint import HTML
from html import escape

ROOT=Path('/mnt/data/r30l'); ROOT.mkdir(exist_ok=True)
SRC=Path('/mnt/data/R30K_MittraphapGames_2569_R30K_Results_TOC_DRAFT.pdf')
OUT=ROOT/'MittraphapGames_2569_R30L_Front_Indexes_100_Approved_Results_DRAFT.pdf'
FONT='/usr/share/fonts/truetype/noto/NotoSansThai-Regular.ttf'
BOLD='/usr/share/fonts/truetype/noto/NotoSansThai-Bold.ttf'
assert SRC.exists() and hashlib.sha256(SRC.read_bytes()).hexdigest()=='db3feb4a4220c7a6c4b57e0f15cd1c743b4358853f782bb07811029050ef1411'
SPORTS=[('ฟุตบอล',51,95),('ยิงจุดโทษ',54,98),('ฟุตซอล',55,100),('วอลเลย์บอล',60,102),('เซปักตะกร้อ',68,105),('เปตอง',76,108),('เทเบิลเทนนิส',86,113),('ชักเย่อ',90,115)]
RESULT_ROWS=[('ฟุตบอล',13,[95,96]),('ฟุตซอล',9,[100,101]),('วอลเลย์บอล',12,[102,103]),('เซปักตะกร้อ',8,[105]),('เปตอง',10,[108,110,111]),('เทเบิลเทนนิส',8,[113])]
ATH=[('ปฐมวัย',121),('8 ปี',124),('10 ปี',126),('12 ปี',128),('มัธยม',131)]
# Only results whose approved status was confirmed in public.nongkum_published_results and cross-checked with R33 fixture_id and pair names.
# No automatically inferred group ranking or semifinal opponent is inserted without an organizer-approved bracket/standing.
ADDITIONS={
 96:{7:'ผลรับรอง: 2 : 1',8:'ผลรับรอง: 0 : 0',9:'ผลรับรอง: 4 : 0',10:'ผลรับรอง: 3 : 0',11:'ผลรับรอง: 0 : 3',12:'ผลรับรอง: 3 : 0',13:'ผลรับรอง: 3 : 1'},
 101:{6:'ผลรับรอง: 1 : 0',7:'ผลรับรอง: 0 : 2',8:'ผลรับรอง: 3 : 2',9:'ผลรับรอง: 1 : 1'},
 103:{7:'ผลรับรอง: ทุ่งมะสังฯ ชนะ',8:'ผลรับรอง: หนองกระทุ่ม ชนะ',9:'ผลรับรอง: ทุ่งมะสังฯ ชนะ',10:'ผลรับรอง: เสาหงส์ ชนะ',11:'ผลรับรอง: ทุ่งมะสังฯ ชนะ',12:'ผลรับรอง: หนองกระทุ่ม ชนะ'}
}
# R32 order of publication, fixture id, revision, sport/division, known participants, score/winner.
AUDIT=[
 ('volleyball-p11-12-ปี-ชาย-B-010',103,12,'พุพรหม','หนองกระทุ่ม','หนองกระทุ่ม ชนะ'),
 ('volleyball-p11-12-ปี-ชาย-A-009',103,11,'เสาหงส์','ทุ่งมะสังฯ','ทุ่งมะสังฯ ชนะ'),
 ('volleyball-p11-12-ปี-หญิง-B-012',103,10,'เสาหงส์','พุพรหม','เสาหงส์ ชนะ'),
 ('volleyball-p11-12-ปี-หญิง-A-011',103,9,'ทุ่งมะสังฯ','หนองกระทุ่ม','ทุ่งมะสังฯ ชนะ'),
 ('volleyball-p11-12-ปี-ชาย-B-006',103,8,'วังด้ง','หนองกระทุ่ม','หนองกระทุ่ม ชนะ'),
 ('volleyball-p11-12-ปี-ชาย-A-005',103,7,'หนองกุ่ม','ทุ่งมะสังฯ','ทุ่งมะสังฯ ชนะ'),
 ('futsal-p09-10-ปี-ชาย-B-009',101,9,'วังด้ง','ทุ่งมะสังฯ','1 : 1'),
 ('futsal-p09-10-ปี-ชาย-A-007',101,7,'หนองกุ่ม','วังเขาแก้ว','0 : 2'),
 ('futsal-p09-10-ปี-ชาย-A-008',101,8,'พุพรหม','หนองกระทุ่ม','3 : 2'),
 ('futsal-p09-10-ปี-ชาย-B-006',101,6,'เสาหงส์','ทุ่งมะสังฯ','1 : 0'),
 ('football-p07-12-ปี-ชาย-012',96,12,'เสาหงส์','หนองกุ่ม','3 : 0'),
 ('football-p07-12-ปี-ชาย-009',96,9,'หนองกระทุ่ม','วังด้ง','4 : 0'),
 ('football-p07-12-ปี-ชาย-013',96,13,'หนองกระทุ่ม','พุพรหม','3 : 1'),
 ('football-p07-12-ปี-ชาย-011',96,11,'ทุ่งมะสังฯ','วังด้ง','0 : 3'),
 ('football-p07-12-ปี-ชาย-010',96,10,'พุพรหม','หนองกุ่ม','3 : 0'),
 ('football-p07-12-ปี-ชาย-008',96,8,'ทุ่งมะสังฯ','เสาหงส์','0 : 0'),
 ('football-p07-มัธยมหญิง-007',96,7,'หนองกระทุ่ม','ทุ่งมะสังฯ','2 : 1')]

CSS=f'''@page{{size:A4;margin:0}}@font-face{{font-family:ThaiN;src:url("file://{FONT}")}}@font-face{{font-family:ThaiN;src:url("file://{BOLD}");font-weight:700}}html,body{{margin:0;padding:0;color:#143b5a;font-family:ThaiN,sans-serif}}.top{{position:absolute;top:0;left:0;width:100%;height:14pt;background:#133957}}.gold{{position:absolute;top:14pt;left:0;width:100%;height:3pt;background:#bb914a}}.title{{position:absolute;top:43pt;left:48pt;font-size:22pt;font-weight:700;line-height:30pt}}.subtitle{{position:absolute;top:83pt;left:48pt;font-size:10pt;color:#536c7e}}.notice{{position:absolute;top:116pt;left:48pt;width:500pt;box-sizing:border-box;background:#f4efe4;border-left:4pt solid #bb914a;padding:10pt 14pt;font-size:9.6pt;line-height:17pt}}.footer{{position:absolute;left:48pt;top:810pt;width:500pt;font-size:8pt;color:#597183;border-top:.5pt solid #d7e0e7;padding-top:6pt}}'''

def mkhtml(page):
 if page==3:
  rows=''
  for i,(sport,bracket,table) in enumerate(SPORTS):
   y=205+i*54
   rows+=f'<div class="sportrow" style="top:{y}pt;background:{"#f4f7fa" if i%2==0 else "#fff"}"><b style="left:13pt">{sport}</b><span style="left:237pt">ผังหน้า {bracket}</span><span style="left:364pt">ตารางหน้า {table}</span></div>'
  return f'''<!DOCTYPE html><html lang="th"><meta charset="utf-8"><style>{CSS}
.sportrow{{position:absolute;left:48pt;width:500pt;height:43pt;box-sizing:border-box;border-bottom:.6pt solid #dce4e8;font-size:11pt}}.sportrow b,.sportrow span{{position:absolute;top:8pt}}.sportrow span{{color:#13618c;font-size:10pt}}.th{{position:absolute;top:184pt;font-weight:700;font-size:10pt;color:#885b20}}.track{{position:absolute;top:650pt;left:48pt;width:500pt;height:42pt;box-sizing:border-box;background:#e9f0f5;border-left:4pt solid #133957;padding:7pt 13pt;font-size:11pt;font-weight:700}}.resultbutton{{position:absolute;top:707pt;left:48pt;width:500pt;height:39pt;box-sizing:border-box;border:1pt solid #b78c40;background:#fff8eb;color:#123a59;font-size:12pt;font-weight:700;padding:6pt 15pt}}.bottom{{position:absolute;top:773pt;left:48pt;font-size:8.5pt;color:#597183}}
</style><body><div class="top"></div><div class="gold"></div><div class="title">สารบัญการแข่งขันและผลรับรอง</div><div class="subtitle">มิตรภาพเกมส์ 2569 · สูจิบัตรฉบับรวม · หน้า 3 / 138</div><div class="notice"><b>ผลรับรองล่าสุด 60 คู่</b> และกรีฑา <b>40 รายการ</b> (109 ช่องอันดับ) · ข้อมูล ณ 18 พ.ย. 2569 เวลา 17.57 น.<div>สถานะตาราง/ผังแยกจากผลการแข่งขันที่ผ่านการรับรอง</div></div><div class="th" style="left:60pt">ชนิดกีฬา</div><div class="th" style="left:286pt">เปิดผังการแข่งขัน</div><div class="th" style="left:407pt">เปิดตาราง/ผล</div>{rows}<div class="track">กรีฑา — ตารางลู่และอันดับรับรอง (เริ่มหน้า 118)</div><div class="resultbutton">เปิดสารบัญผลรับรองแยกตามกีฬาและรุ่นอายุ — หน้า 4</div><div class="bottom">กลับสารบัญคณะกรรมการ (หน้า 5) · ฉบับตรวจร่าง ยังไม่เผยแพร่เป็นทางการ</div><div class="footer">ผลรับรองแสดงเฉพาะรายการที่ผู้จัดรับรองแล้ว · ผังยังต้องตรวจแยก</div></body></html>'''
 if page==4:
  rows=''
  for i,(sport,num,dests) in enumerate(RESULT_ROWS):
   y=222+i*43
   dests=', '.join(map(str,dests))
   rows+=f'<div class="resultrow" style="top:{y}pt;background:{"#f4f7fa" if i%2==0 else "#fff"}"><b>{sport}</b><span class="count">{num} คู่</span><span class="page">หน้า {dests}</span></div>'
  ages=''
  for i,(name,num) in enumerate(ATH):
   ages+=f'<div class="age" style="left:{48+i*101}pt">{name}<small>หน้า {num}</small></div>'
  return f'''<!DOCTYPE html><html lang="th"><meta charset="utf-8"><style>{CSS}
.h1{{position:absolute;top:190pt;left:48pt;font-size:12pt;font-weight:700;color:#82551e}}.resultrow{{position:absolute;left:48pt;width:500pt;height:40pt;box-sizing:border-box;border-bottom:.6pt solid #dce4e8;font-size:11.4pt}}.resultrow b{{position:absolute;top:8pt;left:14pt}}.resultrow .count{{position:absolute;top:8pt;left:235pt;color:#53697c}}.resultrow .page{{position:absolute;top:8pt;right:18pt;color:#15618c;font-weight:700;font-size:10.7pt}}.notyet{{position:absolute;top:489pt;left:48pt;width:500pt;background:#f1f4f6;border-left:3pt solid #8d9eaa;box-sizing:border-box;padding:9pt 12pt;font-size:9.7pt;line-height:16pt;color:#536b7c}}.athh{{position:absolute;top:563pt;left:48pt;font-size:12pt;font-weight:700;color:#82551e}}.age{{position:absolute;top:603pt;width:95pt;height:63pt;background:#e9f0f5;border:1pt solid #cedde6;box-sizing:border-box;border-radius:4pt;text-align:center;padding:7pt 1pt;font-size:10.8pt;font-weight:700;color:#133957}}.age small{{display:block;color:#13608b;font-size:9.5pt;font-weight:400}}.hint{{position:absolute;top:685pt;left:48pt;width:500pt;font-size:9.4pt;line-height:16pt;color:#536b7c}}.back1{{position:absolute;top:757pt;left:48pt;background:#133957;color:#fff;padding:6pt 16pt;font-size:9.5pt;border-radius:3pt}}.back2{{position:absolute;top:757pt;left:270pt;background:#e9f0f5;color:#133957;padding:6pt 16pt;font-size:9.5pt;border-radius:3pt}}
</style><body><div class="top"></div><div class="gold"></div><div class="title">สารบัญผลการแข่งขันที่ผ่านการรับรอง</div><div class="subtitle">มิตรภาพเกมส์ 2569 · เลือกผลกีฬาและรุ่นอายุ · หน้า 4 / 138</div><div class="notice"><b>ผลรับรองล่าสุด ณ 18 พ.ย. 2569 เวลา 17.57 น.</b> จำนวน <b>60 คู่</b> และกรีฑา <b>40 รายการ</b><div>กดชื่อกีฬาหรือเลขหน้าเพื่อไปยังผลที่ผ่านการรับรองโดยตรง</div></div><div class="h1">ผลการแข่งขันรายคู่</div>{rows}<div class="notyet">ยิงจุดโทษและชักเย่อ: ยังไม่มีผลการแข่งขันที่ผ่านการรับรองในเล่มนี้</div><div class="athh">ผลกรีฑา — เลือกรุ่นอายุ</div>{ages}<div class="hint">อันดับกรีฑาแสดงเฉพาะผลรับรอง ส่วนชื่อคู่รอบรองจากอันดับกลุ่มยังรอการยืนยันผู้เข้ารอบ ไม่คาดเดาจากคะแนนเพียงอย่างเดียว</div><div class="back1">กลับสารบัญการแข่งขัน — หน้า 3</div><div class="back2">กลับสารบัญกรรมการ — หน้า 5</div><div class="footer">เอกสารฉบับตรวจร่าง · ข้อมูลตาราง/ผังไม่ได้รับรองตามผลโดยอัตโนมัติ</div></body></html>'''
 raise ValueError(page)

for n in (3,4):
 (ROOT/f'index_{n}.html').write_text(mkhtml(n),encoding='utf-8')
 HTML(string=mkhtml(n),base_url=str(ROOT)).write_pdf(ROOT/f'index_{n}.pdf')

def add_link(p,box,target):
 p.insert_link({'kind':fitz.LINK_GOTO,'from':fitz.Rect(*box),'page':target-1})

def clear_links(p):
 # Handle page internal only: page has already undergone doc.select() remapping.
 for link in list(p.get_links()):p.delete_link(link)

def bg_at(p,rect):
 # Sample the colored panel 4pt left of digits (so no ink), then use exact panel background.
 pix=p.get_pixmap(matrix=fitz.Matrix(1,1),alpha=False)
 xx=int(max(0,min(p.rect.width-1,rect.x0-7))); yy=int(max(0,min(p.rect.height-1,(rect.y0+rect.y1)/2)))
 rgb=pix.pixel(xx,yy)
 return tuple(t/255 for t in rgb[:3])

def change_digits(p,pageno,selector):
 # Capture every original link and restore after redacting numbers to keep clickable TOC.
 orig=[]
 for l in p.get_links():
  if l['kind']==fitz.LINK_GOTO:orig.append((l['from'],l['page'],l.get('to')))
 clear_links(p)
 repairs=[]
 for b in p.get_text('dict')['blocks']:
  for ln in b.get('lines',[]):
   for s in ln.get('spans',[]):
    t=s['text'].strip();r=fitz.Rect(s['bbox']);val=selector(t,r)
    if val is None:continue
    rect=fitz.Rect(r.x0-1,r.y0-.7,r.x1+1,r.y1+.7)
    color=bg_at(p,r)
    p.add_redact_annot(rect,fill=color)
    repairs.append((r,val))
 if repairs:p.apply_redactions(images=0,graphics=0,text=0)
 for r,val in repairs:
  p.insert_text((r.x0,r.y1-3.0),val,fontname='hebo',fontsize=11.0,color=(.085,.275,.414),overlay=True)
 for r,t,to in orig:
  payload={'kind':fitz.LINK_GOTO,'from':r,'page':t}
  if isinstance(to,fitz.Point):payload['to']=to
  p.insert_link(payload)
 return len(repairs)

def number_rule_page5(t,r):
 if not re.fullmatch(r'\d{2}',t):return None
 # 2-column major index rows and committee numbers, not section ordinal labels.
 x=r.x0;y=r.y0
 if (255<x<285 and 150<y<730) or (510<x<544 and 150<y<730):
  if x<283 and y<310 and t=='02':return None
  return f'{int(t)+2:02d}'
 return None

def number_rule_page6(t,r):
 if not re.fullmatch(r'\d{1,2}',t):return None
 x=r.x0;y=r.y0
 if 255<x<285 and 200<y<590:return f'{int(t)+2:02d}'
 if 520<x<546 and 200<y<610:return f'{int(t)+2:02d}'
 if 195<x<270 and 650<y<730 and t in ('49','50'):
  return '03' if t=='49' else '04'
 return None

def fix_footer(p,page_number):
 if page_number in (1,3,4):return False
 found=[]
 for b in p.get_text('dict')['blocks']:
  for ln in b.get('lines',[]):
   for s in ln.get('spans',[]):
    if re.fullmatch(r'\d{2}\s*/\s*138',s['text'].strip()) and s['bbox'][1]>798:found.append(fitz.Rect(s['bbox']))
 if len(found)!=1:
  # Page 2 footer is commonly included; fail rather than silently losing page numbers.
  raise RuntimeError(f'footer missing/duplicate page {page_number}: {found}')
 r=found[0]
 p.add_redact_annot(fitz.Rect(r.x0-2,r.y0-.9,r.x1+2,r.y1+2),fill=(1,1,1))
 p.apply_redactions(images=0,graphics=0,text=0)
 p.insert_text((r.x0,r.y1-1.5),f'{page_number:02d} / 138',fontsize=8.3,fontname='helv',color=(.24,.35,.45),overlay=True)
 return True

with fitz.open(SRC) as d:
 assert len(d)==138
 d.select([0,1,48,49]+list(range(2,48))+list(range(50,138)))
 assert len(d)==138
 # Clear and replace both old indices, keeping every other page untouched.
 for target in (3,4):
  p=d[target-1];clear_links(p)
  p.add_redact_annot(p.rect,fill=(1,1,1));p.apply_redactions(images=2,graphics=1,text=0)
  with fitz.open(ROOT/f'index_{target}.pdf') as temp:
   assert len(temp)==1
   p.show_pdf_page(p.rect,temp,0,overlay=True,keep_proportion=False)
 p=d[2]
 for i,(_,bracket,table) in enumerate(SPORTS):
  y=205+i*54
  add_link(p,(280,y+2,399,y+42),bracket);add_link(p,(400,y+2,548,y+42),table)
 add_link(p,(48,650,548,692),118);add_link(p,(48,707,548,746),4);add_link(p,(48,768,351,795),5)
 p=d[3]
 for i,(_,_,pages) in enumerate(RESULT_ROWS):
  y=222+i*43
  if len(pages)==1:add_link(p,(48,y,548,y+40),pages[0])
  else:
   add_link(p,(48,y,360,y+40),pages[0])
   step=180/len(pages)
   for j,number in enumerate(pages):add_link(p,(360+j*step,y+1,360+(j+1)*step,y+39),number)
 for i,(_,pn) in enumerate(ATH):add_link(p,(48+i*101,603,143+i*101,666),pn)
 add_link(p,(48,757,265,794),3);add_link(p,(270,757,499,794),5)
 # Correct the committee indices (formerly 3/4, now 5/6), while retaining links.
 change_digits(d[4],5,number_rule_page5)
 change_digits(d[5],6,number_rule_page6)
 for n in list(range(2,3))+list(range(5,51)):
  fix_footer(d[n-1],n)
 # Create new results as transparent PDF overlays; no original schedule/score cell is overwritten.
 for n,labels in ADDITIONS.items():
  p=d[n-1];words=p.get_text('words');items=[]
  for num,caption in sorted(labels.items()):
   candidates=[w for w in words if w[4]==str(num) and 48<w[0]<69 and 220<w[1]<620]
   if len(candidates)!=1:raise RuntimeError(f'Row ambiguous page {n} pair {num}: {candidates}')
   rowtop=candidates[0][1]
   items.append((num,round(rowtop+10,1),caption))
  # Result label coordinates follow original R30-E labels, offset ~10pt below main row.
  tags=''.join(f'<div class="outcome" style="top:{y}pt">{escape(caption)}</div>' for _,y,caption in items)
  html=f'''<!DOCTYPE html><html lang="th"><meta charset="utf-8"><style>@page{{size:A4;margin:0}}@font-face{{font-family:Noto;src:url("file://{FONT}")}}@font-face{{font-family:Noto;src:url("file://{BOLD}");font-weight:700}}html,body{{margin:0;background:transparent}}.outcome{{position:absolute;left:212.4pt;font-family:Noto;font-weight:700;font-size:7.2pt;white-space:nowrap;color:#976f24}}</style><body>{tags}</body></html>'''
  (ROOT/f'approved_labels_page{n}.html').write_text(html,encoding='utf-8')
  overlay=ROOT/f'approved_labels_page{n}.pdf';HTML(string=html,base_url=str(ROOT)).write_pdf(overlay)
  with fitz.open(overlay) as fragment:
   p.show_pdf_page(p.rect,fragment,0,keep_proportion=False,overlay=True)
 # Fix outdated executive text in place, as old booklet says competition tables exist only on website.
 p=d[1]
 old='เล่มนี้เน้นกําหนดการพิธี สีประจําโรงเรียน ประกาศ และข้อมูลกรรมการ ส่วนผังและตารางการแข่งขันเปิดดูผ่านเว็บไซต์'
 arr=p.search_for(old)
 if len(arr)==1:
  r=arr[0];p.add_redact_annot(fitz.Rect(r.x0-1,r.y0-2,548,r.y1+2),fill=(1,1,1));p.apply_redactions(images=0,graphics=0,text=0)
  exec_html=f'''<!DOCTYPE html><html lang="th"><meta charset="utf-8"><style>@page{{size:A4;margin:0}}@font-face{{font-family:Noto;src:url("file://{FONT}")}}html,body{{margin:0;background:transparent}}.x{{position:absolute;left:62pt;top:413pt;font:8.8pt Noto;color:#143b5a}}</style><body><div class="x">เล่มรวมมีพิธีการ กรรมการ ผัง ตาราง และผลรับรอง 60 คู่กับกรีฑา 40 รายการ (ณ 18 พ.ย. 2569)</div></body></html>'''
  q=ROOT/'executive_update.pdf';HTML(string=exec_html,base_url=str(ROOT)).write_pdf(q)
  with fitz.open(q) as overlay:p.show_pdf_page(p.rect,overlay,0,overlay=True,keep_proportion=False)
 # Small safe status note: original 2 still DRAFT even though approved scores are embedded.
 # Preserve existing issued notes and references to avoid rewriting source announcements.
 toc=[[1,'ปก — มิตรภาพเกมส์ 2569',1],[1,'บทสรุปผู้บริหาร',2],[1,'สารบัญผังและตารางแข่งขัน',3],[1,'สารบัญผลรับรองตามชนิดกีฬา',4],[1,'สารบัญคณะกรรมการ 20 ชุด',5],[1,'สารบัญกรรมการแยกชนิดกีฬา',6]]
 for lev,label,pn in d.get_toc():
  if pn in (1,2,3,4,5,6):continue
  toc.append([min(lev,2),label,pn])
 # Add clear direct bookmarks for new approved results, including all 17 new entries.
 for s,count,pages in RESULT_ROWS:
  toc.append([1,'ผลรับรองล่าสุด — '+s,pages[0]])
  for j,v in enumerate(pages[1:],1):toc.append([2,'ผล'+s+' (ต่อ '+str(j)+')',v])
 toc.append([1,'ผลกรีฑา 40 รายการ',121])
 d.set_toc(toc)
 d.set_metadata({**d.metadata,'title':'มิตรภาพเกมส์ 2569 — R30-L สารบัญหน้า 3–4 และผลรับรอง 100 รายการ (ฉบับตรวจร่าง)','subject':'60 match approved results +40 athletics; previous 83 preserved and 17 new approved; draft schedule/brackets remain separate'})
 d.save(str(OUT),garbage=4,deflate=True)

with fitz.open(OUT) as d:
 links=[]
 for i,p in enumerate(d):
  for l in p.get_links():
   if l['kind']==fitz.LINK_GOTO:links.append((i+1,l['page']+1))
 print(json.dumps({'output':str(OUT),'bytes':OUT.stat().st_size,'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),'pages':len(d),'links':len(links),'toc':len(d.get_toc()),'results_count':sum(d[i].get_text().count('ผลรับรอง:') for i in range(50,138)),'athletics_tags':sum(len(re.findall(r'(?m)^ผลรับรอง$',d[i].get_text())) for i in range(50,138)),'frontlinks':links[:45]},ensure_ascii=False))
(ROOT/'new_results_audit.json').write_text(json.dumps([{'fixture_id':f,'pdf_page':n,'pair':pair,'team_a':a,'team_b':b,'approved_result':val,'revision':1,'published_date':'2026-11-18'} for f,n,pair,a,b,val in AUDIT],ensure_ascii=False,indent=2),encoding='utf-8')

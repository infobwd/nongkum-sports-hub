#!/usr/bin/env python3
"""R30I: readable reflow of R30H committee directory + detailed clickable sub-TOC.
Source data: PyMuPDF extracted from immutable R30H PDF (250 verified assignments).
REVIEW ONLY; source R30H preserved in Google Drive.
"""
import fitz, pathlib, json, re, html, hashlib, io, os
from weasyprint import HTML
from PIL import Image
from collections import Counter
BASE=pathlib.Path('/mnt/data')
SRC=BASE/'R30H_MittraphapGames_2569_Clickable_20_Committee_TOC_44pages_REVIEW_ONLY.pdf'
OUT=BASE/'R30I_MittraphapGames_2569_LargeType_Detailed_Committee_Index_REVIEW_ONLY.pdf'
DATA=json.load(open(BASE/'r30i_records.json'))
D={int(k):v for k,v in DATA.items()}
TITLES=[
'คณะกรรมการอำนวยการแข่งขัน','คณะกรรมการจัดการแข่งขัน','คณะกรรมการฝ่ายต้อนรับ','คณะกรรมการฝ่ายประชาสัมพันธ์',
'คณะกรรมการฝ่ายรักษาความปลอดภัย','คณะกรรมการฝ่ายปฐมพยาบาล','คณะกรรมการฝ่ายบริการ',
'ฝ่ายจัดเตรียมสถานที่และสนามแข่งขัน','คณะกรรมการฝ่ายงบประมาณและการเงิน','คณะกรรมการฝ่ายจัดรางวัล/จัดพิมพ์วุฒิบัตร',
'คณะกรรมการฝ่ายบันทึกผลการแข่งขันกีฬาและกรีฑา','คณะกรรมการจัดทำสูจิบัตรและถ่ายรูปนักกีฬา',
'คณะกรรมการจัดทำแฟ้มหลักฐานนักกีฬาประเภทต่าง ๆ','คณะกรรมการตรวจสอบหลักฐานและกรรมการตัดสินกีฬาประจำสนามแข่งขัน',
'คณะกรรมการตรวจสอบคุณสมบัตินักกรีฑา','คณะกรรมการตัดสินกรีฑาประเภทลู่ / ปล่อยตัว',
'คณะกรรมการประจำเส้นชัย','คณะกรรมการประจำหมุด','คณะกรรมการฝ่ายจัดส่งตัวนักกรีฑา',
'คณะกรรมการฝ่ายจัดขบวนพาเหรดและตัดสินขบวนพาเหรด']
SPORTS=[('ฟุตบอล',9),('ฟุตซอล',4),('วอลเลย์บอล',4),('เซปักตะกร้อ',4),('เปตอง',13),('เทเบิลเทนนิส 12 ปี ชาย–หญิง',6),('เทเบิลเทนนิส มัธยม ชาย–หญิง',3),('ชักเย่อ',5)]
AGES=[('อนุบาล',8),('ประถม 8 ปี',5),('ประถม 10 ปี',6),('ประถม 12 ปี',6),('มัธยม',5)]
EXPECTED=[21,17,9,5,2,2,15,18,5,15,8,10,9,48,31,5,6,3,13,8]
assert sum(EXPECTED)==250 and [len(D[i]) for i in range(1,21)]==EXPECTED
FONT='/usr/share/fonts/truetype/noto/NotoSansThai-Regular.ttf'
BOLD='/usr/share/fonts/truetype/noto/NotoSansThai-Bold.ttf'
if not os.path.isfile(BOLD): BOLD='/usr/share/fonts/truetype/noto/NotoSansThai-SemiBold.ttf'
NAT='https://infobwd.github.io/nongkum-sports-hub/'
source=fitz.open(SRC)
assert len(source)==44

def E(s):return html.escape(str(s),quote=True)

# Grouped source row layout. We break by committee and subcategory instead of shrinking fonts.
body=[]
source_breaks={14:[],15:[]}
for n in range(1,21):
 rows=D[n]
 body.append(f'<section class="group{" major" if n in [1,8,14,15] else ""}"><div class="chapter" id="group{n:02d}"><span class="section-no">คณะกรรมการชุดที่ {n:02d}</span><h2>{E(TITLES[n-1])}</h2><p>{len(rows)} รายการมอบหมายจากบัญชีฉบับตรวจร่าง · ตรวจชื่อและสังกัดก่อนประกาศใช้</p></div>')
 if n==14:
  k=0
  for j,(label,cnt) in enumerate(SPORTS,1):
   key=f'sport{j}'
   body.append(f'<h3 id="{key}" class="subheading">กีฬา {E(label)} <small>{cnt} รายการ</small></h3>')
   body.extend('ROW:'+str(n)+':'+str(k+i) for i in range(cnt))
   k+=cnt
  assert k==len(rows)
 elif n==15:
  body.append('<h3 class="subheading">ประธานคณะกรรมการ</h3>')
  body.append('ROW:15:0')
  k=1
  for j,(label,cnt) in enumerate(AGES,1):
   body.append(f'<h3 id="age{j}" class="subheading">กลุ่มอายุ {E(label)} <small>{cnt} รายการ</small></h3>')
   body.extend('ROW:15:'+str(k+i) for i in range(cnt))
   k+=cnt
  assert k==len(rows)
 elif n==10:
  body.append('<h3 class="subheading">ฝ่ายจัดรางวัลและจัดพิมพ์วุฒิบัตร</h3>')
  body.extend('ROW:10:'+str(i) for i in range(9))
  body.append('<h3 id="medalteam" class="subheading">ฝ่ายเชิญเหรียญและถ้วยรางวัล <small>6 รายการ</small></h3>')
  body.extend('ROW:10:'+str(i) for i in range(9,len(rows)))
 else:body.extend('ROW:'+str(n)+':'+str(i) for i in range(len(rows)))
 body.append('</section>')

def render_row(n,i):
 r=D[n][i]
 c=r['code']
 # Section 15 source has no distinct numbers; no guessing.
 if n==15 and c=='—':c='—'
 # Show source's obvious truncation as-is, not a silently invented correction.
 return f'''<div class="person">
 <div class="person-top"><span class="person-code">{E(c)}</span><span class="person-name">{E(r['name'])}</span><span class="person-role">{E(r['role'])}</span></div>
 <div class="person-school">{E(r['school'])}</div>
 </div>'''
content='\n'.join(render_row(int(s.split(':')[1]),int(s.split(':')[2])) if s.startswith('ROW:') else s for s in body)
css=f'''@font-face{{font-family:Thai;src:url(file://{FONT})}} @font-face{{font-family:Thai;src:url(file://{BOLD});font-weight:700}}
@page{{size:A4;margin:57pt 42pt 57pt 42pt;
  @top-left{{content:"มิตรภาพเกมส์ 2569  ·  คณะกรรมการ";font:8.5pt Thai;color:#56748c}}
  @top-right{{content:"ฉบับตรวจร่าง · R30I";font:8.5pt Thai;color:#92702a}}
}}
*{{box-sizing:border-box}}
html,body{{font-family:Thai,sans-serif;color:#153c59;background:#fff;margin:0;padding:0;}}
section.group{{break-before:auto;}}
section.group.major{{break-before:page;}}
section.group:first-child{{break-before:auto}}
.chapter{{padding:8pt 0 14pt;border-bottom:2pt solid #b58c49;margin-bottom:15pt;break-after:avoid;break-inside:avoid;}}
.section-no{{color:#986b24;font-size:10pt;font-weight:700}}
h2{{font-size:19pt;line-height:1.5;margin:2pt 0 5pt;font-weight:700;overflow-wrap:anywhere}}
.chapter p{{font-size:9.4pt;line-height:1.6;color:#526c7c;margin:3pt 0}}
h3.subheading{{font-size:12pt;line-height:1.55;margin:18pt 0 7pt;padding:6pt 9pt;background:#e9f1f6;border-left:3pt solid #b58c49;break-after:avoid;font-weight:700}}
h3 small{{font-size:9pt;color:#50738b;font-weight:400}}
.person{{border-bottom:1px solid #dce5e9;padding:7pt 7pt 8pt 7pt;break-inside:avoid;}}
.person:nth-of-type(2n){{background:#f6f8f9}}
.person-top{{display:flex;align-items:flex-start;gap:9pt;line-height:1.5;}}
.person-code{{font-size:10.2pt;min-width:49pt;max-width:70pt;color:#a67728;font-weight:700;padding-top:1pt;}}
.person-name{{font-size:11.5pt;font-weight:700;flex:1;min-width:140pt;overflow-wrap:anywhere;}}
.person-role{{font-size:9.8pt;color:#173e58;max-width:106pt;text-align:right;line-height:1.5;}}
.person-school{{font-size:10.3pt;color:#445b6e;line-height:1.55;padding-left:58pt;margin-top:1pt;overflow-wrap:anywhere;}}
'''
dir_html=f'<html lang="th"><meta charset="utf-8"><style>{css}</style><body>{content}</body></html>'
(BASE/'R30I_directory_source.html').write_text(dir_html,encoding='utf8')
dir_pdf=BASE/'r30i_directory.pdf';HTML(string=dir_html,base_url=str(BASE)).write_pdf(str(dir_pdf))
directory=fitz.open(dir_pdf)
print('directory pages',len(directory))
# Resolve headings for each committee and sport/age category from the new actual typeset pages.
def locate(doc,term,default_idx=None):
 for i,p in enumerate(doc):
  boxes=p.search_for(term)
  if boxes:return i,boxes[0].y0
 if default_idx is not None:return default_idx,64
 raise ValueError('Unresolved text navigation '+term)
loc_group={n:locate(directory,f'คณะกรรมการชุดที่ {n:02d}') for n in range(1,21)}
loc_sport={j:locate(directory,'กีฬา '+label) for j,(label,_) in enumerate(SPORTS,1)}
loc_age={j:locate(directory,'กลุ่มอายุ '+label) for j,(label,_) in enumerate(AGES,1)}
loc_other={k:loc_group[n] for k,n in [('ปล่อยตัว',16),('เส้นชัย',17),('ประจำหมุด',18),('ส่งตัว',19)]}
# Map directory indices to final PDF: pages 1,2,3,4 then source 4..21 (18), then directory.
DIR_START=22  # 0-based, final page 23
NUM_TOTAL=2+2+18+len(directory)+1
FINAL_GROUP={n:(DIR_START+v[0],v[1]) for n,v in loc_group.items()}
FINAL_SPORT={n:(DIR_START+v[0],v[1]) for n,v in loc_sport.items()}
FINAL_AGE={n:(DIR_START+v[0],v[1]) for n,v in loc_age.items()}
print('total pages',NUM_TOTAL,'groups',FINAL_GROUP,'sports',FINAL_SPORT,'ages',FINAL_AGE)

# Two A4 TOC pages: large text plus explicit sports and age-level subcommittee listings.
major=[('บทสรุปผู้บริหาร',2),('กำหนดการพิธีเปิด',5),('กำหนดการพิธีปิด',7),('สีประจำโรงเรียน',8),('คำปฏิญาณนักกีฬา',9),('ประกาศกลุ่ม (ตรวจร่าง)',10),('กติกาและหลักเกณฑ์',21),('ข้อสังเกต',NUM_TOTAL)]
mainlinks=[];subnav=[]
for i,(txt,pg) in enumerate(major):
 col=i%2;row=i//2;x=44+col*254;y=158+row*35
 mainlinks.append((txt,pg, x,y,245,31))
committee_links=[]
for i,label in enumerate(TITLES):
 col=i//10; row=i%10; x=44+col*257; y=345+row*38
 committee_links.append((f'{i+1:02d}',label,FINAL_GROUP[i+1][0]+1,x,y,249,34))
# Detailed TOC categories appear on page 4 with navigation including source page target.
sportlinks=[(j,lab,FINAL_SPORT[j][0]+1,44,210+(j-1)*49,246,44) for j,(lab,_) in enumerate(SPORTS,1)]
ageand=[('อนุบาล',FINAL_AGE[1][0]+1,1),('ประถม 8 ปี',FINAL_AGE[2][0]+1,2),('ประถม 10 ปี',FINAL_AGE[3][0]+1,3),('ประถม 12 ปี',FINAL_AGE[4][0]+1,4),('มัธยม',FINAL_AGE[5][0]+1,5),('ปล่อยตัวนักกรีฑา',FINAL_GROUP[16][0]+1,6),('ประจำเส้นชัย',FINAL_GROUP[17][0]+1,7),('ประจำหมุด',FINAL_GROUP[18][0]+1,8),('จัดส่งตัวนักกรีฑา',FINAL_GROUP[19][0]+1,9)]
age_links=[(lab,pg,300,210+(j-1)*45,252,42) for lab,pg,j in ageand]

def card(label,page,x,y,w,h,prefix=''):
 return f'<div class="linkcard" style="left:{x}pt;top:{y}pt;width:{w}pt;height:{h}pt"><span>{E(prefix)}{E(label)}</span><b>{page:02d}</b></div>'
main_cards=''.join(card(t,p,x,y,w,h) for t,p,x,y,w,h in mainlinks)
com_cards=''.join(card(t,p,x,y,w,h,num+'  ') for num,t,p,x,y,w,h in committee_links)
sport_cards=''.join(card(label,pg,x,y,w,h) for j,label,pg,x,y,w,h in sportlinks)
age_cards=''.join(card(label,pg,x,y,w,h) for label,pg,x,y,w,h in age_links)
toc_css=f'''@page{{size:A4;margin:0}}
@font-face{{font-family:Thai;src:url(file://{FONT})}}
@font-face{{font-family:Thai;src:url(file://{BOLD});font-weight:700}}
*{{box-sizing:border-box}} body{{margin:0;font-family:Thai,sans-serif;color:#143a58;background:#fff}}
.page{{position:relative;width:595.276pt;height:841.89pt;page-break-after:always;overflow:hidden}}
.bar{{position:absolute;left:0;top:0;width:595.276pt;height:6pt;background:#153d5b}}
.meta{{position:absolute;left:44pt;right:44pt;top:35pt;display:flex;justify-content:space-between;border-bottom:1pt solid #d8e4e9;padding-bottom:9pt;color:#567084;font-size:9pt}}
h1{{position:absolute;left:44pt;top:73pt;font-size:23pt;margin:0;font-weight:700;color:#153e5a;line-height:1.35}}
.lead{{position:absolute;left:44pt;right:44pt;top:112pt;font-size:10pt;color:#546c7d}}
.section{{position:absolute;left:44pt;font-size:12pt;font-weight:700;border-bottom:2pt solid #bb8f4d;padding-bottom:6pt;width:507pt}}
.linkcard{{position:absolute;display:flex;align-items:center;gap:6pt;padding:4pt 8pt;background:#f2f6f9;border:1px solid #d6e2e8;border-left:3pt solid #c29857;border-radius:3pt;font-size:10.6pt;line-height:1.33}}
.linkcard span{{flex:1;font-weight:700}}
.linkcard b{{font-size:11.5pt;color:#16476a}}
.note{{position:absolute;left:44pt;right:44pt;bottom:42pt;font-size:9.2pt;color:#8a651d}}
.footer{{position:absolute;left:44pt;right:44pt;bottom:17pt;font-size:8.5pt;color:#5c7488;border-top:1px solid #dce4e9;padding-top:6pt;display:flex;justify-content:space-between}}
'''
toc_html=f'''<html lang="th"><meta charset="utf-8"><style>{toc_css}</style><body>
<div class="page"><div class="bar"></div><div class="meta"><span>มิตรภาพเกมส์ 2569 · สารบัญ</span><span>R30I · ฉบับตรวจร่าง</span></div>
<h1>สารบัญ · คณะกรรมการ 20 ชุด</h1><div class="lead">แตะชื่อเพื่อเปิดรายชื่อ · ตัวอักษรใหญ่ขึ้นสำหรับอ่านบนมือถือและพิมพ์ A4</div>
<div class="section" style="top:137pt">หัวข้อหลัก</div>{main_cards}
<div class="section" style="top:308pt">คณะกรรมการทุกชุด <span style="font-size:9pt;font-weight:400;color:#54738b">· กดไปยังรายชื่อ</span></div>
{com_cards}
<div class="note">รายละเอียดแยกตามชนิดกีฬาและกรีฑาอยู่ในสารบัญหน้าถัดไป</div>
<div class="footer"><span>รายชื่อยังเป็นฉบับตรวจร่าง · ไม่ใช่คำสั่งแต่งตั้งที่รับรองแล้ว</span><span>03 / {NUM_TOTAL:02d}</span></div></div>
<div class="page"><div class="bar"></div><div class="meta"><span>มิตรภาพเกมส์ 2569 · สารบัญย่อย</span><span>R30I · ฉบับตรวจร่าง</span></div>
<h1>กรรมการแยกชนิดกีฬาและกรีฑา</h1><div class="lead">กดชื่อกีฬา รุ่นอายุ หรือหน้าที่กรรมการ เพื่อเปิดรายชื่อในหน้าที่เกี่ยวข้อง</div><div style="position:absolute;top:134pt;right:44pt;font-size:9pt;color:#155171;border:1pt solid #b7ceda;border-radius:3pt;padding:3pt 9pt">กลับสารบัญหลัก</div>
<div class="section" style="top:165pt;left:44pt;width:245pt">กรรมการตัดสินกีฬาประจำสนาม</div>
<div class="section" style="top:165pt;left:300pt;width:252pt">กรรมการกรีฑา</div>{sport_cards}{age_cards}
<div class="note">หมายเหตุ: บัญชีแยกชนิดกีฬามีเลขข้อบางช่วงซ้ำตามต้นฉบับ ระหว่างรอผู้จัดตรวจแก้</div>
<div class="footer"><span>รายชื่อยังเป็นฉบับตรวจร่าง · กลับสารบัญหลักได้จากแถบล่าง</span><span>04 / {NUM_TOTAL:02d}</span></div></div>
</body></html>'''
(BASE/'R30I_TOC_SOURCE.html').write_text(toc_html,encoding='utf8')
toc_pdf=BASE/'r30i_toc.pdf';HTML(string=toc_html,base_url=str(BASE)).write_pdf(str(toc_pdf))
tocdoc=fitz.open(toc_pdf)
assert len(tocdoc)==2,(len(tocdoc),[p.get_text('text')[-120:] for p in tocdoc])
# Regenerate last-page review notes because old 44-page citations no longer point to the right pages.
notes_html=f'''<html lang="th"><meta charset="utf-8"><style>
@page{{size:A4;margin:0}} @font-face{{font-family:Thai;src:url(file://{FONT})}}
@font-face{{font-family:Thai;src:url(file://{BOLD});font-weight:700}}
body{{margin:0;font-family:Thai,sans-serif;color:#143a58}}
.top{{height:6pt;background:#153d5b;width:100%;position:absolute;top:0}}
.meta{{position:absolute;left:46pt;right:46pt;top:54pt;font-size:9pt;color:#58758a;border-bottom:1pt solid #d7e1e8;padding-bottom:8pt}}
h1{{position:absolute;left:46pt;top:102pt;font-size:23pt;margin:0}}
.subtitle{{position:absolute;left:46pt;top:150pt;font-size:10pt;color:#637b89}}
.item{{position:absolute;left:46pt;right:46pt;padding:11pt 12pt;border:1px solid #dce4e9;border-left:3pt solid #bf9249;border-radius:3pt;background:#f6f9fa;}}
.item strong{{display:block;font-size:12pt;margin-bottom:4pt}}.item span{{font-size:10.1pt;line-height:1.5;color:#41596d}}
.links{{position:absolute;left:46pt;top:655pt;right:46pt;padding:13pt;background:#eef5f8;border-radius:3pt;}}
.links strong{{font-size:11pt}}.links div{{font-size:9.5pt;margin:5pt 0;color:#185177}}
.footer{{position:absolute;left:46pt;right:46pt;bottom:26pt;font-size:9pt;border-top:1pt solid #dce4e9;padding-top:7pt}}
</style><body><div class="top"></div><div class="meta">มิตรภาพเกมส์ 2569 · R30I · ฉบับตรวจร่าง (16 พฤศจิกายน 2569)</div>
<h1>จุดที่ต้องตรวจรับก่อนเผยแพร่</h1><div class="subtitle">เนื้อหาพิธีการ ประกาศ กติกา และรายชื่อยังไม่ใช่คำสั่งที่รับรอง</div>
<div class="item" style="top:199pt"><strong>01 · กำหนดการพิธีเปิด–ปิด</strong><span>ตรวจเวลา ลำดับพิธี ผู้รับผิดชอบ และสถานที่ · หน้า 05–07</span></div>
<div class="item" style="top:279pt"><strong>02 · สีประจำโรงเรียน</strong><span>ชื่อสีอ้างอิงร่างเดิม ส่วนเฉดสีใช้ประกอบการจัดหน้า ยังรอโรงเรียนตรวจ · หน้า 08</span></div>
<div class="item" style="top:359pt"><strong>03 · ประกาศแต่งตั้งคณะกรรมการ</strong><span>ตรวจเลขข้อที่ซ้ำ ชื่อ ตำแหน่ง และฉบับลงนาม · หน้า 10–20</span></div>
<div class="item" style="top:439pt"><strong>04 · บัญชีรายชื่อกรรมการ</strong><span>ตรวจชื่อและสังกัด 250 รายการมอบหมาย (มีบุคคลซ้ำได้) · หน้า {DIR_START+1:02d}–{NUM_TOTAL-1:02d}</span></div>
<div class="item" style="top:519pt"><strong>05 · หลักเกณฑ์การแข่งขัน</strong><span>ตรวจเกณฑ์คะแนนรวมและกติกาที่ยังไม่ผ่านการรับรอง · หน้า 21–22</span></div>
<div class="links"><strong>แหล่งข้อมูลและฉบับต้นทาง</strong><div>เว็บไซต์: infobwd.github.io/nongkum-sports-hub/</div><div>สูจิบัตรเต็ม R30E 132 หน้า · Google Drive</div><div>ต้นฉบับ R25D3 155 หน้า · Google Drive</div></div>
<div class="footer">R30I · สำหรับตรวจร่างเท่านั้น  |  {NUM_TOTAL:02d} / {NUM_TOTAL:02d}</div></body></html>'''
(BASE/'R30I_NOTES_SOURCE.html').write_text(notes_html,encoding='utf8')
notes_pdf=BASE/'r30i_notes.pdf';HTML(string=notes_html,base_url=str(BASE)).write_pdf(str(notes_pdf))
notesdoc=fitz.open(notes_pdf);assert len(notesdoc)==1,len(notesdoc)
# Assemble A4 pages; preserve source ceremony, rules and executive-summary bodies as vector.
out=fitz.open()
out.insert_pdf(source,from_page=0,to_page=1,links=False,annots=True)
out.insert_pdf(tocdoc,links=False)
out.insert_pdf(source,from_page=3,to_page=20,links=False,annots=True)
out.insert_pdf(directory,links=False)
out.insert_pdf(notesdoc,links=False)
assert len(out)==NUM_TOTAL
# Update original footers and add Thai return-to-index control. Preserve source content above 802 pt.
back_css=f'''@page{{size:65pt 30pt;margin:0}}
@font-face{{font-family:Thai;src:url(file://{FONT})}}@font-face{{font-family:Thai;src:url(file://{BOLD});font-weight:700}}
body{{margin:0;background:#143d5b;width:65pt;height:30pt;display:flex;align-items:center;justify-content:center;color:white;font-family:Thai;font-size:9.5pt;font-weight:700}}
'''
back_pdf=fitz.open(stream=HTML(string=f'<html lang="th"><meta charset="utf-8"><style>{back_css}</style><body>กลับสารบัญ</body></html>').write_pdf(),filetype='pdf')
assert len(back_pdf)==1
for i,p in enumerate(out):
 if i==0:continue
 if i not in [2,3] and (i<DIR_START or i==NUM_TOTAL-1):
  # All source footers are on a white A4 strip. Remove prior footer and its old NN/44.
  footer_strip=fitz.Rect(0,805,595.28,841.89)
  p.add_redact_annot(footer_strip,fill=(1,1,1))
  p.apply_redactions(images=2,graphics=1,text=0)
  p.draw_line(fitz.Point(43,808),fitz.Point(553,808),color=(.85,.89,.91),width=.6,overlay=True)
  p.insert_text(fitz.Point(44,827),f'R30I  |  REVIEW ONLY',fontname='helv',fontsize=8,color=(.31,.43,.52),overlay=True)
  p.insert_text(fitz.Point(420,827),f'{i+1:02d} / {NUM_TOTAL:02d}',fontname='helv',fontsize=8,color=(.22,.36,.49),overlay=True)
 # Add a visible Thai return button, and page numbers on dynamically reflowed directory pages.
 if DIR_START<=i<NUM_TOTAL-1:
  p.draw_line(fitz.Point(44,808),fitz.Point(553,808),color=(.84,.89,.91),width=.6,overlay=True)
  p.insert_text(fitz.Point(424,827),f'{i+1:02d} / {NUM_TOTAL:02d}',fontname='helv',fontsize=8,color=(.27,.41,.53),overlay=True)
 if i>=1 and i not in [2,3]:
  r=fitz.Rect(488,809,552,838)
  p.show_pdf_page(r,back_pdf,0,overlay=True)
  p.insert_link({'kind':fitz.LINK_GOTO,'from':r,'page':2,'to':fitz.Point(0,0)})
# Source cover unchanged, but update QR links where applicable. Main TOC all link rectangles from layout.
for txt,pg,x,y,w,h in mainlinks:
 out[2].insert_link({'kind':fitz.LINK_GOTO,'from':fitz.Rect(x,y,x+w,y+h),'page':pg-1,'to':fitz.Point(0,0)})
for num,label,pg,x,y,w,h in committee_links:
 out[2].insert_link({'kind':fitz.LINK_GOTO,'from':fitz.Rect(x,y,x+w,y+h),'page':pg-1,'to':fitz.Point(0,60)})
for j,label,pg,x,y,w,h in sportlinks:
 target=FINAL_SPORT[j]
 out[3].insert_link({'kind':fitz.LINK_GOTO,'from':fitz.Rect(x,y,x+w,y+h),'page':target[0],'to':fitz.Point(0,max(0,target[1]-35))})
for j,(label,pg,x,y,w,h) in enumerate(age_links,1):
 target=(FINAL_AGE[j] if j<=5 else FINAL_GROUP[{6:16,7:17,8:18,9:19}[j]])
 out[3].insert_link({'kind':fitz.LINK_GOTO,'from':fitz.Rect(x,y,x+w,y+h),'page':target[0],'to':fitz.Point(0,max(0,target[1]-35))})
# Clickable supplemental page from TOC 1 and reverse.
out[3].insert_link({'kind':fitz.LINK_GOTO,'from':fitz.Rect(382,126,552,168),'page':2,'to':fitz.Point(0,0)})
out[2].insert_link({'kind':fitz.LINK_GOTO,'from':fitz.Rect(44,748,553,796),'page':3,'to':fitz.Point(0,0)})
# old pages' QR and other external links need recreating after insert_pdf; use grounded original URLs.
for i,p in enumerate(out):
 if i==0:continue
 if i in (1,NUM_TOTAL-1):
  p.insert_link({'kind':fitz.LINK_URI,'from':fitz.Rect(48,664,500,744),'uri':NAT})
# New notes page: source documents and website are clickable, not the old obsolete page 44 references.
out[NUM_TOTAL-1].insert_link({'kind':fitz.LINK_URI,'from':fitz.Rect(50,685,545,705),'uri':NAT})
out[NUM_TOTAL-1].insert_link({'kind':fitz.LINK_URI,'from':fitz.Rect(50,705,545,722),'uri':'https://drive.google.com/file/d/1pxf1-Z08PjVbKg8zmuV1CSnutkjnWdh8/view'})
out[NUM_TOTAL-1].insert_link({'kind':fitz.LINK_URI,'from':fitz.Rect(50,722,545,742),'uri':'https://drive.google.com/file/d/16v6cgEk8NyjVqo7TX_Sxd3QvT2NF7aAS/view'})
# Bookmarks with 20 committees and detailed sports + athletic age subsections.
book=[ [1,'ปก — มิตรภาพเกมส์ 2569',1], [1,'บทสรุปผู้บริหาร',2],
 [1,'สารบัญ · คณะกรรมการ 20 ชุด',3],[1,'สารบัญย่อย · ชนิดกีฬาและกรีฑา',4],
 [1,'พิธีเปิด',5],[1,'พิธีปิด',7],[1,'สีโรงเรียน',8],[1,'คำปฏิญาณ',9],[1,'ประกาศ (ฉบับตรวจร่าง)',10],[1,'กติกาและหลักเกณฑ์',21],
 [1,'รายชื่อคณะกรรมการ (ฉบับตรวจร่าง)',DIR_START+1]]
for n,title in enumerate(TITLES,1):
 book.append([2,f'ชุดที่ {n:02d} · {title}',FINAL_GROUP[n][0]+1])
 if n==14:
  for j,(label,_) in enumerate(SPORTS,1):book.append([3,f'กรรมการกีฬา · {label}',FINAL_SPORT[j][0]+1])
 if n==15:
  for j,(label,_) in enumerate(AGES,1):book.append([3,f'กรรมการกรีฑา · {label}',FINAL_AGE[j][0]+1])
book.append([1,'ข้อสังเกตและแหล่งข้อมูล',NUM_TOTAL])
out.set_toc(book)
out.set_metadata({**source.metadata,'title':'มิตรภาพเกมส์ 2569 — R30I อักษรใหญ่และสารบัญแยกกีฬา/กรีฑา (ตรวจร่าง)',
  'subject':'R30I review only, 250 assignments reflowed at 10-11.5pt with clickable 20 committees + sports and athletics subdivisions'})
out.save(OUT,garbage=4,deflate=True)
report={'source':SRC.name,'new_pdf':OUT.name,'pages':NUM_TOTAL,'directory_pages':len(directory),
 'assignments':sum(len(v) for v in D.values()),'committees':20,
 'sports_subgroups':len(SPORTS),'athletics_age_subgroups':len(AGES),'athletics_judging_subgroups':4,
 'bookmarks':len(book),'pdf_sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),
 'committee_start_pages':{str(n):p+1 for n,(p,y) in FINAL_GROUP.items()},
 'sports_start_pages':{label:FINAL_SPORT[j][0]+1 for j,(label,_) in enumerate(SPORTS,1)},
 'age_start_pages':{label:FINAL_AGE[j][0]+1 for j,(label,_) in enumerate(AGES,1)},
 'status':'DRAFT - automated QA pending - not approved; original R30H preserved'}
(BASE/'R30I_BUILD_REPORT.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
print('OUTPUT',OUT,'MB',round(OUT.stat().st_size/1024**2,2),'sha',report['pdf_sha256'])
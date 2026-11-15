#!/usr/bin/env python3
"""Create R30-B READABLE DRAFT from immutable R25D3 155-page source and S74-inspired editorial HTML.
Uses WeasyPrint 68 for new pages and PyMuPDF for vector-preserving page selection,
real GoTo links, bookmarks, footer remapping. Never changes competition data.
"""
from __future__ import annotations
import hashlib, json, re, sys
from pathlib import Path
from collections import OrderedDict
import fitz
from weasyprint import HTML, CSS

ROOT=Path(__file__).resolve().parent
SRC=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'source-155.pdf'
OUT=Path(sys.argv[2]) if len(sys.argv)>2 else ROOT/'output'/'Mittraphap_2569_R30B_Readable_Finals_DRAFT.pdf'
CSS_FILE=ROOT/'layout.css'
OUT.parent.mkdir(parents=True,exist_ok=True)
NAVY=(.071,.220,.349); GOLD=(.745,.553,.200); WHITE=(1,1,1)
TOTAL=94
SPORTS=['ฟุตบอล','ยิงจุดโทษ','ฟุตซอล','วอลเลย์บอล','เซปักตะกร้อ','เปตอง','เทเบิลเทนนิส','ชักเย่อ']
# This order is the original 155-page PDF's order, NOT new schedule authority.
KEEP=[1,41,42]+list(range(44,132))
SRC_TO_NEW={1:1,**{src:src-37 for src in [41,42]},**{src:src-38 for src in range(44,132)}}
assert len(KEEP)==91 and SRC_TO_NEW[41]==4 and SRC_TO_NEW[44]==6 and SRC_TO_NEW[131]==93
BRACKET_FIRST={'ฟุตบอล':44,'ยิงจุดโทษ':47,'ฟุตซอล':48,'วอลเลย์บอล':53,'เซปักตะกร้อ':61,'เปตอง':69,'เทเบิลเทนนิส':79,'ชักเย่อ':83}
SCHEDULE_FIRST={'ฟุตบอล':88,'ยิงจุดโทษ':91,'ฟุตซอล':93,'วอลเลย์บอล':95,'เซปักตะกร้อ':98,'เปตอง':101,'เทเบิลเทนนิส':106,'ชักเย่อ':108}
HEADERS=[('บทสรุปผู้บริหาร',2),('สารบัญและการนำทาง',3),('กติกาและหลักเกณฑ์',4),('ผังสายการแข่งขัน 44 กลุ่ม',6),('ตารางกีฬา 186 คู่',50),('กรีฑา 50 รายการ',73),('ประเด็นตรวจรับและที่มา',94)]

def frame(tag,title,subtitle,body,pagenum):
    return f'''<!doctype html><html lang="th"><head><meta charset="utf-8"><title>{title}</title><link rel="stylesheet" href="layout.css"></head><body>
    <article class="page"><div class="mast"><strong>มิตรภาพเกมส์ 2569 · กีฬากลุ่มหนองกุ่ม</strong><span>ฉบับตรวจร่าง · 15 พฤศจิกายน 2569</span></div>
    <div class="section-tag">{tag}</div><h1>{title}</h1><div class="hr"></div><p class="lead">{subtitle}</p>{body}
    <div class="footer"><span>ฉบับตรวจร่าง · ไม่ใช่ประกาศผลการแข่งขัน</span><span class="link">กลับสารบัญ • หน้า {pagenum:02d} / {TOTAL}</span></div></article></body></html>'''

summary_body='''
 <div class="status"><b>ข้อมูลสำหรับตรวจร่าง:</b> ตารางแข่งขันยังมีรายการที่ต้องยืนยันกับผู้จัดก่อนใช้จริง และไม่แสดงคะแนนหรือผู้ชนะที่ยังไม่ได้รับรอง</div>
 <div class="metrics"><div class="metric"><div class="num">236</div><div class="cap">รายการแข่งขัน<br>ทั้งหมดในสูจิบัตร</div></div>
 <div class="metric"><div class="num">186</div><div class="cap">คู่แข่งขัน<br>ประเภทกีฬา</div></div>
 <div class="metric"><div class="num">50</div><div class="cap">รายการกรีฑา<br>ตามตาราง</div></div>
 <div class="metric"><div class="num">289</div><div class="cap">ช่องลู่แข่งขัน<br>ตามสูจิบัตร</div></div></div>
 <div class="kicker">ข้อมูลการเข้ารอบชิงชนะเลิศที่ผู้จัดแจ้งเมื่อ 15 พฤศจิกายน 2569</div>
 <div class="cols">
  <div class="panel accent finalist"><div class="panel-title">เปตอง รุ่นอายุ 10 ปี หญิง</div><p><b>โรงเรียนบ้านวังด้ง เข้ารอบชิงชนะเลิศ</b></p></div>
  <div class="panel accent finalist"><div class="panel-title">เปตอง รุ่นอายุ 12 ปี ชาย</div><p><b>โรงเรียนบ้านวังด้ง เข้ารอบชิงชนะเลิศ</b></p></div>
 </div>
 <p class="smallnote" style="margin-top:2mm">ทั้งสองรายการยังรอตรวจยืนยันคู่แข่งและคะแนนรอบชิง จึงไม่ระบุผลการแข่งขันล่วงหน้า</p>
 <div class="kicker" style="margin-top:5mm">ภาพรวมและสิ่งที่ต้องตรวจสอบ</div>
 <div class="cols">
  <div class="panel"><div class="panel-title">ช่วงการแข่งขัน</div><p>สนามหลักโรงเรียนบ้านหนองกระทุ่ม มีการแข่งขันเปตองนอกรอบวันที่ 12–13 พฤศจิกายน และกิจกรรมแข่งขันช่วงวันที่ 16–20 พฤศจิกายน 2569 ตามข้อมูลในเล่ม</p></div>
  <div class="panel"><div class="panel-title">ก่อนนำไปใช้</div><p>ตรวจชื่อทีม คู่แข่งขัน วัน เวลา สนาม และหน้าที่กรรมการกับเอกสารที่ผู้จัดรับรอง โดยเฉพาะรายการเปตองที่มีการแจ้งข้อมูลเพิ่มเติม</p></div>
 </div>
 <div class="panel" style="margin-top:3mm"><div class="panel-title">วิธีใช้สูจิบัตร</div><p>เปิดสารบัญหน้า 3 เพื่อเลือกกีฬาและตารางที่ต้องการ แล้วกด “กลับสารบัญ” ที่ท้ายหน้า เอกสารคำสั่งและรายชื่อกรรมการฉบับเต็มยังอยู่ในสูจิบัตรต้นฉบับ 155 หน้า</p></div>
'''
SUMMARY=frame('01 · ภาพรวมการแข่งขัน','บทสรุปผู้บริหาร','รายการแข่งขัน ข้อมูลผู้เข้าชิง และเรื่องที่ควรตรวจสอบก่อนใช้งาน',summary_body,2)

toc_items=[('01','บทสรุปผู้บริหาร',2),('02','สารบัญและการนำทาง',3),('03','หลักเกณฑ์และกติกา',4),('04','ผังสาย 44 กลุ่ม',6),('05','ตารางแข่งขันกีฬา',50),('06','กรีฑาและตารางลู่',73),('07','ประเด็นรอตรวจและที่มา',94)] + [(f'{i+8:02d}',f'ตาราง{sport}',SRC_TO_NEW[SCHEDULE_FIRST[sport]]) for i,sport in enumerate(SPORTS)]
toc_cards=''.join(f'<div class="toc-item"><span class="no">{no}</span><span class="name">{label}</span><span class="page-no">{p:02d}</span></div>' for no,label,p in toc_items)
toc_sports=''.join(f'<span class="sport-chip">{s} · {SRC_TO_NEW[BRACKET_FIRST[s]]:02d}</span>' for s in SPORTS)
TOC=frame('02 · เลือกหน้าได้ทันที','สารบัญและการนำทาง','คลิกชื่อหัวข้อเพื่อไปยังหน้านั้น และเลือก “กลับสารบัญ” เมื่ออ่านเสร็จ',f'''
 <div class="toc-grid">{toc_cards}</div>
 <div class="toc-sub">หน้าผังสายของแต่ละชนิดกีฬา</div>
 <div class="sport-grid">{toc_sports}</div>
 <div class="status" style="margin-top:5mm">ข้อมูลเปตองที่แจ้งเพิ่มเติม: <b>บ้านวังด้งเข้าชิง รุ่น 10 ปีหญิง หน้า 32 และ 12 ปีชาย หน้า 33</b> ส่วนตารางคู่ชิงอยู่หน้า 67</div>
''',3)
notes_body='''
 <div class="two-col">
  <div class="notes-card"><h2>01 · ผลการเข้ารอบชิงที่แจ้งล่าสุด</h2><p>ผู้จัดแจ้งว่าโรงเรียนบ้านวังด้งเข้าชิงเปตอง 10 ปีหญิง และ 12 ปีชาย เมื่อ 15 พฤศจิกายน 2569 โดยยังไม่ได้ยืนยันคู่แข่งและคะแนนรอบชิง</p></div>
  <div class="notes-card"><h2>02 · ตารางแข่งขันและผังสาย</h2><p>ยังมีรายการที่ต้องตรวจชื่อทีม หมายเลขคู่ รอบแข่งขัน และสนามให้ตรงกับเอกสารที่ผู้จัดรับรอง ก่อนใช้เป็นตารางแข่งขันทางการ</p></div>
  <div class="notes-card"><h2>03 · รายการกรีฑา</h2><p>ต้นฉบับมีเลขรายการ 35 และ 48 ปรากฏซ้ำ และบางรายการยังไม่ระบุเวลาเริ่มแข่งขัน จึงคงข้อมูลเดิมและรอผู้จัดตรวจยืนยัน</p></div>
  <div class="notes-card"><h2>04 · กรรมการและเอกสารคำสั่ง</h2><p>คำสั่งและรายชื่อกรรมการฉบับเต็มเก็บไว้ในเล่มเดิม 155 หน้า โปรดตรวจฉบับที่ได้รับการรับรองก่อนมอบหมายหน้าที่</p></div>
 </div>
 <div class="kicker" style="margin-top:4mm">สิ่งที่ต้องตรวจรับก่อนเผยแพร่</div>
 <div class="panel"><ol class="numlist">
 <li>ตรวจชื่อทีม วัน เวลา สนาม และข้อมูลผู้เข้าชิงให้ตรงกับคำยืนยันล่าสุด</li>
 <li>ตรวจผังสาย ตารางคะแนน กติกา และรายชื่อกรรมการโดยผู้รับผิดชอบ</li>
 <li>ทดลองพิมพ์กระดาษ A4 และอ่านบนโทรศัพท์มือถือ</li>
 <li>ตรวจสารบัญ หมายเลขหน้า และสิทธิ์เข้าถึงเอกสารก่อนประกาศใช้</li>
 </ol></div>
 <p class="smallnote" style="margin-top:3mm">ข้อมูลอ้างอิง: สูจิบัตรฉบับเต็ม 155 หน้า และรายงานแก้ไขรายการเปตองที่ผู้จัดแจ้งเพิ่มเติม · ฉบับนี้ยังรอการตรวจรับ</p>
'''
NOTES=frame('07 · ประเด็นที่ต้องตรวจรับ','ข้อสังเกตและแหล่งข้อมูล','ข้อมูลที่ยังต้องยืนยันก่อนใช้สูจิบัตรเป็นเอกสารทางการ',notes_body,94)

def render_html(source,title):
    source=source.replace('ำ','ํา') # Thai U+0E33 decomposition for reliable glyph shaping and text extraction
    path=OUT.parent/(title+'.html');path.write_text(source,encoding='utf-8')
    result=OUT.parent/(title+'.pdf')
    HTML(string=source,base_url=str(ROOT)).write_pdf(str(result),stylesheets=[CSS(filename=str(CSS_FILE))])
    d=fitz.open(result)
    if len(d)!=1:
       raise RuntimeError(f'{title} unexpectedly produced {len(d)} pages')
    return result

summary=render_html(SUMMARY,'executive-summary')
toc=render_html(TOC,'contents')
notes=render_html(NOTES,'review-notes')
source=fitz.open(SRC)
assert len(source)==155
out=fitz.open()
out.insert_pdf(source,from_page=0,to_page=0)
with fitz.open(summary) as p:out.insert_pdf(p)
with fitz.open(toc) as p:out.insert_pdf(p)
out.insert_pdf(source,from_page=40,to_page=41)
out.insert_pdf(source,from_page=43,to_page=130)
with fitz.open(notes) as p:out.insert_pdf(p)
assert len(out)==TOTAL,len(out)

# Provide explicit source traceability without replacing original body text.
for src,final in SRC_TO_NEW.items():
    assert (final==1 if src==1 else 1<=final<=93)
    if src==1:continue
    p=out[final-1]
    # redaction cleans obsolete "old page /155" labels while keeping whole relevant body.
    y=785 if src in (41,42) else 775 if 44<=src<=87 else 799
    red=fitz.Rect(0,y,p.rect.width,p.rect.height)
    p.add_redact_annot(red,fill=WHITE)
    p.apply_redactions(images=0,graphics=0,text=0)
    p.draw_line((35,807),(560,807),color=(.84,.89,.92),width=.7)
    # page number styling is consistent with S74 editorial: light compact footer
    # Thai footer is placed as vector page below
    p.insert_text((378,825),f'{final:02d} / {TOTAL}',fontsize=8,fontname='helv',color=NAVY)


# The imported vector pages preserve competition data. Remove ONLY metadata ribbons outside the body,
# and insert clear Thai navigation. Do not redact source competition rows or bracket diagrams.
header_html='''<html lang="th"><meta charset="utf-8"><style>
@page{size:500pt 32pt;margin:0} html,body{margin:0;padding:0}
main{height:32pt;display:flex;align-items:center;justify-content:space-between;color:#123859;font-family:"Noto Sans Thai";font-size:13pt;font-weight:700;border-bottom:1pt solid #bd8d33}
small{font-size:11pt;font-weight:400;color:#536b7d}</style><main><span>มิตรภาพเกมส์ 2569</span><small>ฉบับตรวจร่าง</small></main></html>'''
footer_html='''<html lang="th"><meta charset="utf-8"><style>
@page{size:250pt 23pt;margin:0} html,body{margin:0;padding:0}
main{color:#2f566f;font-family:"Noto Sans Thai";font-weight:600;font-size:11pt;padding-top:3pt}</style>
<main>ฉบับตรวจร่าง · ยังไม่ใช่ประกาศผล</main></html>'''
head_path=OUT.parent/'friendly-header.pdf';foot_path=OUT.parent/'friendly-footer.pdf'
HTML(string=header_html).write_pdf(str(head_path));HTML(string=footer_html).write_pdf(str(foot_path))
with fitz.open(head_path) as hd,fitz.open(foot_path) as ft:
    for i in range(3,93):
        pp=out[i]
        # Covers the very top original technical ribbon, not any match results.
        if i < 49:
            # Source pages contain a tiny English technical header above y=28.
            pp.add_redact_annot(fitz.Rect(0,0,pp.rect.width,29),fill=(1,1,1))
            pp.add_redact_annot(fitz.Rect(38,34,568,55),fill=(1,1,1))
            # Bracket pages carry version codes at the right of their native header.
            if i>=5:
                pp.add_redact_annot(fitz.Rect(424,52,567,78),fill=(1,1,1))
        else:
            # Table/athletics headings preserve all tabular data from y>84.
            pp.add_redact_annot(fitz.Rect(40,35,585,59),fill=(1,1,1))
            pp.add_redact_annot(fitz.Rect(40,59,581,82),fill=(1,1,1))
        pp.apply_redactions(images=0,graphics=0,text=0)
        pp.show_pdf_page(fitz.Rect(41,3,541,35),hd,0,overlay=True)
        pp.show_pdf_page(fitz.Rect(41,809,291,832),ft,0,overlay=True)

# Visible finalist notes: user-reported advancement ONLY, not certified results.
label_html_template='''<html lang="th"><meta charset="utf-8"><style>
@page{size:515pt 72pt;margin:0} html,body{margin:0;padding:0}
.note{height:72pt;background:#fffaf0;border:1.5pt solid #c49440;border-left:7pt solid #123859;box-sizing:border-box;padding:7pt 12pt;color:#153e5d;font-family:"Noto Sans Thai"}
.h{font-size:13.5pt;font-weight:700;line-height:1.45}.s{font-size:10.6pt;color:#6a5939;margin-top:2pt}
</style><div class="note"><div class="h">{headline}</div><div class="s">แจ้งโดยผู้จัด 15 พฤศจิกายน 2569 · รอยืนยันคู่แข่งและคะแนนรอบชิง</div></div></html>'''
for destidx,headline in ((31,'เปตอง 10 ปีหญิง · บ้านวังด้งเข้ารอบชิงชนะเลิศ'),
                         (32,'เปตอง 12 ปีชาย · บ้านวังด้งเข้ารอบชิงชนะเลิศ'),
                         (66,'เปตอง 10 ปีหญิง และ 12 ปีชาย · บ้านวังด้งเข้าชิง')):
    label_html=label_html_template.format(headline=headline) if False else label_html_template.replace('{headline}',headline)
    label_path=OUT.parent/f'petanque-finalist-{destidx+1}.pdf'
    HTML(string=label_html).write_pdf(str(label_path))
    with fitz.open(label_path) as lab:
        area=fitz.Rect(40,647,555,719) if destidx in (31,32) else fitz.Rect(40,529,555,601)
        out[destidx].show_pdf_page(area,lab,0,overlay=True)

# Replace legacy source-version shorthand above schedules and athletics with useful Thai.
for pageidx in range(49,93):
    pp=out[pageidx]
    sports_page=bool(pp.search_for('ใช้ข้อมูลรายการตามสูจิบัตร'))
    athletics_page=bool(pp.search_for('คงลู่และโรงเรียนตามสูจิบัตร'))
    if not (sports_page or athletics_page):continue
    area=fitz.Rect(42,133.3,402,143.9)
    pp.add_redact_annot(area,fill=(1,1,1))
    pp.apply_redactions(images=0,graphics=0,text=0)
    line='ข้อมูลสำหรับตรวจทาน · ไม่ใช่ผลการแข่งขันที่รับรอง' if sports_page else 'ข้อมูลการจัดลู่ตามร่าง · เว้นช่องชื่อและอันดับไว้'
    snippet=f'''<html lang="th"><meta charset="utf-8"><style>
@page{{size:{area.width}pt {area.height}pt;margin:0}}html,body{{margin:0;padding:0}}
main{{color:#4b6374;font:8.4pt/1.1 "Noto Sans Thai";padding:0;margin:0}}</style><main>{line}</main></html>'''
    spath=OUT.parent/f'friendly-subtitle-{pageidx}.pdf';HTML(string=snippet).write_pdf(str(spath))
    with fitz.open(spath) as fragment:pp.show_pdf_page(area,fragment,0,overlay=True)

# Replace user-facing technical production notes with plain Thai; substantive warnings remain.
plain_patches=[
 (3,fitz.Rect(42,63,175,83),'กติกาและเกณฑ์คะแนน',9.6,'#f5f2e9','#a77a2b'),
 (3,fitz.Rect(80,177,310,195),'กติกาการแข่งขัน · มิตรภาพเกมส์ 2569',10.2,'#123859','#e6bd60'),
 (3,fitz.Rect(44,720,555,775),'เกณฑ์ตัดสินฟุตบอลเมื่อคะแนนเท่ากัน และวิธีเข้ารอบ 4 ทีม\nต้องให้ผู้จัดตรวจยืนยันก่อนประกาศใช้',11.2,'#f5f2e9','#31516b'),
 (8,fitz.Rect(80,534,538,559),'คู่ที่ 7: ตรวจข้อมูลผู้เข้ารอบชิงให้ตรงกับสูจิบัตรต้นฉบับ',10.5,'#fff3df','#31516b')
]
for j,(pageidx,area,word,fontsize,bg,fg) in enumerate(plain_patches):
    bg_rgb=tuple(int(bg[i:i+2],16)/255 for i in (1,3,5))
    pp=out[pageidx]
    pp.add_redact_annot(area,fill=bg_rgb)
    pp.apply_redactions(images=0,graphics=0,text=0)
    pretty=word.replace('\n','<br>')
    patch_html=f'''<html lang="th"><meta charset="utf-8"><style>
@page{{size:{area.width}pt {area.height}pt;margin:0}}html,body{{margin:0;padding:0}}
div{{background:{bg};color:{fg};font:{fontsize}pt/1.45 "Noto Sans Thai";padding:3pt 3pt;height:{area.height}pt;box-sizing:border-box}}</style><div>{pretty}</div></html>'''
    ph=OUT.parent/f'plain-note-{j}.pdf';HTML(string=patch_html).write_pdf(str(ph))
    with fitz.open(ph) as pdf:pp.show_pdf_page(area,pdf,0,overlay=True)

# Build Thai vector navigation label only once and place onto all original pages.
nav_file=OUT.parent/'nav.pdf'
nav_html='<html lang="th"><style>@page{size:80pt 21pt;margin:0;}html,body{margin:0;padding:0}div{background:#123859;color:#fff;font:700 9pt "Noto Sans Thai";text-align:center;height:21pt;line-height:21pt;border-radius:3pt}</style><div>กลับสารบัญ</div></html>'
HTML(string=nav_html).write_pdf(str(nav_file))
with fitz.open(nav_file) as nav:
 for i in range(1,TOTAL):
    if i==2:continue  # the TOC needs no "back" link
    p=out[i]
    area=fitz.Rect(464,814,555,836)
    # One-page sections already display a linked footer phrase, overprinting not needed.
    if i in (1,93):
       # Make their existing footer phrase clickable, no duplicate pill.
       hits=p.search_for('กลับสารบัญ')
       for rect in hits:
         p.insert_link({'kind':fitz.LINK_GOTO,'from':rect,'page':2,'to':fitz.Point(0,0)})
       continue
    p.show_pdf_page(area,nav,0,overlay=True)
    p.insert_link({'kind':fitz.LINK_GOTO,'from':area,'page':2,'to':fitz.Point(0,0)})

# Actual page destinations, not web or Named destinations.
p=out[2]
click_targets=[]
for _,label,n in toc_items:
    boxes=p.search_for(label.replace('ำ','ํา'))
    if not boxes:raise RuntimeError('Cannot locate TOC entry '+label)
    box=next((b for b in boxes if b.y0>170),boxes[-1])
    area=fitz.Rect(box.x0-16,box.y0-6,min(568,box.x1+40),box.y1+6)
    p.insert_link({'kind':fitz.LINK_GOTO,'from':area,'page':n-1,'to':fitz.Point(0,0)})
    click_targets.append({'text':label,'page':n,'bbox':list(area)})
for sport in SPORTS:
    label=f'{sport} · {SRC_TO_NEW[BRACKET_FIRST[sport]]:02d}'
    boxes=p.search_for(label.replace('ำ','ํา'))
    if boxes:
        p.insert_link({'kind':fitz.LINK_GOTO,'from':fitz.Rect(boxes[0].x0-3,boxes[0].y0-3,boxes[0].x1+3,boxes[0].y1+3),'page':SRC_TO_NEW[BRACKET_FIRST[sport]]-1,'to':fitz.Point(0,0)})
        click_targets.append({'text':label,'page':SRC_TO_NEW[BRACKET_FIRST[sport]]})
# Source archive link from the final review page, allowing the reader to open
# legal notices / committee rosters removed from the shortened main booklet.
last=out[93]
archive_rect=last.search_for('ต้นฉบับ 155 หน้า')
if archive_rect:
    last.insert_link({'kind':fitz.LINK_URI,'from':archive_rect[-1],
       'uri':'https://drive.google.com/file/d/16v6cgEk8NyjVqo7TX_Sxd3QvT2NF7aAS/view'})
# Cover link, visually optional; user can click near bottom of title or use bookmarks.
cover=out[0]
cover.insert_link({'kind':fitz.LINK_GOTO,'from':fitz.Rect(370,765,565,832),'page':2,'to':fitz.Point(0,0)})

# Human-oriented bookmarks, not 175 items of repeated table/date headings.
bookmarks=[[1,'ปก — มิตรภาพเกมส์ 2569',1],[1,'บทสรุปผู้บริหาร',2],[1,'สารบัญและการนำทาง',3],
 [1,'กติกาและหลักเกณฑ์',4],[1,'ผังสายการแข่งขัน 44 กลุ่ม',6]]
for sport in SPORTS:bookmarks.append([2,'ผัง · '+sport,SRC_TO_NEW[BRACKET_FIRST[sport]]])
bookmarks.append([1,'ตารางการแข่งขันกีฬา',50])
for sport in SPORTS:bookmarks.append([2,'ตาราง · '+sport,SRC_TO_NEW[SCHEDULE_FIRST[sport]]])
bookmarks.extend([[1,'กรีฑาและตารางลู่',73],[1,'ประเด็นรอตรวจและที่มา',94]])
out.set_toc(bookmarks)
out.set_metadata({'title':'มิตรภาพเกมส์ 2569 — สูจิบัตรฉบับอ่านง่าย พร้อมข้อมูลผู้เข้าชิงเปตอง (ฉบับตรวจร่าง)',
'author':'กลุ่มโรงเรียนหนองกุ่ม — เอกสารเพื่อการตรวจร่าง',
'subject':'สูจิบัตรฉบับอ่านง่ายสำหรับตรวจข้อมูล; ไม่ใช่ผลการแข่งขันที่รับรอง',
'keywords':'มิตรภาพเกมส์ 2569; สูจิบัตร; เปตอง; ตรวจร่าง'})
out.save(OUT,garbage=4,deflate=True,clean=True)
out.close()
manifest={'version':'R30B','source_pdf_name':SRC.name,'source_pages':155,'output_pdf_name':OUT.name,'output_pages':TOTAL,
          'kept_source_pages':KEEP,'source_to_new':SRC_TO_NEW,'removed_from_compact_only':{
              'intro_and_ceremonies':list(range(2,8)),'unsigned_notice':list(range(8,19)),
              'committee_directory':list(range(19,41)),'orphan_rule_continuation':[43],
              'blank_forms':list(range(132,137)),'detailed_qa_notes':[137,138],
              'duplicated_historical_appendix':list(range(139,156))},
          'new_pages':{'executive_summary':2,'toc':3,'review_notes':94},
          'toc_targets':click_targets,'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),
          'source_sha256':hashlib.sha256(SRC.read_bytes()).hexdigest()}
(OUT.parent/'source_map.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps({'output':str(OUT),'pages':TOTAL,'sha256':manifest['sha256'],'entries':len(bookmarks),'toc_links':len(click_targets),'kept':len(KEEP)},ensure_ascii=False))

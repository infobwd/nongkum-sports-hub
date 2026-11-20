#!/usr/bin/env python3
"""Create R30 DRAFT from immutable R25D3 155-page source and S74-inspired editorial HTML.
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
OUT=Path(sys.argv[2]) if len(sys.argv)>2 else ROOT/'output'/'Mittraphap_2569_R30_Compact_Executive_TOC_DRAFT.pdf'
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
    <article class="page"><div class="mast"><strong>MITTRAPHAP GAMES 2569 · NONGKUM SPORTS</strong><span>ฉบับย่อ · DRAFT / REVIEW ONLY</span></div>
    <div class="section-tag">{tag}</div><h1>{title}</h1><div class="hr"></div><p class="lead">{subtitle}</p>{body}
    <div class="footer"><span>มิตรภาพเกมส์ 2569 · ยังไม่ใช่เอกสารรับรอง</span><span class="link">กลับสารบัญ • หน้า {pagenum:02d} / {TOTAL}</span></div></article></body></html>'''

summary_body='''
 <div class="status"><b>สถานะข้อมูล:</b> ตัวเลขด้านล่างอ้างฐานสูจิบัตร R25D3 (10 พ.ย. 2569) ซึ่งใช้ข้อมูลก่อนการแก้ไข R27/R28 ใน GitHub; <b>ยังไม่ใช่ผลแข่งขันหรือกำหนดการที่รับรองล่าสุด</b></div>
 <div class="metrics"><div class="metric"><div class="num">236</div><div class="cap">รายการในฐานร่าง<br>กีฬาและกรีฑา</div></div>
 <div class="metric"><div class="num">186</div><div class="cap">คู่แข่งขัน<br>ตามสูจิบัตรเดิม</div></div>
 <div class="metric"><div class="num">50</div><div class="cap">รายการกรีฑา<br>ตามเอกสาร</div></div>
 <div class="metric"><div class="num">289</div><div class="cap">ช่องลู่กรีฑา<br>จากตารางเดิม</div></div></div>
 <div class="kicker">ข้อมูลสำคัญสำหรับผู้บริหารและเจ้าหน้าที่สนาม</div>
 <div class="cols">
  <div class="panel accent"><div class="panel-title">ภาพรวมงานแข่งขัน</div><p>ข้อมูลครอบคลุมการแข่งขัน 8 โรงเรียน โดยผัง 44 กลุ่ม ตารางกีฬาเป็นคู่ และรายการกรีฑา แสดงตามแหล่งข้อมูล R25D3 เพื่อการตรวจ ไม่เติมผลหรือทีมชนะล่วงหน้า</p></div>
  <div class="panel accent"><div class="panel-title">ช่วงวันและสถานที่ในฐานร่าง</div><p>สนามหลักโรงเรียนบ้านหนองกระทุ่ม; ตารางร่างระบุเปตองนอกรอบ 12–13 พฤศจิกายน และกิจกรรมช่วง 16–20 พฤศจิกายน 2569 ต้องตรวจยืนยันรายรายการก่อนใช้งานจริง</p></div>
 </div>
 <div class="kicker" style="margin-top:4mm">ประเด็นที่ต้องตัดสินใจก่อนใช้สนาม</div>
 <div class="panel"><ol class="numlist">
 <li><b>01  ข้อมูลและสายแข่งขัน</b> — เทียบรายชื่อทีมและผู้เข้ารอบกับคำยืนยันหลัง R25D3; โดยเฉพาะการแก้เปตองและเซปักตะกร้อใน PR รุ่นหลัง</li>
 <li><b>02  วัน เวลา และสนามย่อย</b> — ตรวจคู่ที่ระบุเป็นร่างและความเสี่ยงคาบเกี่ยวกัน; ห้ามถือว่าหน้าตารางคือคำสั่งรับรอง</li>
 <li><b>03  กรรมการและผลการแข่งขัน</b> — ใช้คำสั่งแต่งตั้ง/บัญชีผู้รับผิดชอบที่ลงนามและผลที่ผ่านการรับรองเท่านั้น ไม่ใช้ข้อมูลตรวจร่างแทนผลจริง</li>
 </ol></div>
 <p class="smallnote" style="margin-top:3mm"><b>สำหรับการอ่าน:</b> เล่มย่อเก็บกติกา ผังสาย ตารางกีฬา และตารางลู่ครบจาก R25D3; รายละเอียดพิธีการ คำสั่ง รายชื่อกรรมการ และภาคผนวกเก่ายังคงอยู่ใน PDF ต้นฉบับ 155 หน้า (ไม่ถูกลบทิ้ง)</p>
'''
SUMMARY=frame('EXECUTIVE SUMMARY / 01','บทสรุปผู้บริหาร','ภาพรวมรายการแข่งขัน ความพร้อม และประเด็นที่ต้องรับรองก่อนจัดการแข่งขัน',summary_body,2)

toc_items=[('01','บทสรุปผู้บริหาร',2),('02','สารบัญและการนำทาง',3),('03','หลักเกณฑ์และกติกา',4),('04','ผังสาย 44 กลุ่ม',6),('05','ตารางแข่งขันกีฬา',50),('06','กรีฑาและตารางลู่',73),('07','ประเด็นรอตรวจและที่มา',94)] + [(f'{i+8:02d}',f'ตาราง{sport}',SRC_TO_NEW[SCHEDULE_FIRST[sport]]) for i,sport in enumerate(SPORTS)]
toc_cards=''.join(f'<div class="toc-item"><span class="no">{no}</span><span class="name">{label}</span><span class="page-no">{p:02d}</span></div>' for no,label,p in toc_items)
toc_sports=''.join(f'<span class="sport-chip">{s} · {SRC_TO_NEW[BRACKET_FIRST[s]]:02d}</span>' for s in SPORTS)
TOC=frame('CONTENTS & LINKS / 02','สารบัญและการนำทาง','คลิกชื่อหัวข้อใน PDF เพื่อเปิดหน้าที่ต้องการ และใช้ปุ่ม “กลับสารบัญ” ที่ด้านล่างหน้าต่าง ๆ',f'''
 <div class="toc-grid">{toc_cards}</div>
 <div class="toc-sub">ผังสายแยกตามชนิดกีฬา <span style="font-weight:400;font-size:8px;color:#648093">(หน้าแรกของกีฬาในหมวดผัง)</span></div>
 <div class="sport-grid">{toc_sports}</div>
 <div class="status" style="margin-top:4.7mm">ลิงก์ภายในเล่มใช้การเปิดหน้าจริง (PDF GoTo); รายชื่อกรรมการและคำสั่งฉบับเต็มอยู่ในเอกสารหลักฐานต้นฉบับ ไม่อยู่ในเล่มอ่านย่อนี้</div>
''',3)
notes_body='''
 <div class="two-col">
  <div class="notes-card"><h2>01 · การแก้ไขหลัง PDF ต้นทาง</h2><p>R25D3 เป็นเอกสารวันที่ 10 พ.ย. ก่อนการแก้ R27-C (ชื่อทีม/ฟอนต์) และ R28 (แจ้งเข้าชิงเปตอง) ซึ่งยังเป็น PR ร่าง จึงห้ามถือว่าเล่มย่อนี้เป็นฉบับปรับตามมติล่าสุดทั้งหมด</p></div>
  <div class="notes-card"><h2>02 · ตารางและผังสาย</h2><p>ข้อมูลต้นทางมีข้อสังเกตเรื่องเลขคู่ที่อ้างผู้ชนะผิดรุ่น ชื่อทีมและสายเปตอง รวมทั้งรายการตะกร้อคู่ที่ 24; ให้ยึดเอกสารที่ผู้จัดลงมติแล้วก่อนเปลี่ยนรายการ</p></div>
  <div class="notes-card"><h2>03 · กรีฑา</h2><p>ต้นฉบับมีเลขรายการ 35 และ 48 ซ้ำ และไม่ระบุเวลาเริ่มรายรายการครบทุกลู่ จึงคงเลขเดิมไว้และรอผู้จัดยืนยัน ไม่สร้างเลข 49/50 ขึ้นเอง</p></div>
  <div class="notes-card"><h2>04 · กรรมการและคำสั่ง</h2><p>หน้ารายชื่อกรรมการและประกาศฉบับยาวถูกแยกออกจากเล่มอ่านหลัก แต่ยังอยู่ใน PDF ต้นฉบับ 155 หน้า ต้องตรวจรายชื่อและใช้ฉบับที่ได้รับการรับรองก่อนมอบหมายจริง</p></div>
 </div>
 <div class="kicker" style="margin-top:5mm">รายการตรวจรับก่อนใช้เป็นสูจิบัตรทางการ</div>
 <div class="panel"><ol class="numlist">
 <li>ตรวจเทียบ 236 รายการกับ JSON / Sheets / มติผู้จัดรุ่นล่าสุด และบันทึกจุดต่างรายคู่</li>
 <li>ตรวจผัง 44 กลุ่ม ตารางคะแนนรวม และกติกาเฉพาะชนิดกีฬาโดยผู้รับผิดชอบ</li>
 <li>ทดสอบพิมพ์กระดาษ A4 และเปิด PDF บน Safari, Chrome และ LINE</li>
 <li>ยืนยันภาษาฟอนต์ ลิงก์สารบัญ หมายเลขหน้า เอกสารคำสั่ง และสิทธิ์เข้าถึงก่อนเผยแพร่</li>
 </ol></div>
 <p class="smallnote" style="margin-top:2.8mm">แหล่งอ้างอิง: PDF R25D3 155 หน้า (ต้นฉบับเลข Drive 16v6cgEk8NyjVqo7TX_Sxd3QvT2NF7aAS) และรายงานผู้บริหารศิลปหัตถกรรมครั้งที่ 74 (แบบอย่างการนำทางเท่านั้น) • สถานะ DRAFT</p>
'''
NOTES=frame('REVIEW & PROVENANCE / 07','ประเด็นรอตรวจและแหล่งข้อมูล','ประเด็นสำคัญจากเอกสารต้นฉบับที่ยังต้องตรวจรับ ไม่ใช่การประกาศเปลี่ยนคู่หรือผลแข่งขัน',notes_body,94)

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
    p.insert_text((42,825),'MITTRAPHAP GAMES 2569 · DRAFT',fontsize=8,fontname='helv',color=NAVY)
    p.insert_text((378,825),f'{final:02d} / {TOTAL}',fontsize=8,fontname='helv',color=NAVY)

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
out.set_metadata({'title':'มิตรภาพเกมส์ 2569 — สูจิบัตรฉบับย่อมีบทสรุปและสารบัญ (DRAFT R30)',
'author':'กลุ่มโรงเรียนหนองกุ่ม — เอกสารเพื่อการตรวจร่าง',
'subject':'R30 compact edition derived from R25D3 155-page draft; not approved schedule',
'keywords':'มิตรภาพเกมส์ 2569; DRAFT; executive summary; bookmarks; GoTo'})
out.save(OUT,garbage=4,deflate=True,clean=True)
out.close()
manifest={'version':'R30','source_pdf_name':SRC.name,'source_pages':155,'output_pdf_name':OUT.name,'output_pages':TOTAL,
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

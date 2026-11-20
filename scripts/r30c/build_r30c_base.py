#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, sys
from pathlib import Path
import fitz
from weasyprint import HTML, CSS
import qrcode

ROOT=Path(__file__).resolve().parent
SRC=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'source-155.pdf'
OUT=Path(sys.argv[2]) if len(sys.argv)>2 else ROOT/'output'/'MittraphapGames_2569_R30C_Readable_QR_DRAFT.pdf'
CSS_FILE=ROOT/'layout.css'
OUT.parent.mkdir(parents=True,exist_ok=True)
NAVY=(.071,.220,.349); GOLD=(.745,.553,.200); WHITE=(1,1,1)
TOTAL=94
SPORTS=['ฟุตบอล','ยิงจุดโทษ','ฟุตซอล','วอลเลย์บอล','เซปักตะกร้อ','เปตอง','เทเบิลเทนนิส','ชักเย่อ']
SPORT_ICONS={'ฟุตบอล':'⚽','ยิงจุดโทษ':'🥅','ฟุตซอล':'⚽','วอลเลย์บอล':'🏐','เซปักตะกร้อ':'◎','เปตอง':'●','เทเบิลเทนนิส':'🏓','ชักเย่อ':'🪢'}
WEB_URL='https://infobwd.github.io/nongkum-sports-hub/'
KEEP=[1,41,42]+list(range(44,132))
SRC_TO_NEW={1:1,**{src:src-37 for src in [41,42]},**{src:src-38 for src in range(44,132)}}
assert len(KEEP)==91 and SRC_TO_NEW[41]==4 and SRC_TO_NEW[44]==6 and SRC_TO_NEW[131]==93
BRACKET_FIRST={'ฟุตบอล':44,'ยิงจุดโทษ':47,'ฟุตซอล':48,'วอลเลย์บอล':53,'เซปักตะกร้อ':61,'เปตอง':69,'เทเบิลเทนนิส':79,'ชักเย่อ':83}
SCHEDULE_FIRST={'ฟุตบอล':88,'ยิงจุดโทษ':91,'ฟุตซอล':93,'วอลเลย์บอล':95,'เซปักตะกร้อ':98,'เปตอง':101,'เทเบิลเทนนิส':106,'ชักเย่อ':108}
HEADERS=[('บทสรุปผู้บริหาร',2),('สารบัญและการนำทาง',3),('กติกาและหลักเกณฑ์',4),('ผังสายการแข่งขัน 44 กลุ่ม',6),('ตารางกีฬา 186 คู่',50),('กรีฑา 50 รายการ',73),('รวมจุดสังเกตที่ต้องตรวจสอบ',94)]

# Build QR code for the public website.
qr_path=ROOT/'qr_web.png'
qr=qrcode.QRCode(border=1,box_size=8)
qr.add_data(WEB_URL)
qr.make(fit=True)
img=qr.make_image(fill_color='black',back_color='white')
img.save(qr_path)


def frame(tag,title,subtitle,body,pagenum):
    return f'''<!doctype html><html lang="th"><head><meta charset="utf-8"><title>{title}</title><link rel="stylesheet" href="layout.css"></head><body>
    <article class="page"><div class="mast"><strong>มิตรภาพเกมส์ 2569 · กีฬากลุ่มหนองกุ่ม</strong><span>ฉบับตรวจร่าง · 15 พฤศจิกายน 2569</span></div>
    <div class="section-tag">{tag}</div><h1>{title}</h1><div class="hr"></div><p class="lead">{subtitle}</p>{body}
    <div class="footer"><span>ฉบับตรวจร่าง · ไม่ใช่ประกาศผลการแข่งขัน</span><span class="link">กลับสารบัญ • หน้า {pagenum:02d} / {TOTAL}</span></div></article></body></html>'''

summary_body=f'''
 <div class="status"><b>ข้อมูลสำหรับตรวจร่าง:</b> ตารางแข่งขันยังมีรายการที่ต้องยืนยันกับผู้จัดก่อนใช้จริง และไม่แสดงคะแนนหรือผู้ชนะที่ยังไม่ได้รับรอง</div>
 <div class="metrics"><div class="metric"><div class="num">236</div><div class="cap">รายการแข่งขัน<br>ทั้งหมดในสูจิบัตร</div></div>
 <div class="metric"><div class="num">186</div><div class="cap">คู่แข่งขัน<br>ประเภทกีฬา</div></div>
 <div class="metric"><div class="num">50</div><div class="cap">รายการกรีฑา<br>ตามตาราง</div></div>
 <div class="metric"><div class="num">289</div><div class="cap">ช่องลู่แข่งขัน<br>ตามสูจิบัตร</div></div></div>
 <div class="kicker">ข้อมูลการเข้ารอบชิงชนะเลิศที่ผู้จัดแจ้งเมื่อ 15 พฤศจิกายน 2569</div>
 <div class="cols">
  <div class="panel accent finalist"><div class="panel-title">● เปตอง รุ่นอายุ 10 ปี หญิง</div><p><b>โรงเรียนบ้านวังด้ง เข้ารอบชิงชนะเลิศ</b></p></div>
  <div class="panel accent finalist"><div class="panel-title">● เปตอง รุ่นอายุ 12 ปี ชาย</div><p><b>โรงเรียนบ้านวังด้ง เข้ารอบชิงชนะเลิศ</b></p></div>
 </div>
 <p class="smallnote" style="margin-top:2mm">ทั้งสองรายการยังรอตรวจยืนยันคู่แข่งและคะแนนรอบชิง จึงไม่ระบุผลการแข่งขันล่วงหน้า</p>
 <div class="kicker" style="margin-top:4mm">สิ่งที่แก้ในฉบับนี้</div>
 <div class="cols">
  <div class="panel"><div class="panel-title">จุดแก้สำคัญ</div><p>เอาข้อความอ้างอิง V3 สำหรับตรวจเทียบออกจากหน้ากติกา เพิ่มหน้ารวมจุดสังเกตที่กดไปยังหน้าที่เกี่ยวข้องได้ และเติม QR code สำหรับเข้าเว็บกีฬากลุ่มหนองกุ่ม</p></div>
  <div class="panel"><div class="panel-title">รายการที่แก้ตามผู้จัด</div><p>แก้ผังและตาราง <b>เปตอง 10 ปีชาย</b> ให้คู่ที่ 2 เป็น “รางขาม – ทุ่งมะสังฯ” และคู่ที่ 10 เป็น “ผู้ชนะคู่ที่ 3 – ผู้ชนะคู่ที่ 4” รวมทั้งแก้ <b>ตะกร้อคู่ที่ 24</b> ให้เป็นรุ่น <b>12 ปีหญิง</b></p></div>
 </div>
 <div class="panel" style="margin-top:3mm"><div class="panel-title">วิธีใช้สูจิบัตร</div><p>เปิดสารบัญหน้า 3 เพื่อเลือกกีฬาและตารางที่ต้องการ จากนั้นกด “กลับสารบัญ” ที่ท้ายหน้า เมื่อต้องการตรวจรายการสำคัญอย่างรวดเร็ว ให้เปิดหน้า 94 ซึ่งรวบรวมจุดสังเกตพร้อมลิงก์ไปยังหน้าที่เกี่ยวข้อง</p></div>
'''
SUMMARY=frame('01 · ภาพรวมการแข่งขัน','บทสรุปผู้บริหาร','รายการแข่งขัน ข้อมูลผู้เข้าชิง และเรื่องที่ปรับแก้ในฉบับนี้',summary_body,2)


def toc_item_html(no,label,p):
    icon=''
    for s in SPORTS:
        if s in label:
            icon=SPORT_ICONS.get(s,'')+' '
            break
    return f'<div class="toc-item"><span class="no">{no}</span><span class="name">{icon}{label}</span><span class="page-no">{p:02d}</span></div>'

toc_items=[('01','บทสรุปผู้บริหาร',2),('02','สารบัญและการนำทาง',3),('03','หลักเกณฑ์และกติกา',4),('04','ผังสาย 44 กลุ่ม',6),('05','ตารางแข่งขันกีฬา',50),('06','กรีฑาและตารางลู่',73),('07','รวมจุดสังเกตที่ต้องตรวจสอบ',94)] + [(f'{i+8:02d}',f'ตาราง{sport}',SRC_TO_NEW[SCHEDULE_FIRST[sport]]) for i,sport in enumerate(SPORTS)]
toc_cards=''.join(toc_item_html(no,label,p) for no,label,p in toc_items)
toc_sports=''.join(f'<span class="sport-chip">{SPORT_ICONS.get(s,"")}&nbsp;{s} · {SRC_TO_NEW[BRACKET_FIRST[s]]:02d}</span>' for s in SPORTS)
TOC=frame('02 · เลือกหน้าได้ทันที','สารบัญและการนำทาง','คลิกชื่อหัวข้อเพื่อไปยังหน้านั้น และเลือก “กลับสารบัญ” เมื่ออ่านเสร็จ',f'''
 <div class="toc-grid">{toc_cards}</div>
 <div class="toc-sub">หน้าผังสายของแต่ละชนิดกีฬา</div>
 <div class="sport-grid">{toc_sports}</div>
 <div class="cols" style="margin-top:4mm;align-items:start">
   <div class="panel"><div class="panel-title">สรุปการแก้รอบนี้</div><p>แก้ข้อมูลเปตอง 10 ปีชายในผังและตาราง, แก้ตะกร้อคู่ที่ 24 เป็น 12 ปีหญิง, และเพิ่มหน้า 94 สำหรับรวมจุดสังเกตแบบกดไปตรวจต่อได้</p></div>
   <div class="panel accent"><div class="panel-title">สแกนเข้าเว็บกีฬากลุ่มหนองกุ่ม</div>
     <div style="display:flex;gap:4mm;align-items:center"><img src="qr_web.png" alt="QR" style="width:25mm;height:25mm;border:1px solid #dbe5eb;padding:1mm;background:white"><div><p style="font-size:12.2px;line-height:1.45">เปิดดูตารางแข่งขัน ผล อันดับ และข้อมูลสนามจากเว็บไซต์</p><p class="ref" style="margin-top:1mm">{WEB_URL}</p></div></div>
   </div>
 </div>
''',3)

review_cards=[
    ('A','หน้า 23 · เซปักตะกร้อคู่ที่ 24','ระบุในผังให้คู่ที่ 24 เป็นรุ่น 12 ปีหญิง','หน้า 23',23),
    ('B','หน้า 31 · เปตอง 10 ปีชาย','ผังแก้คู่ที่ 2 เป็น รางขาม – ทุ่งมะสังฯ และคู่ที่ 10 ใช้ผู้ชนะคู่ที่ 3 กับคู่ที่ 4','หน้า 31',31),
    ('C','หน้า 32 · เปตอง 10 ปีหญิง','มีบันทึกว่าบ้านวังด้งเข้าชิง','หน้า 32',32),
    ('D','หน้า 33 · เปตอง 12 ปีชาย','มีบันทึกว่าบ้านวังด้งเข้าชิง','หน้า 33',33),
    ('E','หน้า 62 · ตารางเซปักตะกร้อ','แก้แถวคู่ที่ 24 เป็นรุ่น 12 ปีหญิง','หน้า 62',62),
    ('F','หน้า 64 · ตารางเปตอง','แก้คู่ที่ 2 และคู่ที่ 10 ของรุ่น 10 ปีชาย','หน้า 64',64),
    ('G','หน้า 67 · ตารางเปตองรอบชิง','แสดงหมายเหตุว่าบ้านวังด้งเข้าชิง 10 ปีหญิง และ 12 ปีชาย','หน้า 67',67),
]
notes_cards=''.join(
    f'''<div class="notes-card"><h2>{code} · {title}</h2><p>{desc}</p><p class="ref" style="margin-top:1mm">กดเพื่อไปตรวจที่ {label}</p></div>'''
    for code,title,desc,label,_ in review_cards
)
notes_body=f'''
 <div class="status"><b>หน้ารวมจุดสังเกต:</b> ใช้หน้านี้เป็นศูนย์กลางตรวจรายการสำคัญ แล้วกดไปดูหน้าที่เกี่ยวข้องได้ทันที</div>
 <div class="two-col">{notes_cards}</div>
 <div class="kicker" style="margin-top:4mm">เช็กลำดับก่อนเผยแพร่</div>
 <div class="panel"><ol class="numlist">
 <li><b>ตรวจชื่อทีมและเลขคู่</b> ในผังสายและตารางแข่งขัน โดยเฉพาะเปตอง 10 ปีชาย และตะกร้อคู่ที่ 24</li>
 <li><b>ตรวจข้อความผู้เข้าชิง</b> ให้ตรงกับข้อมูลที่ผู้จัดแจ้งล่าสุด ว่าบ้านวังด้งเข้าชิงเปตอง 10 ปีหญิง และ 12 ปีชาย</li>
 <li><b>ทดลองเปิดบนโทรศัพท์และพิมพ์ A4</b> เพื่อเช็กความอ่านง่ายของตัวอักษรและลิงก์นำทาง</li>
 <li><b>ตรวจ QR code และลิงก์ภายใน</b> ให้ใช้งานได้จริงก่อนเผยแพร่</li>
 </ol></div>
 <p class="smallnote" style="margin-top:3mm">หมายเหตุ: หน้านี้แทนหน้าข้อสังเกตเดิม และใช้เป็นจุดรวมสำหรับตรวจงานก่อนประกาศใช้อย่างเป็นทางการ</p>
'''
NOTES=frame('07 · รวมจุดสังเกต','จุดสังเกตที่ต้องตรวจสอบ','สรุปรายการสำคัญที่ยังต้องดูซ้ำ พร้อมลิงก์ไปยังหน้าที่เกี่ยวข้อง',notes_body,94)


def render_html(source,title):
    source=source.replace('ำ','ํา')
    path=OUT.parent/(title+'.html');path.write_text(source,encoding='utf-8')
    result=OUT.parent/(title+'.pdf')
    HTML(string=source,base_url=str(ROOT)).write_pdf(str(result),stylesheets=[CSS(filename=str(CSS_FILE))])
    d=fitz.open(result)
    if len(d)!=1: raise RuntimeError(f'{title} unexpectedly produced {len(d)} pages')
    return result

summary=render_html(SUMMARY,'executive-summary-r30c')
toc=render_html(TOC,'contents-r30c')
notes=render_html(NOTES,'review-notes-r30c')
source=fitz.open(SRC)
out=fitz.open()
out.insert_pdf(source,from_page=0,to_page=0)
with fitz.open(summary) as p: out.insert_pdf(p)
with fitz.open(toc) as p: out.insert_pdf(p)
out.insert_pdf(source,from_page=40,to_page=41)
out.insert_pdf(source,from_page=43,to_page=130)
with fitz.open(notes) as p: out.insert_pdf(p)
assert len(out)==TOTAL

# Standard footer/page number replacement.
for src,final in SRC_TO_NEW.items():
    if src==1: continue
    p=out[final-1]
    y=785 if src in (41,42) else 775 if 44<=src<=87 else 799
    red=fitz.Rect(0,y,p.rect.width,p.rect.height)
    p.add_redact_annot(red,fill=WHITE)
    p.apply_redactions(images=0,graphics=0,text=0)
    p.draw_line((35,807),(560,807),color=(.84,.89,.92),width=.7)
    p.insert_text((378,825),f'{final:02d} / {TOTAL}',fontsize=8,fontname='helv',color=NAVY)

header_html='''<html lang="th"><meta charset="utf-8"><style>
@page{size:500pt 32pt;margin:0} html,body{margin:0;padding:0}
main{height:32pt;display:flex;align-items:center;justify-content:space-between;color:#123859;font-family:"Noto Sans Thai";font-size:13pt;font-weight:700;border-bottom:1pt solid #bd8d33}
small{font-size:11pt;font-weight:400;color:#536b7d}</style><main><span>มิตรภาพเกมส์ 2569</span><small>ฉบับตรวจร่าง</small></main></html>'''
footer_html='''<html lang="th"><meta charset="utf-8"><style>
@page{size:250pt 23pt;margin:0} html,body{margin:0;padding:0}
main{color:#2f566f;font-family:"Noto Sans Thai";font-weight:600;font-size:11pt;padding-top:3pt}</style>
<main>ฉบับตรวจร่าง · ยังไม่ใช่ประกาศผล</main></html>'''
head_path=OUT.parent/'friendly-header-r30c.pdf'; foot_path=OUT.parent/'friendly-footer-r30c.pdf'
HTML(string=header_html).write_pdf(str(head_path)); HTML(string=footer_html).write_pdf(str(foot_path))
with fitz.open(head_path) as hd, fitz.open(foot_path) as ft:
    for i in range(3,93):
        pp=out[i]
        if i < 49:
            pp.add_redact_annot(fitz.Rect(0,0,pp.rect.width,29),fill=(1,1,1))
            pp.add_redact_annot(fitz.Rect(38,34,568,55),fill=(1,1,1))
            if i>=5: pp.add_redact_annot(fitz.Rect(424,52,567,78),fill=(1,1,1))
        else:
            pp.add_redact_annot(fitz.Rect(40,35,585,59),fill=(1,1,1))
            pp.add_redact_annot(fitz.Rect(40,59,581,82),fill=(1,1,1))
        pp.apply_redactions(images=0,graphics=0,text=0)
        pp.show_pdf_page(fitz.Rect(41,3,541,35),hd,0,overlay=True)
        pp.show_pdf_page(fitz.Rect(41,809,291,832),ft,0,overlay=True)

# Finalist notes.
label_html_template='''<html lang="th"><meta charset="utf-8"><style>
@page{size:515pt 72pt;margin:0} html,body{margin:0;padding:0}
.note{height:72pt;background:#fffaf0;border:1.5pt solid #c49440;border-left:7pt solid #123859;box-sizing:border-box;padding:7pt 12pt;color:#153e5d;font-family:"Noto Sans Thai"}
.h{font-size:13.5pt;font-weight:700;line-height:1.45}.s{font-size:10.6pt;color:#6a5939;margin-top:2pt}
</style><div class="note"><div class="h">{headline}</div><div class="s">แจ้งโดยผู้จัด 15 พฤศจิกายน 2569 · รอยืนยันคู่แข่งและคะแนนรอบชิง</div></div></html>'''
for destidx,headline in ((31,'เปตอง 10 ปีหญิง · บ้านวังด้งเข้ารอบชิงชนะเลิศ'),(32,'เปตอง 12 ปีชาย · บ้านวังด้งเข้ารอบชิงชนะเลิศ'),(66,'เปตอง 10 ปีหญิง และ 12 ปีชาย · บ้านวังด้งเข้าชิง')):
    label_path=OUT.parent/f'petanque-finalist-r30c-{destidx+1}.pdf'
    HTML(string=label_html_template.replace('{headline}',headline)).write_pdf(str(label_path))
    with fitz.open(label_path) as lab:
        area=fitz.Rect(40,647,555,719) if destidx in (31,32) else fitz.Rect(40,529,555,601)
        out[destidx].show_pdf_page(area,lab,0,overlay=True)

# Friendly subtitle on schedule and athletics pages.
for pageidx in range(49,93):
    pp=out[pageidx]
    sports_page=bool(pp.search_for('ใช้ข้อมูลรายการตามสูจิบัตร'))
    athletics_page=bool(pp.search_for('คงลู่และโรงเรียนตามสูจิบัตร'))
    if not (sports_page or athletics_page): continue
    area=fitz.Rect(42,133.3,402,143.9)
    pp.add_redact_annot(area,fill=(1,1,1)); pp.apply_redactions(images=0,graphics=0,text=0)
    line='ข้อมูลสำหรับตรวจทาน · ไม่ใช่ผลการแข่งขันที่รับรอง' if sports_page else 'ข้อมูลการจัดลู่ตามร่าง · เว้นช่องชื่อและอันดับไว้'
    snippet=f'''<html lang="th"><meta charset="utf-8"><style>@page{{size:{area.width}pt {area.height}pt;margin:0}}html,body{{margin:0;padding:0}}main{{color:#4b6374;font:8.4pt/1.1 "Noto Sans Thai";padding:0;margin:0}}</style><main>{line}</main></html>'''
    spath=OUT.parent/f'friendly-subtitle-r30c-{pageidx}.pdf'; HTML(string=snippet).write_pdf(str(spath))
    with fitz.open(spath) as fragment: pp.show_pdf_page(area,fragment,0,overlay=True)

# Helper to patch localized regions with Thai text through WeasyPrint.
def overlay_fragment(page, area, inner_html, name, fill=(1,1,1)):
    page.add_redact_annot(area, fill=fill)
    page.apply_redactions(images=0, graphics=0, text=0)
    frag_html=f'''<html lang="th"><meta charset="utf-8"><style>
    @page{{size:{area.width}pt {area.height}pt;margin:0}}
    html,body{{margin:0;padding:0}}
    body{{font-family:"Noto Sans Thai";color:#173e60}}
    .wrap{{width:{area.width}pt;height:{area.height}pt;box-sizing:border-box}}
    </style>{inner_html}</html>'''
    frag_path=OUT.parent/f'frag-{name}.pdf'
    HTML(string=frag_html).write_pdf(str(frag_path))
    with fitz.open(frag_path) as frag:
        page.show_pdf_page(area, frag, 0, overlay=True)

# Page 4: remove V3 comparison text, replace with plain language note.
p4=out[3]
area=fitz.Rect(51,417,548,434)
overlay_fragment(p4, area, '<div class="wrap" style="font-size:10.5pt;color:#5c7180">ตรวจยืนยันเกณฑ์คะแนนรวมและเงื่อนไขการจัดอันดับก่อนประกาศใช้ โดยแยกออกจากคะแนนการแข่งขันฟุตบอล</div>', 'p04-plainnote')

# Page 23: Sepak takraw pair 24 should be female.
p23=out[22]
overlay_fragment(p23, fitz.Rect(74,395,557,428), '<div class="wrap" style="background:#fff9ef;border:1.2pt dashed #c88b22;padding:8pt 12pt;font-size:11.5pt;color:#81571b"><b>คู่ 24</b> ใช้ในรุ่น <b>12 ปีหญิง</b> ตามข้อมูลตรวจยืนยัน และสัมพันธ์กับรอบชิงหญิง</div>', 'p23-row24', fill=(1,1,1))
overlay_fragment(p23, fitz.Rect(53,472,554,524), '<div class="wrap" style="background:#f5ebdb;border-left:5pt solid #c88b22;padding:10pt 14pt;font-size:11pt;line-height:1.55"><b>มีจุดต้องตรวจ</b><br>• คู่ 24 แก้เป็น <b>12 ปีหญิง</b> ให้ตรงกับการประกบในรอบชิงหญิง</div>', 'p23-note', fill=(0.98,0.95,0.90))

# Page 31: Petanque 10-year boys bracket fixes.
p31=out[30]
overlay_fragment(p31, fitz.Rect(69,429,168,444), '<div class="wrap" style="font-size:10.3pt">ทุ่งมะสังฯ</div>', 'p31-q2-line2', fill=(1,1,1))
overlay_fragment(p31, fitz.Rect(338,362,424,389), '<div class="wrap" style="font-size:10pt;line-height:1.38">ชนะคู่ 3<br>ชนะคู่ 4</div>', 'p31-q10', fill=(1,1,1))
overlay_fragment(p31, fitz.Rect(54,620,552,709), '<div class="wrap" style="background:#f5ebdb;border-left:5pt solid #c88b22;padding:10pt 14pt;font-size:10.8pt;line-height:1.55"><b>⚠ มีจุดต้องตรวจ</b><br>• คู่ 2: <b>รางขาม – ทุ่งมะสังฯ</b><br>• คู่ 9: รอบรองใช้ผู้ชนะคู่ 1 พบผู้ชนะคู่ 2<br>• คู่ 10: รอบรองใช้ผู้ชนะคู่ 3 พบผู้ชนะคู่ 4</div>', 'p31-note', fill=(0.98,0.95,0.90))

# Page 62: schedule pair 24 should be 12-year female, and note updated.
p62=out[61]
overlay_fragment(p62, fitz.Rect(131,345,178,364), '<div class="wrap" style="font-size:10.8pt">12 ปี หญิง</div>', 'p62-row24-cat', fill=(1,1,1))
overlay_fragment(p62, fitz.Rect(55,779,557,799), '<div class="wrap" style="background:#f5ebdb;padding:3pt 8pt;font-size:9.6pt;color:#8a641f"><b>ข้อสังเกต:</b> คู่ที่ 24 ใช้รุ่น <b>12 ปีหญิง</b> เพื่อให้สัมพันธ์กับรอบชิงหญิงคู่ที่ 29</div>', 'p62-note', fill=(0.96,0.93,0.86))

# Page 64: schedule fixes for petanque 10-year boys.
p64=out[63]
overlay_fragment(p64, fitz.Rect(210,277,470,294), '<div class="wrap" style="font-size:11pt;font-weight:700">รางขาม – ทุ่งมะสังฯ</div>', 'p64-row2', fill=(1,1,1))
overlay_fragment(p64, fitz.Rect(210,575,470,592), '<div class="wrap" style="font-size:11pt;font-weight:700">ผู้ชนะคู่ที่ 3 – ผู้ชนะคู่ที่ 4 (รอบรอง)</div>', 'p64-row10', fill=(1,1,1))
overlay_fragment(p64, fitz.Rect(52,684,557,720), '<div class="wrap" style="background:#f5ebdb;border-left:3pt solid #c88b22;padding:6pt 9pt;font-size:10pt;line-height:1.45;color:#8a641f"><b>เปตอง 10 ปีชาย:</b> คู่ 2 เป็น <b>รางขาม – ทุ่งมะสังฯ</b> และคู่ 10 ใช้ <b>ผู้ชนะคู่ที่ 3 – ผู้ชนะคู่ที่ 4</b></div>', 'p64-subnote', fill=(0.96,0.93,0.86))
overlay_fragment(p64, fitz.Rect(53,764,557,798), '<div class="wrap" style="background:#f5ebdb;padding:6pt 9pt;font-size:9.3pt;line-height:1.4;color:#8a641f"><b>ข้อสังเกต:</b> ตรวจการใช้สนามซ้ำ เวลา 09:00, 10:00 และ 13:00 โดยสนาม 1 และ 2 ใช้คู่ละ 2 รายการ ควรตรวจคอร์ตอีกครั้งก่อนใช้งานจริง</div>', 'p64-bottomnote', fill=(0.96,0.93,0.86))

# Replace user-facing technical production notes with plain Thai on rule page.
plain_patches=[
 (3,fitz.Rect(42,63,175,83),'กติกาและเกณฑ์คะแนน',9.6,'#f5f2e9','#a77a2b'),
 (3,fitz.Rect(80,177,310,195),'กติกาการแข่งขัน · มิตรภาพเกมส์ 2569',10.2,'#123859','#e6bd60'),
 (3,fitz.Rect(44,720,555,775),'เกณฑ์ตัดสินฟุตบอลเมื่อคะแนนเท่ากัน และวิธีเข้ารอบ 4 ทีม\nต้องให้ผู้จัดตรวจยืนยันก่อนประกาศใช้',11.2,'#f5f2e9','#31516b'),
 (8,fitz.Rect(80,534,538,559),'คู่ที่ 7: ตรวจข้อมูลผู้เข้ารอบชิงให้ตรงกับสูจิบัตรต้นฉบับ',10.5,'#fff3df','#31516b')
]
for j,(pageidx,area,word,fontsize,bg,fg) in enumerate(plain_patches):
    bg_rgb=tuple(int(bg[i:i+2],16)/255 for i in (1,3,5))
    pp=out[pageidx]
    pp.add_redact_annot(area,fill=bg_rgb); pp.apply_redactions(images=0,graphics=0,text=0)
    pretty=word.replace('\n','<br>')
    patch_html=f'''<html lang="th"><meta charset="utf-8"><style>@page{{size:{area.width}pt {area.height}pt;margin:0}}html,body{{margin:0;padding:0}}div{{background:{bg};color:{fg};font:{fontsize}pt/1.45 "Noto Sans Thai";padding:3pt 3pt;height:{area.height}pt;box-sizing:border-box}}</style><div>{pretty}</div></html>'''
    ph=OUT.parent/f'plain-note-r30c-{j}.pdf'; HTML(string=patch_html).write_pdf(str(ph))
    with fitz.open(ph) as pdf: pp.show_pdf_page(area,pdf,0,overlay=True)

# Build Thai vector navigation label once and place onto all original pages.
nav_file=OUT.parent/'nav-r30c.pdf'
nav_html='<html lang="th"><style>@page{size:80pt 21pt;margin:0;}html,body{margin:0;padding:0}div{background:#123859;color:#fff;font:700 9pt "Noto Sans Thai";text-align:center;height:21pt;line-height:21pt;border-radius:3pt}</style><div>กลับสารบัญ</div></html>'
HTML(string=nav_html).write_pdf(str(nav_file))
with fitz.open(nav_file) as nav:
    for i in range(1,TOTAL):
        if i==2: continue
        p=out[i]
        area=fitz.Rect(464,814,555,836)
        if i in (1,93):
            hits=p.search_for('กลับสารบัญ')
            for rect in hits: p.insert_link({'kind':fitz.LINK_GOTO,'from':rect,'page':2,'to':fitz.Point(0,0)})
            continue
        p.show_pdf_page(area,nav,0,overlay=True)
        p.insert_link({'kind':fitz.LINK_GOTO,'from':area,'page':2,'to':fitz.Point(0,0)})

# TOC internal links.
p=out[2]
click_targets=[]
for _,label,n in toc_items:
    boxes=p.search_for(label.replace('ำ','ํา'))
    if not boxes: continue
    box=next((b for b in boxes if b.y0>170), boxes[-1])
    area=fitz.Rect(box.x0-18,box.y0-6,min(568,box.x1+44),box.y1+6)
    p.insert_link({'kind':fitz.LINK_GOTO,'from':area,'page':n-1,'to':fitz.Point(0,0)})
    click_targets.append({'text':label,'page':n,'bbox':list(area)})
for sport in SPORTS:
    label=f'{sport} · {SRC_TO_NEW[BRACKET_FIRST[sport]]:02d}'
    boxes=p.search_for(label.replace('ำ','ํา'))
    if boxes:
        area=fitz.Rect(boxes[0].x0-3,boxes[0].y0-3,boxes[0].x1+3,boxes[0].y1+3)
        p.insert_link({'kind':fitz.LINK_GOTO,'from':area,'page':SRC_TO_NEW[BRACKET_FIRST[sport]]-1,'to':fitz.Point(0,0)})
        click_targets.append({'text':label,'page':SRC_TO_NEW[BRACKET_FIRST[sport]]})
# QR and website link on TOC
for rect in p.search_for(WEB_URL):
    p.insert_link({'kind':fitz.LINK_URI,'from':rect,'uri':WEB_URL})
# image area roughly at TOC page right lower panel
p.insert_link({'kind':fitz.LINK_URI,'from':fitz.Rect(333,500,410,577),'uri':WEB_URL})

# Review page internal links.
review_page=out[93]
for _,title,desc,label,target in review_cards:
    boxes=review_page.search_for(title.replace('ำ','ํา'))
    if boxes:
        union=boxes[0]
        for r in boxes[1:]: union |= r
        area=fitz.Rect(40, union.y0-6, 555, min(union.y1+26, 650))
        review_page.insert_link({'kind':fitz.LINK_GOTO,'from':area,'page':target-1,'to':fitz.Point(0,0)})
for rect in review_page.search_for('QR code'):
    review_page.insert_link({'kind':fitz.LINK_URI,'from':rect,'uri':WEB_URL})

# Archive link from final review page.
archive_rect=review_page.search_for('หมายเหตุ:')
if archive_rect:
    pass
cover=out[0]
cover.insert_link({'kind':fitz.LINK_GOTO,'from':fitz.Rect(370,765,565,832),'page':2,'to':fitz.Point(0,0)})

bookmarks=[[1,'ปก — มิตรภาพเกมส์ 2569',1],[1,'บทสรุปผู้บริหาร',2],[1,'สารบัญและการนำทาง',3],[1,'กติกาและหลักเกณฑ์',4],[1,'ผังสายการแข่งขัน 44 กลุ่ม',6]]
for sport in SPORTS: bookmarks.append([2,'ผัง · '+sport,SRC_TO_NEW[BRACKET_FIRST[sport]]])
bookmarks.append([1,'ตารางการแข่งขันกีฬา',50])
for sport in SPORTS: bookmarks.append([2,'ตาราง · '+sport,SRC_TO_NEW[SCHEDULE_FIRST[sport]]])
bookmarks.extend([[1,'กรีฑาและตารางลู่',73],[1,'รวมจุดสังเกตที่ต้องตรวจสอบ',94]])
out.set_toc(bookmarks)
out.set_metadata({'title':'มิตรภาพเกมส์ 2569 — สูจิบัตรฉบับอ่านง่าย พร้อม QR และหน้ารวมจุดสังเกต (ฉบับตรวจร่าง)','author':'กลุ่มโรงเรียนหนองกุ่ม — เอกสารเพื่อการตรวจร่าง','subject':'สูจิบัตรฉบับอ่านง่ายสำหรับตรวจข้อมูล; เพิ่ม QR code และลิงก์รวมจุดสังเกต','keywords':'มิตรภาพเกมส์ 2569; สูจิบัตร; QR; เปตอง; เซปักตะกร้อ; ตรวจร่าง'})
out.save(OUT,garbage=4,deflate=True,clean=True)
out.close()
manifest={'version':'R30C','source_pdf_name':SRC.name,'source_pages':155,'output_pdf_name':OUT.name,'output_pages':TOTAL,'kept_source_pages':KEEP,'source_to_new':SRC_TO_NEW,'new_pages':{'executive_summary':2,'toc':3,'review_index':94},'toc_targets':click_targets,'web_url':WEB_URL,'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),'source_sha256':hashlib.sha256(SRC.read_bytes()).hexdigest()}
(OUT.parent/'source_map_r30c.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps({'output':str(OUT),'pages':TOTAL,'sha256':manifest['sha256'],'toc_links':len(click_targets)},ensure_ascii=False))

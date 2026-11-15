#!/usr/bin/env python3
"""R30-F: remove 88 bracket/schedule pages from R30-E while retaining source material.
All remaining original pages are kept as searchable vector content; only executive summary,
TOC and final review notes are regenerated to avoid dangling references. REVIEW ONLY.
"""
from __future__ import annotations
import argparse, base64, hashlib, io, json, re
from pathlib import Path
import fitz
import qrcode
from weasyprint import HTML

SITE = 'https://infobwd.github.io/nongkum-sports-hub/'
FULL_R30E = 'https://drive.google.com/file/d/1pxf1-Z08PjVbKg8zmuV1CSnutkjnWdh8/view'
SOURCE_155 = 'https://drive.google.com/file/d/16v6cgEk8NyjVqo7TX_Sxd3QvT2NF7aAS/view'
W,H = 595.2756,841.8898
NAVY = '#12395a'; GOLD='#bf8732'
TOC = [
    ('01', 'บทสรุปผู้บริหาร', 2),
    ('02', 'กำหนดการพิธีเปิด', 4),
    ('03', 'กำหนดการพิธีปิด', 6),
    ('04', 'สีประจำโรงเรียน', 7),
    ('05', 'คำปฏิญาณนักกีฬา', 8),
    ('06', 'ประกาศกลุ่ม (รอตรวจ)', 9),
    ('07', 'กติกาและหลักเกณฑ์', 20),
    ('08', 'รายชื่อกรรมการ (รอตรวจ)', 22),
    ('09', 'ข้อสังเกตและแหล่งข้อมูล', 44),
]
# output 1-indexed page -> R30-E 1-indexed page, excluding regenerated pages
KEEP = {1:1}
KEEP.update({p:p for p in range(4,22)})
KEEP.update({p:p+88 for p in range(22,44)})

def qr_data():
    qr=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H,box_size=8,border=3)
    qr.add_data(SITE);qr.make(fit=True)
    b=io.BytesIO();qr.make_image(fill_color='#133b5c',back_color='white').save(b,format='PNG')
    return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()

COMMON_CSS='''
@page {size:A4;margin:0}
html,body{margin:0;padding:0;font-family:"Noto Sans Thai","Waree",sans-serif;background:#fff;color:#143958}
*{box-sizing:border-box}
.top{height:8pt;position:absolute;top:0;left:0;width:595pt;background:linear-gradient(90deg,#12395a 0%,#17667a 78%,#ca9544 100%)}
.header{position:absolute;left:46pt;right:46pt;top:52pt;height:30pt;display:flex;justify-content:space-between;border-bottom:1pt solid #dbe5e9;font-size:8.1pt;color:#4e7286}
.flag{position:absolute;top:99pt;left:46pt;font-size:9pt;font-weight:700;color:#ac7c2c}
h1{position:absolute;top:121pt;left:46pt;font-size:25pt;line-height:1.2;margin:0;color:#12395a}
.desc{position:absolute;top:169pt;left:46pt;right:46pt;margin:0;font-size:9pt;color:#547188;line-height:1.6}
.rule{position:absolute;top:192pt;left:46pt;width:90pt;border-top:2pt solid #c5923b}
.note-box{border:1pt solid #d7e2e8;border-left:3pt solid #b9842f;background:#f5f8f8;border-radius:4pt}
.small{font-size:8pt;color:#47697e;line-height:1.6}
strong{color:#163f5d}
.qr{width:100pt;height:100pt;padding:3pt;background:#fff;border:1pt solid #c7d8df;border-radius:3pt}
'''

def render_html(path:Path,html:str):
    HTML(string=html,base_url=str(path.parent)).write_pdf(path)
    with fitz.open(path) as d:assert len(d)==1

def summary_html():
    q=qr_data()
    cards=[('8','โรงเรียนเข้าร่วม'),('236','รายการแข่งขันทั้งหมด'),('186','คู่แข่งขันกีฬา'),('50','รายการกรีฑา')]
    card_html=''.join('<div class="stat"><b>'+x+'</b><span>'+label+'</span></div>' for x,label in cards)
    return f'''<!doctype html><html lang="th"><meta charset="utf-8"><style>{COMMON_CSS}
    .stats{{position:absolute;left:46pt;top:221pt;display:grid;grid-template-columns:repeat(4,120pt);gap:7pt}}
    .stat{{height:88pt;border:1pt solid #dce6ea;background:#f5f8fa;border-radius:5pt;text-align:center;padding:12pt 3pt}}
    .stat b{{display:block;color:#113b5b;font-size:24pt;line-height:1.2}}
    .stat span{{font-size:8pt;color:#557388}}
    .panel{{position:absolute;left:46pt;right:46pt;top:338pt;padding:15pt;border-radius:5pt;background:#f2f6f8;border:1pt solid #dce5e9}}
    .panel h2{{font-size:12pt;margin:0 0 8pt;color:#133c5b}}.panel p{{font-size:9.3pt;line-height:1.75;margin:5pt 0}}
    .twocol{{position:absolute;top:495pt;left:46pt;right:46pt;display:flex;gap:12pt}}
    .item{{flex:1;height:112pt;padding:13pt;border:1pt solid #dce4e8;border-left:3pt solid #c58c35;border-radius:4pt}}
    .item b{{display:block;font-size:9.8pt;margin-bottom:7pt;color:#133c5b}}.item p{{font-size:8.5pt;line-height:1.7;margin:0}}
    .bottom{{position:absolute;left:46pt;right:46pt;top:637pt;height:134pt;border-radius:5pt;background:#eaf4f6;border:1pt solid #c9dfe6;padding:13pt;display:flex;gap:14pt}}
    .bottom h2{{margin:0 0 5pt;font-size:11pt;color:#133c5b}}.bottom p{{margin:0;font-size:8.5pt;line-height:1.7;color:#42647b}}
    </style><div class="top"></div><div class="header"><span>มิตรภาพเกมส์ 2569 · กีฬากลุ่มหนองกุ่ม</span><span>ฉบับตรวจร่าง · 15 พฤศจิกายน 2569</span></div>
    <div class="flag">01 · ภาพรวมการแข่งขัน</div><h1>บทสรุปผู้บริหาร</h1>
    <p class="desc">เอกสารส่วนพิธีการ ประกาศ และคณะกรรมการ · รายละเอียดผังและตารางแข่งขันเปิดดูได้ผ่านเว็บไซต์</p><div class="rule"></div>
    <div class="stats">{card_html}</div>
    <div class="panel"><h2>ข้อมูลสำคัญสำหรับผู้บริหารและผู้จัดการแข่งขัน</h2>
    <p>เจ้าภาพ: <b>โรงเรียนบ้านหนองกระทุ่ม</b> · การแข่งขันหลัก 16–20 พฤศจิกายน 2569 · เปตองนอกรอบ 12–13 พฤศจิกายน 2569</p>
    <p>เล่มนี้จัดไว้สำหรับตรวจสอบกำหนดการพิธี สีประจำโรงเรียน คำปฏิญาณนักกีฬา ประกาศ และหน้าที่กรรมการ โดยไม่รวมผังการแข่งขันและตารางกีฬา–กรีฑา</p></div>
    <div class="twocol"><div class="item"><b>รายงานผู้เข้ารอบชิงที่ได้รับแจ้ง</b><p>โรงเรียนบ้านวังด้งเข้ารอบชิงเปตอง 10 ปีหญิง และ 12 ปีชาย ตามข้อมูลผู้จัดแจ้ง 15 พฤศจิกายน 2569</p></div>
    <div class="item"><b>สถานะการตรวจรับ</b><p>คู่แข่งและคะแนนรอบชิงยังไม่ยืนยัน ห้ามระบุผู้ชนะหรือผลการแข่งขันเป็นทางการ และรายชื่อกรรมการยังต้องตรวจเทียบคำสั่งที่ลงนาม</p></div></div>
    <div class="bottom"><img class="qr" src="{q}"><div><h2>ตารางแข่งขันและผังการแข่งขันออนไลน์</h2>
    <p>สแกน QR Code เพื่อเปิดเว็บไซต์มิตรภาพเกมส์ 2569 ดูผัง ตาราง และข้อมูลการตรวจสอบได้จากต้นทาง โดยไม่ต้องเพิ่มเนื้อหาเหล่านั้นกลับในเล่มพิธีการ</p>
    <p><b>{SITE}</b></p><p>ฉบับตรวจร่าง · ไม่ใช่ประกาศผลหรือเอกสารแต่งตั้งที่รับรองแล้ว</p></div></div>
    </html>'''

def toc_html():
    q=qr_data(); cards=[]
    for i,(no,title,page) in enumerate(TOC):
        col=i%2;row=i//2;left=47+col*253;top=216+row*54
        cards.append(f'<div class="card" style="left:{left}pt;top:{top}pt"><span class="number">{no}</span><span class="name">{title}</span><span class="pg">{page:02}</span></div>')
    return f'''<!doctype html><html lang="th"><meta charset="utf-8"><style>{COMMON_CSS}
    .card{{position:absolute;width:245pt;height:46pt;border:1pt solid #d8e2e7;border-left:2.6pt solid #bd8732;border-radius:3pt;background:#f5f8f9;display:flex;align-items:center;padding:0 10pt;gap:7pt}}
    .number{{color:#ba832c;font-size:9pt;font-weight:750}}.name{{font-size:9.1pt;font-weight:700;flex:1}}.pg{{font-size:10pt;font-weight:800}}
    .scope{{position:absolute;top:512pt;left:47pt;right:47pt;padding:15pt 17pt;height:91pt}}
    .scope b{{display:block;margin-bottom:7pt;font-size:10.4pt}}.scope p{{margin:0;font-size:8.9pt;line-height:1.6}}
    .qrbox{{position:absolute;top:630pt;left:47pt;right:47pt;height:140pt;border:1pt solid #c8dce3;background:#eef6f8;border-radius:5pt;padding:14pt;display:flex;gap:17pt}}
    .qrbox h2{{font-size:11pt;margin:0 0 7pt}}.qrbox p{{font-size:8.8pt;line-height:1.6;margin:0 0 6pt}}
    </style><div class="top"></div><div class="header"><span>มิตรภาพเกมส์ 2569 · กีฬากลุ่มหนองกุ่ม</span><span>ฉบับตรวจร่าง · 15 พฤศจิกายน 2569</span></div>
    <div class="flag">02 · เลือกหน้าได้ทันที</div><h1>สารบัญและการนำทาง</h1><p class="desc">กดหัวข้อเพื่อเปิดหน้าที่ต้องการ และกด “กลับสารบัญ” เมื่ออ่านเสร็จ</p><div class="rule"></div>
    {''.join(cards)}
    <div class="scope note-box"><b>ฉบับพิธีการและคณะกรรมการ 44 หน้า</b><p>ตัดหมวดผังการแข่งขันและตารางแข่งขันกีฬา–กรีฑาออกจากเล่มนี้แล้ว โดยเก็บข้อมูลการแข่งขันไว้ในเว็บไซต์ และเก็บ PDF ฉบับเต็มเดิมสำหรับตรวจย้อนหลัง</p></div>
    <div class="qrbox"><img class="qr" src="{q}"><div><h2>สแกนเพื่อเปิดผังและตารางแข่งขัน</h2><p>ข้อมูลการแข่งขันอยู่บนเว็บไซต์มิตรภาพเกมส์ 2569 แยกจากสูจิบัตรฉบับพิธีการ</p><p><b>{SITE}</b></p><p class="small">รายชื่อและประกาศในเล่มนี้ยังอยู่ระหว่างตรวจรับ</p></div></div>
    </html>'''

def notes_html():
    q=qr_data()
    issues=[
    ('01', 'กำหนดการพิธีเปิด–ปิด', 'ตรวจยืนยันเวลา ลำดับพิธี ผู้รับผิดชอบ และสถานที่ก่อนใช้งานจริง', '04–06'),
    ('02', 'สีประจำโรงเรียน', 'ชื่อสีตามเอกสารต้นทาง แต่เฉดสีในการจัดหน้าเป็นเพียงตัวอย่าง ยังต้องให้โรงเรียนตรวจรับ', '07'),
    ('03', 'ประกาศกลุ่ม', 'ประกาศหน้า 9–19 ยังเป็นฉบับตรวจร่าง ตรวจเลขข้อที่ซ้ำ ชื่อ ตำแหน่ง และฉบับลงนาม', '09–19'),
    ('04', 'รายชื่อกรรมการ', 'บัญชีหน้า 22–43 ใช้ตรวจเทียบรายชื่อและสังกัด อาจมีรหัสตรวจร่างจากต้นฉบับ ไม่ใช่คำสั่งที่รับรองแล้ว', '22–43'),
    ('05', 'หลักเกณฑ์การแข่งขัน', 'กติกาบางข้อและเกณฑ์คะแนนรวมยังต้องผ่านการตรวจรับจากผู้จัด', '20–21'),
    ]
    rows=''.join(f'<div class="issue"><span class="num">{no}</span><div><b>{ttl}</b><p>{desc}</p></div><span class="pages">หน้า {pg}</span></div>' for no,ttl,desc,pg in issues)
    return f'''<!doctype html><html lang="th"><meta charset="utf-8"><style>{COMMON_CSS}
    h1{{top:112pt;font-size:22pt}}.desc{{top:158pt}}.rule{{top:192pt}}
    .rows{{position:absolute;top:216pt;left:46pt;right:46pt}}
    .issue{{height:70pt;border:1pt solid #dbe4e8;border-left:3pt solid #bf8732;border-radius:4pt;padding:9pt 11pt;display:flex;gap:10pt;align-items:flex-start;margin-bottom:9pt;background:#f7f9fa}}
    .num{{font-weight:800;color:#ae7a2c;font-size:9pt;min-width:23pt}}.issue b{{font-size:9.5pt}}.issue p{{font-size:8.2pt;line-height:1.48;color:#527083;margin:3pt 0;max-width:370pt}}
    .pages{{font-size:7.8pt;color:#957130;margin-left:auto;white-space:nowrap}}
    .refs{{position:absolute;top:625pt;left:46pt;right:46pt;height:158pt;border:1pt solid #c8dce3;background:#edf5f8;border-radius:5pt;padding:11pt;display:flex;gap:14pt}}
    .refs h2{{font-size:10.8pt;margin:0 0 6pt}}.refs p{{font-size:8.2pt;line-height:1.7;margin:0 0 4pt;color:#4c6b7e}}
    .refs .link{{color:#075e8a;font-size:7.7pt;word-break:break-all}}
    </style><div class="top"></div><div class="header"><span>มิตรภาพเกมส์ 2569 · กีฬากลุ่มหนองกุ่ม</span><span>ฉบับตรวจร่าง · 15 พฤศจิกายน 2569</span></div>
    <div class="flag">09 · ข้อสังเกตและแหล่งข้อมูล</div><h1>จุดที่ต้องตรวจรับก่อนเผยแพร่</h1><p class="desc">ตรวจเฉพาะส่วนพิธีการ สี ประกาศ กติกา และกรรมการตามขอบเขตฉบับนี้</p><div class="rule"></div>
    <div class="rows">{rows}</div><div class="refs"><img class="qr" src="{q}"><div><h2>แหล่งข้อมูลและเอกสารฉบับเต็ม</h2><p>ผังและตารางแข่งขันไม่ได้อยู่ใน PDF ฉบับนี้; ดูข้อมูลการแข่งขันบนเว็บไซต์หรือสูจิบัตรฉบับเต็มเดิม</p>
    <p class="link">เว็บไซต์: {SITE}</p><p class="link">ฉบับ R30-E 132 หน้า: {FULL_R30E}</p><p class="link">ต้นฉบับ R25D3 155 หน้า: {SOURCE_155}</p>
    <p>ยังไม่รับรอง · ไม่ใช่ประกาศหรือผลการแข่งขันทางการ</p></div></div></html>'''

def footer_pdf(path:Path):
    content=f'''<!doctype html><html lang="th"><meta charset="utf-8"><style>@page{{size:595.276pt 40pt;margin:0}}html,body{{margin:0;padding:0;font-family:"Noto Sans Thai","Waree",sans-serif}}.line{{border-top:.8pt solid #d7e1e8;position:absolute;top:0;left:42pt;width:511pt}}.left{{position:absolute;left:42pt;top:10pt;font-size:8pt;color:#517185}}.nav{{position:absolute;left:471pt;top:6pt;width:80pt;height:23pt;line-height:23pt;border-radius:2pt;text-align:center;background:#143d5b;color:white;font-size:8pt;font-weight:700}}</style><div class="line"></div><div class="left">มิตรภาพเกมส์ 2569 · ฉบับพิธีการและกรรมการ · ตรวจร่าง</div><div class="nav">กลับสารบัญ</div></html>'''
    render_html(path,content)

def make(src:Path,out:Path,working:Path):
    working.mkdir(parents=True,exist_ok=True);out.parent.mkdir(parents=True,exist_ok=True)
    src_doc=fitz.open(src); assert len(src_doc)==132
    generated={}
    for stem,html in [('summary',summary_html()),('toc',toc_html()),('notes',notes_html())]:
        (working/f'{stem}.html').write_text(html,encoding='utf-8');render_html(working/f'{stem}.pdf',html)
        generated[stem]=fitz.open(working/f'{stem}.pdf')
    footer_pdf(working/'footer.pdf');foot=fitz.open(working/'footer.pdf')
    doc=fitz.open()
    doc.insert_pdf(src_doc,from_page=0,to_page=0,links=False,annots=False)
    doc.insert_pdf(generated['summary'],links=False,annots=False)
    doc.insert_pdf(generated['toc'],links=False,annots=False)
    doc.insert_pdf(src_doc,from_page=3,to_page=20,links=False,annots=False)
    doc.insert_pdf(src_doc,from_page=109,to_page=130,links=False,annots=False)
    doc.insert_pdf(generated['notes'],links=False,annots=False)
    assert len(doc)==44,len(doc)
    for i in range(1,len(doc)):
        p=doc[i];r=fitz.Rect(0,802.6,W,H)
        p.add_redact_annot(r,fill=(1,1,1));p.apply_redactions(images=0,graphics=0,text=0)
        p.show_pdf_page(fitz.Rect(0,H-40,W,H),foot,0,overlay=True,keep_proportion=False)
        p.insert_text((393,826),f'{i+1:02d} / 44',fontsize=8.4,fontname='helv',color=(0.13,0.29,0.42),overlay=True)
        if i!=2:
            p.insert_link({'kind':fitz.LINK_GOTO,'from':fitz.Rect(467,805,557,837),'page':2,'to':fitz.Point(0,0)})
    # TOC live cards
    for i,(_,label,pageno) in enumerate(TOC):
        col=i%2;row=i//2;left=47+253*col;top=216+row*54
        doc[2].insert_link({'kind':fitz.LINK_GOTO,'from':fitz.Rect(left,top,left+245,top+46),'page':pageno-1,'to':fitz.Point(0,0)})
    doc[1].insert_link({'kind':fitz.LINK_URI,'from':fitz.Rect(46,637,549,770),'uri':SITE})
    doc[2].insert_link({'kind':fitz.LINK_URI,'from':fitz.Rect(47,630,548,770),'uri':SITE})
    # Footer note links in last page are independent from the QR
    doc[43].insert_link({'kind':fitz.LINK_URI,'from':fitz.Rect(46,625,145,768),'uri':SITE})
    doc[43].insert_link({'kind':fitz.LINK_URI,'from':fitz.Rect(160,680,547,715),'uri':FULL_R30E})
    doc[43].insert_link({'kind':fitz.LINK_URI,'from':fitz.Rect(160,717,547,743),'uri':SOURCE_155})
    toc=[(1,'ปก — มิตรภาพเกมส์ 2569',1),(1,'บทสรุปผู้บริหาร',2),(1,'สารบัญและ QR Code เว็บไซต์',3),
      (1,'กำหนดการพิธีเปิดการแข่งขัน',4),(1,'กำหนดการพิธีปิดการแข่งขัน',6),(1,'สีประจำโรงเรียน',7),
      (1,'คำปฏิญาณนักกีฬา',8),(1,'ประกาศกลุ่ม (ฉบับตรวจร่าง)',9),(1,'กติกาและหลักเกณฑ์',20),
      (1,'รายชื่อกรรมการ (ฉบับตรวจร่าง)',22)]
    for outpg in range(22,44):
        txt=doc[outpg-1].get_text()
        m=re.search(r'คณะกรรมการ\s*/\s*หมวด\s*(\d+)',txt)
        if m:toc.append((2,'บัญชีกรรมการ · หมวด '+m.group(1),outpg))
    toc.append((1,'ข้อสังเกตและแหล่งข้อมูล',44))
    doc.set_toc(toc)
    doc.set_metadata({**doc.metadata,'title':'มิตรภาพเกมส์ 2569 — สูจิบัตรพิธีการและคณะกรรมการ R30-F (ตรวจร่าง)',
      'subject':'R30-F ไม่มีผังหรือตารางแข่งขันกีฬาและกรีฑา / ฉบับตรวจร่าง ไม่ใช่ประกาศรับรอง',
      'keywords':'มิตรภาพเกมส์ 2569,R30-F,ceremony,committee,review-only,44 pages'})
    doc.save(out,garbage=4,deflate=True,clean=True)
    source_map={'pdf':out.name,'source':'R30-E 132 pages','source_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),
      'total_pages':44,'excluded_R30E_pages':list(range(22,110)),
      'pages':[{'output':i,'source':'generated R30-F '+({2:'summary',3:'toc',44:'notes'}.get(i,'page'))} if i in (2,3,44) else {'output':i,'source':'R30-E','source_page':KEEP[i]} for i in range(1,45)]}
    (working/'source_map.json').write_text(json.dumps(source_map,ensure_ascii=False,indent=2),encoding='utf-8')
    result={'file':out.name,'pages':len(doc),'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),
      'file_size':out.stat().st_size,'bookmarks':len(toc),'created_from':str(src),'excluded_pages':88,
      'toc_items':len(TOC),'source_map':str(working/'source_map.json')}
    (working/'build_result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False,indent=2))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--source',type=Path,required=True);parser.add_argument('--output',type=Path,required=True);parser.add_argument('--workdir',type=Path,required=True)
    args=parser.parse_args();make(args.source,args.output,args.workdir)

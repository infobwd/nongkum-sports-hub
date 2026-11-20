#!/usr/bin/env python3
"""R30-E assemble an editorial, complete review-only sports booklet from immutable PDFs.
Preserves original contest-page vector content; restores historical ceremony and
committee pages, builds new clickable TOC/QR, rewrites only footer, maps links.
Never assumes unapproved results/appointments are official.
"""
from __future__ import annotations
import argparse, base64, hashlib, io, json, re
from pathlib import Path
import fitz
import qrcode
from weasyprint import HTML

SITE='https://infobwd.github.io/nongkum-sports-hub/'
W,H=595.2756,841.8898
NAVY='#12395a'; GOLD='#bf8732'
TOC_ITEMS=[
 ('01','บทสรุปผู้บริหาร',2),('02','พิธีเปิดการแข่งขัน',4),
 ('03','พิธีปิดการแข่งขัน',6),('04','สีประจำโรงเรียน',7),
 ('05','คำปฏิญาณนักกีฬา',8),('06','ประกาศกลุ่ม',9),
 ('07','กติกาและหลักเกณฑ์',20),('08','ผังการแข่งขัน 44 กลุ่ม',22),
 ('09','ตารางแข่งขันกีฬา',66),('10','กรีฑาและตารางลู่',89),
 ('11','รายชื่อกรรมการ (ตรวจร่าง)',110),('12','ข้อสังเกตและที่มา',132),
]
SPORTS=[('ฟุตบอล',22,66),('ยิงจุดโทษ',25,69),('ฟุตซอล',26,71),('วอลเลย์บอล',31,73),
 ('เซปักตะกร้อ',39,76),('เปตอง',47,79),('เทเบิลเทนนิส',57,84),('ชักเย่อ',61,86)]

def page_to_final(old_idx):
    if old_idx <3:return old_idx
    if old_idx<=92:return old_idx+16
    if old_idx==93:return 131
    raise AssertionError(old_idx)

def qr_url():
    q=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H,box_size=6,border=3)
    q.add_data(SITE);q.make(fit=True)
    buf=io.BytesIO();q.make_image(fill_color='#143854',back_color='white').save(buf,format='PNG')
    return 'data:image/png;base64,'+base64.b64encode(buf.getvalue()).decode()

def make_toc(pdf_path:Path,html_path:Path):
    cards=[]
    for n,(seq,title,pageno) in enumerate(TOC_ITEMS):
        col=n%2;row=n//2;left=47+col*253;top=193+row*47
        cards.append(f'<div class="card" style="left:{left}pt;top:{top}pt"><span class="number">{seq}</span><span class="name">{title}</span><span class="pg">{pageno:02}</span></div>')
    sports=[]
    for i,(name,b,t) in enumerate(SPORTS):
        col=i%4;row=i//4;left=47+col*126.3;top=563+row*32
        sports.append(f'<div class="sport" style="left:{left}pt;top:{top}pt">{name} <small>ผัง {b:02} / ตาราง {t:02}</small></div>')
    html='''<!doctype html><html lang="th"><meta charset="utf-8"><style>
    @page{size:A4;margin:0}html,body{margin:0;padding:0;background:white;color:#173e60;font-family:"Noto Sans Thai","Waree",sans-serif}
    .top{height:8pt;background:linear-gradient(90deg,#193751 0%,#136b7e 82%,#d5aa53 100%)}
    .heading{position:absolute;left:47pt;right:47pt;top:49pt;font-size:8.6pt;display:flex;justify-content:space-between;border-bottom:1px solid #dce4e9;padding-bottom:8pt;font-weight:600}
    .flag{position:absolute;left:47pt;top:92pt;font-size:9pt;color:#b27a26;font-weight:700}
    h1{position:absolute;left:47pt;top:111pt;margin:0;font-size:24pt;line-height:1.3;color:#103653}
    .accent{position:absolute;left:47pt;top:154pt;width:85pt;height:1.5pt;background:#c78c32}
    .intro{position:absolute;left:47pt;top:168pt;margin:0;font-size:8.4pt;color:#547087}
    .card{position:absolute;width:245pt;height:40pt;box-sizing:border-box;background:#f6f8f8;border:0.8pt solid #d9e3e7;border-left:2pt solid #bf8732;border-radius:3pt;display:flex;align-items:center;padding:0 9pt;gap:7pt}
    .card .number{font-size:8.6pt;font-weight:700;color:#b78126}
    .card .name{flex:1;font-size:8.7pt;font-weight:700;color:#103958}
    .card .pg{font-size:9.5pt;font-weight:800;color:#103958}
    .section{position:absolute;left:47pt;top:524pt;font-size:10.5pt;color:#173e60;font-weight:800}
    .sport{position:absolute;width:119.5pt;height:26.5pt;border:0.8pt solid #dbe5e9;background:#f0f5f8;border-radius:3pt;text-align:center;box-sizing:border-box;padding:3pt 1pt;line-height:9pt;font-size:8.4pt;font-weight:700}
    .sport small{display:block;font-size:7.2pt;color:#5c7588;font-weight:400}
    .bottom-note{position:absolute;top:649pt;left:47pt;width:238pt;border:0.8pt solid #d9e4e8;border-radius:4pt;padding:10pt;box-sizing:border-box;height:133pt}
    .bottom-note b,.qrbox b{display:block;font-size:9.8pt;color:#103958;margin-bottom:5pt}
    .bottom-note p{font-size:8pt;line-height:1.6;color:#49657b;margin:0}
    .qrbox{position:absolute;top:649pt;left:294pt;width:254pt;height:133pt;background:#eff6f8;border:0.8pt solid #c7dce4;border-radius:4pt;padding:8pt;box-sizing:border-box}
    .qrbox img{float:left;width:91pt;height:91pt;margin-right:10pt;background:white;padding:2pt;border:0.5pt solid #dae4e8}
    .qrbox p{font-size:8pt;line-height:1.6;margin:0;color:#49657b}
    .qrbox .url{font-size:7.5pt;color:#056c9b;word-break:break-all}
    </style><div class="top"></div>
    <div class="heading"><span>มิตรภาพเกมส์ 2569 · กีฬากลุ่มหนองกุ่ม</span><span>ฉบับตรวจร่าง · 15 พฤศจิกายน 2569</span></div>
    <div class="flag">02 · เลือกหน้าได้ทันที</div><h1>สารบัญและการนำทาง</h1><div class="accent"></div>
    <p class="intro">กดหัวข้อเพื่อไปยังหน้าที่ต้องการ และกด “กลับสารบัญ” ที่ด้านล่างของแต่ละหน้า</p>
    '''+''.join(cards)+'''<div class="section">ทางลัดไปยังชนิดกีฬา</div>'''+''.join(sports)+'''
    <div class="bottom-note"><b>เนื้อหาในฉบับสมบูรณ์</b><p>คืนหน้าพิธีเปิด–ปิด สีโรงเรียน คำปฏิญาณ ประกาศ และบัญชีกรรมการจากต้นฉบับ 155 หน้า พร้อมคงผังและตารางแข่งขันจาก R30-D<br>เลขหน้าเดิมที่ปรากฏในต้นฉบับใช้ตรวจย้อนหลังเท่านั้น</p></div>
    <div class="qrbox"><b>สแกนเข้าชมเว็บไซต์มิตรภาพเกมส์</b><img src="'''+qr_url()+'''"><p>ตารางแข่งขัน สูจิบัตร และข้อมูลสำหรับตรวจสอบ</p><p class="url">'''+SITE+'''</p><p>ข้อมูลที่ยังไม่รับรองจะไม่ถือเป็นประกาศทางการ</p></div>
    </html>'''
    html_path.parent.mkdir(parents=True,exist_ok=True);html_path.write_text(html,encoding='utf-8')
    HTML(string=html,base_url=str(html_path.parent)).write_pdf(pdf_path)
    assert len(fitz.open(pdf_path))==1

def make_footer(path:Path):
    html='''<!doctype html><html lang="th"><meta charset="utf-8"><style>
    @page{size:595.276pt 40pt;margin:0}html,body{margin:0;padding:0;font-family:"Noto Sans Thai", "Waree",sans-serif;background:white}
    .line{border-top:.8pt solid #d7e1e8;position:absolute;top:0;left:42pt;width:511pt}
    .left{position:absolute;left:42pt;top:10pt;font-size:8pt;color:#517185}
    .nav{position:absolute;left:471pt;top:6pt;width:80pt;height:23pt;line-height:23pt;border-radius:2pt;text-align:center;background:#143d5b;color:white;font-size:8pt;font-weight:700}
    </style><div class="line"></div><div class="left">มิตรภาพเกมส์ 2569 · สูจิบัตรฉบับสมบูรณ์ · ตรวจร่าง</div><div class="nav">กลับสารบัญ</div></html>'''
    HTML(string=html).write_pdf(path)
    assert len(fitz.open(path))==1

def get_real_sections(src:fitz.Document,baseline:fitz.Document):
    pages=[]
    for idx in range(132):
        if idx<=1:pages.append({'output':idx+1,'source':'R30-D','source_page':idx+1})
        elif idx==2:pages.append({'output':3,'source':'generated R30-E TOC','source_page':1})
        elif 3<=idx<=18:pages.append({'output':idx+1,'source':'R25D3','source_page':idx})
        elif 19<=idx<=108:pages.append({'output':idx+1,'source':'R30-D','source_page':idx-15})
        elif 109<=idx<=130:pages.append({'output':idx+1,'source':'R25D3','source_page':idx-90})
        else:pages.append({'output':132,'source':'R30-D','source_page':94})
    return pages

def build(baseline_path:Path,original_path:Path,output:Path,working:Path):
    working.mkdir(parents=True,exist_ok=True); output.parent.mkdir(parents=True,exist_ok=True)
    html_path=working/'contents.html';toc_path=working/'contents.pdf';foot_path=working/'footer.pdf'
    make_toc(toc_path,html_path);make_footer(foot_path)
    doc=fitz.open();r30=fitz.open(baseline_path);full=fitz.open(original_path)
    assert len(r30)==94 and len(full)==155
    toc=fitz.open(toc_path);footer=fitz.open(foot_path)
    doc.insert_pdf(r30,from_page=0,to_page=1,links=False,annots=False)
    doc.insert_pdf(toc,from_page=0,to_page=0,links=False,annots=False)
    doc.insert_pdf(full,from_page=2,to_page=17,links=False,annots=False)
    doc.insert_pdf(r30,from_page=3,to_page=92,links=False,annots=False)
    doc.insert_pdf(full,from_page=18,to_page=39,links=False,annots=False)
    doc.insert_pdf(r30,from_page=93,to_page=93,links=False,annots=False)
    assert len(doc)==132
    # Replace only legacy footer in every content page, including original /155 and compact /94 numbering.
    for i in range(1,len(doc)):
        page=doc[i]
        rect=fitz.Rect(0,802.6,W,H)
        page.add_redact_annot(rect,fill=(1,1,1))
        page.apply_redactions(images=0,graphics=0,text=0)
        page.show_pdf_page(fitz.Rect(0,H-40,W,H),footer,0,overlay=True,keep_proportion=False)
        page.insert_text((381,826),f'{i+1:02d} / 132',fontsize=8.4,fontname='helv',color=(0.13,0.29,0.42),overlay=True)
        page.insert_link({'kind':fitz.LINK_GOTO,'from':fitz.Rect(466,806,557,835),'page':2,'to':fitz.Point(0,0)})
    # Retain every R30-D navigation link outside footer; remap page numbers in the expanded complete book.
    imported_links=0
    for old_idx,page in enumerate(r30):
        if old_idx==2:continue # old TOC replaced entirely
        target_page=doc[page_to_final(old_idx)]
        for l in page.get_links():
            rect=l['from']
            if rect.y0>=799 or rect.y1>802.6:continue # footer replaced
            if l['kind']==fitz.LINK_GOTO and 0<=l.get('page',-1)<94:
                target_page.insert_link({'kind':fitz.LINK_GOTO,'from':rect,'page':page_to_final(l['page']),'to':fitz.Point(0,0)});imported_links+=1
            elif l['kind']==fitz.LINK_URI and str(l.get('uri','')).startswith('https://'):
                target_page.insert_link({'kind':fitz.LINK_URI,'from':rect,'uri':l['uri']});imported_links+=1
    # New TOC cards and buttons. Coordinates are matched to the absolute positions in the HTML template.
    pg=doc[2]
    for n,(_seq,name,page_no) in enumerate(TOC_ITEMS):
        col=n%2;row=n//2;left=47+col*253;top=193+row*47
        pg.insert_link({'kind':fitz.LINK_GOTO,'from':fitz.Rect(left,top,left+245,top+40),'page':page_no-1,'to':fitz.Point(0,0)})
    for n,(name,b,t) in enumerate(SPORTS):
        col=n%4;row=n//4;left=47+col*126.3;top=563+row*32
        pg.insert_link({'kind':fitz.LINK_GOTO,'from':fitz.Rect(left,top,left+63,top+26.5),'page':b-1,'to':fitz.Point(0,0)})
        pg.insert_link({'kind':fitz.LINK_GOTO,'from':fitz.Rect(left+63,top,left+119.5,top+26.5),'page':t-1,'to':fitz.Point(0,0)})
    pg.insert_link({'kind':fitz.LINK_URI,'from':fitz.Rect(294,649,548,783),'uri':SITE})
    # Map all old bookmarks, keeping the nested sports sections.
    t=[(1,'ปก — มิตรภาพเกมส์ 2569',1),(1,'บทสรุปผู้บริหาร',2),(1,'สารบัญและการนำทาง / QR เว็บไซต์',3),
       (1,'กำหนดการพิธีเปิดการแข่งขัน',4),(1,'กำหนดการพิธีปิดการแข่งขัน',6),
       (1,'สีประจำโรงเรียน (รอตรวจเฉดสี)',7),(1,'คำปฏิญาณนักกีฬา',8),
       (1,'ประกาศกลุ่ม (ฉบับร่าง)',9)]
    for level,title,p in r30.get_toc():
        if p<4 or p==94:continue
        dest_page=page_to_final(p-1)+1
        t.append((level,title,dest_page))
    t.append((1,'รายชื่อกรรมการ (ฉบับรอตรวจ)',110))
    # Only mark major committee sections; not assume every source page corresponds to new committee unit.
    for p in range(19,41):
        txt=full[p-1].get_text()
        m=re.search(r'คณะกรรมการ\s*/\s*หมวด\s*(\d+)',txt)
        if m:t.append((2,'บัญชีกรรมการ · หมวด '+m.group(1),p+91))
    t.append((1,'ข้อสังเกตและที่มา',132))
    doc.set_toc(t)
    doc.set_metadata({**doc.metadata,'title':'มิตรภาพเกมส์ 2569 — สูจิบัตรฉบับสมบูรณ์ R30-E (ตรวจร่าง)',
                      'subject':'กีฬากลุ่มหนองกุ่ม 2569 เอกสารตรวจร่าง ไม่ใช่ประกาศที่รับรอง',
                      'keywords':'มิตรภาพเกมส์ 2569, R30-E, ตรวจร่าง, 132 pages, QR'})
    doc.save(output,garbage=4,deflate=True,clean=True)
    # Build machine-readable source provenance and digest record.
    src_map=get_real_sections(full,r30)
    source=output.parent/'R30E_source_map.json';source.write_text(json.dumps({'pdf':output.name,'total_pages':len(doc),'source_pdfs':{
       'R25D3':{'filename':original_path.name,'sha256':hashlib.sha256(original_path.read_bytes()).hexdigest()},
       'R30-D':{'filename':baseline_path.name,'sha256':hashlib.sha256(baseline_path.read_bytes()).hexdigest()}},
       'pages':src_map},ensure_ascii=False,indent=2),encoding='utf8')
    return {'output':str(output),'pages':len(doc),'bookmarks':len(t),'imported_links':imported_links,
            'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'bytes':output.stat().st_size,'source_map':str(source)}

if __name__=='__main__':
    ap=argparse.ArgumentParser()
    ap.add_argument('--r30d',type=Path,required=True);ap.add_argument('--r25d3',type=Path,required=True)
    ap.add_argument('--out',type=Path,required=True);ap.add_argument('--workdir',type=Path,required=True)
    a=ap.parse_args()
    print(json.dumps(build(a.r30d,a.r25d3,a.out,a.workdir),ensure_ascii=False,indent=2))

#!/usr/bin/env python3
"""R30-G: Fix legacy page numbers in R30-F and add committee information to summary.

Uses immutable R30-F PDF (44 pages). Corrects only the committee/ceremony source
footer strip, plus replacement of executive-summary page 2. Preserves existing
approved-vs-review statuses and all other page content. REVIEW-ONLY.
"""
from __future__ import annotations
import argparse, base64, hashlib, io, json, re
from pathlib import Path
import fitz
import qrcode
from weasyprint import HTML

SITE='https://infobwd.github.io/nongkum-sports-hub/'
PAGECOUNT=44
NAVY='#153b58'; GOLD='#b88534'
# Verified from R30-F PDF page 22-43. Total 250 entries, NOT 250 unique people.
ROSTER_COUNTS=[21,17,9,5,2,2,15,18,5,15,8,10,9,48,31,5,6,3,13,8]
assert len(ROSTER_COUNTS)==20 and sum(ROSTER_COUNTS)==250
LARGE_GROUPS=[
    ('48','ฝ่ายตรวจสอบหลักฐานและกรรมการตัดสินกีฬาประจำสนาม'),
    ('31','ฝ่ายตรวจสอบคุณสมบัตินักกรีฑา'),
    ('21','คณะกรรมการอำนวยการแข่งขัน'),
    ('18','ฝ่ายจัดเตรียมสถานที่และสนามแข่งขัน'),
]

def qr_image():
    q=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H,box_size=7,border=3)
    q.add_data(SITE);q.make(fit=True)
    blob=io.BytesIO();q.make_image(fill_color='#113959',back_color='white').save(blob,format='PNG')
    return 'data:image/png;base64,'+base64.b64encode(blob.getvalue()).decode()

def summary_html() -> str:
    cards=[('8','โรงเรียนเข้าร่วม'),('20','คณะ / ฝ่าย'),('250','รายการมอบหมาย'),('236','รายการแข่งขัน')]
    card_html=''.join(f'<div class="stat"><div class="figure">{num}</div><div class="label">{label}</div></div>' for num,label in cards)
    group_html=''.join(f'<div class="group"><div class="value">{count}</div><div class="group-name">{name}</div></div>' for count,name in LARGE_GROUPS)
    return f'''<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"><style>
    @page{{size:A4;margin:0}}
    html,body{{margin:0;padding:0;font-family:"Noto Sans Thai","Waree",sans-serif;background:white;color:#153d5b}}
    *{{box-sizing:border-box}}
    .top{{position:absolute;top:0;left:0;width:595.276pt;height:8pt;background:linear-gradient(90deg,#12395a,#17697a 78%,#cf9b43)}}
    .head{{position:absolute;top:51pt;left:46pt;width:502pt;height:30pt;border-bottom:1pt solid #dce7eb;display:flex;justify-content:space-between;font-size:8.1pt;color:#4b6f83}}
    .tag{{position:absolute;left:46pt;top:96pt;font-size:9.4pt;color:#ad7b31;font-weight:750}}
    h1{{position:absolute;left:46pt;top:121pt;font-size:25pt;line-height:1.2;margin:0;font-weight:750;letter-spacing:0;color:#133a58}}
    .sub{{position:absolute;left:46pt;top:166pt;width:502pt;font-size:8.9pt;line-height:1.4;color:#517084;margin:0}}
    .rule{{position:absolute;top:194pt;left:46pt;width:91pt;border-top:2.2pt solid #c08c37}}
    .stats{{position:absolute;top:210pt;left:46pt;width:502pt;height:83pt;display:flex;gap:7pt}}
    .stat{{width:120pt;height:82pt;border:1pt solid #d6e2e8;background:#f4f8fa;border-radius:5pt;text-align:center;padding:12pt 3pt 6pt}}
    .figure{{font-size:25pt;line-height:1.2;font-weight:750;color:#103c5c}}.label{{font-size:8pt;color:#537083;margin-top:4pt}}
    .note{{position:absolute;left:46pt;top:300pt;width:502pt;min-height:27pt;font-size:7.8pt;color:#9b6c22;line-height:1.5}}
    .panel{{position:absolute;left:46pt;top:339pt;width:502pt;height:91pt;border:1pt solid #d9e3e7;border-radius:5pt;background:#f3f7f8;padding:13pt 15pt}}
    .panel h2{{margin:0 0 5pt;font-size:11.2pt;color:#173f5c}}.panel p{{margin:0 0 4pt;font-size:8.5pt;line-height:1.65}}
    .sectionhead{{position:absolute;left:46pt;top:440pt;width:502pt;display:flex;justify-content:space-between;align-items:baseline}}
    .sectionhead h2{{font-size:11.5pt;margin:0;color:#133e5c}}.sectionhead span{{font-size:8pt;color:#678094}}
    .groups{{position:absolute;top:474pt;left:46pt;width:502pt;display:grid;grid-template-columns:246pt 246pt;column-gap:10pt;row-gap:9pt}}
    .group{{height:56pt;display:flex;align-items:center;border:1pt solid #d9e4e8;border-left:3pt solid #bf8835;background:#fff;border-radius:4pt;padding:7pt 9pt;gap:11pt}}
    .value{{font-weight:750;color:#143e5b;font-size:22pt;min-width:32pt;text-align:center}}
    .group-name{{font-size:8.5pt;line-height:1.48;color:#2a5069}}
    .review{{position:absolute;top:609pt;left:46pt;width:502pt;height:83pt;border:1pt solid #e6d6b9;background:#fff9ec;border-radius:5pt;padding:10pt 12pt}}
    .review b{{font-size:9.5pt;color:#815c21}}.review p{{margin:4pt 0 0;font-size:8pt;color:#6d5d47;line-height:1.55}}
    .qrbox{{position:absolute;top:703pt;left:46pt;width:502pt;height:84pt;border:1pt solid #cbdfe6;background:#eaf4f6;border-radius:5pt;padding:7pt 10pt;display:flex;gap:11pt;align-items:center}}
    .qrimg{{width:69pt;height:69pt;background:white;border:1pt solid #d4e2e7;padding:3pt}}
    .qrbox h2{{font-size:10.5pt;margin:0 0 2pt;color:#16425e}}.qrbox p{{margin:0;font-size:8.1pt;color:#45647b;line-height:1.5}}
    .qrbox .url{{font-size:8pt;font-weight:700;color:#155475}}
    .footer{{position:absolute;top:803pt;left:42pt;width:510pt;height:37pt;border-top:0.8pt solid #d7e1e8}}
    .foot-left{{position:absolute;left:0;top:11pt;color:#517185;font-size:8pt}}
    .foot-num{{position:absolute;left:351pt;top:11pt;color:#214b66;font-size:8.4pt}}
    .nav{{position:absolute;left:429pt;top:7pt;width:80pt;height:23pt;line-height:23pt;text-align:center;border-radius:2pt;background:#143d5b;color:white;font-weight:700;font-size:8pt}}
    </style></head><body>
    <div class="top"></div><div class="head"><span>มิตรภาพเกมส์ 2569 · กีฬากลุ่มหนองกุ่ม</span><span>ฉบับตรวจร่าง · 15 พฤศจิกายน 2569</span></div>
    <div class="tag">01 · ภาพรวมและความพร้อมคณะกรรมการ</div><h1>บทสรุปผู้บริหาร</h1>
    <p class="sub">สูจิบัตรพิธีการ ประกาศ และคณะกรรมการ · สรุปข้อมูลจากบัญชีรายชื่อฉบับตรวจร่าง</p><div class="rule"></div>
    <div class="stats">{card_html}</div>
    <div class="note">250 คือจำนวนรายการมอบหมายในบัญชีกรรมการ ไม่ใช่จำนวนบุคคลไม่ซ้ำกัน และยังไม่ใช่รายชื่อที่รับรองแล้ว</div>
    <div class="panel"><h2>ภาพรวมการจัดการแข่งขัน</h2>
    <p><b>เจ้าภาพ:</b> โรงเรียนบ้านหนองกระทุ่ม · <b>ช่วงการแข่งขันหลัก:</b> 16–20 พฤศจิกายน 2569</p>
    <p><b>แข่งขันนอกรอบ:</b> เปตอง 12–13 พฤศจิกายน 2569</p>
    <p>เล่มนี้เน้นกำหนดการพิธี สีประจำโรงเรียน ประกาศ และข้อมูลกรรมการ ส่วนผังและตารางการแข่งขันเปิดดูผ่านเว็บไซต์</p></div>
    <div class="sectionhead"><h2>คณะ/ฝ่ายที่มีรายการมอบหมายมากที่สุด</h2><span>นับจากบัญชีฉบับร่าง · ไม่ใช่จำนวนคนไม่ซ้ำ</span></div>
    <div class="groups">{group_html}</div>
    <div class="review"><b>ประเด็นที่ยังต้องตรวจรับก่อนประกาศใช้</b>
    <p>ตรวจชื่อ–สกุล ตำแหน่ง สังกัด หน้าที่ซ้ำ และเลขข้อประกาศ รวมทั้งตรวจความต่างของจำนวนรายการฝ่ายรักษาความปลอดภัย (บัญชี 2 / ประกาศ 6) และปฐมพยาบาล (บัญชี 2 / ประกาศ 4) ซึ่งอาจเกิดจากการระบุหน่วยงานแทนรายบุคคล</p></div>
    <div class="qrbox"><img class="qrimg" src="{qr_image()}"><div><h2>ตรวจรายชื่อและรายละเอียดเพิ่มเติมทางเว็บไซต์</h2>
    <p>เปิดเว็บกีฬากลุ่มหนองกุ่มเพื่อดูข้อมูลกรรมการและข้อมูลการแข่งขัน</p><p class="url">{SITE}</p>
    <p>ฉบับตรวจร่าง · ยังไม่ใช่ประกาศแต่งตั้งหรือผลการแข่งขันที่รับรองแล้ว</p></div></div>
    <div class="footer"><span class="foot-left">มิตรภาพเกมส์ 2569 · ฉบับพิธีการและกรรมการ · ตรวจร่าง</span><span class="foot-num">02 / 44</span><span class="nav">กลับสารบัญ</span></div>
    </body></html>'''

def render_summary(workdir:Path):
    html=summary_html().replace('ำ','ํา')
    (workdir/'summary.html').write_text(html,encoding='utf-8')
    out=workdir/'summary.pdf'
    HTML(string=html,base_url=str(workdir)).write_pdf(out)
    with fitz.open(out) as doc: assert len(doc)==1,len(doc)
    return out

def source_roster_counts(d:fitz.Document)->list[int]:
    counts=[]
    for k in range(21,43):
        text=d[k].get_text()
        m=re.search(r'\((\d+)\s*รายการ\)',text)
        if m: counts.append(int(m.group(1)))
    assert counts==ROSTER_COUNTS,counts
    return counts

def build(src:Path,out:Path,workdir:Path):
    out.parent.mkdir(parents=True,exist_ok=True)
    workdir.mkdir(parents=True,exist_ok=True)
    doc=fitz.open(src)
    assert len(doc)==PAGECOUNT,len(doc)
    counts=source_roster_counts(doc)
    prior_links=[[dict(lk) for lk in p.get_links()] for p in doc]
    html_pdf=render_summary(workdir)
    with fitz.open(html_pdf) as summary:
        p=doc[1]
        # Remove *all* old summary text including searchable text, not a white overlay.
        for lk in p.get_links():p.delete_link(lk)
        p.add_redact_annot(p.rect,fill=(1,1,1))
        p.apply_redactions(images=0,graphics=0,text=0)
        p.show_pdf_page(p.rect,summary,0,overlay=True,keep_proportion=False)
        p.insert_link({'kind':fitz.LINK_GOTO,'from':fitz.Rect(467,805,557,837),'page':2,'to':fitz.Point(0,0)})
        p.insert_link({'kind':fitz.LINK_URI,'from':fitz.Rect(46,703,548,787),'uri':SITE})
    fixed=[]
    for page_index in [*range(3,19),*range(21,43)]:
        p=doc[page_index]
        prior=p.get_textbox(fitz.Rect(52,783,548,805))
        if not prior.strip():
            raise AssertionError(f'expected old footer at page {page_index+1}')
        # Original footer occupies y790-803 only. Strip is safely below body (>778).
        # The body and regenerated footer at y811+ are untouched.
        p.add_redact_annot(fitz.Rect(52,784.7,548,803.4),fill=(246/255,242/255,232/255))
        p.apply_redactions(images=0,graphics=0,text=0)
        # Preserve the boundary separating the original page body from our unified footer.
        fixed.append(page_index+1)
    # PyMuPDF's full-page content redaction can invalidate GoTo links targeting
    # the edited page, even when their source annotations are on other pages.
    # Restore those links using their exact source rectangles/target pages.
    restored_links=[]
    for ix, links in enumerate(prior_links):
        if ix==1: continue  # Summary has new footer/website hit targets.
        page=doc[ix]
        have=page.get_links()
        for link in links:
            if link['kind']!=fitz.LINK_GOTO:continue
            dest=link.get('page')
            box=link['from']
            if dest is None or dest<0 or dest>=len(doc):continue
            exists=any(k['kind']==fitz.LINK_GOTO and k.get('page')==dest and abs(k['from'].x0-box.x0)<.3 and abs(k['from'].y0-box.y0)<.3 for k in have)
            if not exists:
                page.insert_link({'kind':fitz.LINK_GOTO,'from':box,'page':dest,'to':fitz.Point(0,0)})
                restored_links.append(ix+1)
                have=page.get_links()
    doc.set_metadata({**doc.metadata,'title':'มิตรภาพเกมส์ 2569 — สูจิบัตร R30-G เลขหน้าเดียวและสารสนเทศกรรมการ (ตรวจร่าง)',
                      'subject':'R30-G: 44-page ceremony and committee review booklet with corrected pagination and draft committee summary',
                      'keywords':'มิตรภาพเกมส์ 2569,R30-G,committee,review-only,44 pages'})
    doc.save(out,garbage=4,deflate=True)
    doc.close()
    with fitz.open(out) as verified:
        final_links=sum(len(p.get_links()) for p in verified)
        assert final_links==sum(len(x) for x in prior_links), (final_links, sum(len(x) for x in prior_links))
    metadata={'file':out.name,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),
              'bytes':out.stat().st_size,'pages':PAGECOUNT,
              'source_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),
              'legacy_footer_pages_removed':fixed,'legacy_footer_pages_count':len(fixed),
              'links_repaired_pages':restored_links,'total_links':final_links,
              'committee_divisions':len(counts),'committee_assignment_rows':sum(counts),
              'source_map':'R30-F 44 pages; page 2 regenerated; old footer removed pages 4-19 and 22-43; other content unchanged'}
    (workdir/'build_result.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(metadata,ensure_ascii=False,indent=2))

if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('--source',type=Path,required=True);a.add_argument('--out',type=Path,required=True);a.add_argument('--workdir',type=Path,required=True)
    args=a.parse_args();build(args.source,args.out,args.workdir)

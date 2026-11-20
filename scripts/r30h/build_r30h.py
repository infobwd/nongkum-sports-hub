#!/usr/bin/env python3
"""R30H: replace only R30G page 3 TOC; add GoTo links for 20 committee sections."""
import os, fitz, qrcode, tempfile
from weasyprint import HTML
from PIL import Image
from pathlib import Path
from html import escape
from hashlib import sha256

base=Path('/mnt/data')
src=base/'R30G_MittraphapGames_2569_R30G_Committee_Summary_FixedPage_44pages_REVIEW_ONLY.pdf'
out=base/'R30H_MittraphapGames_2569_Clickable_20_Committee_TOC_44pages_REVIEW_ONLY.pdf'
main=[('สรุปผู้บริหาร',2),('พิธีเปิด',4),('พิธีปิด',6),('สีโรงเรียน',7),('คำปฏิญาณ',8),('ประกาศกลุ่ม (รอตรวจ)',9),('กติกาและหลักเกณฑ์',20),('ข้อสังเกต',44)]
committee=[
('อำนวยการแข่งขัน',22), ('จัดการแข่งขัน',23), ('ต้อนรับ',24), ('ประชาสัมพันธ์',25),
('รักษาความปลอดภัย',26), ('ปฐมพยาบาล',27), ('บริการ',28),('จัดเตรียมสถานที่และสนาม',29),
('งบประมาณและการเงิน',30),('จัดรางวัลและวุฒิบัตร',31),('บันทึกผลกีฬาและกรีฑา',32),
('จัดทำสูจิบัตรและถ่ายภาพ',33),('จัดทำแฟ้มหลักฐานนักกีฬา',34),('ตรวจหลักฐานและตัดสินกีฬาประจำสนาม',35),
('ตรวจคุณสมบัตินักกรีฑา',37),('ตัดสินกรีฑาประเภทลู่/ปล่อยตัว',39),('ประจำเส้นชัย',40),
('ประจำหมุด',41),('จัดส่งตัวนักกรีฑา',42),('จัดขบวนและตัดสินพาเหรด',43)]
assert len(committee)==20
qr=base/'r30h_website_qr.png'
qrcode.make('https://infobwd.github.io/nongkum-sports-hub/').save(qr)
font='/usr/share/fonts/truetype/noto/NotoSansThai-Regular.ttf'
fontbold='/usr/share/fonts/truetype/noto/NotoSansThai-Bold.ttf'
if not os.path.exists(fontbold): fontbold='/usr/share/fonts/truetype/noto/NotoSansThai-SemiBold.ttf'

# PDF page coordinate rectangles in pt, same as top-left CSS absolute positions
links=[]
main_html=''
for i,(label,pg) in enumerate(main):
  col=i%4; row=i//4
  x=43+col*128; y=145+row*34
  main_html+=f'<div class="main" style="left:{x}pt;top:{y}pt;width:121pt;height:29pt"><span>{escape(label)}</span><b>{pg:02d}</b></div>'
  links.append((fitz.Rect(x,y,x+121,y+29),pg-1))

committee_html=''
for i,(label,pg) in enumerate(committee):
  col=i//10; row=i%10
  x=42+col*259; y=261+row*39
  committee_html+=f'<div class="member" style="left:{x}pt;top:{y}pt;width:251pt;height:35pt"><span class="number">{i+1:02d}</span><span class="txt">{escape(label)}</span><b>{pg:02d}</b></div>'
  links.append((fitz.Rect(x,y,x+251,y+35),pg-1))

html=f'''<!doctype html><html lang="th"><head><meta charset="utf-8"/><style>
@page{{size:A4;margin:0}}
@font-face{{font-family:Thai;src:url(file://{font})}}
@font-face{{font-family:Thai;src:url(file://{fontbold});font-weight:700}}
*{{box-sizing:border-box}} body{{margin:0;font-family:Thai,sans-serif;color:#143752;}}
header{{position:absolute;left:42pt;right:42pt;top:39pt;color:#54788c;font-size:7.5pt;border-bottom:1px solid #d5e4ec;padding-bottom:12pt;display:flex;justify-content:space-between}}
.sect{{position:absolute;left:43pt;top:82pt;color:#ab741b;font-size:9pt;font-weight:700}}
h1{{position:absolute;left:43pt;top:91pt;font-size:22pt;line-height:1.25;margin:0;color:#123856;font-weight:700}}
.subtitle{{position:absolute;left:43pt;top:125pt;font-size:8pt;color:#486d82}}
.main{{position:absolute;background:#edf3f6;border:1px solid #d1dfe6;border-left:2pt solid #b37a1d;border-radius:3pt;display:flex;align-items:center;padding:4pt 6pt;gap:4pt;font-size:8pt;line-height:1.2;}}
.main span{{flex:1;font-weight:700}} .main b{{font-weight:700;font-size:8pt;color:#153e5b;}}
.grouphead{{position:absolute;left:43pt;top:218pt;right:43pt;height:22pt;border-bottom:1.4pt solid #d7e3e9;font-weight:700;font-size:12pt;}}
.groupnote{{position:absolute;right:43pt;top:224pt;font-size:8pt;color:#567286}}
.member{{position:absolute;border:1px solid #d9e7ed;border-radius:3pt;background:#f4f8fa;display:flex;align-items:center;padding:4pt 6pt;gap:7pt;font-size:8pt;line-height:1.14;}}
.member .number{{background:#dfeaf1;border-radius:2pt;color:#ad791f;font-weight:700;min-width:21pt;text-align:center;padding:3pt 0;}}
.member .txt{{flex:1;font-weight:700;}}
.member b{{color:#124568;font-size:8.5pt;}}
.info{{position:absolute;left:42pt;top:666pt;width:511pt;height:77pt;border-radius:4pt;border:1px solid #bad6df;background:#eaf4f6;display:flex;align-items:center;padding:9pt;gap:9pt;}}
.info img{{width:60pt;height:60pt;border:4pt solid white;}}
.info strong{{font-size:10pt;display:block;}}
.info p{{margin:2pt 0 0;font-size:7.6pt;line-height:1.35;color:#355f72}}
.info em{{font-size:7.2pt;color:#886328;font-style:normal;font-weight:700;}}
footer{{position:absolute;left:42pt;right:42pt;bottom:23pt;border-top:1px solid #d9e4e8;color:#55758a;font-size:8pt;padding-top:10pt;display:flex;justify-content:space-between}}
footer span:last-child{{font-weight:700;color:#173d57}}
</style></head><body>
<header><span>มิตรภาพเกมส์ 2569 · กีฬากลุ่มหนองกุ่ม</span><span>ฉบับตรวจร่าง · 16 พฤศจิกายน 2569</span></header>
<div class="sect">02 · เลือกหัวข้อที่ต้องการ</div><h1>สารบัญและรายชื่อคณะกรรมการ</h1>
<div class="subtitle">กดหัวข้อเพื่อไปยังหน้าที่ต้องการ • ทุกหน้ามีปุ่ม “กลับสารบัญ”</div>
{main_html}
<div class="grouphead">คณะกรรมการ 20 ชุด</div><div class="groupnote">แตะชื่อฝ่ายเพื่อเปิดรายชื่อ • หน้า 22–43</div>
{committee_html}
<div class="info"><img src="file://{qr}"/><div><strong>เปิดเว็บกีฬากลุ่มหนองกุ่ม</strong><p>สแกน QR เพื่อดูผัง ตารางแข่งขัน และข้อมูลล่าสุด</p><p>infobwd.github.io/nongkum-sports-hub/</p><em>รายชื่อกรรมการยังเป็นฉบับตรวจร่าง ไม่ใช่คำสั่งแต่งตั้งที่รับรองแล้ว</em></div></div>
<footer><span>มิตรภาพเกมส์ 2569 · ฉบับพิธีการและคณะกรรมการ · ตรวจร่าง</span><span>03 / 44</span></footer>
</body></html>'''
html_path=base/'R30H_TOC_SOURCE.html';html_path.write_text(html,encoding='utf8')
page_pdf=base/'r30h_page3.pdf';HTML(string=html,base_url=str(base)).write_pdf(str(page_pdf))
original=fitz.open(src)
assert len(original)==44
one=fitz.open(page_pdf);assert len(one)==1 and one[0].rect==original[2].rect,(len(one),one[0].rect,original[2].rect)
# Remove original page-three text/drawings/QR and original link areas; redraw only the TOC page.
p=original[2];p.add_redact_annot(p.rect,fill=(1,1,1));p.apply_redactions(images=2,graphics=1,text=0)
p.show_pdf_page(p.rect,one,0,overlay=True)
for box,dest in links:
  p.insert_link({'kind':fitz.LINK_GOTO,'from':box,'page':dest,'to':fitz.Point(0,0)})
p.insert_link({'kind':fitz.LINK_URI,'from':fitz.Rect(42,666,553,743),'uri':'https://infobwd.github.io/nongkum-sports-hub/'})
# R30G bookmarks: replace generic section names only. Preserve other original links and bookmarks.
toc=original.get_toc()
for item in toc:
  title=item[1]
  if title.startswith('บัญชีกรรมการ · หมวด '):
    try:
      n=int(title.split('หมวด ')[1]); item[1]=f'คณะกรรมการ {n:02d} · {committee[n-1][0]}'
    except (ValueError,IndexError):pass
original.set_toc(toc)
original.set_metadata({**original.metadata,'title':'มิตรภาพเกมส์ 2569 — R30H สารบัญกรรมการ 20 ชุด กดได้ (ตรวจร่าง)','subject':'R30H: 44-page review booklet, clickable TOC for all 20 committee sections; source R30G','keywords':'มิตรภาพเกมส์,2569,R30H,committee,clickable,20,review-only'})
original.save(out,garbage=4,deflate=True)
print('OUTPUT',out,'BYTES',out.stat().st_size,'SHA256',sha256(out.read_bytes()).hexdigest())
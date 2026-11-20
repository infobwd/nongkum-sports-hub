#!/usr/bin/env python3
"""Audit R30-C: source integrity, 94-page rendering, internal destinations, QR decode."""
from __future__ import annotations
import hashlib,json,collections, re,sys
from pathlib import Path
import fitz
import numpy as np
from PIL import Image,ImageDraw
import cv2

INPUT=Path(sys.argv[1])
REF=Path(sys.argv[2])
OUT=INPUT.parent
D=fitz.open(INPUT); B=fitz.open(REF)
assert len(D)==len(B)==94
pages_changed={2,3,4,5,9,23,26,31,62,64,94}
# This final pass changes exactly these pages relative to its R30C candidate.
final_pass_pages={5,23,26,31,62,94}
issues=[]
clean=0
for i in range(94):
 a=D[i];b=B[i]
 if i+1 not in final_pass_pages:
  if a.get_text()!=b.get_text(): issues.append(f'page {i+1} text changed unexpectedly')
  else:clean+=1
 assert abs(a.rect.width-595.276)<2 and abs(a.rect.height-841.89)<2
# Text check in key pages
texts={p:D[p-1].get_text() for p in (3,5,23,26,31,32,33,62,64,67,94)}
if 'ข้อความต้นฉบับ V3 หน้า 17 สำหรับตรวจเทียบ' in texts[5] or 'ข้อความต้นฉบับ V3 หน้า 17 สําหรับตรวจเทียบ' in texts[5]:
 issues.append('page5 still contains V3 comparison excerpt')
if 'รอบรองและชิงรุ่นชาย · 3 คู่' not in texts[23]: issues.append('male takraw count incorrect')
if 'รอบรองและชิงรุ่นหญิง · 3 คู่' not in texts[26]: issues.append('female takraw count incorrect')
if 'ผู้ชนะคู่ 24 – ผู้ชนะคู่ 25' not in texts[26]:issues.append('female final wrong')
for term in ('รางขาม','ทุ่งมะสังฯ','ผู้ชนะคู่ 3','ผู้ชนะคู่ 4'):
 if term not in texts[31]: issues.append('bracket missing '+term)
if '14:30' not in texts[62] or '12 ปี หญิง' not in texts[62]: issues.append('pair24 schedule time/type missing')
if 'รางขาม – ทุ่งมะสังฯ' not in texts[64]:issues.append('petanque pair2 schedule incorrect')
if 'ผู้ชนะคู่ที่ 3 – ผู้ชนะคู่ที่ 4' not in texts[64]:issues.append('petanque pair10 schedule incorrect')
if not ('บ้านวังด้ง' in texts[32] and 'บ้านวังด้ง' in texts[33]):issues.append('finalist markers lost')
# Index must have 12 unique navigation cards and correct pages.
review_links=[l for l in D[93].get_links() if l['kind']==fitz.LINK_GOTO]
expected={9,15,18,23,31,32,46,51,64,66,87,67,3}
actual={l['page']+1 for l in review_links}
if not expected.issubset(actual):issues.append('review index destinations incomplete '+str(expected-actual))
for i,l in enumerate(review_links):
 if l['page']<0 or l['page']>=94:issues.append('invalid review link destination')
 for other in review_links[i+1:]:
  x=l['from'] & other['from']
  if not x.is_empty and x.get_area()>40:issues.append('review links overlap')
internal=[l for p in D for l in p.get_links() if l['kind']==fitz.LINK_GOTO]
for l in internal:
 if not 0<=l['page']<94:issues.append('out-of-range link')
if len(D.get_toc())<24:issues.append('bookmarks missing')
# Screenshot QR at high resolution and decode from actual PDF page. Do not infer correctness from source png.
page3=D[2]
pix=page3.get_pixmap(matrix=fitz.Matrix(3,3),alpha=False)
arr=np.frombuffer(pix.samples,dtype=np.uint8).reshape(pix.height,pix.width,pix.n)
found,pts,_=cv2.QRCodeDetector().detectAndDecode(arr)
if found!='https://infobwd.github.io/nongkum-sports-hub/':issues.append('QR decode incorrect '+str(found))
# Render every page at 150 DPI without producing all PNG assets; detect rendering failures.
selected={3,5,23,26,31,62,64,94}
rendered=0
for i,page in enumerate(D):
 pix=page.get_pixmap(matrix=fitz.Matrix(150/72,150/72),alpha=False)
 if pix.width<1000 or pix.height<1600:issues.append(f'bad render geometry page {i+1}')
 if i+1 in selected:pix.save(str(OUT/f'qa_p{i+1:02d}_150dpi.png'))
 rendered+=1
# Independent manual review crops at 200 dpi
for p in [5,23,26,31,62,64,94]:
 D[p-1].get_pixmap(matrix=fitz.Matrix(200/72,200/72),alpha=False).save(str(OUT/f'qa_p{p:02d}_200dpi.png'))
# Font list: embedded name count as a diagnostic, don't claim from regex alone.
fontnames=collections.Counter()
for p in D:
 for f in p.get_fonts(full=True): fontnames[f[3] if len(f)>3 else str(f)]+=1
status='PASS' if not issues else 'CHECK'
report={'status':status,'pdf':INPUT.name,'pages':len(D),'rendered_150dpi':rendered,'rendered_200dpi':7,'bookmarks':len(D.get_toc()),'links_total':sum(len(p.get_links()) for p in D),'internal_goto':len(internal),'review_links':len(review_links),'review_targets':sorted(actual),'qr_decoded':found,'unchanged_text_pages_vs_R30C_candidate':clean,'source_sha256':hashlib.sha256(REF.read_bytes()).hexdigest(),'output_sha256':hashlib.sha256(INPUT.read_bytes()).hexdigest(),'thai_font_occurrences':{k:v for k,v in fontnames.items() if 'Thai' in k or 'Waree' in k},'issues':issues}
(OUT/'QA_REPORT.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
(OUT/'QA_REPORT.md').write_text('''# ผลตรวจ PDF สูจิบัตรมิตรภาพเกมส์ 2569 R30-C\n\n'''+ '\n'.join(f'- **{k}**: {v}' for k,v in report.items() if k not in {'thai_font_occurrences','issues','source_sha256','output_sha256'})+'\n\n## สิ่งที่ตรวจเพิ่มเติมก่อนเผยแพร่\n\n- ตรวจพิมพ์ A4 จริงและตรวจอ่านด้วยโทรศัพท์ (ยังไม่ได้ตรวจภาคสนาม)\n- ตรวจการอนุมัติเลขคู่/สายและการลงนามของผู้จัด (ยังไม่รับรอง)\n- ตรวจการเปิดเว็บไซต์จริงและสิทธิ์แชร์ไฟล์ (QR decode ผ่าน แต่เว็บภายนอกอาจยังไม่เปิด)\n- ตรวจความครบถ้วนกับ Google Sheets และผังข้อมูลล่าสุดก่อน Merge\n\n## ข้อสังเกตจากเครื่อง\n\n'+('\n'.join('- '+x for x in issues) if issues else 'ไม่พบปัญหาในชุดทดสอบอัตโนมัติ')+'\n\n**สถานะเอกสาร: DRAFT — ไม่ใช่ประกาศผลหรือคำสั่งรับรอง**\n',encoding='utf-8')
print(json.dumps({'status':status,'pages':len(D),'QR':found,'issues':issues,'internal_goto':len(internal),'review_links':len(review_links)},ensure_ascii=False))

#!/usr/bin/env python3
"""R29: produce editable HTML/CSS and audit-ready PDFs from verified draft data.
Requires: Python 3.11+, WeasyPrint 68.0, PyMuPDF.
Never generates approved results. Source data must be reviewed separately.
"""
import json,html,os,collections,hashlib,sys,shutil
from pathlib import Path
import fitz
from weasyprint import HTML,CSS

ROOT=Path(__file__).resolve().parent
DATA=json.loads((ROOT/'program-data.json').read_text(encoding='utf8'))
OUT=ROOT/'output';OUT.mkdir(exist_ok=True)
SPORTS=['ฟุตบอล','ยิงจุดโทษ','ฟุตซอล','วอลเลย์บอล','เซปักตะกร้อ','เปตอง','เทเบิลเทนนิส','ชักเย่อ']
SPORT_SLUG=['football','shootout','futsal','volleyball','takraw','petanque','tabletennis','tugofwar']
ESC=html.escape

def rows(items,field=False):
 parts=[]
 for r in items:
  if not r['pair'].strip(): raise ValueError('Blank match pair:'+str(r))
  venue=r['court']
  base=[str(r['match_no']),r['time'],r['division'],r['pair'],venue]
  cells=''.join(f'<td>{ESC(v)}</td>' for v in base)
  if field: cells+='<td><div class="blank">&nbsp;</div></td>'
  parts.append(f'<tr>{cells}</tr>')
 return '\n'.join(parts)

def table(items,field=False):
 a='<colgroup><col class="match-no"><col class="when"><col class="division"><col class="pair"><col class="court"><col class="check"></colgroup>' if field else '<colgroup><col class="col-no"><col class="col-time"><col class="col-class"><col class="col-match"><col class="col-venue"></colgroup>'
 return f'<table>{a}<thead><tr><th>คู่ที่</th><th>เวลา</th><th>รุ่น / ประเภท</th><th>คู่แข่งขัน / รอบ</th><th>สนามย่อย</th>{"<th>บันทึกผล / ผู้ตรวจ</th>" if field else ""}</tr></thead><tbody>{rows(items,field)}</tbody></table>'

def group(items):
 groups=collections.OrderedDict()
 for r in items: groups.setdefault(r['date_text'],[]).append(r)
 return groups

def print_sections(field=False):
 result=[]
 for slug,sport in zip(SPORT_SLUG,SPORTS):
  items=[r for r in DATA['matches'] if r['sport']==sport]
  if field: result.append(f'<section class="field-sport" id="{slug}"><div class="head"><h2>{sport}</h2><span>{len(items)} คู่ · ฉบับตรวจร่าง</span></div>')
  else: result.append(f'<section class="sport" id="{slug}"><div class="page-intro"><div class="kicker">SPORTS PROGRAM / {slug.upper()}</div><h2>{sport}</h2><p>{len(items)} คู่แข่งขัน · สถานที่หลัก โรงเรียนบ้านหนองกระทุ่ม</p></div><div class="sport-lead"><span class="small">วันและเวลาตามตารางร่าง / แยกการรับรองรายคู่</span><span class="count">{len(items)} คู่</span></div>')
  if sport=='เปตอง':result.append('<div class="r28-notice">ข้อสังเกต R28: ผู้จัดแจ้งบ้านวังด้งเข้ารอบชิงรุ่น 10 ปีหญิงและ 12 ปีชาย แต่ยังไม่มีข้อมูลคู่แข่ง/คะแนนที่ตรวจรับ ไม่ใช้เป็นผลรับรอง</div>')
  for date,subset in group(items).items():
   result.append(f'<h3 class="{"date" if field else "section-day"}">{ESC(date)}</h3>')
   result.append(table(subset,field))
  if not field:
   result.append(f'<p class="sport-footnote">ที่มา: สูจิบัตรร่าง R28 หน้า {", ".join(str(p) for p in sorted(set(x["source_page"] for x in items)))} · ผู้จัดต้องตรวจรับก่อนเผยแพร่</p><a class="foot-link" href="#contents">กลับสารบัญ →</a>')
  else:result.append('<p class="footnote">ช่องบันทึกผลเว้นว่างสำหรับเจ้าหน้าที่ · ยังไม่มีผลการแข่งขันที่รับรองในเอกสารนี้</p>')
  result.append('</section>')
 return '\n'.join(result)

def athletics(field=False):
 parts=[]
 if field:
  parts.append('<section id="athletics" class="section-break"><div class="head"><h2>กรีฑา · ใบจัดลู่</h2><span>50 รายการ · 289 ลู่จากเอกสารร่าง</span></div><p class="before-notes">ยังไม่ระบุเวลาเริ่มรายรายการ ให้ตรวจคำสั่งสนามก่อนลงผล</p>')
  for t in DATA['athletics']:
   lanes=''.join(f'<div class="lane">ลู่ {l["lane"]} · {ESC(l["school"])}</div>' for l in t['lanes'])
   parts.append(f'<div class="event"><div class="event-title">รายการ {t["event_no"]} · {ESC(t["event"])}</div><div class="lanes">{lanes}</div><div class="footnote">ผล/อันดับ: _____________________________________________</div></div>')
 else:
  parts.append('<section id="athletics" class="sport"><div class="page-intro"><div class="kicker">TRACK AND FIELD / ATHLETICS</div><h2>กรีฑา · ตารางลู่</h2><p>50 รายการ · 289 ลู่ ตามบัญชีร่างจากสูจิบัตรเดิม ไม่มีการระบุเวลาแข่งขันรายรายการ</p></div><div class="note-box"><strong>หมายเหตุเลขรายการ:</strong> ต้นฉบับใช้เลข 35 และ 48 ซ้ำอย่างละ 1 ครั้ง จึงคงเลขต้นฉบับ ไม่สร้างเลข 49/50 ขึ้นเอง</div><div class="athlete-list">')
  for t in DATA['athletics']:
   lanes=' · '.join(f'{l["lane"]}: {l["school"]}' for l in t['lanes'])
   parts.append(f'<div class="athlete-card"><div class="source-id">รายการ {t["event_no"]} · หน้าต้นฉบับ {t["source_page"]}</div><h3>{ESC(t["event"])}</h3><div class="lanes">{ESC(lanes)}</div></div>')
  parts.append('</div><a class="foot-link" href="#contents">กลับสารบัญ →</a>')
 parts.append('</section>')
 return '\n'.join(parts)

def html_document(field=False):
 css='field.css' if field else 'booklet.css'
 head=f'<!doctype html><html lang="th"><head><meta charset="utf-8"><title>มิตรภาพเกมส์ 2569 - {"ตารางสนาม" if field else "สูจิบัตร"} (DRAFT)</title><link rel="stylesheet" href="{css}"></head><body>'
 if field:
  cover='<section class="intro" id="field-overview"><h1>ตารางการแข่งขัน · ใช้งานสนาม</h1><p>มิตรภาพเกมส์ 2569 · กลุ่มเครือข่ายหนองกุ่ม · DRAFT · สถานที่หลัก โรงเรียนบ้านหนองกระทุ่ม</p><span class="draft-stamp">ฉบับร่างสำหรับตรวจสอบ · ไม่ใช่บันทึกผลรับรอง</span><p>คู่แข่งขัน 186 คู่ และกรีฑา 50 รายการ ใช้ข้อมูลจาก PDF R28 ฉบับตรวจร่าง วันที่ 15 พฤศจิกายน 2569</p><p>สำหรับประเภทที่ไม่ระบุสนามย่อย ให้ยืนยันกับเจ้าหน้าที่ก่อนใช้ตารางนี้</p></section>'
  nav='<div class="field-nav">'+''.join(f'<a href="#{slug}">{sport}</a>' for slug,sport in zip(SPORT_SLUG,SPORTS))+'<a href="#athletics">กรีฑา · ตารางลู่</a></div>'
  cover=cover.replace('</section>',nav+'</section>')
  return head+cover+print_sections(True)+athletics(True)+'</body></html>'
 cover='''<section class="cover" id="cover"><div class="stripe"></div><div class="ribbon"></div><div class="orb"></div><div class="eyebrow">NONGKUM SPORTS / FRIENDSHIP GAMES / 2026</div><div class="headline">สูจิบัตรการแข่งขัน<br>มิตรภาพเกมส์<span>2569</span></div><div class="sub">การแข่งขันกีฬานักเรียน กลุ่มเครือข่ายพัฒนาคุณภาพการศึกษาหนองกุ่ม<br>โรงเรียนบ้านหนองกระทุ่ม · อำเภอบ่อพลอย จังหวัดกาญจนบุรี</div><div class="rule"></div><div class="cover-details"><div>16–20 พฤศจิกายน 2569<br><small>เปตองนอกรอบ 12–13 พฤศจิกายน 2569</small></div><div class="draft">DRAFT · รอตรวจรับ</div></div></section>'''
 intro='''<section id="overview"><div class="page-intro"><div class="kicker">EXECUTIVE OVERVIEW / ข้อมูลการแข่งขัน</div><h1>ภาพรวมและการใช้เอกสาร</h1><p>ยึดรูปเล่มจากรายงานผู้บริหารศิลปหัตถกรรมนักเรียน ครั้งที่ 74 แต่ปรับโครงสร้างให้เหมาะกับสนามกีฬา</p></div><div class="hero-cards"><div class="metric"><b>236</b><span>รายการรวมตามบัญชีร่าง</span></div><div class="metric"><b>186</b><span>คู่แข่งขันกีฬา</span></div><div class="metric"><b>50</b><span>รายการกรีฑา / 289 ลู่</span></div></div><div class="section-panel"><strong>สถานที่หลัก</strong><p>โรงเรียนบ้านหนองกระทุ่ม อำเภอบ่อพลอย จังหวัดกาญจนบุรี · สนามย่อยบางชนิดกีฬาอยู่ระหว่างตรวจสอบ</p></div><div class="section-panel"><strong>วิธีอ่านสถานะ</strong><p>ข้อความ “ยืนยันวัน–เวลา” เป็นสถานะในสูจิบัตรร่างเดิม ไม่ใช่การรับรองผลแข่งขัน ควรตรวจวัน เวลา และสนามย่อยกับเจ้าภาพก่อนใช้ภาคสนาม</p></div><div class="note-box"><strong>ข้อมูลเพิ่มเติมจาก PR #137 (ยังเป็นร่าง):</strong> ผู้จัดแจ้งว่าโรงเรียนบ้านวังด้งเข้ารอบชิงเปตอง 10 ปีหญิง และ 12 ปีชาย แต่ยังไม่มีคะแนนและคู่แข่งที่รับรองแล้ว ไม่เพิ่มผลหรือคู่แข่งในตาราง</div><div class="note-box"><strong>ข้อแตกต่างที่ต้องตรวจ:</strong> หมายเลขกรีฑา 35 และ 48 ซ้ำในสูจิบัตรร่าง และเลขคู่เปตองรอบชิงในชีตกับ PDF อาจไม่ตรงกัน (R28); ให้ฝ่ายจัดการแข่งขันตรวจรับก่อนเผยแพร่</div><p class="small">ฉบับนี้จัดรูปเล่มใหม่ ไม่ใช่ประกาศผล/คำสั่งการแข่งขัน และไม่ได้สร้างผลคะแนนสมมติ</p><a class="foot-link" href="#contents">ไปสารบัญ →</a></section>'''
 toc='''<section class="toc" id="contents"><div class="page-intro"><div class="kicker">CONTENTS / INTERNAL NAVIGATION</div><h1>สารบัญและการนำทาง</h1><p>คลิกหัวข้อเพื่อเปิดหน้าปลายทาง • เลขหน้าคำนวณจาก PDF จริงหลังจัดหน้า</p></div><ul class="toc-list"><li><a href="#overview">ภาพรวมและวิธีใช้งาน</a></li>'''+''.join(f'<li><a href="#{slug}">{sport} · โปรแกรมการแข่งขัน</a></li>' for slug,sport in zip(SPORT_SLUG,SPORTS))+'''<li><a href="#athletics">กรีฑา · รายการและตารางลู่</a></li><li><a href="#sources">แหล่งข้อมูลและข้อสังเกต</a></li></ul><div class="subnote">สารบัญใน PDF ใช้ลิงก์ภายในและ Bookmarks เมื่อต้องการกลับหน้านี้ให้กด “กลับสารบัญ” ที่ท้ายหมวด</div></section>'''
 sources='''<section class="sources" id="sources"><div class="page-intro"><div class="kicker">SOURCE & REVIEW NOTES</div><h2>แหล่งข้อมูลและจุดรอตรวจ</h2><p>แยกฉบับตรวจร่างออกจากข้อมูลรับรอง และรักษาหลักฐานตามรุ่น</p></div><div class="source-item"><strong>รายงานผู้บริหารศิลปหัตถกรรมนักเรียน ครั้งที่ 74</strong><small>ต้นแบบรูปเล่ม PDF 23 หน้า: ปก, สารบัญ, แบบอักษรหลายตระกูล, ตารางและองค์ประกอบนำทาง</small></div><div class="source-item"><strong>สูจิบัตร มิตรภาพเกมส์ 2569 R28 (PDF 41 หน้า)</strong><small>ตารางร่าง 186 คู่ + กรีฑา 50 รายการ ใช้เป็นแหล่งเรียงข้อมูล; R27-C เป็นหลักฐานการแก้เปตอง/ตะกร้อ</small></div><div class="source-item"><strong>GitHub infobwd/nongkum-sports-hub</strong><small>อ้างอิง main และ PR #136 R27-C / PR #137 R28 (ยังไม่ Merge ณ วันที่จัดทำ R29)</small></div>'''+''.join(f'<div class="note-box">{ESC(n)}</div>' for n in DATA['review_notes'])+'''<a href="#contents" class="foot-link">กลับสารบัญ →</a></section>'''
 return head+cover+intro+toc+print_sections(False)+athletics(False)+sources+'</body></html>'

def add_navigation(path,field=False):
 doc=fitz.open(path)
 if not field:
  titles=[('หน้าปก','cover'),('ภาพรวมและวิธีใช้งาน','overview'),('สารบัญ','contents')]+[(s,slug) for s,slug in zip(SPORTS,SPORT_SLUG)]+[('กรีฑา','athletics'),('แหล่งข้อมูลและข้อสังเกต','sources')]
 else:
  titles=[('ตารางสนาม','field-overview')]+[(s,slug) for s,slug in zip(SPORTS,SPORT_SLUG)]+[('กรีฑา · ตารางลู่','athletics')]
 # Links from WeasyPrint initially use named destinations (PDF /Dest), not Explicit /A /GoTo.
 targets={}
 for pg in doc:
  for link in pg.get_links():
   if link.get('nameddest') and link.get('page',-1)>=0:
    targets[link['nameddest']]=link['page']
 if not field:
  targets.update({'cover':0,'overview':1,'contents':2})
 else:
  targets['field-overview']=0
  for label,slug in zip(SPORTS,SPORT_SLUG):
   results=[i for i,p in enumerate(doc) if p.get_text().splitlines()[:1]==[label]]
   if results:targets[slug]=results[0]
  results=[i for i,p in enumerate(doc) if 'กรีฑา · ใบจัดลู่' in p.get_text()]
  if results:targets['athletics']=results[0]
 toc=[]
 for title,slug in titles:
  if slug not in targets:
   print('WARN bookmark destination missing:',title,slug)
   continue
  toc.append([1,title,targets[slug]+1])
 doc.set_toc(toc)
 edited=0
 for page in doc:
  for old in list(page.get_links()):
   if old['kind'] not in (fitz.LINK_GOTO,fitz.LINK_NAMED) or old.get('page',-1)<0:continue
   new={'kind':fitz.LINK_GOTO,'from':old['from'],'page':old['page'],'to':fitz.Point(0,0),'zoom':0}
   try:
    page.delete_link(old)
    page.insert_link(new)
    edited+=1
   except Exception as e:print('WARN GoTo conversion',e)
 temp=Path(str(path)+'.navtmp.pdf');doc.save(temp,garbage=4,deflate=True);doc.close();temp.replace(path)
 return len(toc),edited

def main():
 for css in ['booklet.css','field.css']:
  shutil.copy2(ROOT/css,OUT/css)
 assert len(DATA['matches'])==186 and len(DATA['athletics'])==50 and sum(len(t['lanes']) for t in DATA['athletics'])==289
 assert len(DATA['matches'])+len(DATA['athletics'])==236
 result={}
 for label,field in [('booklet',False),('field',True)]:
  h=OUT/f'mittraphap-2569-r29-{label}-DRAFT.html';h.write_text(html_document(field).replace('\u0E33','\u0E4D\u0E32'),encoding='utf8')
  pdf=OUT/f'mittraphap-2569-r29-{label}-DRAFT.pdf'
  HTML(filename=str(h)).write_pdf(str(pdf))
  n,links=add_navigation(pdf,field)
  d=fitz.open(pdf);result[label]={'pages':len(d),'bookmarks':len(d.get_toc()),'go_to_links':sum(1 for p in d for l in p.get_links() if l['kind']==fitz.LINK_GOTO),'size_bytes':pdf.stat().st_size,'sha256':hashlib.sha256(pdf.read_bytes()).hexdigest()}
  print(label,result[label])
 (OUT/'build-summary.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
if __name__=='__main__':main()

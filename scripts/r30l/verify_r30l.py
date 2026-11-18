#!/usr/bin/env python3
from pathlib import Path
import fitz,hashlib,json,re
from collections import Counter,defaultdict
from PIL import Image,ImageOps,ImageDraw
R=Path('/mnt/data/r30l');F=R/'MittraphapGames_2569_R30L_Front_Indexes_100_Approved_Results_DRAFT.pdf';SRC=Path('/mnt/data/R30K_MittraphapGames_2569_R30K_Results_TOC_DRAFT.pdf');audit=json.loads((R/'new_results_audit.json').read_text(encoding='utf-8'))
with fitz.open(F) as d,fitz.open(SRC) as original:
 errors=[]
 if len(d)!=138:errors.append('wrong page count')
 pairs=sum(p.get_text().count('ผลรับรอง:') for p in list(d)[50:138]);ath=sum(len(re.findall(r'(?m)^ผลรับรอง$',p.get_text())) for p in list(d)[50:138]);
 if pairs!=60:errors.append('approved matches '+str(pairs))
 if ath!=40:errors.append('approved track events '+str(ath))
 oldpairs=sum(p.get_text().count('ผลรับรอง:') for p in list(original)[50:138]);added=0
 for n in (96,101,103):
  added+=d[n-1].get_text().count('ผลรับรอง:')-original[n-1].get_text().count('ผลรับรอง:')
 if oldpairs!=43 or added!=17:errors.append('result reconciliation mismatch')
 original_text_change={}
 for n in range(51,139):
  a=original[n-1].get_text();b=d[n-1].get_text();
  # Match names/score items from the existing published result badges and original fixture pairs.
  for label in re.findall(r'ผลรับรอง: *[^\n]+',a):
   if label not in b:errors.append(f'old approved result missing page {n}: {label}')
 for row in audit:
  n=row['pdf_page'];text=d[n-1].get_text()
  if row['team_a'] not in text or row['team_b'] not in text: errors.append(f'fixture team mismatch {row["fixture_id"]}')
  if f"ผลรับรอง: {row['approved_result']}" not in text:errors.append(f'approved result not found: {row["fixture_id"]}')
 for ix,p in enumerate(d):
  if abs(p.rect.width-595.276)>.8 or abs(p.rect.height-841.89)>.8:errors.append(f'not A4 page {ix+1}')
  if 5<=ix+1<=50:
   if f'{ix+1:02d} / 138' not in p.get_text():errors.append(f'bad footer {ix+1}')
  if ix+1>=51 and f'{ix+1:02d} / 138' not in p.get_text():errors.append(f'bad footer {ix+1}')
 links=[]
 for ix,p in enumerate(d):
  for l in p.get_links():
   if l['kind']==fitz.LINK_GOTO:
    links.append((ix+1,l['page']+1))
    if not 0<=l['page']<138:errors.append(f'bad dest page{ix+1}: {l["page"]}')
 for n,target in [(3,4),(3,5),(4,3),(4,5),(5,7),(6,3),(6,4),(50,5),(95,3),(96,3),(103,3)]:
  if (n,target) not in links:errors.append(f'broken expected navigation p{n}->{target}')
 required={95,96,100,101,102,103,105,108,110,111,113,121,124,126,128,131}
 if not required<={t for p,t in links if p==4}:errors.append('missing results direct links')
 if 'สารบัญการแข่งขันและผลรับรอง' not in d[2].get_text():errors.append('front competition index missing')
 if 'สารบัญผลการแข่งขันที่ผ่านการรับรอง' not in d[3].get_text():errors.append('front results index missing')
 if 'สารบัญ · คณะกรรมการ 20 ชุด' not in d[4].get_text():errors.append('committee index missing')
 if '100 รายการ' in d[3].get_text():errors.append('misleading result count')
 for lev,title,pno in d.get_toc():
  if not 1<=pno<=138:errors.append('bad bookmark '+title)
 if '40 รายการ' not in d[3].get_text():errors.append('missing athletics tally')
 if '60 คู่' not in d[3].get_text():errors.append('missing approved match count')
 if 'ตารางตรวจร่าง' not in d[95].get_text():errors.append('missing disambiguation note')
 # Real rendering: all 138 pages at 150 dpi; selected critical pages at 200 dpi.
 critical={2,3,4,5,6,7,50,95,96,101,103,110,121,138}
 thumbs=[];render_fail=[];rendered=0;checked=0
 for ix,page in enumerate(d,1):
  try:
   pm=page.get_pixmap(matrix=fitz.Matrix(150/72,150/72),alpha=False)
   if pm.width<1100 or pm.height<1600:raise ValueError('unexpected render dimensions')
   rendered+=1
   if ix in critical:
    pm200=page.get_pixmap(matrix=fitz.Matrix(200/72,200/72),alpha=False);checked+=1
    pm200.save(R/f'qa_{ix:03d}_200dpi.png')
   img=Image.frombytes('RGB',(pm.width,pm.height),pm.samples)
   img.thumbnail((145,205))
   thumbs.append((ix,img.copy()))
  except Exception as e:render_fail.append(f'{ix}: {e}')
 if render_fail:errors.extend(render_fail)
 cols=10;rows=(len(thumbs)+cols-1)//cols;sheet=Image.new('RGB',(cols*160,rows*231),(255,255,255));draw=ImageDraw.Draw(sheet)
 for index,(pn,img) in enumerate(thumbs):
  x=(index%cols)*160+7;y=(index//cols)*231+7;sheet.paste(img,(x,y));draw.text((x+2,y+207),f'{pn:03d}',fill=(24,53,75))
 sheet.save(R/'qa_contact_sheet_138pages.jpg',quality=82)
 doc_sha=hashlib.sha256(F.read_bytes()).hexdigest()
 result={'status':'AUTOMATED_QA_PASS' if not errors else 'FAIL','version':'R30-L','source_version':'R30-K','source_pdf_sha256':hashlib.sha256(SRC.read_bytes()).hexdigest(),'sha256':doc_sha,'pages':len(d),'approved_match_results':pairs,'new_approved_match_results':added,'prior_approved_match_results':oldpairs,'athletics_approved_events':ath,'total_approved_results':pairs+ath,'internal_links':len(links),'total_links':sum(len(p.get_links()) for p in d),'bookmarks':len(d.get_toc()),'rendered_150_dpi':rendered,'rendered_200_dpi_critical_pages':checked,'bracket_qualifiers_updated':0,'bracket_note':'Unpublished group standings and draft bracket links prevent authoritatively naming semifinal qualifiers','active_r33_source':'r33-20261116-7ba60be1-fa3269b5','latest_publication_thai':'2026-11-18 17:57:17+07:00','errors':errors}
 (R/'QA_REPORT.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps(result,ensure_ascii=False))
 if errors:raise SystemExit(1)

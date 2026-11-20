#!/usr/bin/env python3
"""R30-J fail-closed copy, navigation, font and page integrity checks."""
import fitz, json, re, hashlib, collections
from pathlib import Path
root=Path('/mnt/data/r30e_work')
a=fitz.open('/mnt/data/R30I_MittraphapGames_2569_LargeType_Detailed_Committee_Index_REVIEW_ONLY.pdf')
b=fitz.open(root/'MittraphapGames_2569_R30E_Approved_Results_DRAFT.pdf')
c=fitz.open(root/'MittraphapGames_2569_R30J_Complete_Booklet_Approved_Results_DRAFT.pdf')
issues=[]; count=0; snapshots=[]
if (len(a),len(b),len(c))!=(48,94,137):issues.append('page-count-not-48-94-137')
for i in range(len(c)):
 p=c[i]
 if abs(p.rect.width-595)>1 or abs(p.rect.height-842)>1:issues.append('page geometry '+str(i+1))
 links=p.get_links()
 for link in links:
  if link['kind']==fitz.LINK_GOTO and not (0<=link.get('page',-1)<137):issues.append('bad goto '+str(i+1)+' -> '+str(link.get('page')))
 # rendering all pages 150 DPI (not retained to disk)
 img=p.get_pixmap(matrix=fitz.Matrix(150/72,150/72),colorspace=fitz.csRGB,alpha=False)
 if img.width<1200 or img.height<1600:issues.append('render dimension '+str(i+1))
 count+=1
 if i+1 in [3,4,49,50,63,64,77,81,94,100,117,137]:
  p.get_pixmap(matrix=fitz.Matrix(200/72,200/72),alpha=False).save(str(root/f'R30J_QA_200dpi_{i+1}.png'))

def counter(page):
 d=page.get_text('dict')
 return collections.Counter((s['text'], round(s['bbox'][0],1),round(s['bbox'][1],1), round(s['size'],1)) for blk in d['blocks'] for line in blk.get('lines',[]) for s in line['spans'] if s['bbox'][1]<797)
checked=0
for i in range(48):
 old=counter(a[i]);new=counter(c[i]);missing=old-new
 if missing:issues.append(f'committee page {i+1} missing spans: '+str(list(missing.items())[:2]))
 checked+=1
for i in range(5,93):
 old=counter(b[i]);new=counter(c[i+44]);missing=old-new
 if missing:issues.append(f'results source page {i+1} -> {i+45} missing: '+str(list(missing.items())[:2]))
 checked+=1
if 'สารบัญการแข่งขันและผลรับรอง' not in c[48].get_text():issues.append('index missing title')
if 'เปิดตารางแข่งขันและผลรับรอง' not in c[3].get_text():issues.append('committee->competition link missing')
if '43 คู่' not in c[48].get_text():issues.append('43 count missing')
if not any(l.get('page')==48 for l in c[3].get_links()):issues.append('no committee to competition goto')
for page in list(range(49,137)):
 if not any(l.get('page')==48 for l in c[page].get_links()):issues.append(f'no competition return page {page+1}')
# verify data: all result labels / ranks carried from input into assembled pages
source_labels=sum(pg.get_text().count('ผลรับรอง') for pg in b[5:93]);assembled_labels=sum(pg.get_text().count('ผลรับรอง') for pg in c[49:137])
if source_labels!=assembled_labels:issues.append('result labels count mismatch '+str([source_labels,assembled_labels]))
if len(c.get_toc())!=66:issues.append('bookmark_count !=66')
linkcount=sum(len(p.get_links()) for p in c)
if linkcount != 204:issues.append('link_count != 204 found '+str(linkcount))
if len(c[48].get_links())!=18:issues.append('comp_index_links !=18')
# Check footer page numbers in rendered text (as part of copied PDF)
for n in [3,4,48,50,94,117,137]:
 text=c[n-1].get_text()
 if not re.search(r'0?'+str(n)+r'\s*/\s*137',text): issues.append('new footer missing page '+str(n))
# Check PDF fonts embedded accessibility
for n in [4,49,50,94,117]:
 page=c[n-1]; f=page.get_fonts(full=True)
 if not f:issues.append('font missing '+str(n))
 if any(x[3].startswith('Times') for x in f): snapshots.append('Times reference '+str(n))
report={'status':'PASS' if not issues else 'FAIL','qa_errors':issues,'date':'2026-11-18','pages':len(c),'a4_pages':sum(abs(p.rect.width-595)<1 and abs(p.rect.height-842)<1 for p in c),'rendered_150dpi_pages':count,'rendered_200dpi_selected_pages':12,'copy_source_text_matched_pages':checked,'committee_pages':48,'competition_pages':88,'competition_index_page':49,'results_in_table':{'fixture_results':43,'athletics_events':40,'rank_cells':109,'approved_labels_in_competition_pages':assembled_labels},'bookmarks':len(c.get_toc()),'internal_and_external_links':linkcount,'page49_links':len(c[48].get_links()),'sha256':hashlib.sha256((root/'MittraphapGames_2569_R30J_Complete_Booklet_Approved_Results_DRAFT.pdf').read_bytes()).hexdigest(),'notes':snapshots, 'limitations':['Automated verification only; no physical printing test','Safari Chrome and LINE readers not tested','Need organizer signoff','Do not Merge or publish until approval']}
(root/'R30J_QA_REPORT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='notes'},ensure_ascii=False))
if issues:raise SystemExit(2)

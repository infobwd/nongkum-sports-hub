#!/usr/bin/env python3
"""R30-K preflight/QA: fail if published results or source text change, or links fail."""
from pathlib import Path
from collections import Counter
import fitz, hashlib, json, re, time
BASE=Path('/mnt/data/r30k')
file=BASE/'MittraphapGames_2569_R30K_Results_TOC_DRAFT.pdf'
prev=Path('/mnt/data/R30J_MittraphapGames_2569_R30J_Complete_Booklet_Approved_Results_DRAFT.pdf')
committee=Path('/mnt/data/R30I_MittraphapGames_2569_LargeType_Detailed_Committee_Index_REVIEW_ONLY.pdf')
results=Path('/mnt/data/r30e_work/MittraphapGames_2569_R30E_Approved_Results_DRAFT.pdf')

def spans(p):
 return Counter((s['text'],round(s['bbox'][0],1),round(s['bbox'][1],1),round(s['size'],1)) for b in p.get_text('dict')['blocks'] for line in b.get('lines',[]) for s in line.get('spans',[]) if s['bbox'][1]<796)

with fitz.open(file) as d,fitz.open(prev) as prior,fitz.open(committee) as c,fitz.open(results) as r:
 errors=[]
 if len(d)!=138 or len(prior)!=137:errors.append('page_count')
 # Copy/graphics from immutable source except footer and link overlay on page 4.
 source_unchanged=0
 for i in range(48):
  a=spans(c[i]);b=spans(d[i]);missing=a-b
  if missing:errors.append(f'committee_original_content_missing_p{i+1}: {list(missing.items())[:2]}')
  else:source_unchanged+=1
 for i in range(5,93):
  a=spans(r[i]);b=spans(d[i+45]);missing=a-b
  if missing:errors.append(f'competition_original_content_missing_p{i+1}: {list(missing.items())[:2]}')
  else:source_unchanged+=1
 # New result table only from unchanged source.
 result_labels=sum(p.get_text().count('ผลรับรอง:') for p in list(d)[50:138])
 result_event_badges=sum(len(re.findall(r'(?m)^ผลรับรอง$',p.get_text())) for p in list(d)[50:138])
 if result_labels!=43:errors.append(f'expected_43_match_result_labels_got_{result_labels}')
 if result_event_badges!=40:errors.append(f'expected_40_athletics_result_tags_got_{result_event_badges}')
 # Navigation and page destinations.
 links=[]
 for ix,p in enumerate(d):
  for l in p.get_links():
   if l['kind']==fitz.LINK_GOTO:
    if not 0<=l['page']<len(d):errors.append(f'broken_link_p{ix+1}_{l.get("page")}')
    links.append((ix+1,l['page']+1))
 actual={dest for page,dest in links if page==50}
 expected={3,49,95,100,102,105,108,110,111,113,121,124,126,128,131}
 if not expected<=actual:errors.append(f'missing_result_index_destination:{expected-actual}')
 if len(d[49].get_links())!=16:errors.append('wrong_result_index_links')
 toc=d.get_toc()
 for level,label,pn in toc:
  if not 1<=pn<=len(d):errors.append(f'bad_bookmark_{label}_{pn}')
 if len(toc)<77:errors.append('missing_bookmarks')
 if 'สารบัญผลการแข่งขันที่ผ่านการรับรอง' not in d[49].get_text():errors.append('missing_results_toc_title')
 if 'ยังไม่มีผลการแข่งขันที่ผ่านการรับรอง' not in d[49].get_text():errors.append('missing_no_results_notice')
 if 'ผลรับรอง' not in d[94].get_text():errors.append('missing_football_results')
 if 'สนาม 2' not in d[108-1].get_text(): errors.append('venue_field_needs_manual_check')
 # Footer and A4 all pages.
 for ix,p in enumerate(d):
  if abs(p.rect.width-595.276)>0.8 or abs(p.rect.height-841.89)>0.8:errors.append(f'non_A4_{ix+1}')
  if ix not in (0,) and f'{ix+1:02d} / 138' not in p.get_text():errors.append(f'bad_footer_{ix+1}')
 report={'status':'AUTOMATED_QA_PASS' if not errors else 'FAIL','source_sha256':hashlib.sha256(prev.read_bytes()).hexdigest(),'pdf_sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'total_pages':len(d),'original_body_pages_preserved':source_unchanged,'match_results_approved':result_labels,'athletics_result_events_approved':result_event_badges,'total_links':sum(len(p.get_links()) for p in d),'result_index_page':50,'result_index_direct_links':len(d[49].get_links()),'bookmarks':len(toc),'errors':errors}
 (BASE/'QA_REPORT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps(report,ensure_ascii=False))
 if errors:raise SystemExit(1)

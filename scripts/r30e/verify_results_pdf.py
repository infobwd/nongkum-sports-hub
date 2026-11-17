#!/usr/bin/env python3
"""R30-E immutable PDF QA: every page render and original-content preservation.
The only permitted pixel changes are additions in declared result label/number boxes.
"""
import json,fitz,hashlib,collections
from pathlib import Path
from PIL import Image,ImageChops,ImageDraw
ROOT=Path('/mnt/data/r30e_work')
audit=json.loads((ROOT/'results_placement_audit.json').read_text(encoding='utf8'))
src=fitz.open('/mnt/data/R30D_MittraphapGames_2569_R30D_RowStyle_Fixed_DRAFT.pdf')
dst=fitz.open(ROOT/audit['output_pdf'])
assert len(src)==len(dst)==94
assert len(src.get_toc())==len(dst.get_toc())==24
assert sum(len(p.get_links()) for p in src)==sum(len(p.get_links()) for p in dst)==133
assert hashlib.sha256(Path(src.name).read_bytes()).hexdigest()==audit['source_sha256']
assert hashlib.sha256(Path(dst.name).read_bytes()).hexdigest()==audit['output_sha256']
assert len(audit['fixture_mappings'])==43 and len(audit['athletics_mappings'])==40
assert sum(a['rank_count'] for a in audit['athletics_mappings'])==109

allowed_by_page=collections.defaultdict(list)
for patch in audit['patches']:
 allowed_by_page[patch['page']].append(fitz.Rect(patch['rect']))
qa_pages=[];errors=[];m=fitz.Matrix(150/72,150/72)
def spanmap(page):
 out=collections.Counter()
 for b in page.get_text('dict')['blocks']:
  for ln in b.get('lines',[]):
   for s in ln.get('spans',[]):
    b=s['bbox'];out[(s['text'],tuple(round(v,1) for v in b))]+=1
 return out

for i in range(94):
 a,b=src[i],dst[i]
 page_no=i+1
 if a.rect!=b.rect:errors.append(f'p{page_no}: changed page geometry')
 old_sp=spanmap(a);new_sp=spanmap(b)
 for span,n in old_sp.items():
  if new_sp[span]<n:errors.append(f'p{page_no}: source text modified/removed {span[0][:35]}')
 old_pix=a.get_pixmap(matrix=m,alpha=False); new_pix=b.get_pixmap(matrix=m,alpha=False)
 if (old_pix.width,old_pix.height)!=(new_pix.width,new_pix.height):errors.append(f'p{page_no}: changed rendering size');continue
 im_old=Image.frombytes('RGB',(old_pix.width,old_pix.height),old_pix.samples)
 im_new=Image.frombytes('RGB',(new_pix.width,new_pix.height),new_pix.samples)
 raw=ImageChops.difference(im_old,im_new).convert('L').point(lambda x:255 if x>12 else 0)
 allowed=Image.new('L',raw.size,0)
 draw=ImageDraw.Draw(allowed)
 for rect in allowed_by_page[page_no]:
  # 3.5pt extra allows anti-alias edges and glyph ascenders.
  r=rect+(-3.5,-3.5,3.5,3.5)
  draw.rectangle([int(r.x0*m.a),int(r.y0*m.d),int(r.x1*m.a),int(r.y1*m.d)],fill=255)
 outside=ImageChops.subtract(raw,allowed)
 if outside.getbbox():
  errors.append(f'p{page_no}: changed pixels outside allowed rectangles {outside.getbbox()}')
 # only expected pages can change
 expected=bool(allowed_by_page[page_no])
 if expected and not raw.getbbox():errors.append(f'p{page_no}: expected changed but no raster difference')
 if not expected and raw.getbbox():errors.append(f'p{page_no}: unplanned page change')
 qa_pages.append({'page':page_no,'allowed_patches':len(allowed_by_page[page_no]),'changed':bool(raw.getbbox()),'outside_area_changed':bool(outside.getbbox())})
# Verify the expected text count and recent source note.
labels=sum(p.get_text().count('ผลรับรอง') for p in dst)
if labels<83:errors.append(f'Only {labels} result labels extracted, expected >=83')
if '43 คู่' not in dst[1].get_text():errors.append('Missing source count on executive summary')
# explicitly protect the two trouble rows that led to this revision.
page64=dst[63].get_text()
for q in ('รางขาม – ทุ่งมะสังฯ','ผู้ชนะคู่ที่ 3 – ผู้ชนะคู่ที่ 4','สนาม 2'):
 if q not in page64:errors.append('Missing fixture/pitch on page64: '+q)
if page64.count('สนาม 2') < 6:errors.append('Venue count on page64 unexpectedly low')
# Render important pages to 200 DPI for manual spot-check.
for num in (2,50,55,57,60,63,64,65,66,68,76,81,87,93):
 dst[num-1].get_pixmap(matrix=fitz.Matrix(200/72,200/72),alpha=False).save(str(ROOT/f'R30E_page_{num}_200dpi.png'))
qa={'status':'PASS' if not errors else 'FAIL','page_count':94,'approved_fixtures':43,'approved_athletics':40,'rank_cells':109,'original_text_preserved':not any('source text modified' in s for s in errors),'render_150dpi_all_pages':94,'render_200dpi_spot_pages':14,'original_toc_count':24,'final_toc_count':len(dst.get_toc()),'links_count':133,'actual_result_labels':labels,'changed_pages':sum(x['changed'] for x in qa_pages),'pages':qa_pages,'errors':errors,'output_pdf':audit['output_pdf'],'sha256':audit['output_sha256']}
(ROOT/'QA_REPORT.json').write_text(json.dumps(qa,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({k:v for k,v in qa.items() if k not in ('pages',)},ensure_ascii=False,indent=2))
if errors:raise SystemExit('PDF QA FAILED')

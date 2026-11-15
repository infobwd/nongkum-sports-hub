#!/usr/bin/env python3
"""R29 visual and structural QA. All pages rendered at 150 DPI; report fails closed."""
import json,fitz,hashlib,collections,re,os,sys,unicodedata
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parent
OUT=ROOT/'output'
DATA=json.loads((ROOT/'program-data.json').read_text(encoding='utf-8'))
checks={}
failures=[]
assert len(DATA['matches'])==186 and len(DATA['athletics'])==50
assert sum(len(x['lanes']) for x in DATA['athletics'])==289
assert len({(m['sport'],m['source_page'],m['match_no']) for m in DATA['matches']})==186
assert len([e for e in DATA['athletics'] if e['event_no']==35])==2 and len([e for e in DATA['athletics'] if e['event_no']==48])==2
for name in ['booklet','field']:
 path=OUT/f'mittraphap-2569-r29-{name}-DRAFT.pdf'
 doc=fitz.open(path)
 expected_orientation='portrait' if name=='booklet' else 'landscape'
 render=ROOT/('renders_'+name);render.mkdir(exist_ok=True)
 page_info=[]
 fonts=collections.Counter()
 unembedded=[]
 out_of_bounds=[]
 goto=0
 malformed_go=0
 no_text_pages=[]
 image_sample=[]
 for n,page in enumerate(doc):
  width,height=page.rect.width,page.rect.height
  if expected_orientation=='portrait' and not width<height:failures.append(f'{name}: page {n+1} incorrect portrait')
  if expected_orientation=='landscape' and not width>height:failures.append(f'{name}: page {n+1} incorrect landscape')
  if sorted((round(width),round(height))) != [595,842]:failures.append(f'{name}: page {n+1} is not A4')
  if len(page.get_text().strip())<18:no_text_pages.append(n+1)
  for entry in page.get_fonts(full=True):
   fonts[entry[3]]+=1
   try:
    buf=doc.extract_font(entry[0])[3]
    if not buf:unembedded.append((n+1,entry[3]))
   except Exception:unembedded.append((n+1,entry[3]))
  for span in [s for b in page.get_text('dict')['blocks'] for ln in b.get('lines',[]) for s in ln['spans']]:
   x0,y0,x1,y1=span['bbox']
   if x0<-1 or y0<-1 or x1>width+1 or y1>height+1:
    out_of_bounds.append((n+1,span['text'][:45]))
  for link in page.get_links():
   if link['kind'] != fitz.LINK_GOTO:malformed_go+=1;continue
   goto+=1
   if not 0<=link.get('page',-1)<len(doc):failures.append(f'{name}: invalid GoTo page at {n+1}')
   obj=doc.xref_object(link['xref'])
   if '/S /GoTo' not in obj:failures.append(f'{name}: not explicit GoTo xref {link["xref"]}')
  pix=page.get_pixmap(matrix=fitz.Matrix(150/72,150/72),alpha=False)
  image=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
  image.save(render/f'p{n+1:03d}.png',optimize=True)
  if n in (0,1,2,3,len(doc)//2,len(doc)-1):image_sample.append((n+1,image.copy()))
  page_info.append({'page':n+1,'dpi':150,'image_px':list(image.size),'nonempty':len(page.get_text().strip())>=18,'links':len(page.get_links())})
 if unembedded:failures.append(f'{name}: unembedded font {unembedded[:3]}')
 if out_of_bounds:failures.append(f'{name}: text outside page bounds {out_of_bounds[:5]}')
 if no_text_pages:failures.append(f'{name}: empty content pages {no_text_pages}')
 if malformed_go:failures.append(f'{name}: links not explicit GoTo {malformed_go}')
 if name=='booklet' and (goto<15 or len(doc.get_toc())<12):failures.append('booklet missing navigation')
 if name=='field' and (goto<9 or len(doc.get_toc())<9):failures.append('field missing navigation')
 tt=unicodedata.normalize('NFKC',' '.join(p.get_text() for p in doc))
 if 'รางขาม – ทุ่งมะสังฯ' not in tt:failures.append(f'{name}: updated pair 2 missing')
 if 'ผู้ชนะคู่ที่ 3 – ผู้ชนะคู่ที่ 4' not in tt:failures.append(f'{name}: pair 10 correction missing')
 if 'บ้านวังด้ง' not in tt:failures.append(f'{name}: PR137 notice missing')
 checks[name]={'pages':len(doc),'rendered_pages_150dpi':len(page_info),'orientation':expected_orientation,
 'bookmarks':len(doc.get_toc()),'explicit_goto_links':goto,'fonts_embedded':not unembedded,'font_families':list(fonts),
 'text_out_of_page':out_of_bounds,'link_errors':malformed_go,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
 'size_bytes':path.stat().st_size,'render_dir':str(render)}
 # compact contact montage selected at 150 DPI (after full-page QA)
 thumb_w=445;thumb_h=670
 cols=3;rows=(len(image_sample)+cols-1)//cols
 canvas=Image.new('RGB',(cols*thumb_w,rows*thumb_h),'#e7ecef');drawer=ImageDraw.Draw(canvas)
 for k,(num,img) in enumerate(image_sample):
  img.thumbnail((430,632));x=k%cols*thumb_w+7;y=k//cols*thumb_h+7
  canvas.paste(img,(x,y));drawer.text((x,y+638),f'Page {num}',fill='#24394b')
 canvas.save(OUT/f'qa-contact-{name}.png',optimize=True)
print(json.dumps(checks,ensure_ascii=False,indent=2))
qa={'status':'PASS' if not failures else 'FAIL','checks':checks,'data':{'matches':len(DATA['matches']),'athletics_events':len(DATA['athletics']),'athletics_lanes':sum(len(x['lanes']) for x in DATA['athletics']),'athletics_source_ids_repeated':{'35':2,'48':2}},'failures':failures,'caveats':['Live iOS Safari, Chrome and LINE WebView not tested','Physical A4 printing not tested','Public access permission not verified','Draft-only data; R27/R28 PRs are not merged','Exact character-for-character Unicode mapping of all Thai diacritics on every page not independently audited','Source PDF athletics item numbers 35 and 48 are each repeated twice; 49/50 absent; no guessed renumbering']}
(OUT/'qa-summary.json').write_text(json.dumps(qa,ensure_ascii=False,indent=2),encoding='utf8')
if failures:print('QA FAIL',failures);sys.exit(1)
print('QA PASS',list(checks))

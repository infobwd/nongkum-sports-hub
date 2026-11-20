#!/usr/bin/env python3
"""R30 PDF audit: source coverage, font embedding, GoTo targets, page geometry and 150DPI render."""
import fitz,json,hashlib,os,sys,re
from pathlib import Path
from collections import Counter
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parent
ORIGINAL=Path(sys.argv[1]); OUTPUT=Path(sys.argv[2]); REPORT=Path(sys.argv[3]); RENDERS=REPORT.parent/'renders150'
RENDERS.mkdir(exist_ok=True,parents=True)
source=fitz.open(ORIGINAL);out=fitz.open(OUTPUT)
problems=[]
assert len(source)==155 and len(out)==94
CHECK_SOURCE=[41,42]+list(range(44,132))
checked=0
for n in CHECK_SOURCE:
 dest=n-37 if n in (41,42) else n-38
 # All core text, including sport division, original teams and schedule, must be unchanged.
 clip=fitz.Rect(0,20,595,770 if n<88 else 768)
 if source[n-1].get_text(clip=clip)!=out[dest-1].get_text(clip=clip):problems.append(f'SOURCE-TEXT-DIFF original {n}, new {dest}')
 else:checked+=1
pcount=len(out)
alllinks=[];fontstat=Counter();not_embedded_thai=[]
for j,p in enumerate(out):
 if abs(p.rect.width-595.28)>.3 or abs(p.rect.height-841.89)>.3:problems.append(f'PAGE-GEOMETRY {j+1}')
 for f in p.get_fonts():
  family=f[3].split('+')[-1];fontstat[family]+=1
  if re.search('(Thai|Waree)',family,re.I) and f[0]>0:
   try:
    blob=out.extract_font(f[0])[3]
    if len(blob)<1000:not_embedded_thai.append([j+1,family])
   except Exception:not_embedded_thai.append([j+1,family])
 for link in p.get_links():
  if link['kind']==1:
   target=link.get('page',-1)
   if not 0<=target<len(out):problems.append(f'BAD-GOTO p{j+1} -> {target}')
  elif link['kind'] not in (2,):problems.append(f'BAD-LINK-TYPE p{j+1} type{link["kind"]}')
  alllinks.append([j+1,link['kind'],link.get('page'),link.get('uri')])
 # All-pages print-quality raster at 150 DPI
 pix=p.get_pixmap(dpi=150,alpha=False)
 pix.save(str(RENDERS/f'p{j+1:03}.png'))
# Thumbnail sheet for human review, includes every page.
W,H=126,187
images=Image.new('RGB',(W*10,H*10),'#dce7eb');draw=ImageDraw.Draw(images)
for j in range(94):
 im=Image.open(RENDERS/f'p{j+1:03}.png');im.thumbnail((120,170))
 x=(j%10)*W;y=(j//10)*H
 images.paste(im,(x,y+15));draw.text((x+3,y+1),f'{j+1:02}',fill='#0c293a')
images.save(REPORT.parent/'ALL_94_PAGES_CONTACT_SHEET.jpg',quality=82)
# Keep spot renders at 200 DPI on main content sections and 3 front matter pages.
for n in [1,2,3,4,6,31,50,63,73,94]:
 out[n-1].get_pixmap(dpi=200,alpha=False).save(str(REPORT.parent/f'R30_p{n:02}_200DPI.png'))
links_internal=sum(z[1]==1 for z in alllinks)
links_external=sum(z[1]==2 for z in alllinks)
missing_toc=[]
for page in range(4,94):
 links=out[page-1].get_links()
 if not any(l['kind']==1 and l.get('page')==2 for l in links):missing_toc.append(page)
if missing_toc:problems.append(f'NO RETURN TOC ON {missing_toc}')
# Explicit PDF GoTo dictionaries, not only inherited bookmarks.
xml_goto=sum('/S/GoTo' in out.xref_object(link['xref']).replace(' ','') for p in out for link in p.get_links() if link['kind']==1)
if xml_goto<30:problems.append(f'FEW EXPLICIT GoTo objects {xml_goto}')
if not_embedded_thai:problems.append(f'UNEMBEDDED THAI FONTS {not_embedded_thai[:8]}')
toc=out.get_toc();pdfpages=dict(page_count=len(out), original_page_count=len(source),reduction=len(source)-len(out),a4=True,
    checked_source_content_pages=checked,headings=len(toc),links_total=len(alllinks),links_internal=links_internal,links_external=links_external,
    explicit_goto=xml_goto,thai_fonts_embedded=not not_embedded_thai,all_pages_rendered_150dpi=len(list(RENDERS.glob('p*.png'))),
    subset_rendered_200dpi=10,sha256=hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),
    original_sha256=hashlib.sha256(ORIGINAL.read_bytes()).hexdigest(),font_family_occurrences=dict(fontstat),
    issues=problems, qa_status=('PASS' if not problems else 'NEEDS_REVIEW'))
REPORT.write_text(json.dumps(pdfpages,indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps({k:v for k,v in pdfpages.items() if k not in ('font_family_occurrences','original_sha256')},ensure_ascii=False))
if problems:sys.exit(2)

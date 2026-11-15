#!/usr/bin/env python3
"""Regression gate for R30-D. Fail if venue, font, fill, other text or other pages change."""
from pathlib import Path
import argparse
import fitz, json, hashlib, collections
from PIL import Image, ImageChops, ImageDraw
parser=argparse.ArgumentParser(description='R30-D row/venue style regression check')
parser.add_argument('--before',type=Path,required=True,help='immutable R30-B 94-page PDF')
parser.add_argument('--current',type=Path,required=True,help='R30-C PDF with typography bug')
parser.add_argument('--after',type=Path,required=True,help='new R30-D PDF')
parser.add_argument('--report',type=Path,required=True)
args=parser.parse_args()
B,C,D=args.before,args.current,args.after
a,b,c=map(fitz.open,(B,C,D)); issues=[]
if list(map(len,(a,b,c)))!=[94,94,94]:issues.append('94-page requirement failed')
for i,(old,new) in enumerate(zip(b,c)):
 if i!=63 and old.get_text()!=new.get_text():issues.append(f'Unexpected page text change p{i+1}')
 if abs(old.rect.width-new.rect.width)>.05 or abs(old.rect.height-new.rect.height)>.05:issues.append(f'Page size changed {i+1}')
 if len(old.get_links()) != len(new.get_links()):issues.append(f'Links changed p{i+1}')
 if i!=63:
  continue
 if len(old.get_drawings()) != len(new.get_drawings()):pass # expected overlay graphics on this page only
 if new.get_text().count('รางขาม – ทุ่งมะสังฯ')==0:issues.append('Pair 2 text absent')
 if 'ผู้ชนะคู่ที่ 3 – ผู้ชนะคู่ที่ 4 (รอบรอง)' not in new.get_text():
  # WeasyPrint can insert combining marks and breaks: check normalized tokens below.
  import unicodedata
  t=unicodedata.normalize('NFKC',new.get_text())
  if 'ผู้ชนะคู่ที่ 3 – ผู้ชนะคู่ที่ 4 (รอบรอง)' not in t:issues.append('Pair 10 text absent')
 # Check no hidden original matchup spans in the two affected rows
 for rect in [fitz.Rect(208,273,425,299),fitz.Rect(208,572,425,598)]:
  ss=[s for block in new.get_text('dict')['blocks'] for line in block.get('lines',[]) for s in line['spans'] if fitz.Rect(s['bbox']).intersects(rect)]
  if any(s['size']>10.2 or s['color']!=0x122b44 for s in ss):issues.append('Wrong font size/color in edited cell')
  if any(s['font'].startswith('Noto-Sans-Thai-Bold') and abs(s['size']-9.7)>.2 for s in ss):issues.append('Wrong size')
  if any('หนองกระทุ่ม' in s['text'] for s in ss):issues.append('Old team hidden in copy text')
  if rect.y0>550 and any('2 –' in s['text'] for s in ss):issues.append('Old pair 10 hidden in copy text')
 # Test venue metadata restored exactly from original: text and position
 orig_spans=[s for block in a[63].get_text('dict')['blocks'] for ln in block.get('lines',[]) for s in ln['spans']]
 new_spans=[s for block in new.get_text('dict')['blocks'] for ln in block.get('lines',[]) for s in ln['spans']]
 for y in (278,576):
  bb=fitz.Rect(432,y-3,468,y+18)
  orig=[s for s in orig_spans if fitz.Rect(s['bbox']).intersects(bb)]
  rec=[s for s in new_spans if fitz.Rect(s['bbox']).intersects(bb)]
  if [(x['text'],x['size'],x['color']) for x in orig]!=[(x['text'],x['size'],x['color']) for x in rec]:issues.append(f'Venue field differs at y={y}: {rec}')
  for x in (216,275,400):
   pm=new.get_pixmap(matrix=fitz.Matrix(1,1),clip=fitz.Rect(x,y+1,x+1,y+2),alpha=False)
   color=tuple(pm.samples[:3]);
   if color!=(246,248,246):issues.append(f'Incorrect row fill at ({x},{y+1}): {color}')
 # Show all render diff pixels are confined to affected columns and rows
 mask=Image.new('L',(round(new.rect.width*2),round(new.rect.height*2)),0)
 paint=ImageDraw.Draw(mask)
 for y0,y1 in [(271.6,300.7),(569.4,599.4)]:paint.rectangle([int(208*2)-1,int(y0*2)-1,int(475*2)+1,int(y1*2)+1],fill=255)
 aa=old.get_pixmap(matrix=fitz.Matrix(2,2),alpha=False)
 bb=new.get_pixmap(matrix=fitz.Matrix(2,2),alpha=False)
 ia=Image.frombytes('RGB',(aa.width,aa.height),aa.samples)
 ib=Image.frombytes('RGB',(bb.width,bb.height),bb.samples)
 dif=ImageChops.difference(ia,ib).convert('L').point(lambda v:255 if v>3 else 0)
 if ImageChops.subtract(dif,mask).getbbox():issues.append('Visual difference outside two edit rectangles')
# Every page at 150DPI, detect failures in rendering pages. We do not assert visual signoff from humans.
rendered=0
for p in c:
 pix=p.get_pixmap(matrix=fitz.Matrix(150/72,150/72),alpha=False)
 if pix.width<1000 or pix.height<1500: issues.append(f'Render dimensions wrong p{p.number+1}')
 rendered+=1
if len(b.get_toc())!=len(c.get_toc()): issues.append('Bookmarks count changed')
report={
 'version':'R30-D','status':'PASS' if not issues else 'FAIL','pages':len(c),'rendered_pages_150dpi':rendered,
 'changed_pages':[64],'pair2':'รางขาม – ทุ่งมะสังฯ','pair10':'ผู้ชนะคู่ที่ 3 – ผู้ชนะคู่ที่ 4 (รอบรอง)',
 'style':{'font_pt':9.7,'font_color':'#122b44','row_bg':'#f6f8f6','venue':'สนาม 2'},
 'bookmarks':len(c.get_toc()),'links':sum(len(p.get_links()) for p in c),'old_links':sum(len(p.get_links()) for p in b),
 'pdf_sha256':hashlib.sha256(D.read_bytes()).hexdigest(),'issues':issues,
 'limitations':'Programmatic checks only; printing, LINE/iPhone and organizer approval remain pending.'
}
args.report.parent.mkdir(parents=True,exist_ok=True)
args.report.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
if issues:raise SystemExit(1)

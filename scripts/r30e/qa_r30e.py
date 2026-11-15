#!/usr/bin/env python3
"""R30-E non-destructive, programmatic PDF acceptance checks (field/print QA still pending)."""
from __future__ import annotations
import json,hashlib,re,time,sys,argparse
from collections import Counter
from pathlib import Path
import fitz
from PIL import Image

parser=argparse.ArgumentParser()
parser.add_argument('--r25d3',required=True,type=Path)
parser.add_argument('--r30d',required=True,type=Path)
parser.add_argument('--final',required=True,type=Path)
parser.add_argument('--report',required=True,type=Path)
a=parser.parse_args()
SRC,BASE,DEST,OUT=a.r25d3,a.r30d,a.final,a.report

orig=fitz.open(SRC);base=fitz.open(BASE);doc=fitz.open(DEST)
errors=[];warnings=[]
if (len(orig),len(base),len(doc)) !=(155,94,132):errors.append('wrong source/dest page count')

expected={}
for j in (0,1):expected[j]=(base,j,'R30D')
for idx in range(2,18):expected[idx+1]=(orig,idx,'R25D3 ceremony/notice')
for idx in range(3,93):expected[idx+16]=(base,idx,'R30D sport/body')
for idx in range(18,40):expected[idx+91]=(orig,idx,'R25D3 committee')
expected[131]=(base,93,'R30D notes')
assert len(expected)==131

def body_words(page):
    return [x[4] for x in page.get_text('words') if x[3] <790]

comparisons=[]
for idx,(s,source_i,lab) in expected.items():
    a=body_words(s[source_i]);b=body_words(doc[idx]);
    if a != b:
        bad=next((k for k in range(min(len(a),len(b))) if a[k]!=b[k]),min(len(a),len(b)))
        errors.append(f'body mismatch final={idx+1} source={source_i+1} ({lab}) at word {bad}: {a[bad:bad+5]} != {b[bad:bad+5]}')
    comparisons.append({'final_page':idx+1,'source_page':source_i+1,'source':lab,'text_preserved':a==b,'word_count':len(a)})

sizes=[];rendered=0;start=time.time()
for i,page in enumerate(doc):
    r=page.rect;sizes.append([round(r.width,2),round(r.height,2)])
    if abs(r.width-595.276)>.2 or abs(r.height-841.89)>.2:errors.append(f'Not A4 final page {i+1}')
    # low-res rasterization all 132 pages confirms each page is independently renderable
    try:
        pix=page.get_pixmap(matrix=fitz.Matrix(1.22,1.22),alpha=False,colorspace=fitz.csRGB)
        if pix.width<700 or pix.height<1000:errors.append(f'render dimensions invalid page {i+1}')
        rendered+=1
    except Exception as e:errors.append(f'render page {i+1}: {e}')

links=Counter();bad_dest=[];uri_list=set();qa_links=[]
for i,page in enumerate(doc):
    for l in page.get_links():
        links[str(l['kind'])]+=1
        if l['kind']==fitz.LINK_GOTO:
            to=l.get('page',-1)
            if not 0<=to<132:bad_dest.append((i+1,to))
        if l['kind']==fitz.LINK_URI:uri_list.add(l.get('uri'))
        if i==2:qa_links.append({'kind':l['kind'],'target_page':l.get('page',-1)+1 if 'page' in l else None,'uri':l.get('uri',None)})
if bad_dest:errors.append(f'Invalid link destinations {bad_dest}')
if len(doc.get_toc())<40:errors.append(f'bookmarks too few: {len(doc.get_toc())}')
for item in doc.get_toc():
    if not 1<=item[2]<=132:errors.append(f'bad bookmark page {item}')
if not any(x and x.startswith('https://infobwd.github.io/nongkum-sports-hub/') for x in uri_list):errors.append('site URL link missing')
if 'สนาม 2' not in doc[79].get_text():errors.append('petanque page 80 missing venue 2')
for word in ['รางขาม','ทุ่งมะสัง','ผู้ชนะคู่ที่ 3','สนาม 2']:
    if word not in doc[79].get_text():errors.append('petanque page 80 missing '+word)
for check_idx,keywords in [(3,['พิธีเปิด','07.00']), (5,['พิธีปิด']), (6,['วังด้ง','หนองกระทุ่ม']), (8,['ประกาศกลุ่ม']), (109,['คณะกรรมการ'])]:
    txt=doc[check_idx].get_text()
    for s in keywords:
        if s not in txt:errors.append(f'expected heading not found page {check_idx+1}: {s}')

# QR read-back from actual rasterized page 3
qr_status='not_tested';qr_text=''
try:
    import cv2,numpy as np
    pix=doc[2].get_pixmap(matrix=fitz.Matrix(2.0,2.0),alpha=False)
    img=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
    arr=np.array(img)
    qr_text,points,_=cv2.QRCodeDetector().detectAndDecode(arr)
    qr_status='PASS' if qr_text=='https://infobwd.github.io/nongkum-sports-hub/' else 'FAIL'
    if qr_status!='PASS':errors.append('QR scan mismatch: '+repr(qr_text))
except Exception as e:
    qr_status='UNVERIFIED';warnings.append('QR raster decode not possible: '+str(e))

stats={
 'status':'PASS' if not errors else 'FAIL', 'qa_scope':'PDF programmatic QA only; no print/device/administrator acceptance',
 'pdf':DEST.name,'sha256':hashlib.sha256(DEST.read_bytes()).hexdigest(), 'pages':len(doc),
 'a4_pages':sum(1 for s in sizes if abs(s[0]-595.276)<.2 and abs(s[1]-841.89)<.2),
 'rasterized_pages':rendered, 'raster_dpi_approx':87.84,
 'page_body_compared':len(comparisons),'page_body_equal':sum(c['text_preserved'] for c in comparisons),
 'restored_original_pages':38,'bookmarks':len(doc.get_toc()),
 'links':dict(links),'link_totals':sum(links.values()), 'toc_links':len(qa_links),
 'QR_render_decoded':qr_status,'qr_url':qr_text,
 'urls':sorted(str(s) for s in uri_list), 'petanque_page':80,
 'elapsed_seconds':round(time.time()-start,2), 'errors':errors,'warnings':warnings,
 'source_map_file':'R30E_source_map.json',
 'pending_checks':['Signed committee order vs draft names','A4 physical print','Safari/Chrome/LINE real devices','Drive external permission','Reconcile R27/R28/Sheets/PDF competition data','Organizer approval']
}
OUT.write_text(json.dumps(stats,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(stats,ensure_ascii=False,indent=2))
if errors:sys.exit(1)

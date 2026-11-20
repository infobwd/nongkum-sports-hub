#!/usr/bin/env python3
"""R30-F invariant checks for 44-page ceremony/committee draft. No acceptance claimed."""
from __future__ import annotations
import argparse, fitz, hashlib, json, re
from pathlib import Path
from PIL import Image

def digest_text(s):
    # do not normalize spacing: exact source preservation matters
    return hashlib.sha256(s.encode('utf8')).hexdigest()

def run(source:Path,pdf:Path,out:Path):
    old=fitz.open(source);d=fitz.open(pdf)
    errors=[];warnings=[]
    if len(old)!=132:errors.append('unexpected source length')
    if len(d)!=44:errors.append('wrong output length')
    keep={1:1};keep.update({p:p for p in range(4,22)});keep.update({p:p+88 for p in range(22,44)})
    unchanged=0
    width,height=fitz.paper_size('a4')
    for i in range(len(d)):
        p=d[i]
        if abs(p.rect.width-width)>0.3 or abs(p.rect.height-height)>0.3:errors.append(f'not A4 page {i+1}')
        for l in p.get_links():
            if l['kind']==fitz.LINK_GOTO and not (0<=l.get('page',-1)<len(d)):
                errors.append(f'broken internal link page {i+1}')
            if l['kind']==fitz.LINK_URI and not l.get('uri','').startswith('https://'):
                errors.append(f'non-https link page {i+1}')
        if i+1 in keep:
            src=old[keep[i+1]-1]
            r=fitz.Rect(0,0,p.rect.width,802.5)
            a=src.get_textbox(r);b=p.get_textbox(r)
            if digest_text(a)==digest_text(b):unchanged+=1
            else:errors.append(f'body text mismatch page {i+1} vs R30E {keep[i+1]}')
        if i+1 in (2,3,44) and '132' in p.get_text('text') and 'R30-E' not in p.get_text('text'):
            warnings.append(f'132 appears in generated page {i+1}; manually inspect')
    text=d[2].get_text().replace('ํา','ำ').replace(';า','ำ').replace(';ำ','ำ')
    for required in ['กำหนดการพิธีเปิด','กำหนดการพิธีปิด','สีประจำโรงเรียน','ประกาศกลุ่ม','รายชื่อกรรมการ']:
        if required not in text:errors.append(f'missing TOC item {required}')
    if any(k in text for k in ['ผังการแข่งขัน 44 กลุ่ม','ตารางแข่งขันกีฬา 50','กรีฑาและตารางลู่']):errors.append('old removed TOC items still present')
    if 'กำหนดการพิธีเปิด' not in d[3].get_text().replace('ํา','ำ'):errors.append('ceremony page not retained')
    if 'ประกาศกลุ่ม' not in d[8].get_text():errors.append('official notice not retained')
    if 'คณะกรรมการ' not in d[21].get_text():errors.append('committee directory not retained')
    if len(d.get_toc())<10:errors.append('bookmarks unexpectedly low')
    # Render every page, with high-res checks on generated/important pages
    renders=out.parent/'renders';renders.mkdir(parents=True,exist_ok=True)
    dpi_all=100;dpi_risk=170
    for i in range(len(d)):
        dpi=dpi_risk if i+1 in (2,3,4,6,7,9,20,21,22,43,44) else dpi_all
        pix=d[i].get_pixmap(matrix=fitz.Matrix(dpi/72,dpi/72),alpha=False)
        if pix.width<700 or pix.height<1000:errors.append(f'bad render dimensions p{i+1}')
        if i+1 in (2,3,4,7,9,20,22,43,44):pix.save(renders/f'page_{i+1:03}.png')
    # QR code visual decoding from rendered pages (optional module availability)
    qr_results={}
    try:
        import cv2
        det=cv2.QRCodeDetector()
        for pno in (2,3,44):
            pix=d[pno-1].get_pixmap(matrix=fitz.Matrix(2,2),alpha=False)
            import numpy as np
            im=np.frombuffer(pix.samples,dtype=np.uint8).reshape(pix.height,pix.width,3)
            txt,pts,_=det.detectAndDecode(cv2.cvtColor(im,cv2.COLOR_RGB2BGR))
            qr_results[str(pno)]=txt
            if txt!='https://infobwd.github.io/nongkum-sports-hub/':errors.append(f'QR decode mismatch page {pno}: {txt!r}')
    except ImportError:
        warnings.append('opencv unavailable for QR decode; test QR separately')
    links={str(i+1):len(p.get_links()) for i,p in enumerate(d)}
    result={'status':'PASS' if not errors else 'FAIL','pdf':pdf.name,'source_pdf':source.name,
      'sha256':hashlib.sha256(pdf.read_bytes()).hexdigest(),'pages':len(d),'a4_pages':len(d)-sum(e.startswith('not A4') for e in errors),
      'kept_body_pages':len(keep),'unchanged_body_pages':unchanged,'removed_pages':88,'rendered_pages':len(d),
      'toc_entries':len(d.get_toc()),'links_total':sum(links.values()),'links_by_page':links,
      'qr_decoded':qr_results,'errors':errors,'warnings':warnings,
      'pending_manual_checks':['Original signatures and committee names','School color shade confirmation','A4 physical printing','Safari/Chrome/LINE real devices','Drive external sharing','Organizer acceptance']}
    out.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps(result,ensure_ascii=False,indent=2))
    if errors:raise SystemExit(1)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--source',type=Path,required=True);p.add_argument('--pdf',type=Path,required=True);p.add_argument('--out',type=Path,required=True)
    x=p.parse_args();run(x.source,x.pdf,x.out)

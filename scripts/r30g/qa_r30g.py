#!/usr/bin/env python3
"""R30-G fail-closed checks for duplicated footer removal and summary data correctness."""
from __future__ import annotations
import argparse,hashlib,json,re
from pathlib import Path
import fitz
from PIL import Image

PAGECOUNT=44
FIXED=[*range(4,20),*range(22,44)]
SITEMAP='https://infobwd.github.io/nongkum-sports-hub/'

def plain_words(p):
    # Original body data must be unchanged. Ignore the old/new footers below y780.
    return [(round(x[0],1),round(x[1],1),round(x[2],1),round(x[3],1),x[4]) for x in p.get_text('words') if x[1]<780.0]

def run(old:Path,new:Path,workdir:Path):
    import numpy as np
    import cv2
    workdir.mkdir(exist_ok=True,parents=True)
    src=fitz.open(old); dst=fitz.open(new)
    checks=[]; errors=[]; rendered=0;images=[]
    def check(name,cond,detail=None):
        checks.append({'name':name,'passed':bool(cond),'detail':detail})
        if not cond:errors.append(name+(f': {detail}' if detail is not None else ''))
    check('page_count_44',len(src)==len(dst)==PAGECOUNT, {'before':len(src),'after':len(dst)})
    check('all_A4',all(abs(p.rect.width-595.276)<0.2 and abs(p.rect.height-841.890)<0.2 for p in dst))
    check('bookmarks_stable',len(src.get_toc())==len(dst.get_toc())==31)
    link_sum_old=sum(len(p.get_links()) for p in src);link_sum_new=sum(len(p.get_links()) for p in dst)
    check('link_count_stable',link_sum_old==link_sum_new==56,{'before':link_sum_old,'after':link_sum_new})
    badlinks=[]
    for i,p in enumerate(dst):
        for link in p.get_links():
            if link['kind']==fitz.LINK_GOTO and not (0<=link['page']<44):badlinks.append({'page':i+1,'target':link['page']})
    check('all_internal_links_have_valid_targets',not badlinks,badlinks)
    summary=dst[1].get_text()
    for phrase in ['20','250','236','48','31','21','18','คณะ','ฝ่าย','ร่าง']:
        check('summary_has_'+phrase,phrase in summary)
    check('summary_not_250_distinct_people', ('ไม่ใช่จำนวนบุคคลไม่ซ้ำกัน' in summary or 'ไม่ใช่จํานวนบุคคลไม่ซ้ํากัน' in summary))
    check('summary_gives_pending_verification', ('ต้องตรวจรับ' in summary and 'ไม่ได้' in summary) or ('ยังไม่' in summary and 'รับรอง' in summary))
    bodydiff=[];footererror=[];footerbefore=[]
    for pn in FIXED:
        before=src[pn-1]; after=dst[pn-1]
        if plain_words(before)!=plain_words(after):bodydiff.append(pn)
        bef=before.get_textbox(fitz.Rect(52,783,548,804)).strip()
        aft=after.get_textbox(fitz.Rect(52,783,548,804)).strip()
        if bef:footerbefore.append(pn)
        if aft:footererror.append({'page':pn,'text':aft[:50]})
    check('body_text_preservation_38_pages',len(bodydiff)==0,bodydiff)
    check('original_footer_existed_38_pages',len(footerbefore)==len(FIXED),footerbefore)
    check('old_footer_text_removed_38_pages',len(footererror)==0,footererror)
    untouched=[1,3,20,21,44]
    changed=[]
    for pn in untouched:
        if src[pn-1].get_text()!=dst[pn-1].get_text():changed.append(pn)
    check('unmodified_pages_keep_text',len(changed)==0,changed)
    # Every page rendered at 120 DPI; check visual image differences outside the footer.
    diff_pages=[]
    for i,p in enumerate(dst):
        pix=p.get_pixmap(matrix=fitz.Matrix(120/72,120/72),alpha=False)
        # save selected images for QA review, render every page for completeness
        rendered+=1
        if i+1 in (2,3,9,22,29,37,43,44):
            pix.save(workdir/f'page_{i+1:02d}_120dpi.png')
        if i+1 in FIXED:
            pix0=src[i].get_pixmap(matrix=fitz.Matrix(120/72,120/72),alpha=False)
            a=np.frombuffer(pix.samples,dtype=np.uint8).reshape(pix.height,pix.width,pix.n)
            b=np.frombuffer(pix0.samples,dtype=np.uint8).reshape(pix0.height,pix0.width,pix0.n)
            high=int(780*120/72)
            if np.any(a[:high,:,:]!=b[:high,:,:]):diff_pages.append(i+1)
    check('all_pages_rendered_120dpi',rendered==44,rendered)
    check('pixel_preservation_above_footer_38_pages',not diff_pages,diff_pages)
    # Decode QR from rendered images via OpenCV, independent from payload text.
    decoded={}
    for pn in (2,3,44):
        img=cv2.imread(str(workdir/f'page_{pn:02d}_120dpi.png'))
        val,pts,_=cv2.QRCodeDetector().detectAndDecode(img)
        if not val:
            # Crop QR column to avoid false detections in text-heavy full-page layout.
            val,pts,_=cv2.QRCodeDetector().detectAndDecode(img[:, :int(img.shape[1]*.4), :])
        decoded[pn]=val
    check('qr_decodes_to_website_all_three_pages',all(val==SITEMAP for val in decoded.values()),decoded)
    # Check after footer cleanup there is exactly one current page no in the bottom strip.
    misnumbered=[]
    for i in range(1,44):
        lower=dst[i].get_textbox(fitz.Rect(42,804,550,840))
        if not re.search(rf'\b{i+1:02d}\s*/\s*44\b',lower):
            misnumbered.append(i+1)
    check('current_page_number_2_to_44',not misnumbered,misnumbered)
    result={'status':'PASS' if not errors else 'FAIL','file':new.name,'sha256':hashlib.sha256(new.read_bytes()).hexdigest(),
            'size_bytes':new.stat().st_size,'pages':len(dst),'A4_pages':44,'rendered_pages_120dpi':rendered,
            'old_footer_pages_redacted':len(FIXED),'body_preserved_pages':len(FIXED),'bookmarks':len(dst.get_toc()),
            'links':link_sum_new,'committee_divisions':20,'committee_assignment_rows':250,
            'group_counts_top4':{'field_sports_referees':48,'athletics_eligibility':31,'steering':21,'venue_preparation':18},
            'qr_decoded_pages':decoded,'checks':checks,'errors':errors,
            'pending':['signed committee appointment order','school review of roster names and affiliations',
            'physical A4 print','real Safari Chrome LINE tests','external share permissions']}
    (workdir/'QA_REPORT.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:result[k] for k in ['status','sha256','size_bytes','pages','rendered_pages_120dpi','old_footer_pages_redacted','links','bookmarks','errors']},ensure_ascii=False,indent=2))
    dst.close();src.close()
    if errors:raise SystemExit(1)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--before',type=Path,required=True);parser.add_argument('--after',type=Path,required=True);parser.add_argument('--workdir',type=Path,required=True)
    a=parser.parse_args();run(a.before,a.after,a.workdir)

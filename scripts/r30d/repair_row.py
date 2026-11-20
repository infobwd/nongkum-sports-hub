#!/usr/bin/env python3
"""R30-D: restore the untouched table style/venue from R30-B and replace only matchup text in R30-C.
Never alter competition results, time, venue or pages other than page 64. Review-only draft.
"""
from __future__ import annotations
import argparse, fitz, json, hashlib
from pathlib import Path
from weasyprint import HTML

FONT_COLOR='#122b44'; BG=(246/255,248/255,246/255)
ROWS=[
  {'pair_no':2,'label':'รางขาม – ทุ่งมะสังฯ','y0':271.6,'y1':300.7,'text_top':277.5,'match':2},
  {'pair_no':10,'label':'ผู้ชนะคู่ที่ 3 – ผู้ชนะคู่ที่ 4 (รอบรอง)','y0':569.4,'y1':599.4,'text_top':575.0,'match':10},
]

def render_text(label, filename):
    txt=label.replace('ำ','ํา')
    html=f'''<!DOCTYPE html><html lang="th"><meta charset="utf-8"><style>
    @page{{size:212pt 23pt;margin:0}}
    html,body{{padding:0;margin:0}}
    .match{{font:700 9.7pt/16pt "Noto Sans Thai","Waree",sans-serif;color:{FONT_COLOR};white-space:nowrap;}}
    </style><div class="match">{txt}</div></html>'''
    HTML(string=html).write_pdf(str(filename))
    with fitz.open(filename) as f:
        assert len(f)==1, 'text fragment overflowing'
        assert 'รางขาม' in f[0].get_text() or 'ผู้ชนะคู่ที่' in f[0].get_text()

def fix(r30b:Path,r30c:Path,output:Path):
    output.parent.mkdir(parents=True,exist_ok=True)
    doc=fitz.open(r30c); ref=fitz.open(r30b)
    assert len(doc)==len(ref)==94
    p=doc[63]; src=ref[63]
    for row in ROWS:
        y0,y1=row['y0'],row['y1']
        # Redact only the two erroneous matchup-row regions so old overlaid text
        # cannot remain in PDF search/copy text layers. Preserve other columns.
        section=fitz.Rect(208.0,y0,474.5,y1)
        p.add_redact_annot(section,fill=BG)
        p.apply_redactions(images=0,graphics=0,text=0)
        # Bring back *only the venue field* from immutable R30-B as vector,
        # not the old opponent text. Destination and source clips have 1:1 geometry.
        venue=fitz.Rect(432.5,y0,468.0,y1)
        p.show_pdf_page(venue,ref,63,clip=venue,overlay=True,keep_proportion=False)
        # The matchup text is created fresh inside its OWN column, matching
        # the original 9.7pt family/color, and never crosses venue x>=435.
        fragment=output.parent/f'_r30d_pair_{row["pair_no"]}.pdf'
        render_text(row['label'],fragment)
        text_rect=fitz.Rect(211.4,row['text_top'],423.4,row['text_top']+23)
        with fitz.open(fragment) as txt:
            p.show_pdf_page(text_rect,txt,0,overlay=True,keep_proportion=False)
    doc.set_metadata({**doc.metadata,'title':'มิตรภาพเกมส์ 2569 — สูจิบัตรตรวจร่าง R30-D คืนรูปแบบตารางและข้อมูลสนาม'})
    doc.save(str(output),garbage=4,deflate=True)
    doc.close();ref.close()
    print(json.dumps({'file':str(output),'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'size':output.stat().st_size},ensure_ascii=False))

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--before',required=True,type=Path);ap.add_argument('--current',required=True,type=Path);ap.add_argument('--output',required=True,type=Path)
    x=ap.parse_args();fix(x.before,x.current,x.output)

from pathlib import Path
from collections import Counter
from statistics import median
import fitz, json, hashlib, re
from PIL import Image
base=Path(__file__).resolve().parent
inp=Path(__import__('sys').argv[1])
orig=fitz.open('/mnt/data/R30_MittraphapGames_2569_R30_Compact_Executive_TOC_DRAFT.pdf')
doc=fitz.open(inp)
assert len(doc)==94
issues=[]
# all page images actually rasterized at 150dpi; 200dpi visual inspection subset
for i,p in enumerate(doc):
    assert 594<p.rect.width<596 and 841<p.rect.height<843
    pix=p.get_pixmap(matrix=fitz.Matrix(150/72,150/72),alpha=False)
    if pix.width<1239 or pix.height<1753:issues.append(f'p{i+1}: dpi-size wrong')
    if i+1 in {2,3,4,9,32,33,50,63,67,73,94}:
        pix200=p.get_pixmap(matrix=fitz.Matrix(200/72,200/72),alpha=False)
        pix200.save(str(inp.parent/f'preview_p{i+1:02d}_200dpi.png'))
for i in range(3,93):
    new=doc[i];old=orig[i]
    def get_body(pg):
        out=[]
        for b in pg.get_text('dict')['blocks']:
            for l in b.get('lines',[]):
                for s in l['spans']:
                    q=s['text'].strip();r=fitz.Rect(s['bbox'])
                    if q and 93<r.y0<620 and r.x0>30 and r.x1<580 and not (i==8 and 534<=r.y0<=551) and not (i==3 and 175<=r.y0<=195) and not (49<=i<93 and 127<=r.y0<=145):
                        out.append(q)
        return Counter(out)
    missing=get_body(old)-get_body(new)
    # p32/33/67 badges are added outside underlying body; source rows preserved.
    if missing:issues.append(f'p{i+1} missing source spans in protected body {dict(missing.most_common(4))}')

# robust link QA
links=[]
for i,p in enumerate(doc):
    for item in p.get_links():
        links.append((i+1,item.get('kind'),item.get('page'),item.get('uri')))
        if item['kind']==fitz.LINK_GOTO and not (0<=item['page']<len(doc)):
            issues.append(f'invalid GoTo p{i+1}')
assert len(doc.get_toc())>=20
assert sum(a[1]==fitz.LINK_GOTO for a in links)>=110
for pno,match in [(2,'เข้ารอบชิงชนะเลิศ'),(32,'เปตอง 10 ปีหญิง'),(33,'เปตอง 12 ปีชาย'),(67,'เปตอง 10 ปีหญิง และ 12 ปีชาย'),(94,'บ้านวังด้ง')]:
    if match not in doc[pno-1].get_text():issues.append(f'p{pno} missing {match}')
front_stats={}
for pno in [2,3,94]:
    sizes=[]
    for b in doc[pno-1].get_text('dict')['blocks']:
        for l in b.get('lines',[]):
            for s in l['spans']:
                if s['text'].strip():sizes.extend([round(s['size'],2)]*len(s['text']))
    front_stats[str(pno)]={'weighted_median_pt':round(median(sizes),2),'lowest_pt':min(sizes),'char_count':len(sizes)}
# forbid technical words in freshly authored front matter
for pno in [2,3,94]:
    text=doc[pno-1].get_text()
    for term in ['DRAFT','REVIEW ONLY','DESIGN V2','GitHub','JSON','GoTo','R25D3']:
        if term in text:issues.append(f'p{pno} technical wording {term}')
# verify visible meta removed as true PDF text in imported pages
for pno in [6,32,33,50,67,73]:
    s=doc[pno-1].get_text()
    if 'NONGKUM SPORTS' in s or 'MATCH SCHEDULE' in s:issues.append(f'p{pno} metadata not removed')
sha=hashlib.sha256(inp.read_bytes()).hexdigest()
result={'version':'R30B','status':'QA_PASS' if not issues else 'NEEDS_REVIEW','source_file':'R30 94-page booklet','pages':len(doc),'all_pages_rendered_150dpi':len(doc),'subset_rendered_200dpi':11,'links':len(links),'internal_GoTo':sum(a[1]==fitz.LINK_GOTO for a in links),'bookmarks':len(doc.get_toc()),'font_sizes_front':front_stats,'finalist_mentions':[2,3,32,33,67,94],'source_core_body_preserved':len(issues)==0,'sha256':sha,'issues':issues}
(inp.parent/'QA_R30B.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(result,ensure_ascii=False,indent=2))

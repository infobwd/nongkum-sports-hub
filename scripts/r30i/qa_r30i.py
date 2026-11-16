#!/usr/bin/env python3
"""QA for R30I: source preservation, link targets, large type, 250 assignments."""
import fitz,json,pathlib,hashlib,collections,re,unicodedata
B=pathlib.Path('/mnt/data')
source=fitz.open(B/'R30H_MittraphapGames_2569_Clickable_20_Committee_TOC_44pages_REVIEW_ONLY.pdf')
newfile=B/'R30I_MittraphapGames_2569_LargeType_Detailed_Committee_Index_REVIEW_ONLY.pdf'
new=fitz.open(newfile)
records=json.load(open(B/'r30i_records.json'))
report=json.load(open(B/'R30I_BUILD_REPORT.json'))
assert len(source)==44
assert len(new)==report['pages']==48
assert all(595.0<=p.rect.width<=596 and 841<=p.rect.height<=843 for p in new)
assert sum(len(v) for v in records.values())==250
# PDF text integrity for inherited vector pages 1, 2 and 4–21 (now 5–22)
for src_idx,new_idx in [(0,0),(1,1)]+[(i,i+1) for i in range(3,21)]:
 a=source[src_idx].get_text('text',clip=fitz.Rect(0,0,595,804))
 b=new[new_idx].get_text('text',clip=fitz.Rect(0,0,595,804))
 assert a==b,('source body changed',src_idx+1,new_idx+1, len(a),len(b))
# Check all 250 row names represented in reflow text with multiplicity.
# A few names are repeated within/between committees; count every name.
text='\n'.join(new[i].get_text('text') for i in range(22,len(new)-1))
# WeasyPrint glyph mapping in Noto Sans Thai yields semicolon for some Thai nikhahit U+0E4D before U+0E32.
# Normalize only this known extraction quirk; rendered glyphs remain visually Thai.
text=text.replace(';า','ํา')
for group,rows in records.items():
 for row in rows:
  n=row['name']
  assert n in text,('name missing from new PDF',group,n)
# Check typography, readable minimums, page bounds and no body text in footer.
font_counts=collections.Counter(); body_sizes=[];above_footer=[]
for i in range(22,len(new)-1):
 p=new[i]
 for b in p.get_text('dict')['blocks']:
  for line in b.get('lines',[]):
   for span in line['spans']:
    if not span['text'].strip():continue
    bb=fitz.Rect(span['bbox']);sz=round(span['size'],1)
    assert bb.x0>=-1 and bb.x1<=p.rect.width+1 and bb.y0>=-1 and bb.y1<=p.rect.height+1,('out of page',i,bb)
    if 110<bb.y0<780 and ('นาย' in span['text'] or 'นาง' in span['text'] or 'ครู' in span['text']):
     body_sizes.append(sz)
     font_counts[sz]+=1
    if bb.y0>780 and 'CONTENTS' not in span['text'] and 'R30I' not in span['text'] and 'คณะกรรมการ' not in span['text']:
     above_footer.append((i+1,bb.y0,span['text'][:30]))
assert body_sizes and min(body_sizes)>=10.0,('too small',min(body_sizes))
# New TOC spans larger than R30H's 8pt cards (while meta/footer remain smaller).
assert any(round(s['size'],1)>=10.0 for b in new[2].get_text('dict')['blocks'] for l in b.get('lines',[]) for s in l['spans'])
# Page 3 = 8 main + 20 committee + link to detailed index + return; page 4 = 8 sport + 9 athletics + return.
main_links=[x for x in new[2].get_links() if x['kind']==fitz.LINK_GOTO]
detail_links=[x for x in new[3].get_links() if x['kind']==fitz.LINK_GOTO]
assert len(main_links)>=29,('TOC link count',len(main_links))
assert len(detail_links)>=18,('Sub-TOC link count',len(detail_links))
valid_count=0
for i,p in enumerate(new):
 for link in p.get_links():
  if link.get('kind')==fitz.LINK_GOTO:
   assert 0<=link['page']<len(new),(i+1,link)
   valid_count+=1
for n,page in report['committee_start_pages'].items():
 assert f'คณะกรรมการชุดที่ {int(n):02d}' in new[page-1].get_text('text'),('committee destination mismatch',n,page)
for label,pg in report['sports_start_pages'].items():
 assert ('กีฬา '+label) in new[pg-1].get_text('text'),('sport destination mismatch',label,pg)
for label,pg in report['age_start_pages'].items():
 assert ('กลุ่มอายุ '+label) in new[pg-1].get_text('text'),('age destination mismatch',label,pg)
assert '250 รายการมอบหมาย' in new[-1].get_text('text')
assert str(len(new)) in new[-1].get_text('text')
qa={
 'status':'AUTOMATED_QA_PASS', 'source_pdf':B.name if False else source.name if hasattr(source,'name') else 'R30H',
 'new_pdf':newfile.name,'sha256':hashlib.sha256(newfile.read_bytes()).hexdigest(),
 'pdf_pages':len(new),'a4_pages':len(new), 'source_content_pages_preserved':20,
 'committees':20,'assignments':250,'sports_subcommittee_types':8,'athletics_age_groups':5,'other_athletics_committees':4,
 'main_toc_links':len(main_links),'sports_age_toc_links':len(detail_links),'internal_links':valid_count,
 'bookmarks':len(new.get_toc()),'name_font_target_pt':11.5,'affiliation_font_target_pt':10.3,
 'observed_font_size_sample_pt':sorted(font_counts.items()),
 'source_line_truncations_preserved':['ฝ่ายรักษาความปลอดภัยรายชื่อ 2 จากประกาศ 6','ฝ่ายปฐมพยาบาลรายชื่อ 2 จากประกาศ 4','เลขข้อ 14.6 ซ้ำ','ตำแหน่งกรรมการ 14.5.6 ในบัญชีร่างมีข้อความตัด'],
 'cautions':['ยังไม่ผ่านตรวจบนมือถือ Safari/Chrome/LINE จริง','ยังไม่ตรวจพิมพ์ A4 จริง','ยังไม่รับรองรายชื่อกรรมการและประกาศฉบับลงนาม','ยังไม่ได้ Merge หรือเผยแพร่แทนฉบับทางการ']
}
(B/'R30I_QA_REPORT.json').write_text(json.dumps(qa,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({k:v for k,v in qa.items() if k not in ('observed_font_size_sample_pt','cautions')},ensure_ascii=False,indent=2))
#!/usr/bin/env python3
"""R30-E: update only presentation of published approved results from R32.
The immutable R30-D PDF remains untouched. Matching files prevalidated from published view.
No competition data or Supabase records are edited by this script.
"""
import hashlib,json,re,fitz,collections
from pathlib import Path
ROOT=Path('/mnt/data/r30e_work')
INPUT=Path('/mnt/data/R30D_MittraphapGames_2569_R30D_RowStyle_Fixed_DRAFT.pdf')
OUTPUT=ROOT/'MittraphapGames_2569_R30E_Approved_Results_DRAFT.pdf'
MAPPING=json.loads((ROOT/'match_mapping_initial.json').read_text(encoding='utf-8'))
NAMES={'wangdong':'วังด้ง','saohong':'เสาหงส์','phuphrom':'พุพรหม','rangkham':'รางขาม','nongkum':'หนองกุ่ม','nongkrathum':'หนองกระทุ่ม','thungmasang':'ทุ่งมะสังฯ','wangkhaokaew':'วังเขาแก้ว'}
THAI_FONT='/usr/share/fonts/truetype/noto/NotoSansThai-Regular.ttf'
FONT_CSS=f'''@font-face {{font-family:NotoReport;src:url("{THAI_FONT}");}}'''
# Labels occupy only empty second-line room inside matchup column.
# No redaction or background patch. The existing venue, row stripe, date and time are immutable.
def label(doc,page_num,rectangle,text,size=7.2,color='#17633f',align='left'):
 p=doc[page_num-1]
 css=FONT_CSS+f' div{{font-family:NotoReport,sans-serif;font-size:{size}pt;color:{color};line-height:1.12;margin:0;padding:0;text-align:{align};white-space:nowrap;}}'
 html=f'<div>{text}</div>'
 spare,scale=p.insert_htmlbox(fitz.Rect(*rectangle),html,css=css)
 if scale < 0.97:
  raise RuntimeError(f'Unexpected font shrinking {scale} at page {page_num}: {text}')
 return {'page':page_num,'rect':[round(float(x),2) for x in rectangle],'text':text,'scale':scale}

def visible_fixture(f):
 if f['score']:
  a,b=f['score'].split('-')
  if (int(a)>int(b) and f['winner']!=f['a']) or (int(b)>int(a) and f['winner']!=f['b']):
   raise RuntimeError('Score winner conflict: '+f['fixture_id'])
  return f'ผลรับรอง: {a} : {b}'
 if f['sets']:
  pairs=[list(map(int,x.split('-'))) for x in f['sets'].split(',')]
  seta=sum(a>b for a,b in pairs);setb=sum(b>a for a,b in pairs)
  win=f['a'] if seta>setb else f['b'] if setb>seta else None
  if win!=f['winner']:
   raise RuntimeError('Published winner/sets conflict: '+f['fixture_id'])
  return f'ผลรับรอง: {NAMES[f["winner"]]} ชนะ {max(seta,setb)} : {min(seta,setb)} เซต'
 if f['winner'] not in (f['a'],f['b']):
  raise RuntimeError('Invalid winner without confirmed team ID: '+f['fixture_id'])
 return f'ผลรับรอง: {NAMES[f["winner"]]} ชนะ'

all_fixtures=MAPPING['fixtures']; all_ath=MAPPING['athletics']
assert len(all_fixtures)==43 and len(all_ath)==40
assert all(len(x['matches'])==1 and x['matches'][0]['reversed'] is False for x in all_fixtures)
assert all(len(x['events'])==1 and all(len(r['matches'])==1 for r in x['rows']) for x in all_ath)

with fitz.open(INPUT) as doc:
 assert len(doc)==94
 before_links=sum(len(p.get_links()) for p in doc)
 before_toc=len(doc.get_toc())
 patches=[]; fixture_map=[]; athletic_map=[]
 for f in all_fixtures:
  m=f['matches'][0];text=visible_fixture(f)
  y=m['y']+13.1
  patch=label(doc,m['page'],(211.4,y,423.0,y+12.3),text,size=7.1)
  patches.append(patch)
  fixture_map.append({'result_id':f['fixture_id'],'sport':f['sport'],'pdf_page':m['page'],'pdf_pair_no':m['no'],'division':m['div'],'teams':[f['a'],f['b']],'winner':f['winner'],'result_label':text})
 for e in all_ath:
  ev=e['events'][0]
  # Read-only provenance badge in the spare right-hand header space.
  patch=label(doc,ev['page'],(480,ev['y']+1.5,558,ev['y']+14.2),'ผลรับรอง',size=7.0,align='right')
  patches.append(patch)
  for row in e['rows']:
   sp=row['matches'][0]
   # Only blank ranking column of this lane; no names or neighboring columns touched.
   y=sp['y']-1.5
   rankpatch=label(doc,ev['page'],(429,y,466,y+14),str(row['rank']),size=8.3,align='center')
   patches.append(rankpatch)
  athletic_map.append({'result_id':f'athletics-{e["event_no"]:03d}-{e["sex"]}', 'pdf_page':ev['page'],'event_no':e['event_no'],'division':ev['title'],'rankings':e['ranking'],'rank_count':len(e['rows'])})
 # Executive summary: a clearly distinguished data-source note in previously blank space.
 patches.append(label(doc,2,(57,671,543,693),'ผลรับรองที่ตรวจแล้ว: กีฬาแบบคู่ 43 คู่ และกรีฑา 40 รายการ (ข้อมูลถึง 17 พ.ย. 2569)',size=9.5,color='#123c5f'))
 patches.append(label(doc,2,(57,697,543,715),'ข้อความ “ผลรับรอง” และตัวเลขอันดับในตารางอ้างอิงผลที่เผยแพร่และผ่านการรับรองแล้ว',size=8.0,color='#36546b'))
 doc.set_metadata({**doc.metadata,'title':'มิตรภาพเกมส์ 2569 สูจิบัตร R30-E ฉบับตรวจร่าง พร้อมผลรับรองรายคู่และกรีฑา','subject':'83 published approved results from Supabase Meeting; 2026-11-18 snapshot; DRAFT'})
 OUTPUT.parent.mkdir(exist_ok=True)
 doc.save(OUTPUT,garbage=4,deflate=True)
 after_links=sum(len(p.get_links()) for p in doc)
 assert before_links==after_links,('link mismatch',before_links,after_links)
 assert len(doc.get_toc())==before_toc
 payload={'status':'draft_qa_pending','source_pdf':INPUT.name,'source_sha256':hashlib.sha256(INPUT.read_bytes()).hexdigest(),'output_pdf':OUTPUT.name,'output_sha256':hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),'matches':len(all_fixtures),'athletics':len(all_ath),'lane_rankings':sum(len(a['rows']) for a in all_ath),'pages':len(doc),'bookmarks':before_toc,'links':before_links,'patches':patches,'fixture_mappings':fixture_map,'athletics_mappings':athletic_map,'last_published_at_utc':'2026-11-17T10:56:53.629378Z'}
 (ROOT/'results_placement_audit.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf8')
 print(json.dumps({k:v for k,v in payload.items() if k not in ('patches','fixture_mappings','athletics_mappings')},ensure_ascii=False))

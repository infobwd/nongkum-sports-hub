#!/usr/bin/env python3
"""Post-PDF review artifact preflight; preserves coverage without official publication."""
import json, pathlib, sys
import fitz
from PIL import Image,ImageDraw

out=pathlib.Path(sys.argv[1])
q=json.loads((out/"souvenir-v4-qa.json").read_text("utf-8"))
stage=json.loads((out/"souvenir-v42f-stage-qa.json").read_text("utf-8"))
anchors=json.loads((out/"souvenir-v4-page-map.json").read_text("utf-8"))["entries"]
pdf=fitz.open(out/"souvenir-v4-full-draft.pdf")
assert len(pdf)==q["pdf_pages"] and len(pdf)>100
assert all(abs(z.rect.width-595.28)<1.5 and abs(z.rect.height-841.89)<1.5 for z in pdf)
assert q["layout_revision"]=="R11C-V4.2-F" and q["status"]=="draft_not_approved"
assert (q["program_items"],q["matches"],q["athletics"],q["athletics_lanes"])==(236,186,50,289)
assert (q["committee_entries"],q["anchors"],q["confirmed_date_and_time"])==(250,486,45)
assert q["appendix_pages"]==17 and stage["brackets"]["appendix_replaced_pages"]==[]
assert q["official_source_lines"]==q["official_rendered_lines"]==341
assert q["official_section_count"]==20
assert q["ceremony_opening_events"]==22 and q["ceremony_closing_events"]==9
assert stage["rules"]["award_rank_points"]=={"1":5,"2":3,"3":2}
assert q["bracket_verified_edges"]>0
assert len(anchors)==486 and all(1<=v["page"]<=len(pdf) for v in anchors.values())
assert stage["cover_status"]=="layout_approved_hero_rights_pending"
assert len(stage["matchday"])==8
pages={}
for i,z in enumerate(pdf):
    txt=z.get_text()
    for key,terms in {
      "ceremony":["กำหนดการพิธีเปิดการแข่งขัน","พิธีเปิดการแข่งขัน"],
      "rules":["หลักเกณฑ์การแข่งขันและคะแนนรวม","THE RULEBOOK"],
      "brackets":["การประกบคู่และเส้นทางสู่รอบชิง","ผังสายและการประกบคู่ใหม่"],
      "matchday":["SPORTS MAGAZINE","MATCH DAY"],
      "risk":["ข้อสังเกตและสิ่งที่ควรตรวจเป็นพิเศษ"]}.items():
        if key not in pages and any(term in txt for term in terms):pages[key]=i
render=list(dict.fromkeys([0]+list(pages.values())+[len(pdf)-18]))
thumbs=[]
for i in render[:7]:
    pix=pdf[i].get_pixmap(matrix=fitz.Matrix(1.08,1.08),alpha=False)
    img=Image.frombytes("RGB",(pix.width,pix.height),pix.samples)
    img.thumbnail((505,715));thumbs.append((i+1,img))
w=2*535+15;h=((len(thumbs)+1)//2)*755+20
sheet=Image.new("RGB",(w,h),"#edf1f6");draw=ImageDraw.Draw(sheet)
for k,(n,im) in enumerate(thumbs):
    x=15+(k%2)*535;y=15+(k//2)*755
    sheet.paste(im,(x,y+24));draw.text((x,y),f"PDF page {n}",fill="#263f5d")
sheet.save(out/"souvenir-v42f-contact-sheet.png")
result={"status":"review_only_pass","pages":len(pdf),"a4":True,"anchors":len(anchors),
        "ceremony_events":31,"rank_points":stage["rules"]["award_rank_points"],
        "bracket_verified_edges":q["bracket_verified_edges"],
        "bracket_groups_needing_review":q["bracket_groups_needing_review"],
        "v3_appendix_pages_retained":q["appendix_pages"],"selected_preview_pages":pages,
        "cover_image_rights":"pending"}
(out/"souvenir-v42f-pdf-preflight.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n","utf-8")
print(json.dumps(result,ensure_ascii=False,indent=2))

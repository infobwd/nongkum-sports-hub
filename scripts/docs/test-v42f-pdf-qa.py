#!/usr/bin/env python3
"""Post-PDF review artifact preflight; preserves coverage without official publication."""
import json, pathlib, sys, re
import fitz
from PIL import Image,ImageDraw

out=pathlib.Path(sys.argv[1])
q=json.loads((out/"souvenir-v4-qa.json").read_text("utf-8"))
stage=json.loads((out/"souvenir-v42f-stage-qa.json").read_text("utf-8"))
anchors=json.loads((out/"souvenir-v4-page-map.json").read_text("utf-8"))["entries"]
pdf=fitz.open(out/"souvenir-v4-full-draft.pdf")
assert len(pdf)==q["pdf_pages"] and len(pdf)>100
# Check text extraction from the *newly generated* pages, not the unchanged V3 appendix.
new_text="\n".join(p.get_text() for p in list(pdf)[:-17])
assert not re.search(r"[ก-๙];[ก-๙]",new_text), "Thai Sara Am incorrectly extracted with ASCII semicolon"
assert not re.search(r"[ก-๙]a[ก-๙]",new_text), "Thai Sara Am incorrectly extracted with Latin a"
assert all(abs(z.rect.width-595.28)<1.5 and abs(z.rect.height-841.89)<1.5 for z in pdf)
assert q["layout_revision"]=="R11C-V4.2-H" and q["status"]=="draft_not_approved"
assert (q["program_items"],q["matches"],q["athletics"],q["athletics_lanes"])==(236,186,50,289)
assert (q["committee_entries"],q["anchors"],q["confirmed_date_and_time"])==(250,486,45)
assert q["appendix_pages"]==17 and stage["brackets"]["appendix_replaced_pages"]==[]
assert q["official_source_lines"]==q["official_rendered_lines"]==341
assert q["official_section_count"]==20
assert q["ceremony_opening_events"]==22 and q["ceremony_closing_events"]==9
assert stage["rules"]["award_rank_points"]=={"1":5,"2":3,"3":2}
assert q["bracket_verified_edges"]>0
assert q["organizer_review_rows"]==6
assert q["organizer_review_gate_counts"]=={"text_only":1,"approval_required":3,"blocking_confirmation":1,"pattern_verified":1}
assert stage["organizer_review"]["publication_state"]=="review_only" and stage["organizer_review"]["source_rows_checked"]==8
assert "ORGANIZER REVIEW" in new_text
assert len(anchors)==486 and all(1<=v["page"]<=len(pdf) for v in anchors.values())
assert stage["cover_status"]=="layout_approved_hero_rights_pending"
assert stage["cover_typography_status"]=="G1_sport_masthead_review_only"
assert q["cover_typography_revision"]=="V42-G1"
# Noto Thai renders Sara Am as canonically-equivalent combining marks for PDF text-layer compatibility.
def thai_search_normalized(text):
    return re.sub(r"\\s+","",text.replace("\\u0e33","\\u0e4d\\u0e32"))
first_page=thai_search_normalized(pdf[0].get_text())
assert thai_search_normalized("มิตรภาพเกมส์") in first_page, "Sport masthead must be native, searchable Thai PDF text"
assert "2569" in first_page and thai_search_normalized("ร่างสำหรับตรวจข้อมูล") in first_page
assert len(stage["matchday"])==8
pages={}
for i,z in enumerate(pdf):
    txt=z.get_text()
    for key,terms in {
      "ceremony":["กำหนดการพิธีเปิดการแข่งขัน","พิธีเปิดการแข่งขัน"],
      "rules":["หลักเกณฑ์การแข่งขันและคะแนนรวม","THE RULEBOOK"],
      "brackets":["การประกบคู่และเส้นทางสู่รอบชิง","ผังสายและการประกบคู่ใหม่"],
      "matchday":["SPORTS MAGAZINE","MATCH DAY"],
      "risk":["ข้อสังเกตและสิ่งที่ควรตรวจเป็นพิเศษ"],
      "organizer":["ORGANIZER REVIEW"]}.items():
        if key not in pages and any(term in txt for term in terms):pages[key]=i
assert "organizer" in pages and pages["organizer"] < len(pdf)-17
assert len(pdf[len(pdf)-18].get_text())>800, "Orphan closing note in a mostly empty A4 page"
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
        "organizer_review_rows":q["organizer_review_rows"],
        "v3_appendix_pages_retained":q["appendix_pages"],"selected_preview_pages":pages,
        "cover_image_rights":"pending","th_any_ascii_semicolon_between_thai":0}
(out/"souvenir-v42f-pdf-preflight.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n","utf-8")
print(json.dumps(result,ensure_ascii=False,indent=2))

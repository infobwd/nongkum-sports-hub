#!/usr/bin/env python3
"""Post-PDF review artifact preflight; preserves coverage without official publication."""
import json, pathlib, sys, re, unicodedata
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
assert q["official_duty_paragraphs"]==20
assert q["official_duty_wrapped_lines"]==14
assert q["formal_font"]=="Sarabun (Google Fonts, OFL)", "Full Sarabun Regular/Bold is required"
assert q["notice_layout_revision"]=="PR82-V2-N3B"
assert q["notice_visual_reference"]=="PR82-V2"
assert q["selected_cover_design"]=="full_photo_v2" and q["rendered_cover_design"]=="g1_text_only_fallback"
assert stage["notice_pr82"]=={
    "revision":"PR82-V2-N3B","status":"draft_review_only",
    "source_pages":[6,16],"full_source_retained":True}
assert q["notice_rendered_pages"]==11
notice_start=q["notice_inserted_start_page"]-1
notice_end=q["notice_inserted_end_page"]
assert notice_end-notice_start==11
assert notice_start>=1 and notice_end<len(pdf)-17
assert unicodedata.normalize("NFKC","คำปฏิญาณ") in unicodedata.normalize("NFKC",pdf[notice_start-1].get_text())
assert "ข้อมูลกรรมการ" in pdf[notice_end].get_text()
assert re.search(r"คณะกรรมการ\s*/\s*หมวด\s*1(?:\s|$)",pdf[notice_end].get_text())
assert "รอชื่อผู้ลงนาม" not in "\n".join(p.get_text() for p in list(pdf)[:notice_end]), "Old N1 opening must not reappear"
reference=fitz.open(out/"announcement_formal_preview_v2.pdf")
assert len(reference)==11
assert q["notice_golden_pdf_sha256"]==__import__("hashlib").sha256((out/"announcement_formal_preview_v2.pdf").read_bytes()).hexdigest()
assert q["notice_golden_page_text_hashes_checked"]==11 and q["notice_golden_page_pixel_hashes_checked"]==11
for i in range(11):
    expected=reference[i];actual=pdf[notice_start+i]
    assert expected.get_text()==actual.get_text(),f"Golden PR82 notice text changed on embedded page {i+1}"
    a=actual.get_pixmap(matrix=fitz.Matrix(1.4,1.4),alpha=False)
    b=expected.get_pixmap(matrix=fitz.Matrix(1.4,1.4),alpha=False)
    assert a.width==b.width and a.height==b.height and a.samples==b.samples, f"Golden PR82 visual layout changed on embedded page {i+1}"
fonts={span["font"] for p in list(pdf)[notice_start:notice_end]
    for block in p.get_text("dict")["blocks"] if "lines" in block
    for line in block["lines"] for span in line["spans"]}
assert any("SarabunFull" in name for name in fonts),f"Embedded PR82 Sarabun font missing: {fonts}"
assert len([p for p in list(pdf)[:-17] if "ข้อมูลกรรมการ" in p.get_text() and re.search(r"คณะกรรมการ\s*/\s*หมวด\s*1(?:\s|$)",p.get_text())])==1
reference.close()
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
    return re.sub(r"\s+","",text.replace(chr(0x0e33),chr(0x0e4d)+chr(0x0e32)))
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
render=list(dict.fromkeys([0,notice_start,notice_start+5,notice_end-1,notice_end]+list(pages.values())+[len(pdf)-18]))
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
        "notice_golden_pr82_pdf_pages":11,"notice_golden_start_pdf_page":notice_start+1,"notice_golden_end_pdf_page":notice_end,
        "notice_text_visual_parity":"11_of_11",
        "cover_image_rights":"pending","th_any_ascii_semicolon_between_thai":0}
(out/"souvenir-v42f-pdf-preflight.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n","utf-8")
print(json.dumps(result,ensure_ascii=False,indent=2))

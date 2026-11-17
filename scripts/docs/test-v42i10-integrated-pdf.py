#!/usr/bin/env python3
"""Post-integration acceptance: A4, no loss outside bracket, 486 anchors, PR82 parity."""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import unicodedata
from collections import Counter

import fitz
from PIL import Image, ImageDraw

parser=argparse.ArgumentParser()
parser.add_argument("--base-dir",type=pathlib.Path,required=True)
parser.add_argument("--out",type=pathlib.Path,required=True)
args=parser.parse_args()
base_q=json.loads((args.base_dir/"souvenir-v4-qa.json").read_text("utf8"))
q=json.loads((args.out/"souvenir-v42i10-integration-qa.json").read_text("utf8"))
manifest=json.loads((args.out/"brackets-44-groups-manifest.json").read_text("utf8"))
mapped=json.loads((args.out/"souvenir-v42i10-page-map.json").read_text("utf8"))["entries"]
base=fitz.open(args.base_dir/"souvenir-v4-full-draft.pdf")
pdf=fitz.open(args.out/"souvenir-v42i10-integrated-review.pdf")
assert q["state"]=="review_only_not_approved" and not q["official_publication"]
assert q["bracket_groups"]==44 and q["bracket_mirrored"]==14
assert q["new_bracket_pages"]==44 and q["replaced_legacy_bracket_pages"]>=1
assert q["matches"]==186 and q["athletics"]==50 and q["program_items"]==236
assert q["committee_entries"]==250 and q["anchors"]==486
assert q["notice_pages"]==11 and q["appendix_pages"]==17
assert q["pdf_pages"]==len(pdf)==len(base)+q["page_delta"]
assert q["source_revision_sha"]==base_q["source_revision_sha"]
assert len(mapped)==486
assert manifest["group_count"]==44 and manifest["rendered_fixture_count"]==186
assert sum(manifest["topology_counts"].values())==44
assert len(q["remaining_review_groups"])==6
assert all(abs(p.rect.width-595.28)<1.5 and abs(p.rect.height-841.89)<1.5 for p in pdf)
assert all(p.get_text().strip() for p in pdf), "Empty A4 page"

start=q["new_bracket_start_page"]-1
end=q["new_bracket_end_page"]
original_start=q["legacy_bracket_start_page"]-1
original_end=q["legacy_bracket_end_page"]
delta=q["page_delta"]
assert start==original_start and end-start==44 and delta==44-(original_end-original_start)
assert q["new_bracket_end_page"]<len(pdf)-17

def norm(text):
    return unicodedata.normalize("NFKC",text)

# Outer pages must preserve original visible text, with only native CSS page number changes.
for old_index in list(range(0,original_start))+list(range(original_end,len(base))):
    new_index=old_index if old_index<original_start else old_index+delta
    old=base[old_index]
    new=pdf[new_index]
    content=fitz.Rect(0,0,595,798)
    assert old.get_text(clip=content)==new.get_text(clip=content), (
        f"Unrelated booklet text changed: old page {old_index+1} new page {new_index+1}")

# PR82's signed-off 11-page typography must be pixel-identical away from the footer stamp.
notice_begin=base_q["notice_inserted_start_page"]-1
notice_end=base_q["notice_inserted_end_page"]
assert notice_end<start
for page_index in range(notice_begin,notice_end):
    a=base[page_index].get_pixmap(matrix=fitz.Matrix(1,1),
                                  clip=fitz.Rect(0,0,595,799),alpha=False)
    b=pdf[page_index].get_pixmap(matrix=fitz.Matrix(1,1),
                                 clip=fitz.Rect(0,0,595,799),alpha=False)
    assert a.width==b.width and a.height==b.height and a.samples==b.samples, (
        f"Notice PR82 pixel regression on page {page_index+1}")

# Anchors remain searchable on the correctly shifted program/committee/athletics pages.
for fid,ref in mapped.items():
    token="v4"+__import__("hashlib").sha1(fid.encode("utf8")).hexdigest()[:12]
    assert len(pdf[ref["page"]-1].search_for(token))==1,(fid,ref)
assert Counter(x["page"] for x in mapped.values())

# Existing Thai source-edit footer exactly once on every sheet including inserted 44 A4 pages.
footer=norm(q["revision_footer_text"])
for idx,page in enumerate(pdf):
    assert norm(page.get_text()).count(footer)==1, f"Thai revision footer count on page {idx+1}"
    words=[w[4] for w in page.get_text("words")
           if w[0]>535 and w[1]>800 and re.fullmatch(r"\d+",w[4])]
    if idx==0 or notice_begin<=idx<notice_end or idx>=len(pdf)-17:
        continue
    assert words==[str(idx+1)], f"Physical page numbering mismatch page {idx+1}: {words}"

# The new 44 pages replace, not duplicate, the legacy chapter.
review_text="\n".join(pdf[i].get_text() for i in range(start,end))
assert "R11C" in review_text and "REVIEW ONLY" in review_text
assert "⚠" in review_text or "รอตรวจ" in review_text
assert "ผังสายและการประกบคู่ใหม่" not in review_text
assert "ข้อมูลจากเอกสารอ้างอิง" in review_text
assert not re.search(r"[ก-๙];[ก-๙]",review_text)
assert not re.search(r"[ก-๙]a[ก-๙]",review_text)

# Confirm first and last 17 V3 appendix pages are not changed except their physical position.
for i in range(17):
    assert base[len(base)-17+i].get_text(clip=fitz.Rect(0,0,595,798))==(
       pdf[len(pdf)-17+i].get_text(clip=fitz.Rect(0,0,595,798)))

# Contact sheet for organizer visual QA (review-only artifact), not automatic visual acceptance.
indices=[0,notice_begin,start,start+1,start+13,start+43,end,len(pdf)-18]
thumb_w,thumb_h=340,480
sheet=Image.new("RGB",(thumb_w*4, (thumb_h+26)*2),"#E8EDF2")
draw=ImageDraw.Draw(sheet)
for i,index in enumerate(indices):
    page=pdf[index]
    pix=page.get_pixmap(matrix=fitz.Matrix(0.7,0.7),alpha=False)
    im=Image.frombytes("RGB",[pix.width,pix.height],pix.samples)
    im.thumbnail((thumb_w-12,thumb_h-12))
    x=(i%4)*thumb_w+6;y=(i//4)*(thumb_h+26)+19
    sheet.paste(im,(x,y))
    draw.text((x,y-17),f"PDF page {index+1}",fill="#163B60")
sheet.save(args.out/"souvenir-v42i10-contact-sheet.png")

result={"status":"source_pdf_integration_qa_pass","a4":True,"pages":len(pdf),
        "bracket_pages":44,"groups":44,"matches":186,"anchors":486,
        "notice_pr82_pixel_pages":11,
        "unrelated_pages_text_parity":len(base)-(original_end-original_start),
        "revision_footer_pages":len(pdf),
        "appendix_pages":17,"release_state":"review_only_not_published"}
(args.out/"souvenir-v42i10-preflight.json").write_text(
    json.dumps(result,ensure_ascii=False,indent=2)+"\n","utf8")
print("V42-I10 INTEGRATED PDF PASS:",result)

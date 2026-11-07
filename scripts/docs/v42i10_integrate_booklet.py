#!/usr/bin/env python3
"""R11C V42-I10 — opt-in review-only replacement of the legacy bracket chapter.

Do not change the source V42-H builder, original review PDF, PR82 notice or official URLs.
Source fixtures are read-only and source-driven; all paper/page-map changes are audited.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import re
import unicodedata
from collections import Counter

import fitz
from weasyprint import HTML

from v42_revision_footer import apply_revision_footer
from v42i_full_bracket_review import render_all

ROOT = pathlib.Path(__file__).resolve().parents[2]
BRACKET_TITLE = "ผังสายและการประกบคู่ใหม่"
NEXT_CHAPTER = "โปรแกรมการแข่งขัน ฟุตบอล"


def compact(text):
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", text))


def locate_chapter(source_pdf):
    pages = [compact(p.get_text("text")) for p in source_pdf]
    starts = [i for i, text in enumerate(pages) if compact(BRACKET_TITLE) in text]
    nexts = [i for i, text in enumerate(pages) if compact(NEXT_CHAPTER) in text]
    if len(starts) != 1 or len(nexts) != 1 or nexts[0] <= starts[0]:
        raise ValueError(f"Unsafe chapter boundary for bracket replacement: {starts}, {nexts}")
    a, b = starts[0], nexts[0]
    if b - a < 1:
        raise ValueError("Legacy bracket chapter empty")
    # The V42-E source heading must be at the top of a new physical A4 page.
    if compact(BRACKET_TITLE) not in compact(source_pdf[a].get_text(clip=fitz.Rect(0,0,595,210))):
        raise ValueError("Legacy chapter did not start on its own page")
    if compact(NEXT_CHAPTER) not in compact(source_pdf[b].get_text(clip=fitz.Rect(0,0,595,210))):
        raise ValueError("Next program chapter did not start on its own page")
    return a,b


def replace_native_number(page, expected):
    """Modify only a detected native CSS counter, not source contents or revision stamp."""
    items = [w for w in page.get_text("words")
             if w[0] > 535 and w[1] > 800 and re.fullmatch(r"\d+", w[4])]
    if len(items) != 1:
        raise ValueError(f"Native CSS page counter missing or ambiguous: {items}")
    word = items[0]
    rect = fitz.Rect(word[0]-0.7,word[1]-0.7,word[2]+0.7,word[3]+0.7)
    # Region is in the original footer margin, far above the source edit revision stamp.
    if rect.y1 > 827 or rect.x0 < 535:
        raise ValueError("Refusing to redact anything beyond isolated page counter")
    page.add_redact_annot(rect, fill=(1,1,1),cross_out=False)
    page.apply_redactions(images=0, graphics=0, text=0)
    page.insert_text((word[0],word[3]),str(expected),fontsize=8,
                     fontname="helv",color=(0.235,0.376,0.506),overlay=True)


def insert_native_number(page, expected):
    page.insert_text((page.rect.width-24,820),str(expected),fontsize=8,
                     fontname="helv",color=(0.235,0.376,0.506),overlay=True)


def physical_page(original_index, begin, end, new_count):
    if original_index < begin:
        return original_index
    if original_index >= end:
        return original_index + new_count - (end-begin)
    raise ValueError("Original anchor fell in removed legacy bracket pages")


def main(args=None):
    parser=argparse.ArgumentParser(description="Replace V42-E bracket chapter with 44 V42-I A4 review pages")
    parser.add_argument("--base-dir",type=pathlib.Path,required=True)
    parser.add_argument("--out",type=pathlib.Path,required=True)
    parser.add_argument("--source",type=pathlib.Path,default=ROOT/"data/program-from-pdf-2569-20261104-draft.json")
    parser.add_argument("--font",type=pathlib.Path,default=None)
    opts=parser.parse_args(args)

    opts.out.mkdir(parents=True,exist_ok=True)
    base_pdf_path=opts.base_dir/"souvenir-v4-full-draft.pdf"
    base_qa=json.loads((opts.base_dir/"souvenir-v4-qa.json").read_text("utf8"))
    base_map=json.loads((opts.base_dir/"souvenir-v4-page-map.json").read_text("utf8"))["entries"]
    source=json.loads(opts.source.read_text("utf8"))
    assert base_qa["status"]=="draft_not_approved"
    assert (base_qa["program_items"],base_qa["matches"],base_qa["athletics"],base_qa["committee_entries"],base_qa["anchors"],base_qa["appendix_pages"]) == (236,186,50,250,486,17)
    if len(base_map)!=486:
        raise ValueError("Legacy anchor count changed")
    if base_qa["notice_rendered_pages"]!=11:
        raise ValueError("PR82 11-page notice required")

    document=fitz.open(base_pdf_path)
    if len(document)!=base_qa["pdf_pages"]:
        raise ValueError("Baseline PDF page count disagrees with source QA")
    start,end=locate_chapter(document)
    notice_end=base_qa["notice_inserted_end_page"]
    if start <= notice_end or end >= len(document)-17:
        raise ValueError("Legacy bracket boundaries overlap PR82 notice or V3 appendix")
    legacy_pages=end-start
    html_doc, manifest=render_all(source)
    if manifest["group_count"]!=44 or manifest["rendered_fixture_count"]!=186:
        raise ValueError("V42-I source coverage changed")
    # The 1/44 indicator is a division index and is labeled explicitly in the combined book.
    html_doc=re.sub(r">(\d+)/44 · A4<",lambda m:">ผังที่ "+m.group(1)+" จาก 44<",html_doc)
    (opts.out/"brackets-44-groups.html").write_text(html_doc,encoding="utf8")
    (opts.out/"brackets-44-groups-manifest.json").write_text(
        json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf8")

    bracket_path=opts.out/"v42i-bracket-section-temp.pdf"
    # Decompose Sara Am like the existing full booklet renderer for searchable native Thai PDF text.
    HTML(string=html_doc.replace("\u0e33","\u0e4d\u0e32"),base_url=str(ROOT)).write_pdf(bracket_path)
    bracket=fitz.open(bracket_path)
    if len(bracket)!=44 or any(abs(p.rect.width-595.28)>1.5 or abs(p.rect.height-841.89)>1.5 for p in bracket):
        raise ValueError("Expected exactly 44 standalone A4 bracket sheets")
    if not all(p.get_text().strip() for p in bracket):
        raise ValueError("Bracket review contains a blank page")
    footer_text=base_qa["last_updated_footer_text"]
    font=opts.font
    if font is None:
        from pathlib import Path
        options=[Path("/usr/share/fonts/truetype/noto/NotoSansThai-Regular.ttf"),
                 Path("/usr/share/fonts/opentype/noto/NotoSansThai-Regular.ttf")]
        font=next((x for x in options if x.is_file()),None)
    if font is None or not font.is_file():
        raise RuntimeError("NotoSansThai-Regular is required for truthful Thai revision footer")
    counted=apply_revision_footer(bracket,font,opts.out,{"footer_text":footer_text})
    if counted!=44:
        raise ValueError("Missing source-edit footer on bracket pages")

    document.delete_pages(from_page=start,to_page=end-1)
    document.insert_pdf(bracket,start_at=start)
    bracket.close()
    delta=44-legacy_pages
    appendix_start=len(document)-17
    if len(document) != base_qa["pdf_pages"]+delta:
        raise ValueError("Unexpected integrated page count")

    for index in range(start,start+44):
        insert_native_number(document[index],index+1)
    # PR82 notice and previous chapter numbers are untouched. Later chapters shift by delta.
    for index in range(start+44,appendix_start):
        replace_native_number(document[index],index+1)

    # Anchors are source-of-truth pointers in existing program/committee/athletics sections.
    # None may lie in the removed bracket chapter.
    mapped={}
    for fixture_id, record in base_map.items():
        old_index=record["page"]-1
        new_index=physical_page(old_index,start,end,44)
        token="v4"+hashlib.sha1(fixture_id.encode("utf8")).hexdigest()[:12]
        found=document[new_index].search_for(token)
        if len(found)!=1:
            raise ValueError(f"Anchor moved or missing after bracket replacement: {fixture_id} ({len(found)})")
        page=document[new_index]
        rect=found[0]
        mapped[fixture_id]={"page":new_index+1,
                             "rect":[round(rect.x0/page.rect.width,6),round(rect.y0/page.rect.height,6),
                                     round(rect.x1/page.rect.width,6),round(rect.y1/page.rect.height,6)]}
    if len(mapped)!=486:
        raise ValueError("486 mapped anchors required")

    outfile=opts.out/"souvenir-v42i10-integrated-review.pdf"
    document.set_metadata({"title":"มิตรภาพเกมส์ 2569 — สูจิบัตร V42-I10 ฉบับตรวจร่าง",
                           "subject":"Review only; source-grounded brackets for 44 groups; not officially approved",
                           "keywords":"R11C-I10; review-only; source "+base_qa["source_revision_sha"]})
    document.save(outfile,garbage=3,deflate=True)
    document.close()

    result={"schema_version":1,"state":"review_only_not_approved",
            "source_pdf_sha256":base_qa["source_pdf_sha256"],
            "source_revision_sha":base_qa["source_revision_sha"],
            "revision_footer_text":footer_text,
            "baseline_pdf_sha256":hashlib.sha256(base_pdf_path.read_bytes()).hexdigest(),
            "integrated_pdf_sha256":hashlib.sha256(outfile.read_bytes()).hexdigest(),
            "legacy_pdf_pages":base_qa["pdf_pages"],
            "legacy_bracket_start_page":start+1,"legacy_bracket_end_page":end,
            "replaced_legacy_bracket_pages":legacy_pages,
            "new_bracket_pages":44,"new_bracket_start_page":start+1,"new_bracket_end_page":start+44,
            "page_delta":delta,"pdf_pages":base_qa["pdf_pages"]+delta,
            "program_items":236,"matches":186,"athletics":50,"committee_entries":250,
            "confirmed_date_and_time":base_qa["confirmed_date_and_time"],
            "anchors":486,"notice_pages":11,"appendix_pages":17,
            "bracket_groups":44,"bracket_mirrored":manifest["mirrored_group_count"],
            "bracket_topology_counts":manifest["topology_counts"],
            "remaining_review_groups":manifest["required_review_groups"],
            "non_bracket_page_content_preserved":True,
            "official_publication":False}
    (opts.out/"souvenir-v42i10-integration-qa.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n","utf8")
    (opts.out/"souvenir-v42i10-page-map.json").write_text(
        json.dumps({"schema_version":1,"source_pdf_sha256":result["integrated_pdf_sha256"],
                    "entries":mapped},ensure_ascii=False,indent=2)+"\n","utf8")
    print(json.dumps(result,ensure_ascii=False,indent=2))
    return result


if __name__=="__main__":
    main()

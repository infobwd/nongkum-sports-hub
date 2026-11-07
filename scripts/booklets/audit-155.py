#!/usr/bin/env python3
"""R24-B: audit 155-page G2 cover swap against I10 baseline, without publishing PDFs.

Usage:
  python scripts/booklets/audit-155.py --baseline /private/I10-before-cover.pdf --cover /private/I10-G2-cover.pdf
Optional --report /private/audit-result.json
Requires PyMuPDF. This script does not access Drive, alter PDFs, or commit private files.
"""
import argparse
import collections
import hashlib
import json
import re
from pathlib import Path

import fitz

BASELINE_SHA = "0c052af59d73bbefbe66f43dd797f08c5041ef2c00733805cd95a1ffbce6edec"
COVER_SHA = "a2a9f47f8bf871403c3995e6b4ebd102802e600fc20c16198eb12ab73b12e89d"
TOKENS_SHA = "21feb66eb393f6fa24f0012e9dd3052a7e8eabca84bf40c3a5c73a3dda380d99"
TOKEN = re.compile(r"v4[0-9a-f]{12}")

def file_sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def anchors(pdf):
    mapping = {}
    for pno, page in enumerate(pdf, start=1):
        tokens = TOKEN.findall(page.get_text())
        for tok in tokens:
            if tok in mapping:
                raise AssertionError(f"duplicate PDF anchor {tok}")
            hits = page.search_for(tok)
            if len(hits) != 1:
                raise AssertionError(f"ambiguous anchor {tok}: {len(hits)}")
            r=hits[0]
            if not (0<=r.x0<r.x1<=page.rect.width and
                    0<=r.y0<r.y1<=page.rect.height):
                raise AssertionError(f"anchor rect invalid {tok}")
            mapping[tok] = [pno, [round(r.x0/page.rect.width,6),
                                  round(r.y0/page.rect.height,6),
                                  round(r.x1/page.rect.width,6),
                                  round(r.y1/page.rect.height,6)]]
    if len(mapping) != 486:
        raise AssertionError(f"not 486 unique source anchors: {len(mapping)}")
    digest=hashlib.sha256("\n".join(sorted(mapping)).encode("utf-8")).hexdigest()
    if digest != TOKENS_SHA:
        raise AssertionError(f"source identity digest mismatch: {digest}")
    return mapping, digest

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--baseline",type=Path,required=True)
    p.add_argument("--cover",type=Path,required=True)
    p.add_argument("--report",type=Path)
    args=p.parse_args()
    if file_sha(args.baseline)!=BASELINE_SHA:
        raise AssertionError("baseline PDF revision mismatch")
    if file_sha(args.cover)!=COVER_SHA:
        raise AssertionError("cover PDF revision mismatch")
    with fitz.open(args.baseline) as base,fitz.open(args.cover) as cover:
        if len(base)!=155 or len(cover)!=155:
            raise AssertionError("wrong booklet length")
        if len(base.get_toc()) != 175 or base.get_toc()!=cover.get_toc():
            raise AssertionError("bookmark structure changed")
        for i in range(155):
            if tuple(round(v,2) for v in base[i].rect)!=tuple(round(v,2) for v in cover[i].rect):
                raise AssertionError(f"page {i+1}: A4 dimensions changed")
            r=cover[i].rect
            if not(593 <= r.width <= 597 and 839<=r.height<=845):
                raise AssertionError(f"page {i+1}: not A4")
        for i in range(1,155):
            if base[i].get_text() != cover[i].get_text():
                raise AssertionError(f"text mismatch after cover on page {i+1}")
        a0,d0=anchors(base)
        a1,d1=anchors(cover)
        if a0!=a1:
            raise AssertionError("some anchors moved after cover replacement")
        report={
          "schema_version":1,"status":"integrity_only_not_release_approval",
          "pages":155,"untouched_content_page_text_parity":154,
          "a4_pages":155,"toc_items":175,"anchor_count":486,
          "unique_anchors":486,"same_page_and_normalized_rect":486,
          "token_digest_sha256":d1,"baseline_sha256":BASELINE_SHA,
          "cover_sha256":COVER_SHA,"missing_or_ambiguous":0,
          "rights_and_data_approval":"pending",
          "public_pdf_link_permission":"not_verified"
        }
        print(json.dumps(report,ensure_ascii=False,indent=2))
        if args.report:args.report.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n","utf-8")
        return 0
if __name__=="__main__":
    raise SystemExit(main())

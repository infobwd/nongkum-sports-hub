#!/usr/bin/env python3
"""R23: derive reproducible, fail-closed fixture highlights from exact 41-page PDF V2.

No OCR or guessed row text. The layout uses the numeric 'คู่ที่' column or
the athletics 'รายการที่' heading. Requires verified PDF SHA and organizer's
single excluded repeated final. Run --check on CI, --write only for revisions.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[2]
PDF = ROOT / "assets/souvenir-2569-v2.pdf"
PROGRAM = ROOT / "data/program-from-pdf-2569-20261104-draft.json"
TARGET = ROOT / "data/program-pdf-positions-v2.json"
SOURCE_SHA = "1cd0d0166fe202b2b69e18f5ec2e1c2d80439386767a1826bf21d7d5da9e0bbf"
EXCLUDED = "football-p07-มัธยมหญิง-020-repeated-final"
HEIGHT = 841.92
# Page -> number-column word x-min/x-max and table y-min in points.
COLUMN = {
    7:(193,225,365), 8:(161,187,297), 9:(187,216,370),
    11:(205,235,144), 12:(195,221,590), 13:(195,219,45),
    14:(188,214,430), 17:(196,220,140), 18:(196,220,150),
    20:(191,219,137), 22:(190,218,136),
}


def read_rows(page, page_num):
    words = page.get_text("words")
    lo, hi, ymin = COLUMN.get(page_num, (99,137,40))
    rows = []
    for x, y, x2, y2, value, *_ in words:
        if not (lo <= x <= hi and y >= ymin) or not re.fullmatch(r"\d{1,2}", value):
            continue
        n = int(value)
        if page_num >= 23:
            if not (1 <= n <= 50):
                continue
            # Not lane numbers, times, or dates: same line contains 'รายการที่'.
            if not any("รายการที่" in w[4] and abs(w[1]-y) < 3.5 and w[0] < x
                       for w in words):
                continue
        elif not (1 <= n <= 44):
            continue
        rows.append(dict(number=n, y=round(y,1)))
    rows.sort(key=lambda r:r["y"])
    for i, row in enumerate(rows):
        row["ordinal"] = i
    return rows


def generate():
    if hashlib.sha256(PDF.read_bytes()).hexdigest() != SOURCE_SHA:
        raise AssertionError("PDF source changed — do not reuse V2 coordinates")
    data = json.loads(PROGRAM.read_text(encoding="utf-8"))
    if data["metadata"]["source_sha256"] != SOURCE_SHA:
        raise AssertionError("program JSON source revision mismatch")
    with fitz.open(PDF) as pdf:
        if len(pdf) != 41:
            raise AssertionError("source PDF no longer has 41 pages")
        rows_by_page = {p:read_rows(pdf[p-1],p) for p in
                        [*COLUMN, *range(23,36)]}
        entries, used = {}, Counter()
        active = [f for f in data["fixtures"] if f["id"] != EXCLUDED]
        if len(active) != 236:
            raise AssertionError("R20B active fixture count changed")
        for f in active:
            p = int((f.get("source_pdf") or {}).get("page") or f["source_page"])
            n = int(f["source_match_no"])
            rows = rows_by_page.get(p,[])
            matches = [row for row in rows if row["number"] == n]
            if len(matches) == 1:
                row = matches[0]
            elif p == 7 and n == 20 and f["sport_id"] == "football" and f["division"] == "มัธยมชาย":
                row = matches[-1]    # same number repeated for excluded women's final
            elif p in (32,35) and ((p,n) in ((32,35),(35,48))) and f["kind"] == "track_event":
                row = matches[0 if f["gender"] == "ชาย" else 1]
            else:
                raise AssertionError(f"ambiguous/missing source row: {f['id']} on page {p} #{n}")
            if used[(p,row["ordinal"])]:
                raise AssertionError(f"duplicate PDF row assignment {f['id']}")
            used[(p,row["ordinal"])] += 1
            next_row = rows[row["ordinal"]+1] if row["ordinal"]+1 < len(rows) else None
            track = f["kind"] == "track_event"
            top = (row["y"]-3)/HEIGHT
            bottom = ((row["y"]+18)/HEIGHT if track else
                      ((next_row["y"]-2)/HEIGHT if next_row and
                       next_row["y"]-row["y"] <= 40 else
                       (row["y"]+min(35,next_row["y"]-row["y"]-2 if next_row else 22))/HEIGHT))
            rect = [0.14 if track else 0.195, round(top,6), 0.945,
                    round(min(.985,bottom),6)]
            if not(0 <= rect[0] < rect[2] <= 1 and 0 <= rect[1] < rect[3] <= 1):
                raise AssertionError(f"invalid PDF rectangle {f['id']}: {rect}")
            entries[f["id"]] = {
                "page":p, "number":str(f["source_match_no"]), "sport_id":f["sport_id"],
                "kind":f["kind"], "division":f["division"], "rect":rect,
                "evidence":"pdf_athletics_heading" if track else "pdf_match_number_column",
            }
        if len(entries)!=236 or sum(e["kind"]=="track_event" for e in entries.values())!=50:
            raise AssertionError("missing fixture mapping")
        # Validate that the actual printed numeric token intersects each rectangle.
        for fid, e in entries.items():
            p=e["page"]
            words=pdf[p-1].get_text("words")
            r=e["rect"]
            hits=[w for w in words if w[4].strip()==e["number"] and
                  r[0]<=w[0]/pdf[p-1].rect.width<=r[2] and
                  r[1]<=w[1]/pdf[p-1].rect.height<=r[3] and
                  (w[1]+w[3])/2/pdf[p-1].rect.height<=r[3]]
            if not hits:
                raise AssertionError(f"no matching numbered PDF word in marked row for {fid}")
        return {
            "schema_version":1, "source_pdf":"assets/souvenir-2569-v2.pdf",
            "source_sha256":SOURCE_SHA, "source_pdf_pages":41,
            "source_program_sha256":data["metadata"]["source_sha256"],
            "coordinate_space":"normalized_top_left_cropbox",
            "program_correction":"remove "+EXCLUDED,
            "generated_from":"PyMuPDF verified number-column / athletics-heading positions for exact V2 PDF",
            "qa":{"active_total":236, "expected_active_total":236, "match_rows":186,
                  "track_rows":50,"unresolved":0,
                  "source_pdf_row_suppressed":[EXCLUDED,"takraw-p13-repeat-match-9"]},
            "entries":entries,
        }


if __name__ == "__main__":
    parser=argparse.ArgumentParser()
    group=parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--check",action="store_true")
    group.add_argument("--write",action="store_true")
    args=parser.parse_args()
    out=generate()
    if args.write:
        TARGET.write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        print("R23 coordinate index written: 236 verified entries")
    else:
        committed=json.loads(TARGET.read_text(encoding="utf-8"))
        if committed != out:
            raise AssertionError("committed R23 coordinate index differs from exact PDF extraction")
        print("R23 coordinate index PASS: 236 active (186 match, 50 athletics); all source rows verified")

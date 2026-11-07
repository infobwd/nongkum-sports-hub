#!/usr/bin/env python3
"""CLI for the PR #82 golden 11-page draft notice renderer (N3-A).

The reusable renderer now consumes the original audited V3 source model.
The older --html argument is accepted only for legacy caller compatibility;
it is deliberately NOT parsed, because N1/N2 changed its markup.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import fitz

from v42_official import build_source_model
from v42_notice_pr82 import render_official_notice_v2


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--source-pdf", type=Path,
                   default=Path("assets/souvenir-committee-2569-v3.pdf"),
                   help="Original V3 PDF used to validate the 341-line notice")
    p.add_argument("--html", type=Path, default=None,
                   help="Deprecated: accepted for older workflows; ignored")
    p.add_argument("--fonts", type=Path, required=True,
                   help="Full Sarabun Regular/Bold TTF directory (runner only)")
    p.add_argument("--out", type=Path, required=True)
    args = p.parse_args()
    if not args.source_pdf.is_file():
        raise FileNotFoundError("Original V3 source PDF missing: " + str(args.source_pdf))
    with fitz.open(args.source_pdf) as pdf:
        source_model = build_source_model(pdf)
    output = render_official_notice_v2(source_model, args.fonts, args.out)
    print(json.dumps(output["qa"], ensure_ascii=False, indent=2))
    print("REVIEW_ONLY", output["pdf"])


if __name__ == "__main__":
    main()

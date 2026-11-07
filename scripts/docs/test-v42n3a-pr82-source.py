#!/usr/bin/env python3
"""N3-A source-contract regression for the reusable PR82 notice renderer."""
from pathlib import Path
import hashlib
import re

import fitz

from v42_notice_pr82 import source_rows_from_model, render_official_notice_v2
from v42_official import build_source_model

root=Path(__file__).resolve().parents[2]
source_path=root/"assets/souvenir-committee-2569-v3.pdf"
with fitz.open(source_path) as original:
    model=build_source_model(original)
rows=source_rows_from_model(model)
assert model["full_text_sha256"]=="31d86c20a790377cbc3d839dfdb7641ccb520a1e71192894c89628d1b633bdd3", "V3 source contents changed; organizer review is required"
assert len(rows)==341
assert len({row["id"] for row in rows})==341
assert rows[0]["kind"]=="v42-document-title" and rows[1]["kind"]=="v42-document-title"
assert len([x for x in rows if x["kind"]=="v42-section-title"])==20
assert len([x for x in rows if x["kind"]=="v42-duty-line"])==20
assert len([x for x in rows if x["id"].startswith("v3-p16-")])==5
assert len([x for x in rows if x["kind"]=="v42-member-line"])>=200
assert [x["id"] for x in rows]==[line["id"] for page in model["pages"] for line in page["lines"]]
assert hashlib.sha256("\n".join(x["text"] for x in rows).encode("utf-8")).hexdigest()==model["full_text_sha256"]
assert all(re.fullmatch(r"v3-p\d{2}-l\d+",x["id"]) for x in rows)
assert callable(render_official_notice_v2)
# Layout is still the original PR82 template, not the N1/N2 magazine editor.
source_code=(root/"scripts/docs/v42_notice_pr82.py").read_text("utf-8")
assert "grid-template-columns:12mm minmax(0,1fr) 33mm" in source_code
assert ".duty{margin:2.5mm 0 4mm;" in source_code
assert "v41_editorial" not in source_code
assert "v42-official-content" not in source_code
assert "source_rows_from_model(model)" in source_code
assert "Sarabun-Regular.ttf" in source_code and "Sarabun-Bold.ttf" in source_code
print("N3-A SOURCE PASS — 341 original V3 IDs, 20 sections, 20 duties, direct PR82 renderer")

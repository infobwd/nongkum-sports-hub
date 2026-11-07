#!/usr/bin/env python3
"""Golden PR82 V2 notice output QA; no public or official publication."""
import hashlib
import json
import re
import sys
import unicodedata
from pathlib import Path

import fitz

out=Path(sys.argv[1])
pdfpath=out/"announcement_formal_preview_v2.pdf"
q=json.loads((out/"announcement_fontfix_v2_qa.json").read_text("utf-8"))
doc=fitz.open(pdfpath)
assert len(doc)==11==q["pages"], "Golden PR #82 layout is exactly 11 A4 pages"
assert q["source_lines"]==341 and q["sections"]==20
assert q["duty_paragraphs"]==20 and q["closing_lines"]==5
assert q["renderer"]=="PR82-V2-direct-source"
assert q["status"]=="draft_preview_not_signed" and q["A4"] is True
assert q["stray_latin_a_in_thai"]==0 and all(q["search_checks"].values())
assert hashlib.sha256(pdfpath.read_bytes()).hexdigest()==q["sha256"]
assert all(abs(p.rect.width-595.28)<1 and abs(p.rect.height-841.89)<1 for p in doc)
all_text="\n".join(page.get_text() for page in doc)
normalized=unicodedata.normalize("NFKC",all_text)
assert normalized.count("มีหน้าที่")==20
for word in ("ดำเนินการ","ตำบล","อำนวยการ","จัดทำ","น้ำดื่ม","คำ"):
    assert unicodedata.normalize("NFKC",word) in normalized, word
assert not re.findall(r"[ก-๙]a[ก-๙]",all_text)
fonts={f[3] for p in doc for f in p.get_fonts()}
assert any(f.endswith("+SarabunFull") for f in fonts), fonts
assert any(f.endswith("+SarabunFull-Bold") for f in fonts), fonts
first=doc[0]
words=first.get_text("words")
role_right=[w for w in words if w[4] in ("กรรมการ","ประธานกรรมการ") and w[0]>445 and w[2]<535]
assert len(role_right)>=10, "PR82 role column must remain right-aligned, not N2 inline prose"
for i in (0,5,10):
    page=doc[i]
    assert len(page.get_text().strip())>100
    assert not page.get_images(full=True), "PR82 is text-only, do not fabricate a logo or signature"
    pix=page.get_pixmap(matrix=fitz.Matrix(.5,.5),alpha=False)
    assert pix.width>280 and pix.height>400
assert "ร่าง" in normalized and "สั่ง ณ" in normalized
print(json.dumps({"golden_reference":"PR82 announcement_formal_preview_v2.pdf",
                  "golden_reference_sha256":"8cc68ba476192fe47310280600a9c681afdbe98378dc7881bf183d977d8928d8",
                  "produced_sha256":q["sha256"],"pages":len(doc),
                  "source_lines":q["source_lines"],"sections":q["sections"],
                  "duty_paragraphs":q["duty_paragraphs"],
                  "right_gutter_roles_page1":len(role_right),
                  "status":"review_only_pass"},ensure_ascii=False,indent=2))

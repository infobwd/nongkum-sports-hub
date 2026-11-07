#!/usr/bin/env python3
"""R11C-V42H: prevent silently changing source fixture references in organizer notes."""
import json, pathlib, sys
root=pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0,str(root/"scripts/docs"))
from v42_organizer_review import CASES, SOURCE_ASSERTIONS, audit, render, css
data=json.loads((root/"data/program-from-pdf-2569-20261104-draft.json").read_text("utf-8"))
fixtures=[x for x in data["fixtures"] if not x["id"].endswith("repeated-final")]
markup,report=render(fixtures)
assert report["publication_state"]=="review_only"
assert report["item_count"]==6 and report["source_rows_checked"]==8
assert report["gate_counts"]=={"text_only":1,"approval_required":3,"blocking_confirmation":1,"pattern_verified":1}
assert all(c["sport"] in markup for c in CASES)
assert all(c["id"] in report["case_ids"] for c in CASES)
assert "ห้ามประกาศคู่ใหม่" in markup and "ไม่ต้องเปลี่ยนคู่" in markup
assert "ภาคผนวก V3 อีก 17 หน้า" in markup
assert "organizer-card" in css()
# A future fixture change must force human review of the old observations.
wrong=[x.copy() for x in fixtures]
target=next(x for x in wrong if x["id"]=="petanque-p17-10-ปี-ชาย-030")
target["source_pair_text"]="ผู้ชนะคู่ที่ 3 – ผู้ชนะคู่ที่ 4 (รอบรอง)"
try:
    audit(wrong)
except ValueError as ex:
    assert "source changed" in str(ex)
else:
    raise AssertionError("Source change silently accepted")
print("R11C-V42H PASS: six cases, 8 archived fixtures, gated review-only, source-change regression")

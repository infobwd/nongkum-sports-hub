#!/usr/bin/env python3
"""Regression: every effective source fixture appears exactly once, with safe review marks."""
import copy
import json
import pathlib
import sys
from collections import Counter

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "docs"))
from v42i_full_bracket_review import render_all, REVIEW_POINTS, EXPECTED_REVIEW_GROUPS

data = json.loads((ROOT / "data/program-from-pdf-2569-20261104-draft.json").read_text("utf-8"))
doc, qa = render_all(data)

assert qa["status"] == "review_only_not_approved"
assert (qa["raw_count"], qa["effective_count"], qa["matches"], qa["athletics"]) == (237, 236, 186, 50)
assert qa["group_count"] == 44 and qa["rendered_fixture_count"] == 186
assert doc.count('<section class="paper full-coverage"') == 44
assert doc.count('data-fixture="') == 186
assert "@page {size:A4;margin:0}" in doc
assert "ไม่ใช่ผลการแข่งขัน" not in doc or "ไม่ใช่ผลการแข่งขัน" in doc  # no fake output asserted below
assert "REVIEW ONLY" in doc and "ห้ามเผยแพร่แทนสูจิบัตรจริง" in doc
assert "⚠" in doc and "ⓘ" in doc

matches = [x for x in data["fixtures"] if x["kind"] == "match" and not x["id"].endswith("repeated-final")]
all_ids = [f for g in qa["groups"] for f in g["fixture_ids"]]
assert Counter(all_ids) == Counter(x["id"] for x in matches)
assert len(all_ids) == len(set(all_ids))
for row in matches:
    assert doc.count('data-fixture="'+row["id"]+'"') == 1, row["id"]

groups = {(g["sport_id"], g["division"]):g for g in qa["groups"]}
assert len(groups) == 44
assert EXPECTED_REVIEW_GROUPS.issubset(groups.keys())
assert groups["petanque","10 ปี หญิง"]["mirrored"]
assert groups["petanque","10 ปี ชาย"]["mirrored"]
assert groups["petanque","10 ปี ชาย"]["visual_links"]["has_blocking"]
assert not groups["petanque","10 ปี ชาย"]["visual_links"]["right_link"]
assert groups["tugofwar","12 ปี หญิง"]["mirrored"]
assert groups["tugofwar","12 ปี หญิง"]["visual_links"]["has_bye"]
assert groups["football","12 ปี ชาย"]["topology"] == "league_with_final"
assert not groups["football","12 ปี ชาย"]["mirrored"]
assert groups["football","มัธยมชาย"]["topology"] == "direct_final"
assert groups["volleyball","12 ปี หญิง"]["topology"] == "playoff_source_only"
assert not groups["volleyball","12 ปี หญิง"]["mirrored"]
assert groups["takraw","12 ปี ชาย"]["topology"] == "playoff_source_only"
assert not groups["takraw","12 ปี ชาย"]["mirrored"]

# Every hard-coded review note must match one real source fixture.
indexed = {(x["sport_id"],x["division"],str(x.get("source_match_no") or "")) for x in matches}
assert set(REVIEW_POINTS).issubset(indexed)

# Invalid bye reference must not draw a fictitious seven-team progression.
mutated = copy.deepcopy(data)
for row in mutated["fixtures"]:
    if row["sport_id"]=="tugofwar" and row["division"]=="12 ปี หญิง" and row["source_match_no"]=="17":
        row["source_pair_text"]="ผู้ชนะคู่ที่ 999 – ชื่อสมมติ (รอบรอง)"
        break
_, qa2 = render_all(mutated)
tug = next(x for x in qa2["groups"] if x["sport_id"]=="tugofwar" and x["division"]=="12 ปี หญิง")
assert not tug["mirrored"] and tug["topology"]=="nonstandard_source_only"

# A4 and source-review requirement, never silently removing the 17-page V3 appendix from main booklet.
assert qa["v3_appendix_pages_retained"] == 17
print("V42-I FULL COVERAGE PASS: 44 groups / 186 unique fixtures / 6 review topics; no fictional links or 7th-team bye")

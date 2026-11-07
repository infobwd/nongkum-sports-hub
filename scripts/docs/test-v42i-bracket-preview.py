#!/usr/bin/env python3
"""V42-I source/fixture regression for three review-only bracket proof pages."""
import copy
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "docs"))
from v42i_bracket_preview import render_document

data = json.loads((ROOT / "data/program-from-pdf-2569-20261104-draft.json").read_text("utf-8"))
assert len(data["fixtures"]) == 237, "Do not silently change source fixture inventory"
live_matches = [f for f in data["fixtures"] if f["kind"] == "match" and not f["id"].endswith("repeated-final")]
assert len(live_matches) == 186, "Expected 186 nonrepeated matches"

html, qa = render_document(data)
assert html.count('<section class="paper">') == 3
assert "@page {size:A4;margin:0}" in html
assert "V4.2-I" in html and "REVIEW ONLY" in html
assert "ไม่ใช่ผลการแข่งขัน" in html
assert "รอตรวจ" in html and "ผ่านเข้ารอบ" in html

girls = qa["petanque/10 ปี หญิง"]
assert girls == {"left_link":True,"right_link":True,"final_link":True,"has_bye":False,"has_blocking":False}, girls
boys = qa["petanque/10 ปี ชาย"]
assert boys["has_blocking"] and not boys["left_link"] and not boys["right_link"]
assert boys["final_link"] and not boys["has_bye"], boys
tug = qa["tugofwar/12 ปี หญิง"]
assert tug["has_bye"] and tug["right_link"] and tug["final_link"] and not tug["has_blocking"], tug

# Reject a fabricated seven-team bye reference even when its round is otherwise present.
modified = copy.deepcopy(data)
for fixture in modified["fixtures"]:
    if fixture["sport_id"] == "tugofwar" and fixture["division"] == "12 ปี หญิง" and fixture["source_match_no"] == "17":
        fixture["source_pair_text"] = "ผู้ชนะคู่ที่ 999 – ทีมที่ไม่มีในต้นฉบับ (รอบรอง)"
        break
else:
    raise AssertionError("Source test fixture for tug-of-war bye missing")
try:
    render_document(modified)
except ValueError as exc:
    assert "Cannot safely identify" in str(exc)
else:
    raise AssertionError("Fabricated bye was accepted")

print("V42-I PASS: 237 raw / 186 matches, 3 A4 proofs, safe 8-team links, blocked petanque, verified 7-team bye")

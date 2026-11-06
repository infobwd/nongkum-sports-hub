#!/usr/bin/env python3
import pathlib,json,sys
r=pathlib.Path(__file__).resolve().parents[2];sys.path.insert(0,str(r/"scripts/docs"))
from v42_brackets import analyze,render,APPENDIX_SOURCE_PAGES
j=json.loads((r/"data/program-from-pdf-2569-20261104-draft.json").read_text("utf-8"))
rows=[x for x in j["fixtures"] if x["kind"]=="match" and not x["id"].endswith("repeated-final")]
assert len(rows)==186
groups,qa=analyze(rows)
assert qa["fixture_count"]==186
assert len(APPENDIX_SOURCE_PAGES)==17
assert qa["verified_edges"]>0 and qa["division_groups"]>=40
assert len(qa["source_ambiguities"])>0
assert qa["appendix_replaced_pages"]==[]
markup,_=render(rows,j["sports"])
assert "การประกบคู่" in markup and "รอตรวจผังสาย" in markup
assert 'data-fixture="petanque-' in markup
assert "ไม่มีเส้นแพ้คัดออก" in markup
assert "วอลเลย์บอล" in markup and "ฟุตบอล" in markup
print(f"V42-E PASS: {qa['division_groups']} divisions; {qa['verified_edges']} source-grounded edges; {qa['groups_with_source_ambiguity']} ambiguous groups; V3 appendix retained")

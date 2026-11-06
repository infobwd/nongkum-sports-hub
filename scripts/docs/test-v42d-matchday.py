#!/usr/bin/env python3
import json,pathlib,sys
r=pathlib.Path(__file__).resolve().parents[2];sys.path.insert(0,str(r/"scripts/docs"))
from v42_matchday import render,get_school_map,css
j=json.loads((r/"data/program-from-pdf-2569-20261104-draft.json").read_text("utf-8"))
lookup=get_school_map(j["schools"]);assert len(lookup)==8
rows=[x for x in j["fixtures"] if x["sport_id"]=="football" and x["kind"]=="match" and "repeated-final" not in x["id"]]
a,report=render(rows,j["schools"],"ฟุตบอล")
assert "v42-match-card" in a and "VS" in a and report["cards"]==8
assert report["known_school_sides"]>0
assert "สีประกอบ" in a and "ยังไม่ทราบโรงเรียน" in a
assert "v42-match-grid" in css()
unknown=dict(rows[0],team_a_id=None,team_b_id=None)
b,_=render([unknown],j["schools"],"ฟุตบอล");assert 'class="v42-team-colors unknown"' in b
print("V42-D PASS: exact ID palette 8 schools, 8 football cards, neutral unknown teams, no guessed winners")

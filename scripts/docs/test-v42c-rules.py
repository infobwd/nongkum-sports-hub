#!/usr/bin/env python3
import json, pathlib, sys, fitz
r=pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0,str(r/"scripts/docs"))
from v42_rules import validate,render,css
pdf=fitz.open(r/"assets/souvenir-committee-2569-v3.pdf")
policy=json.loads((r/"data/standings-rules.json").read_text("utf-8"))
s,a=render(pdf,policy)
assert a["award_rank_points"]=={"1":5,"2":3,"3":2}
assert len(a["petanque_rule_lines"])>=6
assert "ผลต่างประตูได้–เสีย" in s and "ใบแดง" in s and "ใบเหลือง" in s
assert "5" in s and "3" in s and "2" in s
assert "V3 หน้า 19" in s and "แพ้คัดออก" in s
assert "7 ประเภทกีฬา" in s and "9 หมวด" in s
assert "v42-awards" in css() and "v42-petanque" in css()
print("V42-C PASS: trophy 5/3/2, football 3/1/0 and approved tiebreak, petanque source clauses; unresolved policies visible")

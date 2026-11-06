#!/usr/bin/env python3
import pathlib,sys,fitz
root=pathlib.Path(__file__).resolve().parents[2];sys.path.insert(0,str(root/"scripts/docs"))
from v42_ceremony import render,parse
pdf=fitz.open(root/"assets/souvenir-committee-2569-v3.pdf")
a,qa1=render(pdf,3);b,qa2=render(pdf,4)
assert qa1["events"]==22 and qa2["events"]==9
assert qa1["slots"]==["07.00","07.15","08.45","09.00","10.00"]
assert qa2["slots"]==["8.30"]
assert a.count('class="v42-ceremony-event"')==22
assert b.count('class="v42-ceremony-event"')==9
assert "ณ สนามโรงเรียน (ข้อความต้นฉบับรอตรวจ)" in a
assert "ไม่มีเวลาเริ่มใหม่" in a
print("V42-B integration PASS: 31 source events, 6 time slots; no invented timestamps")

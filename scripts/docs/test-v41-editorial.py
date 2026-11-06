#!/usr/bin/env python3
"""R11C V4.1 source-grounded regression: no athlete PII, no invented certification."""
import importlib.util, json, pathlib, sys
ROOT=pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"scripts/docs"))
import v41_editorial as v
def check(vv,desc):
    if not vv:raise AssertionError(desc)
colorpage="สีประจำโรงเรียน" 
color=v.colors_and_oath(colorpage)
check(color.count('class="school-card"')==8,"eight color cards")
check("คำปฏิญาณนักกีฬา" in color,"source-based oath")
check("รหัสสีประจำโรงเรียน" in color,"color swatches explicitly not official")
timeline=v.ceremony_timeline("กำหนดการ\n07.00 น. - เตรียมตัว\n07.15 น. - เคลื่อนขบวน\n08.45 น. - ประธานเดินทาง","พิธีเปิด","16 พฤศจิกายน 2569")
check(timeline.count('class="timeline-row"')==3,"only explicit source times")
check("09.00" not in timeline,"never invent additional clock times")
source6="ประกาศกลุ่มเครือข่ายพัฒนาคุณภาพการศึกษาหนองกุ่ม\nเรื่อง แต่งตั้งกรรมการ\nด้วยความร่วมมือของสถานศึกษา\n1. คณะกรรมการอำนวยการแข่งขัน\n1.1 นายทดสอบ ตัวอย่าง"
source16="ทั้งนี้ เพื่อความเรียบร้อย\nสั่ง ณ วันที่ ..."
notice=v.notice(source6,source16)
check("official-paper" in notice and "ร่าง" in notice,"draft formal page")
check("รอชื่อผู้ลงนาม" in notice and "เลขที่ประกาศ" in notice,"no fabricated signature or notice number")
check("นายทดสอบ" not in notice,"source committee list belongs in roster")
screen=json.loads((ROOT/"data/analysis/r12a-school-time-risk-20261104.json").read_text(encoding="utf-8"))
risk=v.special_observations(screen)
check("33" in risk and "96" in risk and "53" in risk,"R12A known counts")
check("ไม่ใช่จำนวนเด็กที่แข่งขันชนกันจริง" in risk,"R12A is school-level only")
check("พื้นที่ส่วนตัว" in risk,"private roster gate")
mock=[{"source_team_a_label":"ทีมหนึ่ง","source_team_b_label":"ทีมสอง","source_match_no":"1","division":"12 ปี ชาย","round":"รอบแรก","draft_date":"2026-11-17","draft_time":"08:30","source_pair_text":"ทีมหนึ่ง - ทีมสอง"}]
cards=v.sports_cards(mock,"ฟุตบอล")
check(cards.count('class="matchup-card"')==1,"fixture cards")
check("ทีมหนึ่ง" in cards and "ทีมสอง" in cards,"no invented teams")
check(v.bracket_note(mock)=="","round robin must not become a fabricated knockout bracket")
css=v.extra_css()
check(".official-paper" in css and ".school-grid" in css and ".qa-cards" in css,"style groups")
formal_css,font=v.formal_font_css()
check(font and (formal_css or font),"formal font available or falls back")
b=(ROOT/"scripts/docs/build-v4-full.py").read_text("utf-8")
check("special_observations(r12_screen)" in b and "render_ceremony(pdf,3)" in b,"V42-B ceremony and risk connected")
check("render_matchday(rows" in b and "render_brackets(matches" in b,"V42-D/E layout connected")
check("render_rules(pdf,policy)" in b,"V42-C rules connected")
print("R11C-V4.1 TEST PASS: 8 schools, formal draft, explicit timeline, bracket guard, R12A source limits")

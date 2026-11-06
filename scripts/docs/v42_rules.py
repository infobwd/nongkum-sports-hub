"""V42-C: source-traceable magazine rules pages. DRAFT not an official rulebook."""
import html, re
def e(x): return html.escape(str(x if x is not None else ""),quote=True)
def txt(page): return page.get_text("text",sort=True)
def source_lines(pdf,n):
    return [s.strip() for s in txt(pdf[n-1]).splitlines() if s.strip() and not re.fullmatch(r"-\s*\d+\s*-",s.strip())]
def validate(pdf,policy):
    if len(pdf)<19: raise ValueError("V3 pages 17-19 required")
    p17="\n".join(source_lines(pdf,17))
    p19="\n".join(source_lines(pdf,19))
    if not all(x in p17 for x in ("เกณฑ์การคิดคะแนน","ที่ 1","ที่ 2","ที่ 3","ฟุตบอล","ฟุตซอล","วอลเลย์บอล")):
        raise ValueError("V3 page 17 rule headings changed")
    if "กติกา เปตอง" not in p19 and "กติกาเปตอง" not in p19: raise ValueError("V3 petanque rule text missing")
    overall=policy.get("overall_award",{})
    if overall.get("draft_rank_points")!={"1":5,"2":3,"3":2}: raise ValueError("draft award source changed")
    football=policy.get("football_league",{})
    if football.get("points")!={"win":3,"draw":1,"loss":0}: raise ValueError("football points source changed")
    if football.get("tie_breakers")!=["head_to_head_goal_difference","fewest_red_cards","fewest_yellow_cards"]:
        raise ValueError("football tie-breaker source changed")
    if len(policy.get("sport_policies",[]))<9: raise ValueError("sport policies incomplete")
    petanque=[x for x in policy["sport_policies"] if x["sport_id"]=="petanque"]
    if len(petanque)!=1 or petanque[0].get("elimination_status")!="approved": raise ValueError("petanque elimination not approved")
    rulelines=[]
    in_petanque=False
    for line in source_lines(pdf,19):
        if "กติกา เปตอง" in line or "กติกาเปตอง" in line:in_petanque=True;continue
        if in_petanque and re.match(r"^\d+\.\s+เปตอง",line):break
        if in_petanque:rulelines.append(line)
    if len(rulelines)<6:raise ValueError("petanque detailed clauses incomplete")
    return {"source_pages":[17,19],"award_rank_points":overall["draft_rank_points"],
            "football_policy_status":football.get("approval_status"),
            "petanque_rule_lines":rulelines,"petanque_rule_count":len(rulelines),
            "source_seven_sport_categories":True,
            "public_program_has_nine_sport_ids":True,
            "release_state":"needs_organizer_approval"}
def render(pdf,policy):
    audit=validate(pdf,policy)
    cards=[]
    for rank,points in (("1",5),("2",3),("3",2)):
        cards.append(f'<div class="v42-award"><small>อันดับ {rank}</small><strong>{points}</strong><span>คะแนนถ้วยรวม</span></div>')
    pts=policy["football_league"]["points"]
    football_cells="".join(f'<div class="v42-footpt"><b>{e(label)}</b><strong>{pts[key]}</strong><span>คะแนน</span></div>' for key,label in
                            (("win","ชนะ"),("draw","เสมอ"),("loss","แพ้")))
    tiebreak=[("01","ผลต่างประตูได้–เสีย เฉพาะการพบกันของทีมคะแนนเท่ากัน"),
              ("02","จำนวนใบแดงน้อยกว่า"),
              ("03","จำนวนใบเหลืองน้อยกว่า")]
    ties="".join(f'<div class="v42-tie"><b>{i}</b><span>{e(s)}</span></div>' for i,s in tiebreak)
    petanque=[]
    for line in audit["petanque_rule_lines"]:
        if line.startswith("-"):petanque.append(line.lstrip("-").strip())
        elif petanque:petanque[-1]+=" "+line
        else:petanque.append(line)
    pe="".join(f'<div class="v42-petanque-rule"><span>{i:02}</span><p>{e(s)}</p></div>' for i,s in enumerate(petanque,1))
    orig=e("\n".join(source_lines(pdf,17))).replace("\n","<br>")
    body=f'''<section class="v42-rules">
      <div class="v42-rule-hero"><span>THE RULEBOOK · มิตรภาพเกมส์ 2569</span>
       <h2>หลักเกณฑ์การแข่งขัน</h2>
       <p>แยกคะแนนถ้วยรวมออกจากกติกาของแต่ละชนิดกีฬา • ฉบับร่างเพื่อให้ผู้จัดตรวจ</p></div>
      <div class="v42-rule-kicker">01 / ตารางคะแนนถ้วยรางวัล</div>
      <div class="v42-awards">{''.join(cards)}</div>
      <p class="v42-rule-annotation">V3 หน้า 17 ระบุเกณฑ์คะแนนรวมทั้งทีมและบุคคลแบบเดียวกัน แต่ยังต้องรับรองการนับอันดับเสมอและรายการที่ไม่ส่งผู้แข่งขัน (ไม่ใช่คะแนนฟุตบอล)</p>
      <div class="v42-rule-kicker">02 / ฟุตบอล 12 ปี ชาย</div>
      <h3>คะแนนการแข่งขันแบบพบกันหมด</h3>
      <div class="v42-footpts">{football_cells}</div>
      <h3>เมื่อคะแนนเท่ากัน</h3>
      <div class="v42-ties">{ties}</div>
      <p class="v42-rule-annotation">ลำดับเกณฑ์ชี้ขาดมาจากข้อสั่งการผู้จัดที่บันทึกใน data/standings-rules.json; การผ่านเข้ารอบ 4 ทีมตาม V3 ยังมีข้อขัดกับ Google Docs รุ่นเก่าและต้องตรวจมติผู้จัดก่อนประกาศใช้</p>
      <div class="v42-rule-kicker">03 / เปตอง</div>
      <h3>แพ้คัดออก — ผู้ชนะผ่านรอบ</h3>
      <p class="v42-rule-annotation">นโยบายแพ้คัดออกมีคำยืนยันของผู้จัดแล้ว ส่วนจำนวนเซ็ต ระยะทาง และข้อบังคับแต่ละช่วงชั้นต่อไปนี้ถอดจาก V3 หน้า 19 ยังต้องตรวจรับเป็นข้อความสุดท้าย</p>
      <div class="v42-petanque-list">{pe}</div>
      <div class="v42-rule-kicker">04 / หลักเกณฑ์อื่นที่ต้องตรวจ</div>
      <p>รายการ V3 หน้า 17 ระบุ “7 ประเภทกีฬา” ขณะที่ระบบโปรแกรมมี 9 หมวดรวมยิงจุดโทษและชักเย่อ ต้องแยกประเภทหลักจากรายการกิจกรรมเสริมก่อนจัดสูจิบัตรฉบับประกาศใช้</p>
      <div class="v42-scope-note">กติกาของกีฬาที่เหลือยังไม่มีข้อความฉบับรับรองครบทุกข้อ จึงแสดงในตารางรายการแข่งขันโดยไม่แต่งเกณฑ์ใหม่</div>
      <div class="v42-source-rule"><b>ข้อความต้นฉบับ V3 หน้า 17 สำหรับตรวจเทียบ</b><p>{orig}</p></div>
      <p class="v42-rule-foot">ร่างเพื่อการตรวจรับ ไม่ใช้แทนระเบียบการแข่งขันหรือเอกสารที่กรรมการลงนาม</p>
    </section>'''
    return body,audit
def css():
    return """
.v42-rules{color:#19334d}.v42-rule-hero{padding:8mm 9mm;background:#153b60;color:white;border-bottom:4px solid #dabb63;margin:0 0 5mm;break-inside:avoid}
.v42-rule-hero span{font-size:8pt;letter-spacing:.6px;color:#f1d484}.v42-rule-hero h2{font-size:23pt;color:white;margin:2mm 0 1mm}
.v42-rule-hero p{font-size:8.5pt;color:#d7e5f1}.v42-rule-kicker{font-size:9pt;font-weight:700;letter-spacing:.2px;color:#b38c36;margin:6mm 0 2mm;break-after:avoid}
.v42-awards,.v42-footpts{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;break-inside:avoid}
.v42-award{padding:4mm 2mm;text-align:center;border:1px solid #e4eaf0;background:#f4f7fb}
.v42-award small,.v42-award span{display:block;color:#496780;font-size:9pt}.v42-award strong{font-size:27pt;color:#153d60;display:block}
.v42-rule-annotation{font-size:8.5pt;line-height:1.7;color:#60778d;margin:3mm 0 5mm}
.v42-footpt{background:#173d61;color:white;text-align:center;border-top:3px solid #d8bb61;padding:3mm}
.v42-footpt b,.v42-footpt span{display:block;font-size:9pt}.v42-footpt strong{display:block;font-size:24pt;color:#f5d786}
.v42-rules h3{font-size:12pt;margin:4mm 0 2mm}.v42-ties{display:grid;grid-template-columns:1fr;gap:2mm}
.v42-tie{display:flex;align-items:baseline;gap:3mm;border-left:3px solid #caac62;background:#f4f7fa;padding:2mm 3mm;break-inside:avoid}
.v42-tie b{font-size:12pt;color:#c29e48}.v42-tie span{font-size:9.2pt}
.v42-petanque-list{display:grid;grid-template-columns:1fr 1fr;gap:2.5mm}
.v42-petanque-rule{display:grid;grid-template-columns:7mm 1fr;gap:2mm;background:#f2f6fa;border:1px solid #e1e8ee;padding:2.5mm;break-inside:avoid}
.v42-petanque-rule span{font-size:11pt;font-weight:700;color:#bb9948}.v42-petanque-rule p{margin:0;font-size:8.5pt;line-height:1.6}
.v42-scope-note{background:#fff5e2;border-left:3px solid #c69d4a;padding:3mm;font-size:9pt}
.v42-source-rule{margin:7mm 0 4mm;border-top:1px solid #dbe3eb;padding:3mm 0;color:#526d85}
.v42-source-rule b{font-size:9pt}.v42-source-rule p{font-size:7.5pt;line-height:1.65}
.v42-rule-foot{font-size:8pt;color:#89672c;margin:5mm 0}
"""

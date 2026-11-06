"""R11C-V4.1: source-grounded formal and magazine layouts (no private athlete data).
All sections return HTML strings, and do not change the approved fixture projection.
"""
import html
import re
from pathlib import Path

def e(s):
    return html.escape(str(s if s is not None else ""))

def formal_font_css():
    """Use embedded looped Sarabun (Google Fonts) when present; never substitute a loopless font."""
    paths=[
        (Path("/tmp/v41-fonts/Sarabun-Regular.ttf"),Path("/tmp/v41-fonts/Sarabun-Bold.ttf"),"Sarabun (Google Fonts, OFL)"),
        (Path("/usr/share/fonts/truetype/th-sarabun/THSarabunNew.ttf"),Path("/usr/share/fonts/truetype/th-sarabun/THSarabunNew-Bold.ttf"),"TH Sarabun New"),
    ]
    for regular,bold,label in paths:
        if regular.is_file() and bold.is_file():
            css=("@font-face{font-family:FormalThai;src:url('"+regular.as_uri()+"');font-weight:400}"
                 "@font-face{font-family:FormalThai;src:url('"+bold.as_uri()+"');font-weight:700}")
            return css,label
    # Noto Looped Thai is a clearly looped fallback, not an unverified Google Sans alias.
    return 'html{--formal-family:"Noto Looped Thai","Noto Sans Thai Looped",NotoThai,sans-serif}',"Noto Thai Looped fallback"

def notice(source_page6,source_page16):
    """Formal layout but not an issued order. Intro is quoted from the V3 draft, not newly drafted."""
    lines=[s.strip() for s in source_page6.splitlines() if s.strip()]
    opening=[]
    for s in lines[2:]:
        if re.match(r"^1\.\s*(คณะกรรมการ|ฝ่าย)",s):break
        opening.append(s)
    if not opening:
        opening=lines[:7]
    source_close="\n".join(s.strip() for s in source_page16.splitlines() if s.strip())
    intro=" ".join(opening)
    return f'''
    <article class="official-paper">
      <div class="official-watermark">ร่าง</div>
      <div class="official-org">กลุ่มเครือข่ายพัฒนาคุณภาพการศึกษาหนองกุ่ม</div>
      <div class="official-rule"></div>
      <p class="official-doc-type">ประกาศกลุ่มเครือข่ายพัฒนาคุณภาพการศึกษาหนองกุ่ม</p>
      <p class="official-topic">เรื่อง แต่งตั้งคณะกรรมการดำเนินการแข่งขันกีฬานักเรียน “มิตรภาพเกมส์ 2569”</p>
      <p class="official-meta">เลขที่ประกาศ / วันที่รับรอง : <b>รอข้อมูลและการลงนามจากผู้มีอำนาจ</b></p>
      <div class="official-body">
        <p class="official-paragraph">{e(intro)}</p>
        <p class="official-closing">{e(source_close)}</p>
        <p class="official-reference">รายละเอียดรายชื่อและหน้าที่อ้างอิงจากหน้าคณะกรรมการที่แสดงต่อจากประกาศนี้ (รอการตรวจรายโรงเรียน)</p>
      </div>
      <div class="official-sign">
        <div>........................................................</div>
        <div>(รอชื่อผู้ลงนามและตำแหน่งตามเอกสารรับรอง)</div>
        <small>ยังไม่ใช่ประกาศที่มีผลบังคับใช้หรือคำสั่งแต่งตั้งที่ลงนาม</small>
      </div>
    </article>
    '''

def ceremony_timeline(source_text,kind,date_note):
    """Timeline of only clock times actually printed in the V3 source text."""
    times=re.compile(r'(?m)^\s*(\d{1,2}[.:]\d{2})\s*น\.?\s*[-–]?\s*')
    list_hits=list(times.finditer(source_text))
    if not list_hits:
        return '<div class="warning">ไม่สามารถแยกเวลาอัตโนมัติได้ โปรดดูต้นฉบับ</div><div class="source">'+e(source_text).replace("\n","<br>")+'</div>'
    cards=[]
    for i,m in enumerate(list_hits):
        to=list_hits[i+1].start() if i+1<len(list_hits) else len(source_text)
        body=source_text[m.end():to].strip()
        body=re.sub(r"\n+", " / ",body)
        cards.append(f'<div class="timeline-row"><div class="time-capsule">{e(m.group(1))}<small>น.</small></div><div class="timeline-copy">{e(body)}</div></div>')
    return '<div class="feature-head"><div class="feature-index">พิธีการ · '+e(kind)+'</div><div class="feature-title">'+e(date_note)+'</div><p>กำหนดการตามสูจิบัตร V3 ฉบับร่าง • แสดงเฉพาะเวลาที่มีในต้นฉบับ • กิจกรรมต่อเนื่องที่ไม่ระบุเวลาอยู่ในช่วงก่อนหน้า</p></div><div class="timeline">'+''.join(cards)+'</div>'

# Names and color pairs transcribed from V3 page 5; color swatches are approximate illustration only.
COLORS=[
 ("โรงเรียนวัดทุ่งมะสัง (มิตรภาพที่ 9)","แดง","เหลือง","#d94040","#e6bc48"),
 ("โรงเรียนวังเขาแก้ว (หงำอุปถัมภ์)","ฟ้า","ส้ม","#68a9df","#f19c48"),
 ("โรงเรียนบ้านพุพรหม","ชมพู","ม่วง","#e88abb","#946abb"),
 ("โรงเรียนบ้านหนองกุ่ม","ฟ้า","เหลือง","#74b3e7","#e9c752"),
 ("โรงเรียนบ้านเสาหงส์","ม่วง","ชมพู","#946abb","#e88abb"),
 ("โรงเรียนบ้านรางขาม","ขาว","เขียว","#fffefa","#5fae76"),
 ("โรงเรียนบ้านวังด้ง","เหลือง","น้ำเงิน","#e9c752","#2654a4"),
 ("โรงเรียนบ้านหนองกระทุ่ม","ฟ้า","ชมพู","#74b3e7","#e88abb"),
]
def colors_and_oath(source_text):
    if "สีประจำโรงเรียน" not in source_text:
        raise ValueError("V3 page 5 color source changed")
    cards=[]
    for i,(name,left,right,hexleft,hexright) in enumerate(COLORS,1):
        cards.append(f'''<div class="school-card">
           <div class="school-card-top"><span class="school-number">{i:02}</span><strong>{e(name)}</strong></div>
           <div class="color-bar"><span style="background:{hexleft}"></span><span style="background:{hexright}"></span></div>
           <div class="color-names">{e(left)} · {e(right)}</div>
        </div>''')
    # Preserve the substantive source oath and leave the name blank for the speaker.
    oath=("ข้าพเจ้า (.....ชื่อตนเอง...) ขอประกาศตน ณ ที่นี้ว่า\n"
          "ข้าพเจ้า เป็นนักกีฬาสมัครเล่น\n"
          "จะทำการแข่งขันกีฬา\n"
          "ด้วยน้ำใจของนักกีฬา อย่างแท้จริง")
    return f'''<div class="feature-head"><div class="feature-index">OUR SCHOOL COLOURS</div>
      <div class="feature-title">สีสันแห่งมิตรภาพ</div>
      <p>8 โรงเรียน · ชื่อสีตามร่าง V3 หน้า 5 / เฉดสีตัวอย่างประกอบการจัดหน้า ยังไม่ได้รับรองรหัสสีประจำโรงเรียน</p></div>
      <div class="school-grid">{''.join(cards)}</div>
      <div class="oath-feature"><p class="oath-kicker">คำปฏิญาณนักกีฬา</p>
        <div class="quote-mark">“</div>
        <blockquote>{e(oath).replace(chr(10),"<br>")}</blockquote>
        <div class="oath-source">ถ้อยคำจาก V3 หน้า 5 · กรุณาตรวจเทียบต้นฉบับก่อนใช้กล่าวจริง</div>
      </div>'''

def sports_cards(rows, sport_name):
    """Fixtures as editorial matchup cards. Does not imply unverified knockout progression."""
    subset=rows[:min(8,len(rows))]
    cards=[]
    for x in subset:
        pair=x.get("source_pair_text") or "รอประกบคู่"
        left=x.get("source_team_a_label") or "รอทีม"
        right=x.get("source_team_b_label") or "รอทีม"
        day=x.get("planning_date") if x.get("planning_date_confirmation")=="confirmed" else x.get("draft_date")
        time=x.get("planning_time") if x.get("planning_time_confirmation")=="confirmed" else x.get("draft_time")
        status="ยืนยันวันและเวลา" if x.get("planning_date_confirmation")=="confirmed" and x.get("planning_time_confirmation")=="confirmed" else "เวลา/ทีมตามร่าง"
        cards.append(f'''<div class="matchup-card">
          <div class="matchup-meta">คู่ {e(x.get("source_match_no") or "—")} · {e(x.get("division") or "—")} · {e(x.get("round") or "—")}</div>
          <div class="matchup-pair"><span>{e(left)}</span><b>VS</b><span>{e(right)}</span></div>
          <div class="matchup-detail">{e(day or "รอวัน")} · {e(time or "รอเวลา")} · {e(status)}</div>
        </div>''')
    return (f'<div class="matchup-intro"><span class="matchup-eyebrow">MATCH DAY · {e(sport_name)}</span>'
            f'<h2>คู่แข่งขันที่น่าติดตามในโปรแกรม</h2><p>การ์ดตัวอย่าง {len(subset)} คู่จากข้อมูลต้นทางจริง ยังไม่ใช่ลำดับสายแพ้คัดออกที่รับรอง</p></div>'
            f'<div class="matchup-grid">{"".join(cards)}</div>')

def bracket_note(rows):
    knockout=[x for x in rows if any(k in str(x.get("round") or "") for k in ("ชิง","รอง","ก่อนรอง","คัดออก"))]
    if not knockout:return ""
    preview=knockout[:8]
    rows_html="".join(f'''<div class="bracket-row"><span class="bracket-round">{e(x.get("round") or "")}</span>
       <span>{e(x.get("source_pair_text") or "รอประกบ")}</span>
       <small>คู่ {e(x.get("source_match_no") or "?")}</small></div>''' for x in preview)
    return (f'<div class="bracket-feature"><h2>เส้นทางรอบคัดเลือกและรอบชิง</h2>'
            f'<p>แสดง {len(preview)} รายการที่ระบุชื่อรอบในต้นฉบับ — ไม่เชื่อมลูกศรผู้ชนะโดยคาดเดา</p>'
            f'{rows_html}</div>')

def special_observations(screen):
    st=screen.get("stats",{})
    if screen.get("report_type")!="school_level_draft_start_time_screening":
        raise ValueError("R12A source format changed")
    expected={"same_start_school_groups":33,"near_start_school_pairs":96,"missing_date_or_time":53,
              "athletics_events":50,"unresolved_match_team_refs":60,"fixtures":237}
    for key,n in expected.items():
        if st.get(key)!=n:raise ValueError("R12A baseline revised; review statistics before printing")
    risk=[
      ("01","วัน เวลา และสนาม","ทบทวนรายการที่ยังไม่ยืนยัน รวมเปตองนอกรอบ 12–13 พ.ย., คอร์ตที่ยังเป็นข้อมูลร่าง และกรีฑา 50 รายการที่ยังไม่มีเวลาเริ่มรายรายการ"),
      ("02","รายการซ้ำและปีที่ไม่ตรง","ฟุตบอลมัธยมหญิงใช้ชิง 18 พ.ย. เพียงครั้งเดียว; ตรวจบรรทัดวันที่ 20 พ.ย. ในภาคผนวก V3 และคู่ที่ 9 ของเซปักตะกร้อ รวมถึงรายการต้นฉบับที่ค้าง QA เรื่องปี 2568"),
      ("03","ผู้ชนะคู่และสายแข่งขัน","ตรวจคู่ที่อ้าง ‘ผู้ชนะคู่...’ และลำดับรอบ อย่าเติมชื่อทีมเองก่อนทราบผลรอบก่อน; ตรวจการแข่งขันพบกันหมดแยกจากแพ้คัดออก"),
      ("04","สนามและคณะกรรมการ","ตรวจสนามย่อย/คอร์ตจริง ระยะเดินทาง การใช้กรรมการและสถานที่ในเวลาเดียวกัน ชื่อสนามหมายเลขเดียวกันข้ามกีฬาไม่ได้แปลว่าเป็นสนามเดียว"),
      ("05","นักกีฬาเล่นมากกว่าหนึ่งกีฬา","ต้องมีทะเบียนรายชื่อและรหัสนักกีฬาที่ได้รับการตรวจในพื้นที่ส่วนตัวก่อน จึงตรวจ hard/near conflict ได้จริง; อย่าเผยแพร่ชื่อเด็กใน repo สาธารณะ"),
      ("06","การรับรองประกาศและพิธีการ","ตรวจประเภท ‘ประกาศ’ กับถ้อยคำ ‘สั่ง ณ วันที่’, เลขที่ วันลงนาม ผู้มีอำนาจ ชื่อ/สังกัดกรรมการ สีโรงเรียน เวลาและลำดับพิธี และข้อความปฏิญาณ"),
      ("07","เกณฑ์การแข่งขัน","ตรวจเกณฑ์คะแนนรวมถ้วย, เงื่อนไขผลเสมอของฟุตบอล, ใบเหลืองใบแดง, แพ้คัดออกของเปตอง ให้ตรงข้อสรุปผู้จัด ไม่ยึดข้อความ PDF ร่างถ้ามีคำยืนยันใหม่")
    ]
    cells="".join(f'<div class="qa-card"><div class="qa-no">{num}</div><div><h3>{e(title)}</h3><p>{e(note)}</p></div></div>' for num,title,note in risk)
    return f'''<div class="qa-cover"><div class="qa-kicker">BEFORE THE FIRST WHISTLE</div>
       <h2>ข้อสังเกตและรายการตรวจเป็นพิเศษ</h2><p>ใช้เพื่อประชุมผู้จัดและโรงเรียนก่อนยืนยันตารางแข่งขัน</p>
       <div class="qa-stats"><div><strong>{st["same_start_school_groups"]}</strong><span>กลุ่มโรงเรียนเริ่มตรงกัน</span></div>
       <div><strong>{st["near_start_school_pairs"]}</strong><span>คู่รายการเริ่มห่าง 1–30 นาที</span></div>
       <div><strong>{st["missing_date_or_time"]}</strong><span>รายการยังขาดวัน/เวลาเริ่ม</span></div></div>
       <p class="qa-caution">ข้อมูลคัดกรอง R12A วันที่ 4 พ.ย. 2569 จากข้อมูล PDF ร่าง 237 รายการ — ไม่ใช่จำนวนเด็กที่แข่งขันชนกันจริง และยังไม่ใช่ผลตรวจหลังปรับ 236 รายการ</p></div>
       <div class="qa-cards">{cells}</div>
       <div class="warning"><b>เงื่อนไขก่อนสรุปว่าไม่มีชน:</b> ต้องรับและตรวจรายชื่อนักกีฬาจริงของทั้ง 8 โรงเรียนในพื้นที่ส่วนตัว ตรวจทีม/รุ่น/ลู่ และกำหนดเวลารายงานตัว เวลาแข่งขัน เวลาเดินทาง เวลาพัก แล้วใช้เครื่องมือ R12C ตรวจเป็นรายบุคคลก่อน จึงเสนอการแก้ตารางผ่านผู้จัด</div>
       <p class="muted">อ้างอิง: docs/R12A_SCHOOL_TIME_RISK_REPORT_2569.md และ docs/R12C_PRIVATE_ROSTER_CONFLICT_ENGINE.md • การตรวจ R12A เป็นการคัดกรองระดับโรงเรียนเท่านั้น</p>'''

def extra_css():
    return """
@page{ @top-left{content:"มิตรภาพเกมส์ 2569 • V4.1 ฉบับร่าง"} 
 @bottom-left{content:"R11C-V4.1 • รอตรวจข้อมูล";font-size:7pt;color:#8594a7} }
.anchor-id{font-size:1pt!important;line-height:1!important;color:rgba(255,255,255,0.01)!important;display:block!important}
.official-paper{position:relative;font-family:FormalThai,"Noto Looped Thai",NotoThai,sans-serif;color:#222;min-height:208mm;border:1px solid #d6dde3;padding:7mm 9mm 15mm;margin:1mm 0 4mm;font-size:13pt;line-height:1.65;overflow:hidden}
.official-org{text-align:center;font-weight:bold;font-size:14.5pt;padding:0 0 2mm}
.official-rule{border-top:2px double #34485d;margin:2mm 0 8mm}
.official-doc-type{text-align:center;font-size:17pt;font-weight:700;line-height:1.3;margin-bottom:2mm}
.official-topic{text-align:center;font-size:14pt;font-weight:700;margin-bottom:7mm}
.official-meta{font-size:10pt;text-align:center;color:#596577;margin-bottom:7mm}
.official-body{position:relative;z-index:1}
.official-paragraph,.official-closing{text-indent:12mm;text-align:justify;line-height:1.85;margin-bottom:7mm}
.official-reference{font-size:10pt;color:#657d93}
.official-sign{margin:24mm 0 0 auto;text-align:center;width:65%;line-height:1.6}
.official-sign small{font-size:9pt;color:#9e602c}
.official-watermark{position:absolute;left:16%;top:44%;font-size:80pt;font-weight:bold;color:rgba(150,60,60,.075);transform:rotate(-24deg)}
.feature-head{background:#183958;color:#fff;padding:8mm 8mm 7mm;border-radius:5px;margin:3mm 0 5mm}
.feature-index{font-size:8pt;color:#f4d681;letter-spacing:1px}
.feature-title{font-size:21pt;font-weight:700;line-height:1.35;margin:1mm 0}
.feature-head p{font-size:8.5pt;color:#dceaf3;margin:0}
.timeline{border-left:2.5px solid #dbc06f;margin:4mm 0 8mm 14mm;padding-left:4mm}
.timeline-row{display:flex;gap:5mm;margin:0 0 4mm;break-inside:avoid}
.time-capsule{flex:0 0 19mm;font-size:14pt;font-weight:bold;color:#1c496e}
.time-capsule small{display:block;font-size:8pt;color:#927a3a}
.timeline-copy{flex:1;padding:2.5mm 3mm;background:#f3f7fb;border-left:3px solid #d9b95d;border-radius:2px;font-size:9pt;line-height:1.55}
.school-grid{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin:4mm 0 8mm}
.school-card{break-inside:avoid;border:1px solid #dce6f0;border-radius:5px;overflow:hidden;background:#fff}
.school-card-top{display:flex;align-items:flex-start;gap:3mm;padding:3mm 3mm 1.5mm;min-height:14mm}
.school-number{color:#b49a58;font-size:8pt;font-weight:bold}
.school-card strong{font-size:9.4pt;line-height:1.3}
.color-bar{height:8mm;display:flex}.color-bar span{width:50%;border-top:1px solid #e3e8ee;border-bottom:1px solid #e3e8ee}
.color-names{text-align:center;padding:1mm;font-size:8.5pt;color:#52677e}
.oath-feature{break-inside:avoid;margin:7mm 0;padding:9mm 9mm 8mm;background:#142f4b;color:#fff;position:relative}
.oath-kicker{font-size:9pt;letter-spacing:1px;color:#e3c25c}
.quote-mark{position:absolute;right:6mm;top:0;font-size:64pt;opacity:.25}
.oath-feature blockquote{font-size:16pt;line-height:1.85;margin:4mm 0 7mm;border-left:3px solid #e9c561;padding-left:7mm}
.oath-source{font-size:8pt;color:#d7e4ee}
.matchup-intro{padding:3mm 4mm;background:#edf4fa;border-left:3px solid #c9a550;margin:5mm 0 3mm}
.matchup-eyebrow{font-size:8pt;color:#9c8249}
.matchup-intro h2{margin:0}.matchup-intro p{font-size:8pt;margin:0}
.matchup-grid{display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin:0 0 7mm}
.matchup-card{break-inside:avoid;border:1px solid #dce6ef;background:#fff;border-radius:5px;padding:2.5mm 3mm;min-height:23mm}
.matchup-meta{font-size:7pt;color:#67809b}
.matchup-pair{display:flex;gap:2mm;align-items:center;justify-content:space-between;font-weight:bold;font-size:9pt;min-height:9mm}
.matchup-pair span{width:43%;line-height:1.25}.matchup-pair b{color:#b59b54}
.matchup-detail{font-size:7.5pt;color:#58718b}
.bracket-feature{border:1px solid #dbe4ee;padding:3mm;margin:4mm 0 6mm}
.bracket-feature h2{margin:1mm}.bracket-feature p{font-size:8pt;color:#58718b}
.bracket-row{display:grid;grid-template-columns:22mm 1fr 12mm;gap:2mm;padding:1.5mm 2mm;border-bottom:1px solid #e4ebf1;break-inside:avoid;font-size:8.5pt}
.bracket-round{font-weight:700;color:#24557a}.bracket-row small{font-size:7.5pt;text-align:right;color:#58718b}
.qa-cover{padding:8mm 7mm;background:#143857;color:#fff;margin:2mm 0 5mm;break-inside:avoid}
.qa-kicker{font-size:8pt;color:#eccc69}.qa-cover h2{font-size:17pt;color:#fff;margin:1mm 0 3mm}
.qa-cover>p{font-size:8pt;color:#dae4ef}
.qa-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm}
.qa-stats>div{background:#254b6d;padding:3mm;text-align:center}.qa-stats strong{display:block;font-size:22pt;color:#f4d16e}
.qa-stats span{display:block;font-size:7pt}
.qa-caution{margin:3mm 0 0!important;color:#f4dca9!important}
.qa-cards{display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin-bottom:5mm}
.qa-card{break-inside:avoid;display:grid;grid-template-columns:9mm 1fr;gap:2mm;padding:3mm;background:#f5f8fb;border:1px solid #dfe8f0}
.qa-card h3{margin:0;color:#163e60;font-size:9.5pt}.qa-card p{font-size:8pt;margin:1mm 0 0;line-height:1.55}
.qa-no{font-weight:bold;font-size:13pt;color:#c4a252}
"""

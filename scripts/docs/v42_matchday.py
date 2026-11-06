"""V42-D: color-coded Match Day editorial, mapped ONLY by known school IDs."""
from collections import Counter
import html
def e(s):return html.escape(str(s if s is not None else ""),quote=True)
# Name colors from source V3 page 5; hex swatches are editorial illustrations, NOT official school specifications.
SCHOOL_COLORS={
"thungmasang":("แดง","เหลือง","#d94040","#e6bc48"),
"wangkhaokaew":("ฟ้า","ส้ม","#68a9df","#f19c48"),
"phuphrom":("ชมพู","ม่วง","#e88abb","#946abb"),
"nongkum":("ฟ้า","เหลือง","#74b3e7","#e9c752"),
"saohong":("ม่วง","ชมพู","#946abb","#e88abb"),
"rangkham":("ขาว","เขียว","#fffefa","#5fae76"),
"wangdong":("เหลือง","น้ำเงิน","#e9c752","#2654a4"),
"nongkrathum":("ฟ้า","ชมพู","#74b3e7","#e88abb")}
def get_school_map(schools):
    result={}
    for x in schools:
        k=x["id"]
        if k in result or k not in SCHOOL_COLORS:raise ValueError("Unreviewed/duplicate school ID: "+str(k))
        result[k]={"name":x["name"],"short":x.get("short") or x["name"],"colors":SCHOOL_COLORS[k]}
    if set(result)!=set(SCHOOL_COLORS):raise ValueError("Expected eight schools from V3 color palette")
    return result
def match_card(row,lookup):
    status=row.get("planning_date_confirmation")=="confirmed" and row.get("planning_time_confirmation")=="confirmed"
    short_names=[];swatches=[];unknown=0
    for side in ("a","b"):
        name=row.get("source_team_"+side+"_label") or "รอประกบคู่"
        sid=row.get("team_"+side+"_id")
        school=lookup.get(sid) if sid else None
        if sid and school is None:raise ValueError("Unrecognized school ID: "+str(sid))
        short_names.append(name)
        if school is None:
            unknown+=1
            swatches.append('<span class="v42-team-colors unknown" title="ยังไม่ทราบโรงเรียน"><i></i><i></i></span>')
        else:
            a,b,first,second=school["colors"]
            swatches.append(f'<span class="v42-team-colors" title="สีประกอบ: {e(a)}–{e(b)}"><i style="background:{first}"></i><i style="background:{second}"></i></span>')
    day=row.get("planning_date") if row.get("planning_date_confirmation")=="confirmed" else row.get("draft_date")
    time=row.get("planning_time") if row.get("planning_time_confirmation")=="confirmed" else row.get("draft_time")
    details=f'{e(day or "รอวัน")} · {e(time or "รอเวลา")} · {"วัน–เวลายืนยัน" if status else "วัน–เวลารอตรวจ"}'
    return f'''<div class="v42-match-card" data-fixture-id="{e(row["id"])}">
       <div class="v42-match-kicker">คู่ {e(row.get("source_match_no") or "—")} · {e(row.get("division") or "—")} · {e(row.get("round") or "—")}</div>
       <div class="v42-match-teams"><div class="v42-team">{swatches[0]}<strong>{e(short_names[0])}</strong></div>
       <b class="v42-vs">VS</b><div class="v42-team">{swatches[1]}<strong>{e(short_names[1])}</strong></div></div>
       <div class="v42-match-meta">{details}</div>
    </div>''',unknown
def render(rows,schools,sport_title,limit=8):
    lookup=get_school_map(schools)
    displayed=rows[:limit]
    out=[];unknown=0;known=0
    for x in displayed:
        if x["kind"]!="match":raise ValueError("Only pair fixtures are Match Day cards")
        text,n=match_card(x,lookup);out.append(text);unknown+=n;known+=2-n
    intro=f'''<section class="v42-match-day">
      <div class="v42-match-head"><span>SPORTS MAGAZINE · MATCH DAY</span><h2>{e(sport_title)}</h2>
       <p>คู่แข่งขันจากโปรแกรมจริง • แถบสีเป็นเฉดประกอบตามชื่อสี V3 หน้า 5 ไม่ใช่รหัสสีโรงเรียนที่รับรอง</p></div>
      <div class="v42-match-grid">{''.join(out)}</div>
      <p class="v42-match-caption">แสดง {len(displayed)} จาก {len(rows)} คู่ • คู่ที่รอประกบหรือยังไม่ทราบโรงเรียนใช้สีเทากลาง ไม่เติมทีมสมมติ • รายการและวันเวลาให้ดูตารางฉบับเต็มด้านล่าง</p>
    </section>'''
    return intro,{"sport":sport_title,"cards":len(displayed),"known_school_sides":known,"unknown_school_sides":unknown,
                   "missing_school_id_allowed":True,"color_status":"illustration_unconfirmed"}
def css():
 return """
.v42-match-day{margin:5mm 0 8mm}
.v42-match-head{background:#173d60;color:white;padding:5mm 6mm;margin-bottom:3mm;border-left:4px solid #dabb63}
.v42-match-head span{font-size:8pt;letter-spacing:.8px;color:#eaca6e}
.v42-match-head h2{color:#fff;font-size:19pt;line-height:1.3;margin:1mm 0}
.v42-match-head p{font-size:8pt;color:#e1ebf3;margin:1mm 0}
.v42-match-grid{display:grid;grid-template-columns:1fr 1fr;gap:2.8mm}
.v42-match-card{border:1px solid #dbe5ef;border-radius:5px;background:#fff;break-inside:avoid;overflow:hidden;min-height:26mm}
.v42-match-kicker{font-size:7.5pt;color:#617b91;background:#f5f8fa;padding:1.4mm 2.5mm}
.v42-match-teams{display:grid;grid-template-columns:minmax(0,1fr) 12mm minmax(0,1fr);gap:2mm;align-items:center;padding:3mm 2.5mm}
.v42-team{min-width:0;display:flex;flex-direction:column;align-items:center;gap:1.4mm;text-align:center;font-size:8.7pt;line-height:1.35}
.v42-team strong{overflow-wrap:anywhere}
.v42-team-colors{display:flex;width:100%;height:4mm;border:1px solid #c8d6e2;border-radius:2px;overflow:hidden}
.v42-team-colors i{flex:1}.v42-team-colors.unknown i{background:#e0e5ea}.v42-team-colors.unknown i+i{background:#aeb8c2}
.v42-vs{font:700 13pt NotoThai,sans-serif;color:#b89442;text-align:center}
.v42-match-meta{text-align:center;padding:1.5mm 2mm;font-size:7pt;background:#f7f9fc;color:#526b84;border-top:1px solid #e4ebf1}
.v42-match-caption{font-size:8pt;color:#6a8397;margin:2.5mm 0 0}
"""

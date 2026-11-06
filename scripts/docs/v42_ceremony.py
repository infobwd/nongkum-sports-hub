"""V42-B accepted ceremony timeline rendered from V3 original, no invented timestamps."""
import html,re,hashlib
TIME=re.compile(r"^(\d{1,2}[.:]\d{2})\s*น\.?\s*[-–]?\s*(.*)$")
def e(x):return html.escape(str(x),quote=True)
def parse(pdf,page):
    if page not in (3,4):raise ValueError("Only V3 ceremonies pages 3,4 allowed")
    s=pdf[page-1].get_text("text",sort=True)
    raw=[z.strip() for z in s.splitlines() if z.strip()]
    raw=[x for x in raw if not re.fullmatch(r"-\s*\d+\s*-",x) and not re.fullmatch(r"-+",x)]
    slots=[];head=[];cur=None;covered=[]
    for i,line in enumerate(raw):
        m=TIME.match(line)
        if m:
            cur={"time":m.group(1).replace(":","."),"events":[]}
            slots.append(cur)
            if m.group(2).strip():
                cur["events"].append({"parts":[m.group(2).strip()],"lines":[i]});covered.append(i)
            continue
        if cur is None:head.append(line);continue
        if line.startswith(("-","–")):
            cur["events"].append({"parts":[line.lstrip("-–").strip()],"lines":[i]})
        else:
            if cur["events"]:
                cur["events"][-1]["parts"].append(line);cur["events"][-1]["lines"].append(i)
            else:cur["events"].append({"parts":[line],"lines":[i]})
        covered.append(i)
    if not slots:raise ValueError("No ceremonies in source")
    for slot in slots:
        for ev in slot["events"]:
            ev["text"]=" ".join(ev.pop("parts"))
    if len(covered)!=len(set(covered)):raise ValueError("Duplicate ceremony line mapping")
    counts={3:(5,22,18),4:(1,9,9)}
    c=counts[page]
    if len(slots)!=c[0] or sum(len(s["events"]) for s in slots)!=c[1]:
        raise ValueError("V3 ceremony source changed: "+str(page))
    if page==3:
        target=[s for s in slots if s["time"]=="08.45"]
        if len(target)!=1 or len(target[0]["events"])!=18:raise ValueError("08.45 source events changed")
    return {"page":page,"source_lines":len(raw),"source_sha256":hashlib.sha256("\n".join(raw).encode()).hexdigest(),
            "slots":slots,"events":sum(len(s["events"]) for s in slots)}
def render(pdf,page):
    data=parse(pdf,page)
    title="พิธีเปิดการแข่งขัน" if page==3 else "พิธีปิดการแข่งขัน"
    date="16 พฤศจิกายน 2569" if page==3 else "20 พฤศจิกายน 2569"
    venue="ณ สนามโรงเรียน (ข้อความต้นฉบับรอตรวจ)" if page==3 else "ณ สนามโรงเรียนบ้านหนองกระทุ่ม"
    parts=[f'''<section class="v42-ceremony"><header class="v42-ceremony-head"><span>MITTRAPHAP GAMES · CEREMONY</span>
     <h2>{title}</h2><strong>{date}</strong><p>{venue}</p></header>
     <div class="v42-ceremony-source">กำหนดการจาก V3 หน้า {page} • ไม่มีการเพิ่มเวลาสำหรับขั้นตอนต่อเนื่อง • ยังรอรับรอง</div>''']
    for slot in data["slots"]:
        items="".join(f'<div class="v42-ceremony-event"><b>{i:02}</b><span>{e(z["text"])}</span></div>'
                      for i,z in enumerate(slot["events"],1))
        parts.append(f'''<div class="v42-ceremony-slot"><div class="v42-ceremony-slothead">
           <strong>{e(slot["time"])} <small>น.</small></strong><span>{len(slot["events"])} ขั้นตอนต่อเนื่อง</span></div>
           <div class="v42-ceremony-events">{items}</div></div>''')
    parts.append('<p class="v42-ceremony-foot">กิจกรรมย่อยที่อยู่ภายใต้เวลาเดียวกันไม่มีเวลาเริ่มใหม่ที่ระบุในต้นฉบับ</p></section>')
    qa={"source_page":page,"source_lines":data["source_lines"],"source_sha256":data["source_sha256"],
        "slots":[x["time"] for x in data["slots"]],"events":data["events"],"status":"draft_review"}
    return "".join(parts),qa
def css():
 return """
.v42-ceremony{color:#173c5d}.v42-ceremony-head{background:#183d60;color:#fff;border-left:4px solid #ddbe65;padding:8mm;break-inside:avoid}
.v42-ceremony-head span{font-size:8pt;color:#f2d781;letter-spacing:.8px}
.v42-ceremony-head h2{font-size:22pt;color:#fff;margin:1mm 0}
.v42-ceremony-head strong{font-size:15pt;color:#efd078}
.v42-ceremony-head p{font-size:9pt;color:#deecf6;margin:1mm 0}
.v42-ceremony-source{font-size:8pt;color:#785d31;background:#fff5df;padding:2mm;margin:3mm 0}
.v42-ceremony-slot{margin:4mm 0;break-inside:auto}
.v42-ceremony-slothead{display:flex;align-items:center;gap:6mm;border-bottom:1px solid #cfdbe5;padding:0 0 1mm;margin-bottom:2mm;break-after:avoid}
.v42-ceremony-slothead strong{font-size:17pt;color:#234d73}.v42-ceremony-slothead small{font-size:9pt;color:#ac883a}
.v42-ceremony-slothead span{font-size:8pt;color:#7892a6}
.v42-ceremony-events{border-left:2px solid #d5b863;margin-left:8mm;padding-left:3mm}
.v42-ceremony-event{display:flex;align-items:flex-start;gap:3mm;padding:2mm 3mm;margin-bottom:1.6mm;
 background:#f1f5f9;break-inside:avoid;border-radius:3px}
.v42-ceremony-event:nth-child(even){background:#f8fafc}
.v42-ceremony-event b{flex:0 0 8mm;font-size:8.7pt;color:#b19148}
.v42-ceremony-event span{font-size:9.4pt;line-height:1.65;overflow-wrap:anywhere}
.v42-ceremony-foot{font-size:8pt;color:#758da1;border-top:1px solid #d8e4ed;padding-top:2mm}
"""

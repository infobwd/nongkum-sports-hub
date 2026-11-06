"""V42-E source-driven editorial bracket views; never infer a missing link."""
from collections import defaultdict, Counter
import html,re
def e(v):return html.escape(str(v if v is not None else ""),quote=True)
APPENDIX_SOURCE_PAGES=(17,18,19,20,21,22,23,24,26,27,28,30,33,34,35,38,40)
WINNER=re.compile(r"ผู้ชนะคู่ที่\s*(\d+)")
def classify(row):
    raw=row.get("source_pair_text") or ""
    round_=row.get("round") or ""
    if "ชิงชนะเลิศ" in round_ or "รอบชิง" in raw or "(ชิง)" in raw:return "final"
    if "รองชนะเลิศ" in round_ or "รอบรอง" in raw or "ทีมคะแนนอันดับ" in raw or re.search(r"ที่\s*[12]\s*[AB]",raw):return "semifinal"
    if round_=="พบกันหมด" or " A" in str(row.get("division")) or " B" in str(row.get("division")):return "league"
    return "first"
def analyze(fixtures):
    groups=defaultdict(list)
    for x in fixtures:
        if x.get("kind")!="match":continue
        groups[(x["sport_id"],x["division"])].append(x)
    result=[];seen=set();total_edges=0;unresolved=[]
    for (sport,division),rows in groups.items():
        number_to_rows=defaultdict(list)
        for x in rows:
            number_to_rows[str(x.get("source_match_no") or "")].append(x)
            if x["id"] in seen:raise ValueError("Duplicate fixture id")
            seen.add(x["id"])
        stages=defaultdict(list);links=[];problems=[]
        for x in rows:
            typ=classify(x);stages[typ].append(x)
            raw=x.get("source_pair_text") or ""
            refs=WINNER.findall(raw)
            if "ชนะคู่" in raw and len(refs)!=2:
                problems.append({"target":x["id"],"cause":"winner reference malformed/partial","source_pair":raw})
                continue
            if refs:
                if len(refs)!=2 or refs[0]==refs[1]:
                    problems.append({"target":x["id"],"cause":"duplicate or missing source-match refs","refs":refs});continue
                sources=[]
                for n in refs:
                    cand=number_to_rows.get(n,[])
                    if len(cand)!=1:
                        problems.append({"target":x["id"],"cause":"ambiguous/cross-division reference","number":n,"candidates":len(cand)})
                        sources=[];break
                    sources.append(cand[0])
                if len(sources)==2:
                    links.append({"target":x["id"],"source_ids":[z["id"] for z in sources],
                                 "source_numbers":[z["source_match_no"] for z in sources],
                                 "target_number":x.get("source_match_no")})
                    total_edges+=2
        if len(stages["semifinal"])>=2 and len(stages["final"])>=1 and len(stages["first"])>=3 and not links:
            problems.append({"cause":"round progression cannot be reconstructed"})
        complete=(len(stages["first"])==4 and len(stages["semifinal"])==2 and len(stages["final"])==1
                  and len(links)==3 and not problems)
        if problems:
            unresolved.append({"sport":sport,"division":division,"issues":problems})
        result.append({"sport":sport,"division":division,"rows":rows,"stages":dict(stages),
                       "verified_links":links,"problems":problems,"full_bracket_verified":complete})
    return result,{"schema_version":1,"fixture_count":len(seen),
         "division_groups":len(result),"verified_edges":total_edges,
         "complete_seven_match_brackets":sum(x["full_bracket_verified"] for x in result),
         "groups_with_source_ambiguity":len(unresolved),
         "source_ambiguities":unresolved,
         "v3_appendix_pages":list(APPENDIX_SOURCE_PAGES),
         "appendix_replaced_pages":[],"appendix_publication_state":"retain_pending_per_page_source_crosswalk"}
def node(r,linked=False):
    pair=r.get("source_pair_text") or "รอประกบ"
    return f'''<div class="v42-bracket-node{" linked" if linked else ""}" data-fixture="{e(r["id"])}">
       <small>คู่ {e(r.get("source_match_no") or "—")} · {e(r.get("round") or "—")}</small>
       <strong>{e(pair)}</strong></div>'''
def render(matches,sports):
    groups,report=analyze(matches)
    out=['<section class="v42-new-brackets"><header class="v42-bracket-cover"><span>NEW BRACKET EDITION · DRAFT</span>',
         '<h2>การประกบคู่และเส้นทางสู่รอบชิง</h2><p>สร้างใหม่จากคู่แข่งขันจริงในโปรแกรม / เชื่อมเฉพาะ “ผู้ชนะคู่ที่ ...” ที่อ้างอิงหมายเลขได้แน่นอน</p></header>']
    names={s["id"]:s["name"] for s in sports}
    current=None
    for g in groups:
        if g["sport"]!=current:
            current=g["sport"];out.append('<h2 class="v42-bracket-sport">'+e(names.get(current,current))+'</h2>')
        parts=g["stages"]; links=g["verified_links"]
        show=len(g["rows"])>1 or len(parts.get("final",[]))>0
        if not show:continue
        label="ครบตามเลขคู่ที่อ้างอิง" if g["full_bracket_verified"] else "ผังเบื้องต้น · ตรวจหมายเลขคู่และรอบ"
        out.append(f'<section class="v42-bracket-group"><div class="v42-bracket-heading"><h3>{e(g["division"])}</h3><span>{e(label)}</span></div>')
        if parts.get("league") and not parts.get("semifinal") and not parts.get("final"):
            out.append(f'<div class="v42-round-robin">แข่งแบบกลุ่ม/พบกันหมด {len(parts["league"])} คู่ — ดูตารางการแข่งขันรายวัน ไม่มีเส้นแพ้คัดออก</div>')
        else:
            cols=[]
            for key,title in [("first","รอบแรก"),("semifinal","รอบรอง"),("final","รอบชิง")]:
                rr=parts.get(key,[])
                if not rr:continue
                cards="".join(node(x,any(x["id"]==l["target"] for l in links)) for x in rr)
                cols.append(f'<div class="v42-bracket-column"><div class="v42-bracket-coltitle">{e(title)}</div>{cards}</div>')
            out.append('<div class="v42-bracket-columns">'+"".join(cols)+'</div>')
            if links:
                link_text="".join('<div class="v42-bracket-link"><b>คู่ '+e(l["source_numbers"][0])+
                           ' + '+e(l["source_numbers"][1])+'</b> → คู่ '+e(l["target_number"])+
                           ' <span>อ้างอิงคำว่า ผู้ชนะคู่ที่ ในต้นฉบับ</span></div>' for l in links)
                out.append('<div class="v42-bracket-links">'+link_text+'</div>')
        if g["problems"]:
            out.append(f'<div class="v42-bracket-review"><b>รอตรวจผังสาย {len(g["problems"])} จุด:</b> '
                       +' / '.join(e(x["cause"]) for x in g["problems"][:4])+'</div>')
        if len(g["rows"])==1:
            out.append('<p class="v42-bracket-onematch">รายการชิงชนะเลิศหนึ่งคู่ — ไม่สร้างสายย้อนหลังที่ไม่มีในต้นฉบับ</p>')
        out.append('</section>')
    out.append('<div class="v42-appendix-review"><b>ภาคผนวก V3 ยังคงเป็นแหล่งอ้างอิง:</b> '
               +str(len(APPENDIX_SOURCE_PAGES))+' หน้าเดิมจะยังไม่ถูกตัดทิ้งใน PDF review จนกว่าจะทำ coverage map รายหน้า '
               'และรับรองคู่/รอบทุกข้อที่มีความคลาดเคลื่อน</div></section>')
    return "".join(out),report
def css():
 return """
.v42-new-brackets{color:#173956}
.v42-bracket-cover{background:#153b60;border-left:5px solid #d6b15a;color:#fff;padding:9mm 8mm;break-inside:avoid}
.v42-bracket-cover span{font-size:8pt;color:#ecd17b}.v42-bracket-cover h2{font-size:20pt;color:#fff;margin:2mm 0}
.v42-bracket-cover p{font-size:8.5pt;color:#d8e4ef}
.v42-bracket-sport{margin:8mm 0 4mm;border-bottom:2px solid #d2b35a;padding-bottom:2mm;font-size:15pt}
.v42-bracket-group{background:#fff;border:1px solid #dce7f0;border-radius:5px;padding:3.5mm;margin:3mm 0 5mm;break-inside:avoid}
.v42-bracket-heading{display:flex;justify-content:space-between;gap:3mm;align-items:center}
.v42-bracket-heading h3{color:#173d63;font-size:10pt;margin:0}
.v42-bracket-heading span{font-size:7.5pt;color:#987a3b;max-width:50%;text-align:right}
.v42-bracket-columns{display:flex;gap:3mm;margin-top:2.5mm}
.v42-bracket-column{flex:1;min-width:0;border-top:2px solid #c5a258;background:#f5f8fb;padding:2mm}
.v42-bracket-coltitle{font-size:8pt;font-weight:700;color:#416686;margin-bottom:1.5mm}
.v42-bracket-node{padding:2mm 1.5mm;margin:0 0 1.8mm;background:white;border:1px solid #d6e3ec;border-left:2px solid #8aa5b9;break-inside:avoid}
.v42-bracket-node.linked{border-left-color:#c9a152}
.v42-bracket-node small{font-size:6.9pt;color:#7a8ca0;display:block}
.v42-bracket-node strong{font-size:7.8pt;line-height:1.35;display:block;overflow-wrap:anywhere}
.v42-bracket-links{margin:2mm 0 0;border-top:1px dashed #cbd9e5;padding-top:2mm;display:grid;grid-template-columns:1fr 1fr;gap:1.2mm}
.v42-bracket-link{font-size:7.7pt;color:#3f6280}.v42-bracket-link b{color:#193d5d}
.v42-bracket-link span{font-size:7pt;color:#8595a7}
.v42-bracket-review,.v42-appendix-review{background:#fff1df;border-left:3px solid #c6a054;color:#7d602a;padding:2.3mm;font-size:8.1pt;margin-top:2mm}
.v42-round-robin{font-size:8.5pt;background:#f1f6fa;padding:3mm;margin:3mm 0}
.v42-bracket-onematch{font-size:8pt;color:#758aa0}
.v42-appendix-review{margin:6mm 0}
"""

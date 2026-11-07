#!/usr/bin/env python3
"""V42-I: A4 proof of mirrored, evidence-led match brackets (never publishes results)."""
from __future__ import annotations
import argparse
import html
import json
import pathlib
import re

from v42_brackets import analyze

CASES = (
    ("petanque", "10 ปี หญิง", "เปตอง", "8 ทีม · ผังที่ตรวจเลขคู่ได้"),
    ("petanque", "10 ปี ชาย", "เปตอง", "4 คู่รอบแรก · รอทวนทีมและรอบรอง"),
    ("tugofwar", "12 ปี หญิง", "ชักเย่อ", "7 ทีม · มีทีมผ่านเข้ารอบตามต้นฉบับ"),
)

def esc(v):
    return html.escape(str(v if v is not None else ""), quote=True)


def match_number(row):
    return int(row.get("source_match_no") or 0)


def pair_names(row):
    raw = (row.get("source_pair_text") or "").split("(")[0].strip()
    parts = re.split(r"\s*[–—]\s*|\s+-\s+", raw, maxsplit=1)
    return (parts + ["รอระบุจากต้นฉบับ"])[:2]


def slot(row, x, y, label, status=""):
    a, b = pair_names(row)
    body = f'<span>{esc(a)}</span><span>{esc(b)}</span>'
    return (f'<div class="match {esc(status)}" data-fixture="{esc(row["id"])}" '
            f'style="left:{x}%;top:{y}%"><small>คู่ {esc(row["source_match_no"])} · {esc(label)}</small>{body}</div>')


def semi_slot(row, x, status=""):
    raw = (row.get("source_pair_text") or "").split("(")[0].strip()
    refs = re.findall(r"ผู้ชนะคู่ที่\s*(\d+)", raw)
    if len(refs)==2:
        label = f'<span>ชนะคู่ {esc(refs[0])}</span><span>ชนะคู่ {esc(refs[1])}</span>'
    elif len(refs)==1:
        bye_name = re.sub(r"^ผู้ชนะคู่ที่\s*\d+\s*[–—-]\s*", "", raw)
        label = f'<span>ชนะคู่ {esc(refs[0])}</span><span>{esc(bye_name)}</span>'
    else:
        label = f'<span>{esc(raw)}</span>'
    return (f'<div class="semi {esc(status)}" data-fixture="{esc(row["id"])}" '
            f'style="left:{x}%;top:39%"><small>คู่ {esc(row["source_match_no"])} · รอบรองฯ</small>{label}</div>')


def source_ids(group, target):
    for link in group["verified_links"]:
        if link["target"] == target["id"]:
            return set(link["source_ids"])
    return set()


def draw_bracket(group, key):
    stages = group["stages"]
    first = sorted(stages.get("first", []), key=match_number)
    semis = sorted(stages.get("semifinal", []), key=match_number)
    finals = sorted(stages.get("final", []), key=match_number)
    if len(first) not in (3, 4) or len(semis) != 2 or len(finals) != 1:
        raise ValueError(f"Unsupported proof shape {key}: first={len(first)} semi={len(semis)} final={len(finals)}")

    # Sides are assigned from verified source row order, never from predicted winners.
    left, right = first[:2], first[2:]
    left_ok = source_ids(group, semis[0]) == {x["id"] for x in left}
    right_ok = len(right) == 2 and source_ids(group, semis[1]) == {x["id"] for x in right}
    bye = ""
    if len(first) == 3:
        # An explicit source expression "winner of match 11 – named bye" is essential.
        raw = semis[1].get("source_pair_text") or ""
        m = re.match(r"ผู้ชนะคู่ที่\s*(\d+)\s*[–—-]\s*([^()]+)", raw)
        if not m or m.group(1) != str(right[0]["source_match_no"]):
            raise ValueError("Cannot safely identify a seven-team bye from source")
        bye = m.group(2).strip()
        right_ok = True
    final_ok = source_ids(group, finals[0]) == {x["id"] for x in semis}

    # Recognize bad source even if a local reference might technically be resolvable.
    reused = any("reused or omitted" in p.get("cause", "") for p in group["problems"])
    if reused:
        right_ok = False

    paths = []
    def add_path(d, tone="ok"):
        paths.append(f'<path class="{tone}" d="{d}" fill="none" stroke="{"#BE8833" if tone=="hold" else "#68839A"}" stroke-width="2"/>')
    if left_ok:
        add_path("M240 86 H260 V184 H290 M240 265 H260 V184")
    else:
        add_path("M240 86 H251 M240 265 H251", "hold")
    if right_ok:
        add_path("M760 86 H740 V184 H710 M760 265 H740 V184", "info" if bye else "ok")
    else:
        add_path("M760 86 H748 M760 265 H748", "hold")
    if final_ok:
        add_path("M430 184 H460 M570 184 H540")
    else:
        add_path("M430 184 H448 M570 184 H552", "hold")

    bits = ['<div class="arena"><svg class="lines" viewBox="0 0 1000 360" preserveAspectRatio="none" '
            'aria-label="เส้นทางการแข่งขัน: เส้นทึบเชื่อมเฉพาะคู่ที่ตรวจสอบได้">', *paths, '</svg>']
    for i, row in enumerate(left):
        bits.append(slot(row, 1.5, 13.5 if i == 0 else 63.5, "รอบแรก"))
    for i, row in enumerate(right):
        bits.append(slot(row, 76, 13.5 if i == 0 else 63.5, "รอบแรก"))
    if bye:
        bits.append('<div class="bye" style="left:76%;top:63.5%"><small>ⓘ ผ่านเข้ารอบตามต้นฉบับ</small>'
                    f'<span>{esc(bye)}</span></div>')
    bits.append(semi_slot(semis[0], 29, "" if left_ok else "caution"))
    bits.append(semi_slot(semis[1], 57, "" if right_ok else "caution"))
    bits.append(f'<div class="final {"" if final_ok else "caution"}" data-fixture="{esc(finals[0]["id"])}" '
                f'style="left:46%;top:39%"><small>คู่ {esc(finals[0]["source_match_no"])} · รอบชิง</small><b>VS</b>'
                '<span>ผู้ชนะรอบรองฯ</span></div>')
    if not right_ok:
        bits.append('<div class="alert-dot" style="left:71%;top:48%">!</div>')
    if bye:
        bits.append('<div class="info-dot" style="left:72%;top:48%">i</div>')
    bits.append('</div>')

    status = '⚠ รอตรวจรายชื่อทีมและเลขคู่รอบรอง' if reused else (
        'ⓘ มีทีมผ่านเข้ารอบตามผังต้นฉบับ' if bye else '✓ เลขคู่เชื่อมตามเอกสารอ้างอิง')
    detail = (
        'คู่ 9 รับผู้ชนะคู่ 1 และ 2; คู่ 10 กลับอ้างคู่ 2 กับ 4 ทำให้คู่ 2 ถูกใช้ซ้ำ '
        'และคู่ 3 ยังไม่ถูกอ้างอิง อีกทั้งรายชื่อหนองกระทุ่มปรากฏซ้ำในรอบแรก จึงไม่ต่อเส้นที่ยังไม่ยืนยัน'
        if reused else
        ('รอบแรกมี 3 คู่ รอบรองคู่ 17 รับผู้ชนะคู่ 11 และทีมที่ระบุชื่อไว้ในต้นฉบับ '
         'ชื่อทีมในข้อมูลต้นทางบางแห่งสะกดไม่สม่ำเสมอ จึงคงข้อความต้นฉบับในตัวอย่างนี้' if bye else
         'รอบแรกคู่ 5–8 ต่อรอบรองคู่ 11–12 และรอบชิงคู่ 42 ตามเอกสารที่ตรวจได้ ไม่แสดงผลล่วงหน้า')
    )
    return ''.join(bits), status, detail, {"left_link":left_ok,"right_link":right_ok,"final_link":final_ok,"has_bye":bool(bye),"has_blocking":reused}


def page(group, sport_name, division, subtitle, index):
    bracket, status, detail, qa = draw_bracket(group, (sport_name,division))
    mark = "warning" if qa["has_blocking"] else ("info" if qa["has_bye"] else "ready")
    return f'''<section class="paper">
      <div class="eyebrow">มิตรภาพเกมส์ 2569 <em>V4.2-I · ตัวอย่างผังสายเพื่อผู้จัดตรวจ</em></div>
      <header><div class="kicker">ผังการแข่งขัน · {index:02}</div><h1>{esc(sport_name)} <span>{esc(division)}</span></h1>
        <p>{esc(subtitle)}</p></header>
      <div class="round-title"><span>รอบแรก</span><span>รอบรองฯ</span><span>รอบชิง</span><span>รอบรองฯ</span><span>รอบแรก</span></div>
      {bracket}
      <div class="status {mark}"><b>{esc(status)}</b><p>{esc(detail)}</p></div>
      <div class="legend"><span><b>━</b> เชื่อมตามเลขคู่ต้นฉบับ</span><span><b>!</b> รอตรวจจุดที่ขัดแย้ง</span><span><b>ⓘ</b> หมายเหตุรูปแบบสาย</span></div>
      <div class="notes"><strong>หลักสำคัญ</strong> กรอบที่แสดงเป็นการประกบคู่ตามเอกสาร ไม่ใช่ผลการแข่งขัน
      และเครื่องหมายตรวจเอกสารไม่ใช่มติรับรองของผู้จัด ข้อมูลที่ยังไม่ยืนยันไม่ถูกเชื่อมเส้นแทนข้อเท็จจริง</div>
      <footer><span>R11C · REVIEW ONLY · ไม่ใช่เอกสารเผยแพร่</span><span>ตัวอย่าง {index}/3 · A4</span></footer>
    </section>''', qa


def preview_css():
    css = '''
    @page {size:A4;margin:0} *{box-sizing:border-box}
    body{margin:0;font-family:"Noto Sans Thai", "Sarabun", sans-serif;color:#183B57}
    .paper{width:210mm;height:297mm;position:relative;padding:13mm 14mm 14mm;break-after:page;background:#fff}
    .paper:last-child{break-after:auto}
    .eyebrow{display:flex;justify-content:space-between;border-bottom:1px solid #d7e1e9;padding:0 0 3mm;font-size:9pt;font-weight:700;letter-spacing:.15px}
    .eyebrow em{font-style:normal;font-weight:500;color:#8A6C2C;font-size:8pt}
    header{background:#153A5D;color:#fff;padding:9mm 8mm 7mm;margin:7mm 0 6mm;border-bottom:3mm solid #D3B05A}
    .kicker{font-size:8pt;color:#F1D587;font-weight:600;letter-spacing:.25px}
    h1{font-size:22pt;margin:2mm 0 1.5mm;line-height:1.5;font-weight:800}
    h1 span{font-size:16pt;color:#F5DC8A}header p{font-size:9pt;color:#E1EBF4;margin:0}
    .round-title{display:flex;justify-content:space-between;padding:0 1.3mm 2.2mm;color:#526C85;font-size:8.5pt;font-weight:700}
    .arena{position:relative;width:100%;height:91mm;background:#FAFCFE;border:1px solid #DFE9F0;border-radius:3mm;margin-bottom:7mm}
    .lines{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
    .lines path{fill:none;stroke:#6A849C;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    .lines path.hold{stroke:#C28B36;stroke-width:2.5;stroke-dasharray:7 5}
    .lines path.info{stroke:#6A849C}
    .match,.bye,.semi,.final{position:absolute;background:white;border:1px solid #CDDAE6;border-left:3px solid #517494;border-radius:2mm;padding:2.2mm 2.4mm;display:flex;flex-direction:column;gap:.6mm;overflow:hidden}
    .match{width:22.5%;height:21.5%;font-size:8.1pt;line-height:1.35}
    .match span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .match small,.semi small,.final small,.bye small{font-size:6.7pt;color:#7D6B47;font-weight:700;white-space:nowrap}
    .semi{width:14%;height:22%;font-size:7.2pt;line-height:1.5;justify-content:center}
    .semi span{font-size:7.5pt;line-height:1.6;overflow-wrap:anywhere}
    .final{width:8%;height:22%;padding:1mm .8mm;align-items:center;justify-content:center;text-align:center;background:#153A5D;border:1px solid #153A5D;color:white;gap:0}
    .final small{color:#F2D482;font-size:5.6pt;white-space:normal}.final b{font-size:15pt;line-height:1.15}
    .final span{font-size:5.6pt;line-height:1.2}
    .semi.caution{border:2px solid #B57B2A;background:#FFF9ED}
    .bye{width:23%;height:21.5%;background:#F3F7FA;border:1px dashed #7496AD;border-left:3px solid #7496AD;justify-content:center}
    .bye span{font-size:9pt}.bye small{font-size:7pt;color:#517494}
    .alert-dot,.info-dot{position:absolute;background:#A56A1D;border:2px solid white;color:white;border-radius:50%;width:7mm;height:7mm;text-align:center;line-height:6mm;font-weight:900;font-size:10pt}
    .info-dot{background:#477991}
    .status{padding:5mm 6mm;border-left:1.7mm solid #557E79;background:#F1F7F5;margin-bottom:5mm;font-size:10pt}
    .status.warning{background:#FFF5E4;border-color:#BC8234}
    .status.info{background:#EDF6F9;border-color:#5687A6}
    .status b{font-size:10.7pt}.status p{margin:2mm 0 0;line-height:1.75;font-size:9.1pt}
    .legend{display:flex;justify-content:space-between;font-size:8.1pt;color:#506879;padding:3mm 1.5mm;border-bottom:1px solid #DFE5EB;border-top:1px solid #DFE5EB}
    .legend b{color:#9A6B29}
    .notes{margin-top:8mm;color:#607589;font-size:8.5pt;line-height:1.7}
    footer{position:absolute;bottom:10mm;left:14mm;right:14mm;border-top:1px solid #D7E0E8;padding-top:3mm;font-size:7.7pt;color:#6B8092;display:flex;justify-content:space-between}
    '''
    return css


def render_document(source):
    fixtures = [x for x in source["fixtures"] if x.get("kind")=="match" and not x["id"].endswith("repeated-final")]
    groups,_ = analyze(fixtures)
    by_key = {(g["sport"], g["division"]):g for g in groups}
    sheets=[]; proof={}
    for i,(sport,division,name,subtitle) in enumerate(CASES,1):
        group = by_key[(sport,division)]
        sheet,qa=page(group,name,division,subtitle,i)
        proof[f"{sport}/{division}"]=qa
        sheets.append(sheet)
    css = preview_css()
    return '<!doctype html><html lang="th"><head><meta charset="utf-8"><style>'+css+'</style></head><body>'+''.join(sheets)+'</body></html>', proof


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--source',default='data/program-from-pdf-2569-20261104-draft.json')
    parser.add_argument('--output',required=True,help='A4 preview HTML path')
    parser.add_argument('--qa-output',help='optional JSON report path')
    args=parser.parse_args()
    source=json.loads(pathlib.Path(args.source).read_text('utf-8'))
    document,qa=render_document(source)
    pathlib.Path(args.output).write_text(document,encoding='utf-8')
    if args.qa_output:
        pathlib.Path(args.qa_output).write_text(json.dumps(qa,ensure_ascii=False,indent=2),encoding='utf-8')
    print('V42-I proof HTML: '+args.output)
    print(json.dumps(qa,ensure_ascii=False))

if __name__=='__main__':main()

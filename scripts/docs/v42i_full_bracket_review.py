#!/usr/bin/env python3
"""R11C V42-I6–I9: A4 review for every source-derived sport/division, no invented links."""
from __future__ import annotations
import argparse
import hashlib
import html
import json
import pathlib
import re
from collections import Counter

from v42_brackets import analyze
from v42i_bracket_preview import draw_bracket, preview_css

SOURCE = "data/program-from-pdf-2569-20261104-draft.json"

# Organizer review topics from V42-H; never interpreted as approved corrections.
REVIEW_POINTS = {
    ("shootout", "ปฐมวัย", "7"): ("warning", "ข้อความผู้ชนะคู่ชิงใน JSON ถอดผิดจาก PDF ต้นฉบับ"),
    ("volleyball", "12 ปี ชาย", "19"): ("warning", "รอบชิงอ้างเลขคู่รอบรองหญิง รอผู้จัดยืนยัน"),
    ("volleyball", "12 ปี หญิง", "20"): ("warning", "รอบชิงอ้างเลขคู่รอบรองชาย รอผู้จัดยืนยัน"),
    ("takraw", "12 ปี ชาย", "24"): ("warning", "คู่ 24 ระบุรุ่นชาย แต่ถูกอ้างในรอบชิงหญิง"),
    ("takraw", "12 ปี หญิง", "29"): ("warning", "รอบชิงอ้างคู่ 24 ข้ามรุ่น รอผู้จัดตรวจ"),
    ("petanque", "10 ปี ชาย", "1"): ("warning", "รายชื่อหนองกระทุ่มปรากฏซ้ำระหว่างคู่แรก"),
    ("petanque", "10 ปี ชาย", "2"): ("warning", "รายชื่อหนองกระทุ่มปรากฏซ้ำระหว่างคู่แรก"),
    ("petanque", "10 ปี ชาย", "9"): ("warning", "รอบรองอ้างคู่ 2 ซ้ำกับอีกคู่"),
    ("petanque", "10 ปี ชาย", "10"): ("warning", "รอบรองอ้างคู่ 2 ซ้ำ และยังไม่อ้างคู่ 3"),
    ("tugofwar", "12 ปี หญิง", "17"): ("info", "ทีมที่ระบุชื่อในต้นฉบับผ่านเข้ารอบรองโดยไม่แข่งรอบแรก"),
}
EXPECTED_REVIEW_GROUPS = {
    ("shootout", "ปฐมวัย"),
    ("volleyball", "12 ปี ชาย"),
    ("volleyball", "12 ปี หญิง"),
    ("takraw", "12 ปี หญิง"),
    ("petanque", "10 ปี ชาย"),
    ("tugofwar", "12 ปี หญิง"),
}


def esc(value):
    return html.escape(str(value if value is not None else ""), quote=True)


def number(row):
    n = str(row.get("source_match_no") or "")
    return (int(n) if n.isdigit() else 10**9, row["id"])


def topology(group):
    s = group["stages"]
    a, b, c = (len(s.get(k, [])) for k in ("first", "semifinal", "final"))
    league = len(s.get("league", []))
    if league:
        return "league_with_final" if (a or b or c) else "pool_or_league"
    if a == 4 and b == 2 and c == 1:
        return "eight_team_bracket"
    if a == 3 and b == 2 and c == 1:
        return "seven_team_bracket"
    if a == 0 and b == 0 and c == 1:
        return "direct_final"
    if a == 0 and b >= 1 and c >= 1:
        return "playoff_source_only"
    return "nonstandard_source_only"


def review_items(group):
    result = {}
    for row in group["rows"]:
        key = (group["sport"], group["division"], str(row.get("source_match_no") or ""))
        if key in REVIEW_POINTS:
            result[row["id"]] = REVIEW_POINTS[key]
    for p in group["problems"]:
        target = p.get("target")
        if target and target not in result:
            result[target] = ("warning", "หมายเลขคู่ที่อ้างอิงยังไม่ตรง/ไม่ครบในรุ่นเดียวกัน")
    return result


def table_markup(group, annotations):
    title = "ตารางคู่แข่งขันตามต้นฉบับ (ไม่สร้างผังแพ้คัดออก)"
    rows = []
    for row in sorted(group["rows"], key=lambda x:(number(x), x["id"])):
        severity, reason = annotations.get(row["id"], ("", ""))
        badge = ("⚠ รอตรวจ" if severity == "warning" else ("ⓘ หมายเหตุ" if severity == "info" else "—"))
        rows.append(
            '<tr data-fixture="'+esc(row["id"])+'" data-review="'+esc(severity)+'">'
            '<td>'+esc(row.get("source_match_no") or "—")+'</td>'
            '<td>'+esc(row.get("round") or "—")+'</td>'
            '<td>'+esc(row.get("source_pair_text") or "รอตรวจเอกสาร")+'</td>'
            '<td>'+esc(badge)+'</td></tr>')
    return ('<div class="table-head">'+title+'</div>'
            '<table class="fixture-table"><thead><tr><th>คู่</th><th>รอบ</th>'
            '<th>การประกบคู่ตามต้นฉบับ</th><th>สถานะ</th></tr></thead>'
            '<tbody>'+''.join(rows)+'</tbody></table>')


def marked_bracket(markup, annotations):
    for fixture_id, (severity, _) in annotations.items():
        old = 'data-fixture="'+esc(fixture_id)+'"'
        new = old+' data-review="'+esc(severity)+'"'
        if old not in markup:
            raise ValueError("Cannot locate review marker fixture: "+fixture_id)
        markup = markup.replace(old, new, 1)
    return markup


def render_group(group, sport_name, index, total):
    name = group["division"]
    typ = topology(group)
    marks = review_items(group)
    first = sorted(group["stages"].get("first",[]), key=number)
    all_rows = group["rows"]
    embedded = False
    visuals = {}
    if typ in ("eight_team_bracket", "seven_team_bracket"):
        try:
            graphic, _, _, visuals = draw_bracket(group, (group["sport"], name))
            graphic = marked_bracket(graphic, marks)
            embedded = True
        except ValueError:
            graphic = table_markup(group, marks)
            typ = "nonstandard_source_only"
    else:
        graphic = table_markup(group, marks)

    status = "⚠ มีจุดต้องตรวจ" if (group["problems"] or any(s == "warning" for s,_ in marks.values())) else (
        "ⓘ หมายเหตุรูปแบบสาย" if any(s == "info" for s,_ in marks.values()) else
        "✓ เทียบเลขคู่กับต้นฉบับได้")
    details = []
    for row in sorted(all_rows,key=number):
        if row["id"] in marks:
            severity, message = marks[row["id"]]
            prefix = "⚠" if severity == "warning" else "ⓘ"
            details.append(f"{prefix} คู่ {row.get('source_match_no') or '—'}: {message}")
    if group["problems"] and not any(x.startswith("⚠") for x in details):
        details.append("⚠ กลุ่มนี้มีเลขคู่ที่ไม่สามารถยืนยันการเชื่อมสายได้ ต้องตรวจต้นฉบับ")
    if len(details) > 7:
        raise ValueError("Review notes exceed one-page safe layout for "+group["sport"]+"/"+name)
    if not details:
        details.append("เส้นทึบที่แสดงอ้างอิงเลขคู่จากรายการแข่งขันต้นทาง ไม่ใช่ผลการแข่งขัน")
    notes = ''.join('<li>'+esc(x)+'</li>' for x in details)
    label = {
        "eight_team_bracket":"ผังสาย 8 ทีม",
        "seven_team_bracket":"ผังสาย 7 ทีม มีทีมผ่านรอบ",
        "direct_final":"คู่ชิงโดยตรง",
        "pool_or_league":"แข่งขันแบบพบกันหมด/รอบแบ่งกลุ่ม",
        "league_with_final":"การแข่งขันแบบลีกและรอบชิง",
        "playoff_source_only":"รอบรองและชิงตามต้นฉบับ",
        "nonstandard_source_only":"รูปแบบอื่น — แสดงคู่จริงรอตรวจ"
    }[typ]
    head = f'''<section class="paper full-coverage" data-sport="{esc(group["sport"])}" data-division="{esc(name)}">
      <div class="eyebrow">มิตรภาพเกมส์ 2569 <em>V4.2-I · ตรวจรูปแบบผังสายทุกกลุ่ม</em></div>
      <header><div class="kicker">{esc(sport_name)} · รายการที่ {index}/{total}</div>
      <h1>{esc(sport_name)} <span>{esc(name)}</span></h1>
      <p>{label} · {len(all_rows)} คู่ · ข้อมูลต้นฉบับเพื่อให้ผู้จัดตรวจ</p></header>'''
    cols = ('<div class="round-title"><span>รอบแรก</span><span>รอบรองฯ</span><span>รอบชิง</span>'
            '<span>รอบรองฯ</span><span>รอบแรก</span></div>' if embedded else "")
    body = (f'<div class="status {"warning" if status.startswith("⚠") else ("info" if status.startswith("ⓘ") else "ready")}">'
            '<b>'+esc(status)+'</b><ul>'+notes+'</ul></div>')
    tail = ('<p class="review-note">ข้อมูลจากเอกสารอ้างอิง ไม่ใช่การรับรองผลหรือคู่แข่งขันโดยผู้จัด '
            'หากเส้นทางขัดแย้งให้หยุดเชื่อมสายไว้ที่จุดรอตรวจ</p>'
            '<footer><span>R11C · REVIEW ONLY · ห้ามเผยแพร่แทนสูจิบัตรจริง</span>'
            f'<span>{index}/{total} · A4</span></footer></section>')
    rendered = head+cols+graphic+body+tail
    metadata = {"sport_id":group["sport"],"division":name,"topology":typ,
                "fixture_ids":[x["id"] for x in all_rows],
                "source_match_numbers":[str(x.get("source_match_no") or "") for x in all_rows],
                "count":len(all_rows),"verified_edges":len(group["verified_links"])*2,
                "has_source_ambiguity":bool(group["problems"]),
                "warning_fixture_ids":[k for k,v in marks.items() if v[0]=="warning"],
                "info_fixture_ids":[k for k,v in marks.items() if v[0]=="info"],
                "mirrored":embedded,
                "visual_links":visuals}
    return rendered, metadata


def render_all(source):
    raw = source["fixtures"]
    matches = [x for x in raw if x.get("kind")=="match" and not x["id"].endswith("repeated-final")]
    groups, audit = analyze(matches)
    names = {s["id"]:s["name"] for s in source["sports"]}
    ordered = sorted(groups, key=lambda g:(list(names).index(g["sport"]) if g["sport"] in names else 99,g["division"]))
    pages, records = [], []
    for i,g in enumerate(ordered,1):
        fragment, record = render_group(g,names.get(g["sport"],g["sport"]),i,len(ordered))
        pages.append(fragment)
        records.append(record)
    displayed = [fid for r in records for fid in r["fixture_ids"]]
    expected = [x["id"] for x in matches]
    if Counter(displayed) != Counter(expected) or len(displayed) != len(set(displayed)):
        raise ValueError("Fixture coverage mismatch: missing, duplicate or invented fixture")
    if set((g["sport"],g["division"]) for g in groups if (g["sport"],g["division"]) in EXPECTED_REVIEW_GROUPS) != EXPECTED_REVIEW_GROUPS:
        raise ValueError("One of the six reviewed sport/divisions is missing")
    if len(matches) != 186 or len(groups) != 44:
        raise ValueError("Source inventory changed: re-review baseline 186/44 before publishing")
    if len(raw)!=237 or len([x for x in raw if x.get("kind")!="match"])!=50:
        raise ValueError("Expected 237 raw records with 50 athletics")
    css = preview_css()+'''
    .full-coverage .table-head{margin:4mm 0 2mm;font-size:10pt;font-weight:700}
    .full-coverage .fixture-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8.25pt}
    .fixture-table th{background:#EAF0F5;color:#284762;text-align:left;padding:2mm;border:1px solid #DAE4ED}
    .fixture-table td{border-bottom:1px solid #DAE4ED;padding:1.6mm 1.8mm;line-height:1.5;vertical-align:top;overflow-wrap:anywhere}
    .fixture-table th:nth-child(1),.fixture-table td:nth-child(1){width:10%}
    .fixture-table th:nth-child(2),.fixture-table td:nth-child(2){width:20%}
    .fixture-table th:nth-child(4),.fixture-table td:nth-child(4){width:17%}
    .fixture-table tr[data-review="warning"]{background:#FFF4E3}
    .fixture-table tr[data-review="info"]{background:#EEF6FA}
    .full-coverage [data-review="warning"]{outline:1.5pt dashed #AA7624}
    .full-coverage .match[data-review="warning"]::after,.full-coverage .semi[data-review="warning"]::after,
    .full-coverage .final[data-review="warning"]::after{content:"!";position:absolute;right:1mm;top:0;color:#AD7428;font-weight:900;font-size:12pt}
    .full-coverage .semi[data-review="info"]::after{content:"ⓘ";position:absolute;right:1mm;top:0;color:#43768B}
    .full-coverage .status{margin-top:6mm;padding:3mm 4mm;font-size:8.7pt}
    .full-coverage .status b{font-size:9.5pt}
    .full-coverage .status ul{margin:1.5mm 0 0;padding-left:5mm;line-height:1.55}
    .full-coverage .status li{margin:.5mm 0}
    .full-coverage .review-note{font-size:8pt;color:#718397;margin-top:7mm}
    '''
    html_doc = ('<!doctype html><html lang="th"><head><meta charset="utf-8"><title>'
                'มิตรภาพเกมส์ 2569 ผังสาย V42-I ตรวจร่างครบทุกกลุ่ม</title><style>'+css+
                '</style></head><body>'+''.join(pages)+'</body></html>')
    manifest = {"schema_version":1, "status":"review_only_not_approved",
                "source":SOURCE,
                "source_sha256":hashlib.sha256(json.dumps(source,ensure_ascii=False,sort_keys=True).encode("utf8")).hexdigest(),
                "raw_count":len(raw),"effective_count":len(matches)+50,
                "matches":len(matches),"athletics":50,
                "group_count":len(groups),
                "rendered_fixture_count":len(displayed),
                "topology_counts":dict(Counter(r["topology"] for r in records)),
                "mirrored_group_count":sum(r["mirrored"] for r in records),
                "source_verified_edges":audit["verified_edges"],
                "source_groups_needing_review":audit["groups_with_source_ambiguity"],
                "required_review_groups":sorted("/".join(x) for x in EXPECTED_REVIEW_GROUPS),
                "v3_appendix_pages_retained":len(audit["v3_appendix_pages"]),
                "groups":records}
    return html_doc, manifest


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--source",default=SOURCE)
    parser.add_argument("--output",required=True)
    parser.add_argument("--manifest",required=True)
    a=parser.parse_args()
    source=json.loads(pathlib.Path(a.source).read_text("utf-8"))
    html_doc,manifest=render_all(source)
    pathlib.Path(a.output).parent.mkdir(parents=True,exist_ok=True)
    pathlib.Path(a.output).write_text(html_doc,encoding="utf8")
    pathlib.Path(a.manifest).write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf8")
    print("V42-I FULL COVERAGE PASS:",manifest["group_count"],"groups;",manifest["matches"],
          "matches;",manifest["mirrored_group_count"],"mirrored")
    print("Topologies:",manifest["topology_counts"])


if __name__=="__main__":
    main()

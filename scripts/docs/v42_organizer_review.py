"""R11C-V42H: evidence-bound six-group organizer checklist for review PDF only.

Never rewrite fixtures from this presentation module. Source V2/V3 and archived
public JSON remain draft until the organizing committee records its decision.
"""
from html import escape

REVISION = "R11C-V42H"
CASES = (
    {
        "id": "shootout-early-years",
        "sport": "ยิงจุดโทษ · ปฐมวัย",
        "match": "คู่ชิง 7",
        "finding": "ข้อมูลถอดเป็น JSON มีคำว่า ‘ผูช้ นะคู่ที่ 5’ แต่การประกบจริงเป็นผู้ชนะคู่ 5 พบผู้ชนะคู่ 6",
        "proposal": "ปรับเฉพาะคำสะกดในข้อมูลแสดงผล ผังรอบแรก 1–4 → รอบรอง 5–6 → รอบชิง 7 ไม่เปลี่ยน",
        "status": "แก้คำแสดงผล · ไม่ต้องเปลี่ยนคู่",
        "gate": "text_only",
        "source": "V2/V3: ตารางยิงจุดโทษ; JSON: shootout-p08-ปฐมวัย-007",
    },
    {
        "id": "volleyball-12-boys",
        "sport": "วอลเลย์บอล · 12 ปีชาย",
        "match": "คู่ชิง 19",
        "finding": "V2/V3 อ้างผู้ชนะคู่ 13 และ 14 ซึ่งเป็นรอบรอง 12 ปีหญิง",
        "proposal": "เสนอเปลี่ยนเป็นผู้ชนะคู่ 15 และ 16 (รอบรองชาย) โดยคงวัน/เวลาเดิมตามที่ผู้จัดตรวจรับ",
        "status": "เสนอแก้เลขคู่ · รอผู้จัดตรวจรับ",
        "gate": "approval_required",
        "source": "V2/V3: โปรแกรมวอลเลย์บอล; JSON: volleyball-p11-12-ปี-ชาย-019",
    },
    {
        "id": "volleyball-12-girls",
        "sport": "วอลเลย์บอล · 12 ปีหญิง",
        "match": "คู่ชิง 20",
        "finding": "V2/V3 อ้างผู้ชนะคู่ 15 และ 16 ซึ่งเป็นรอบรอง 12 ปีชาย",
        "proposal": "เสนอเปลี่ยนเป็นผู้ชนะคู่ 13 และ 14 (รอบรองหญิง) โดยคงวัน/เวลาเดิมตามที่ผู้จัดตรวจรับ",
        "status": "เสนอแก้เลขคู่ · รอผู้จัดตรวจรับ",
        "gate": "approval_required",
        "source": "V2/V3: โปรแกรมวอลเลย์บอล; JSON: volleyball-p11-12-ปี-หญิง-020",
    },
    {
        "id": "takraw-12-girls",
        "sport": "เซปักตะกร้อ · 12 ปีหญิง",
        "match": "คู่รอง 24 / คู่ชิง 29",
        "finding": "คู่ 24 เขียนว่า 12 ปีชาย ซ้ำกับคู่รองชาย 22–23 แต่คู่ชิงหญิง 29 อ้างผู้ชนะคู่ 24 และ 25",
        "proposal": "เสนอปรับรุ่นของคู่ 24 เป็น 12 ปีหญิง ห้ามเดาเปลี่ยนวัน/เวลา",
        "status": "เสนอแก้ชื่อรุ่น · รอผู้จัดตรวจรับ",
        "gate": "approval_required",
        "source": "V2/V3: โปรแกรมเซปักตะกร้อ; JSON: takraw-p13-12-ปี-ชาย-024",
    },
    {
        "id": "petanque-10-boys",
        "sport": "เปตอง · 10 ปีชาย",
        "match": "คู่แรก 1–4 / คู่รอง 9–10",
        "finding": "คู่ 9 รับผู้ชนะ 1+2 แต่คู่ 10 รับ 2+4 จึงอ้างคู่ 2 ซ้ำ/ขาดคู่ 3; คู่แรก 1 และ 2 มีชื่อหนองกระทุ่มซ้ำ และรายชื่อในตารางไม่สอดคล้องกับหน้ารายชื่อทีม",
        "proposal": "ให้ผู้จัดยืนยันทีมที่เข้าร่วมและการประกบคู่ 1–4 ก่อน; รูปแบบ 9 = 1+2 และ 10 = 3+4 เป็นเพียงข้อเสนอ ห้ามแทนตารางจริงเอง",
        "status": "ต้องยืนยันชื่อทีมและสาย · ห้ามประกาศคู่ใหม่",
        "gate": "blocking_confirmation",
        "source": "V2/V3: ตารางเปตอง 10 ปีชาย; JSON: petanque-p17-10-ปี-ชาย-030",
    },
    {
        "id": "tug-12-girls",
        "sport": "ชักเย่อ · 12 ปีหญิง",
        "match": "คู่แรก 9–11 / รอง 16–17",
        "finding": "มีทีม 7 โรงเรียน จึงแข่งรอบแรก 3 คู่ และทุ่งมะสังฯ เข้ารอบรองโดยไม่ต้องแข่งรอบแรก",
        "proposal": "คงคู่ 16 = ผู้ชนะ 9+10 และคู่ 17 = ผู้ชนะ 11 พบ ทุ่งมะสังฯ; ผู้จัดตรวจรับว่าเป็นการผ่านรอบโดยไม่แข่ง",
        "status": "โครงสร้าง 7 ทีมถูกต้อง · แจ้งผู้จัดทราบ",
        "gate": "pattern_verified",
        "source": "V2/V3: ตารางชักเย่อ; JSON: tugofwar-p22-12-ปี-หญิง-017",
    },
)

# Validate precise archived values before a future build, so source revisions
# cannot silently turn an old review note into a false statement.
SOURCE_ASSERTIONS = (
    ("shootout-p08-ปฐมวัย-007", "7", "ผูช้ นะคู่ที่ 5"),
    ("volleyball-p11-12-ปี-ชาย-019", "19", "ผู้ชนะคู่ที่ 13 - ผู้ชนะคู่ที่ 14"),
    ("volleyball-p11-12-ปี-หญิง-020", "20", "ผู้ชนะคู่ที่ 15 - ผู้ชนะคู่ที่ 16"),
    ("takraw-p13-12-ปี-ชาย-024", "24", "ที่ 1 A"),
    ("takraw-p13-12-ปี-หญิง-025", "25", "ที่ 1 B"),
    ("petanque-p17-10-ปี-ชาย-029", "9", "ผู้ชนะคู่ที่ 1 – ผู้ชนะคู่ที่ 2"),
    ("petanque-p17-10-ปี-ชาย-030", "10", "ผู้ชนะคู่ที่ 2 – ผู้ชนะคู่ที่ 4"),
    ("tugofwar-p22-12-ปี-หญิง-017", "17", "ผู้ชนะคู่ที่ 11"),
)

def audit(fixtures):
    rows = {row["id"]: row for row in fixtures}
    for fixture_id, expected_num, fragment in SOURCE_ASSERTIONS:
        row = rows.get(fixture_id)
        if not row or str(row.get("source_match_no")) != expected_num or fragment not in (row.get("source_pair_text") or ""):
            raise ValueError("R11C-V42H archived source changed; recheck six-group organizer review: "+fixture_id)
    categories = {name: sum(c["gate"] == name for c in CASES)
                  for name in ("text_only", "approval_required", "blocking_confirmation", "pattern_verified")}
    if len(CASES) != 6 or len({c["id"] for c in CASES}) != 6:
        raise ValueError("R11C-V42H requires six unique cases")
    if categories != {"text_only": 1, "approval_required": 3, "blocking_confirmation": 1, "pattern_verified": 1}:
        raise ValueError("R11C-V42H approval categories changed")
    return {"schema_version": 1, "revision": REVISION, "publication_state": "review_only",
            "item_count": len(CASES), "gate_counts": categories,
            "source_rows_checked": len(SOURCE_ASSERTIONS),
            "case_ids": [c["id"] for c in CASES]}

def render(fixtures):
    report = audit(fixtures)
    cards = []
    for index, c in enumerate(CASES, 1):
        gate_name = {"text_only": "ข้อความ", "approval_required": "ขอรับรอง",
                     "blocking_confirmation": "สำคัญ", "pattern_verified": "รูปแบบถูกต้อง"}[c["gate"]]
        cards.append(
            '<div class="organizer-card organizer-gate-'+escape(c["gate"])+'">'
            '<div class="organizer-head"><span class="organizer-number">'+str(index).zfill(2)+'</span>'
            '<h3>'+escape(c["sport"])+'</h3><b>'+escape(gate_name)+'</b></div>'
            '<div class="organizer-match">'+escape(c["match"])+'</div>'
            '<p><strong>สิ่งที่พบ:</strong> '+escape(c["finding"])+'</p>'
            '<p><strong>ข้อเสนอ:</strong> '+escape(c["proposal"])+'</p>'
            '<p class="organizer-status"><strong>สถานะ:</strong> '+escape(c["status"])+'</p>'
            '<p class="organizer-source">อ้างอิง: '+escape(c["source"])+'</p>'
            '</div>'
        )
    body = (
        '<div class="organizer-intro"><b>เอกสารสำหรับผู้จัดตรวจรับ — ไม่ใช่การเปลี่ยนโปรแกรมที่รับรองแล้ว</b>'
        '<p>สรุปข้อมูลจากสูจิบัตร V2, V3 และตารางที่ถอดไว้เพื่อช่วยประชุมตรวจเทียบ '
        'รายการที่เป็นเพียงข้อเสนอห้ามแก้คู่แข่งขันหรือประกาศผลโดยไม่ได้รับรองจากผู้จัด</p></div>'
        '<div class="organizer-grid">'+''.join(cards)+'</div>'
        '<div class="organizer-signoff"><b>บันทึกการพิจารณาของผู้จัด</b>'
        '<p>☐ รับรองข้อแก้ไขตามข้อเสนอ &nbsp; ☐ ปรับข้อแก้ไขตามมติ &nbsp; ☐ ขอหลักฐานเพิ่มเติม</p>'
        '<p>รายการ/ข้อที่มีมติ: ....................................................................................................................</p>'
        '<p>ผู้ตรวจ/ผู้รับรอง: ................................................ วันที่: ...................................................</p>'
        '</div>'
        '<p class="organizer-appendix">หมายเหตุ: หลังหมวดนี้ยังมีภาคผนวกสูจิบัตร V3 อีก 17 หน้าเพื่อใช้ตรวจต้นฉบับ '
        'ภาคผนวกและข้อเสนอในหน้านี้ยังไม่ใช่ตารางแข่งขันฉบับรับรอง</p>'
    )
    return body, report

def css():
    return """
.organizer-intro{padding:3.5mm 4mm;background:#f5f0e2;border-left:3px solid #b99141;font-size:8.5pt;margin:3mm 0 5mm}
.organizer-intro p{margin:1.5mm 0 0;line-height:1.5}
.organizer-grid{display:grid;grid-template-columns:1fr 1fr;gap:3mm;align-items:start}
.organizer-card{break-inside:avoid;border:1px solid #dbe5ed;padding:3.3mm;border-left:3px solid #ccae5c;background:#fff}
.organizer-card h3{font-size:9.5pt;margin:0;color:#194160;line-height:1.3}
.organizer-head{display:flex;gap:2mm;align-items:start}
.organizer-number{font-weight:700;color:#ac8b4c;font-size:12pt;min-width:7mm}
.organizer-head>b{margin-left:auto;font-size:6.6pt;color:#8b6c3b;white-space:nowrap}
.organizer-match{color:#47708c;font-size:7.5pt;font-weight:bold;margin:1mm 0 2mm}
.organizer-card p{font-size:7.5pt;line-height:1.45;margin:1.4mm 0}
.organizer-card .organizer-status{background:#f5f7f9;padding:1mm}
.organizer-card .organizer-source{font-size:6.7pt;color:#6d8495}
.organizer-gate-blocking_confirmation{border-left-color:#a75142}
.organizer-gate-pattern_verified{border-left-color:#47876c}
.organizer-signoff{margin:5mm 0 3mm;break-inside:avoid;border:1px solid #d2dce6;padding:3mm 4mm;font-size:8pt}
.organizer-signoff p{margin:2mm 0}
.organizer-appendix{font-size:7.5pt;color:#6c7180;margin:4mm 0;break-inside:avoid}
"""

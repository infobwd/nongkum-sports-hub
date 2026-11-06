"""R11C-V42-A: source-faithful official-content reflow from V3 pages 6–16.

This renderer is intentionally DRAFT ONLY. It reproduces source lines instead
of inventing authority, legal bases, notice numbers or signatures. The revised
public-review roster remains a separate, more current name verification view.
"""
from __future__ import annotations

from collections import Counter
import hashlib
import html
import json
import re

SOURCE_PAGES = tuple(range(6, 17))
SECTION = re.compile(r"^([1-9]|1[0-9]|20)\.\s+(?!\d)(.+)")
MEMBER = re.compile(r"^\d{1,2}(?:\.\d{1,2}){1,3}(?![\d.])(?:\s+|$)")
SUBSECTION = re.compile(r"^\d{1,2}\.\d{1,2}\s+")
PAGE_FOOT = re.compile(r"^-\s*\d+\s*-$")
DOC_HEADING = ("ประกาศกลุ่มเครือข่าย", "เรื่อง ")
CLOSING_START = ("ทั้งนี้", "สั่ง ณ", "(นาย")
DUTY_MARK = "มีหน้าที่"

def clean_lines(document, page_number):
    source = document[page_number - 1].get_text("text", sort=True)
    lines = [line.strip() for line in source.replace("\u200b", "").splitlines()]
    return [line for line in lines if line and not PAGE_FOOT.fullmatch(line)]

def classify(text):
    match = SECTION.match(text)
    if match:
        return "section", match.group(1)
    if text.startswith(DUTY_MARK):
        return "duty", None
    if text.startswith(CLOSING_START):
        return "closing", None
    if MEMBER.match(text):
        if SUBSECTION.match(text) and not re.search(
            r"(?:นาย|นาง|เด็ก|กรรมการ|ครู|เจ้าหน้าที่|ร\.ร\.|โรงเรียน|อปพร)", text
        ):
            return "subsection", None
        return "member", None
    if text.startswith(DOC_HEADING):
        return "title", None
    return "paragraph", None

def build_source_model(pdf):
    """Create 1:1 source-line crosswalk; no source line is silently discarded."""
    pages, seen_sections, all_lines = [], [], []
    current_section = None
    for page_number in SOURCE_PAGES:
        lines = clean_lines(pdf, page_number)
        records = []
        for i, line in enumerate(lines, 1):
            kind, section_id = classify(line)
            if section_id is not None:
                current_section = section_id
                seen_sections.append(section_id)
            record = {"id": f"v3-p{page_number:02}-l{i:02}",
                      "source_page": page_number,
                      "source_line": i,
                      "kind": kind,
                      "section_id": current_section,
                      "text": line}
            records.append(record)
            all_lines.append(line)
        if not records:
            raise ValueError(f"V3 page {page_number} has no extractable text")
        pages.append({"source_page": page_number, "lines": records,
                      "line_count": len(records),
                      "sha256": hashlib.sha256("\n".join(lines).encode("utf-8")).hexdigest()})
    if sorted(set(seen_sections), key=int) != [str(i) for i in range(1, 21)]:
        raise ValueError(f"Official draft headings changed: {seen_sections}")
    if len(seen_sections) != 20:
        raise ValueError("Duplicate/missing official 1–20 heading detected")
    counter = Counter(record["kind"] for page in pages for record in page["lines"])
    if counter["member"] < 200 or counter["duty"] < 12:
        raise ValueError(f"Official source text unexpectedly sparse: {dict(counter)}")
    if not any("สั่ง ณ วันที่" in line for line in all_lines):
        raise ValueError("Closing source instruction missing")
    return {"schema_version": 1,
            "status": "source_transcription_draft_not_approved",
            "source_pages": list(SOURCE_PAGES),
            "pages": pages,
            "sections": seen_sections,
            "total_lines": len(all_lines),
            "kind_counts": dict(counter),
            "full_text_sha256": hashlib.sha256("\n".join(all_lines).encode("utf-8")).hexdigest(),
            "unverified_items": ["official_document_type", "legal_authority",
                                 "signing_date_and_signatory",
                                 "numbering_and_affiliations"]}

def official_full_html(model):
    content = [
        '<div class="v42-official-guide">',
        '<span class="v42-official-draft">ร่างเพื่อการตรวจสอบ · ยังไม่ใช่เอกสารลงนาม</span>',
        '<h2>รายละเอียดประกาศตามสูจิบัตรต้นฉบับ V3</h2>',
        '<p>จัดหน้าใหม่ด้วยฟอนต์ไทยมีหัว โดยเก็บข้อความต้นทางหน้า 6–16 ทุกบรรทัด'
        ' รวมทั้งคณะกรรมการ 20 หมวดและข้อความ “มีหน้าที่” '
        'รายชื่อสะกดที่ปรับแก้ล่าสุดอยู่ในตารางกรรมการถัดไป '
        'รายการจากต้นฉบับด้านล่างอาจมีชื่อหรือเลขข้อที่ยังรอตรวจ</p>',
        '<p class="v42-official-warning">ต้นฉบับใช้หัวข้อ “ประกาศ” แต่ใช้ถ้อยคำปิด'
        ' “สั่ง ณ วันที่” ต้องให้ผู้มีอำนาจตรวจรูปแบบและการลงนามก่อนใช้จริง</p>',
        '</div>',
        '<article class="v42-official-content">'
    ]
    rendered_ids = []
    for source_page in model["pages"]:
        n = source_page["source_page"]
        content.append('<div class="v42-source-page" data-source-page="'+str(n)+'">')
        content.append('<div class="v42-page-label">ต้นฉบับ V3 · หน้า '+str(n)+'</div>')
        for line in source_page["lines"]:
            kind = line["kind"]
            id_ = line["id"]
            text = html.escape(line["text"], quote=True)
            if kind == "section":
                tag, class_name = "h3", "v42-section-title"
            elif kind == "subsection":
                tag, class_name = "h4", "v42-subsection"
            elif kind == "title":
                tag, class_name = "p", "v42-document-title"
            elif kind == "member":
                tag, class_name = "p", "v42-member-line"
            elif kind == "duty":
                tag, class_name = "p", "v42-duty-line"
            elif kind == "closing":
                tag, class_name = "p", "v42-closing-line"
            else:
                tag, class_name = "p", "v42-body-line"
            content.append(f'<{tag} class="{class_name}" data-source-line="{id_}">{text}</{tag}>')
            rendered_ids.append(id_)
        content.append("</div>")
    content.append("</article>")
    if len(rendered_ids) != model["total_lines"] or len(set(rendered_ids)) != len(rendered_ids):
        raise ValueError("Official source line mapping is incomplete or duplicated")
    return "".join(content)

def source_audit(model, rendered_html):
    """Machine-readable crosswalk; rejects omitted or duplicated rendered lines."""
    line_ids = re.findall(r'data-source-line="(v3-p\d\d-l\d+)"', rendered_html)
    expected_ids = [line["id"] for page in model["pages"] for line in page["lines"]]
    if line_ids != expected_ids:
        raise ValueError("Rendered source crosswalk is out of order or incomplete")
    return {"schema_version": 1,
            "status": "source_line_complete_not_approved",
            "source_pages": model["source_pages"],
            "verified_section_ids": model["sections"],
            "total_source_lines": model["total_lines"],
            "rendered_source_lines": len(line_ids),
            "missing_source_line_ids": [],
            "duplicate_source_line_ids": [],
            "kind_counts": model["kind_counts"],
            "full_text_sha256": model["full_text_sha256"],
            "per_page": [{"page": p["source_page"], "lines": p["line_count"],
                          "sha256": p["sha256"]} for p in model["pages"]],
            "unverified_items": model["unverified_items"]}

def official_css():
    return """
.v42-official-guide{font-family:FormalThai,NotoThai,sans-serif;border-top:3px solid #233e57;
 padding:6mm 0 5mm;margin:3mm 0 5mm;break-inside:avoid}
.v42-official-draft{display:inline-block;background:#fff1dd;color:#825e27;font-size:9pt;
 padding:1mm 3mm;border-radius:3px;font-weight:700}
.v42-official-guide h2{font-size:18pt;color:#152e45;margin:4mm 0 3mm}
.v42-official-guide p{font-size:10pt;line-height:1.6}
.v42-official-warning{border-left:3px solid #cb9a53;padding:2mm 3mm;background:#fffaf1}
.v42-official-content{font-family:FormalThai,NotoThai,sans-serif;color:#202936;font-size:11pt;line-height:1.55}
.v42-source-page{break-inside:auto;margin:0 0 5mm}
.v42-page-label{color:#647889;font:8pt NotoThai,sans-serif;border-top:1px solid #dae2e8;
 padding:1mm 0 2mm;margin-top:4mm}
.v42-document-title{text-align:center;font-size:14pt;font-weight:700;margin:2mm 0}
.v42-body-line{margin:0 0 1.3mm;line-height:1.7;text-indent:0}
.v42-section-title{font-size:12.3pt;color:#243d56;margin:4mm 0 2mm;
 border-bottom:1px solid #b9c8d5;break-after:avoid}
.v42-subsection{font-size:11.2pt;color:#254862;margin:3mm 0 1.5mm;break-after:avoid}
.v42-member-line{font-size:10.2pt;padding-left:4mm;margin:0 0 1.4mm;
 overflow-wrap:anywhere;break-inside:avoid}
.v42-duty-line{font-size:10.5pt;padding:1.2mm 3mm;background:#f0f5f9;
 border-left:2px solid #7d9db7;margin:2mm 0 1mm;break-inside:avoid}
.v42-closing-line{font-size:11.2pt;margin:2mm 0;padding-left:6mm;break-inside:avoid}
"""

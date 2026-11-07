#!/usr/bin/env python3
"""V42-A regression: full official V3 source coverage, read-only layout, no fake order."""
from __future__ import annotations
import html
import pathlib
import re
import sys
import fitz

ROOT=pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"scripts/docs"))
from v42_official import (build_source_model,official_full_html,source_audit,
                          SOURCE_PAGES, official_css)
pdf=fitz.open(ROOT/"assets/souvenir-committee-2569-v3.pdf")
model=build_source_model(pdf)
html_text=official_full_html(model)
audit=source_audit(model,html_text)
assert audit["source_pages"]==list(range(6,17))
assert audit["verified_section_ids"]==[str(x) for x in range(1,21)]
assert audit["total_source_lines"]==audit["rendered_source_lines"]>=320
assert audit["kind_counts"]["member"]>=200
assert audit["kind_counts"]["duty"]>=12
assert audit["missing_source_line_ids"]==[]
assert "ร่างเพื่อการตรวจสอบ" in html_text
assert "สั่ง ณ วันที่" in html_text
assert "มีหน้าที่" in html_text
# Source-wrapped duty prose must be a continuous administrative paragraph.
assert html_text.count('class="v42-duty-paragraph"')==20
assert html_text.count('class="v42-duty-continuation"')==14
for paragraph in re.findall(r'<p class="v42-duty-paragraph">(.*?)</p>',html_text,re.S):
    assert "มีหน้าที่" in paragraph
    assert "ฝ่ายเชิญเหรียญ" not in paragraph
assert '.v42-duty-paragraph{' in official_css()
assert '.v42-page-label{display:none}' in official_css()
assert '.v42-official-guide{display:none}' in official_css()
assert "20. คณะกรรมการ" in html_text
assert "รายชื่อสะกดที่ปรับแก้ล่าสุด" in html_text
assert "ไม่คัดลอกภาพทั้งสอง" in html_text
assert audit["per_page"][0]["embedded_image_count"]>=1
assert audit["per_page"][-1]["embedded_image_count"]>=1
assert html_text.count('data-source-page="')==11
assert html_text.count('data-source-line="')==audit["total_source_lines"]
for page in model["pages"]:
    assert page["line_count"]==len(page["lines"])
    for line in page["lines"]:
        encoded=html.escape(line["text"],quote=True)
        pattern=rf'data-source-line="{line["id"]}">{re.escape(encoded)}</'
        assert re.search(pattern,html_text),f"Lost/mutated source text: {line['id']}"
first=model["pages"][0]["lines"][0]["id"]
try:
    source_audit(model,html_text.replace(f'data-source-line="{first}"','data-source-line="MISSING"',1))
except ValueError: pass
else: raise AssertionError("Missing line must block rendering")
css=official_css()
assert ".v42-official-content" in css and ".v42-duty-line" in css
assert "R11C-V4.2-A" in css
builder=(ROOT/"scripts/docs/build-v4-full.py").read_text("utf-8")
assert "official_html=official_full_html(official_model)" in builder
assert 'notice_html=notice(read_source(pdf,6),read_source(pdf,16))' not in builder
assert 'pages.append(sec("ประกาศกลุ่มเครือข่าย (ฉบับร่าง)"' not in builder
assert 'pages.append(sec("ข้อความประกาศแต่งตั้งคณะกรรมการ (ฉบับร่าง)"' not in builder
assert "render_official_notice_v2(official_model" in builder
assert "document.insert_pdf(pr82_pdf,start_at=insert_at)" in builder
assert "first_committee_pages" in builder
assert "source_audit(official_model,official_html)" in builder
assert "souvenir-v42a-official-source-qa.json" in builder
assert "v42_official_css()" in builder
print(f"V42-A PASS: {len(model['pages'])} source pages, "
      f"{audit['total_source_lines']} verbatim lines, "
      f"{len(audit['verified_section_ids'])} sections, "
      f"{audit['kind_counts']['duty']} duty paragraphs, "
      "source line crosswalk complete, document remains draft")

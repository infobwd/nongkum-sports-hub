#!/usr/bin/env python3
"""R11C-V42-N1: reuse formal opening without replacing complete V3 duties."""
from __future__ import annotations
from pathlib import Path
import fitz
from v41_editorial import notice, extra_css
from v42_official import build_source_model, official_full_html, source_audit

root=Path(__file__).resolve().parents[2]
src=fitz.open(root/"assets/souvenir-committee-2569-v3.pdf")
source6=src[5].get_text("text",sort=True)
source16=src[15].get_text("text",sort=True)
opening=notice(source6,source16)
detail_model=build_source_model(src)
detail_html=official_full_html(detail_model)
audit=source_audit(detail_model,detail_html)
assert 'class="official-paper"' in opening
assert 'class="official-watermark">ร่าง' in opening
assert "รอชื่อผู้ลงนามและตำแหน่งตามเอกสารรับรอง" in opening
assert "ยังไม่ใช่ประกาศที่มีผลบังคับใช้" in opening
assert "เลขที่ประกาศ / วันที่รับรอง" in opening
assert "มิตรภาพเกมส์ 2569" in opening
assert '.official-paper{' in extra_css()
assert audit["rendered_source_lines"]==audit["total_source_lines"]==341
assert audit["verified_section_ids"]==[str(i) for i in range(1,21)]
assert "มีหน้าที่" in detail_html
assert audit["missing_source_line_ids"]==audit["duplicate_source_line_ids"]==[]
builder=(root/"scripts/docs/build-v4-full.py").read_text("utf-8")
assert 'notice_html=notice(read_source(pdf,6),read_source(pdf,16))' in builder
assert 'official_html=official_full_html(official_model)' in builder
assert 'official_report=source_audit(official_model,official_html)' in builder
assert builder.index('pages.append(sec("ประกาศกลุ่มเครือข่าย (ฉบับร่าง)"') < builder.index('pages.append(sec("รายละเอียดประกาศและหน้าที่กรรมการตามต้นฉบับ"')
assert '"rendered_cover_design":"g1_text_only_fallback"' in builder
print("V42-N1 PASS: V4.1 notice styling restored, 341 source lines and 20 committee sections preserved; review-only")

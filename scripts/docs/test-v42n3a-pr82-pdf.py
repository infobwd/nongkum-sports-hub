#!/usr/bin/env python3
"""Golden PR82 V2 notice output QA; no public or official publication."""
import hashlib
import json
import re
import sys
import unicodedata
from pathlib import Path

import fitz

out=Path(sys.argv[1])
pdfpath=out/"announcement_formal_preview_v2.pdf"
q=json.loads((out/"announcement_fontfix_v2_qa.json").read_text("utf-8"))
doc=fitz.open(pdfpath)
assert len(doc)==11==q["pages"], "Golden PR #82 layout is exactly 11 A4 pages"
assert q["source_lines"]==341 and q["sections"]==20
assert q["duty_paragraphs"]==20 and q["closing_lines"]==5
assert q["renderer"]=="PR82-V2-direct-source"
assert q["status"]=="draft_preview_not_signed" and q["A4"] is True
assert q["stray_latin_a_in_thai"]==0 and all(q["search_checks"].values())
assert hashlib.sha256(pdfpath.read_bytes()).hexdigest()==q["sha256"]
assert all(abs(p.rect.width-595.28)<1 and abs(p.rect.height-841.89)<1 for p in doc)
all_text="\n".join(page.get_text() for page in doc)
normalized=unicodedata.normalize("NFKC",all_text)
assert normalized.count("มีหน้าที่")==20
for word in ("ดำเนินการ","ตำบล","อำนวยการ","จัดทำ","น้ำดื่ม","คำ"):
    assert unicodedata.normalize("NFKC",word) in normalized, word
assert not re.findall(r"[ก-๙]a[ก-๙]",all_text)
fonts={f[3] for p in doc for f in p.get_fonts()}
assert any(f.endswith("+SarabunFull") for f in fonts), fonts
assert any(f.endswith("+SarabunFull-Bold") for f in fonts), fonts
# Hashes from the user's PR #82 approved 11-page Drive PDF; no reference PDF
# or font binaries are committed. PyMuPDF 1.26.7 at 1.4x RGB must match
# every page, not just pages 1/6/11. Font or layout updates now fail fast.
GOLDEN_PIXEL_SHA256 = (
    "3a83c62b43686e82fd0e38ed2dfcbe28a8ccd7eb5a124619080a1ff52dce246d",
    "7f9f1c173f2be03732fb406789b132a6480a9d1bb88572dc58eac183ef3da3a6",
    "ff3ad3dec7609c2a045d8f0cd32fe06fdb6de39a30995d1bf59f2ef817a45317",
    "a053495e1f4c62d5f02755c282724e958e3fe1f8c8c91b11e0eb91915390f6ea",
    "b4da3a63bbb35e099688524a3293a9343fd3db90e06e73ff6456921ed58733dc",
    "b0c8f00b092ab8f669ca807bf25acf1dab6205aab2d1a1c007a81751c5b65101",
    "6c5c55a7d9b04fba8ac50da9abb2f39a77676376a1595d049247a68ba7677f78",
    "2932fe26032ff54d3fe00bb542fad01fa00653ca2ce78fa852b082deda2a1353",
    "1bbe3a56ea1603c2271cf4ca404cc88e689a80a08fa5422c22bc4e7f799c1eb4",
    "8ba3c7ef9c799d51a9c555c240416a92b03a6b95d479c3819d47534534c6fec3",
    "23837ef9d02653f6a8347938be6c319be8ef265bd639bb870e5cee132f979f6d",
)
GOLDEN_TEXT_SHA256 = (
    "bcd6af1fd4244bb8184107e4590c2c754d043b53719249568ffa1473b2b07ca7",
    "8cbef97c65e49054b3c03fe80a663f91580d88ad51edc0831f4315c708f9f926",
    "a07c57e856110c3f465ccd515f5e62b2eebcc2c1f3d9003ee8680e54ac6d4260",
    "a73a40da800ba9494689f88e82f944aadaeb597623c8c23faf93574b80b1d826",
    "99307f70c31986677e2c43750fe139811ca89b36f312fae4440f6b8b91625cde",
    "e17fc0b38074b2191957420f41cb8cd6b8cecc3d9adcfa02077543182ba310d3",
    "39f2a4a99143484c02860b50f7d38083f32250745f7d168710e5c62cfebb4aa6",
    "bed12c2e4fc69ea93574e5d35532eba39dac9e643dbb53c8f5c901797ba280f4",
    "be985a359e8000bb866cd616fb05574b4f49afc6596d6cdbf6535293d7815a25",
    "a1b690ea0bbb51c5c2df1419b58d241d0abbcfa522dccf63c6223c82d38d8d3b",
    "a1ef87d20db5162d3844a76318b2090331c9bfb27c4d3231784c094ad8324a23",
)
for i, page in enumerate(doc):
    page_text_hash=hashlib.sha256(page.get_text().encode("utf-8")).hexdigest()
    pix=page.get_pixmap(matrix=fitz.Matrix(1.4,1.4),alpha=False)
    page_pixels_hash=hashlib.sha256(pix.samples).hexdigest()
    assert page_text_hash==GOLDEN_TEXT_SHA256[i], f"PR82 text drift on notice page {i+1}"
    assert page_pixels_hash==GOLDEN_PIXEL_SHA256[i], f"PR82 visual drift on notice page {i+1}"
first=doc[0]
words=first.get_text("words")
role_right=[w for w in words if w[4] in ("กรรมการ","ประธานกรรมการ") and w[0]>445 and w[2]<535]
assert len(role_right)>=10, "PR82 role column must remain right-aligned, not N2 inline prose"
for i in (0,5,10):
    page=doc[i]
    assert len(page.get_text().strip())>100
    assert not page.get_images(full=True), "PR82 is text-only, do not fabricate a logo or signature"
    pix=page.get_pixmap(matrix=fitz.Matrix(.5,.5),alpha=False)
    assert pix.width>280 and pix.height>400
assert "ร่าง" in normalized and "สั่ง ณ" in normalized
print(json.dumps({"golden_reference":"PR82 announcement_formal_preview_v2.pdf",
                  "golden_reference_sha256":"8cc68ba476192fe47310280600a9c681afdbe98378dc7881bf183d977d8928d8",
                  "produced_sha256":q["sha256"],"pages":len(doc),
                  "source_lines":q["source_lines"],"sections":q["sections"],
                  "duty_paragraphs":q["duty_paragraphs"],
                  "right_gutter_roles_page1":len(role_right),
                  "golden_text_parity":"11_of_11_exact",
                  "golden_visual_parity":"11_of_11_exact_pixels_1.4x",
                  "status":"review_only_pass"},ensure_ascii=False,indent=2))

#!/usr/bin/env python3
"""G2 private photo slot and source-based Thai revision footer guard."""
from pathlib import Path
from datetime import timedelta
import re
import sys

sys.path.insert(0,str(Path(__file__).resolve().parent))
from v42_cover import cover_html, cover_g2_html, cover_g2_css
from v42_revision_footer import revision_stamp

assert 'data-cover-revision="V42-G1"' in cover_html()
assert "กีฬานักเรียนกลุ่มหนองกุ่ม" in cover_html()
g2=cover_g2_html("file:///tmp/private-selected-portrait.jpg")
assert 'data-cover-revision="V42-G2-PRIVATE-PROOF"' in g2
assert 'src="file:///tmp/private-selected-portrait.jpg"' in g2
assert "<h1" in g2 and "มิตรภาพเกมส์" in g2 and "2569" in g2
assert 'data-title-revision="V42-G2-SPORT-MASTHEAD-V21"' in g2
assert 'class="g2-title-panel"' in g2 and 'class="g2-speed"' in g2
assert 'class="g2-year-plate"' in g2 and 'g2-year-speed' in g2
assert 'font:900 43pt' in cover_g2_css() and 'G2SportThai' in cover_g2_css()
assert 'transform:skewX(-7deg)' in cover_g2_css()
assert 'font:900 70pt' in cover_g2_css()
assert 'text-shadow:2.4pt' in cover_g2_css()
assert '.g2-year-speed.g2-short' in cover_g2_css()
assert cover_g2_css().count('NotoSansThai-Black.ttf')==1
assert "ตัวอย่างตรวจแบบเท่านั้น" in g2
assert "16–20 พฤศจิกายน 2569" in g2
assert ".cover-g2 .g2-hero-photo" in cover_g2_css()
assert "object-fit:cover" in cover_g2_css()
assert not re.search(r"https?://",g2), "Private G2 must not access a remote URL"
for url in ("https://drive.google.com/photo","http://example.org/a.jpg","data:image/png;base64,broken"):
    try:
        cover_g2_html(url)
    except ValueError:
        pass
    else:
        raise AssertionError("Rejected non-local private photo reference: "+url)
stamp=revision_stamp(Path("/tmp"),"2026-11-07T07:39:00+00:00")
assert stamp["footer_text"]=="ปรับปรุงล่าสุด 7 พ.ย. 2569 เวลา 14:39 น."
assert stamp["source_last_modified_bangkok"]=="2026-11-07T14:39:00+07:00"
assert stamp["timestamp_origin"]=="explicit_preview"
assert stamp["timezone"]=="Asia/Bangkok"
try:
    revision_stamp(Path("/tmp"),"2026-11-07T14:39:00")
except ValueError:
    pass
else:
    raise AssertionError("A timezone-naive timestamp must never be accepted")
# Render a 1-page G2 proof using a color-only synthetic fixture; never a child
# image, selected photo, or public-ready cover. This validates layout mechanics.
import tempfile
from PIL import Image
from weasyprint import HTML
import fitz
with tempfile.TemporaryDirectory(prefix="g2-layout-unit-") as folder:
    tmp=Path(folder)
    fixture=tmp/"synthetic-no-person-color-card.jpg"
    Image.new("RGB",(1200,1700),(37,76,109)).save(fixture,quality=88)
    candidates=list(Path("/usr/share/fonts").rglob("NotoSansThai-Regular.ttf"))
    assert candidates, "Noto Thai font required for G2 review preview"
    font_url=candidates[0].resolve().as_uri()
    source="""<!doctype html><html lang="th"><head><meta charset="utf-8"><style>
    @font-face{font-family:NotoThai;src:url('"""+font_url+"""');font-weight:400}
    @font-face{font-family:NotoThai;src:url('"""+font_url+"""');font-weight:700}
    @page{size:A4;margin:0}body{margin:0;padding:0}
    """+cover_g2_css()+"""</style></head><body>"""+cover_g2_html(fixture.resolve().as_uri())+"""</body></html>"""
    out=tmp/"g2-private-layout-unit.pdf"
    HTML(string=source,base_url=str(tmp)).write_pdf(out)
    proof=fitz.open(out)
    assert len(proof)==1, "Full Photo V2 should occupy exactly one A4 page"
    assert abs(proof[0].rect.width-595.28)<1 and abs(proof[0].rect.height-841.89)<1
    normalized=proof[0].get_text().replace(chr(0x0e33),chr(0x0e4d)+chr(0x0e32))
    assert "มิตรภาพเกมส์" in normalized and "2569" in normalized
    assert "ตัวอย่างตรวจแบบเท่านั้น" in normalized
    assert len(proof[0].get_images())>=1, "Private photo is not embedded in G2 proof"
    all_spans=[span for block in proof[0].get_text("dict")["blocks"]
               if "lines" in block for line in block["lines"]
               for span in line["spans"]]
    main_titles=[span for span in all_spans if span["text"]=="มิตรภาพเกมส์"]
    assert len(main_titles)==1, f"Sport Thai title must stay single/searchable: {main_titles}"
    assert main_titles[0]["size"]>=40, "Sports masthead title should be visibly dominant"
    assert "G2SportThai" in main_titles[0]["font"], f"G2 masthead fell back to generic Bold: {main_titles[0]['font']}"
    assert main_titles[0]["bbox"][3]<proof[0].rect.height*.42, "Title may not obscure athletes or venue"
    year=[span for span in all_spans if span["text"]=="2569" and span["size"]>60]
    assert len(year)==1, "Sport year must be a single native PDF text span"
    assert year[0]["bbox"][3]<proof[0].rect.height*.43
    proof.close()
# The source timestamp must be stable across a CI re-run and a docs-only
# commit. It is not the ephemeral GitHub pull-request merge SHA.
import subprocess
root=Path(__file__).resolve().parents[2]
git_source_sha=subprocess.check_output(
    ["git","log","-1","--format=%H","--","scripts/docs","data","assets"],
    cwd=root,text=True).strip()
source_stamp=revision_stamp(root)
assert source_stamp["source_revision_sha"]==git_source_sha
assert source_stamp["timestamp_origin"]=="git_commit"
print("G2 cover source/rights gate PASS; Thai footer conversion from explicit UTC to Bangkok PASS")

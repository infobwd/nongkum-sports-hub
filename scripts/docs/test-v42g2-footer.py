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
print("G2 cover source/rights gate PASS; Thai footer conversion from explicit UTC to Bangkok PASS")

#!/usr/bin/env python3
"""V42-G1 source-level checks; no external media or changes to fixtures."""
from v42_cover import cover_css, cover_html

markup=cover_html()
styles=cover_css()
for required in (
    'class="cover cover-g1"', 'data-cover-revision="V42-G1"',
    '<h1 class="cover-display-title">มิตรภาพเกมส์</h1>',
    '<div class="cover-display-year">2569</div>',
    'โรงเรียนบ้านหนองกระทุ่ม',
    '16–20 พฤศจิกายน 2569',
    '12–13 พฤศจิกายน 2569',
    'ร่างสำหรับตรวจข้อมูล',
    'ยังไม่ใช่โปรแกรมการแข่งขันหรือคำสั่งแต่งตั้งที่รับรองแล้ว',
):
    assert required in markup, required
assert '<img' not in markup and 'url(' not in markup
assert 'photos.google.com' not in markup and 'drive.google.com' not in markup
assert '.cover-g1 h1.cover-display-title' in styles
assert '.cover-g1 .cover-display-year' in styles
assert 'text-shadow' in styles and '#eec65b' in styles
assert 'src:url(' not in styles
assert 'background-image:url(' not in styles
print('V42-G1 cover source checks PASS: searchable text markup and photo-free fallback')

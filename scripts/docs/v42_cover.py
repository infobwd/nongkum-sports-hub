"""R11C V4.2-G1: searchable Thai sport-masthead on the text-only review cover.

This helper never loads images from Drive or adds personal photographs.
Cover image rights (G2) and R11E publication approval remain separate gates.
"""
from __future__ import annotations


def cover_html() -> str:
    return """<section class="cover cover-g1" data-cover-revision="V42-G1">
  <div class="cover-sport-band" aria-hidden="true"></div>
  <div class="cover-sport-ring" aria-hidden="true"></div>
  <div class="cover-sport-slash" aria-hidden="true"></div>
  <div class="cover-main">
    <p class="over">NONGKUM SCHOOLS SPORTS 2569</p>
    <div class="cover-title-frame">
      <p class="cover-edition">กีฬานักเรียนกลุ่มหนองกุ่ม</p>
      <h1 class="cover-display-title">มิตรภาพเกมส์</h1>
      <div class="cover-display-year">2569</div>
      <div class="cover-title-rule" aria-hidden="true"></div>
      <p class="cover-subtitle">สูจิบัตรการแข่งขันกีฬานักเรียน</p>
      <p class="cover-network">กลุ่มเครือข่ายพัฒนาคุณภาพการศึกษาหนองกุ่ม</p>
    </div>
  </div>
  <div class="cover-bottom">
    <span class="seal">V4.2-H + G1 • ร่างสำหรับตรวจข้อมูล</span>
    <strong>สนามหลัก โรงเรียนบ้านหนองกระทุ่ม</strong>
    <p>อำเภอบ่อพลอย จังหวัดกาญจนบุรี</p>
    <strong>16–20 พฤศจิกายน 2569</strong>
    <p>เปตองนอกรอบ 12–13 พฤศจิกายน 2569</p>
    <p class="cover-review-warning">เอกสารนี้ยังไม่ใช่โปรแกรมการแข่งขันหรือคำสั่งแต่งตั้งที่รับรองแล้ว</p>
  </div>
</section>"""


def cover_css() -> str:
    # Plain text stays in the PDF text layer. Gold framing and track lines create
    # the sport-display effect; shadow is nonessential if a PDF engine ignores it.
    return """
.cover.cover-g1{position:relative;width:210mm;height:297mm;background:#112e4c;color:#fff;overflow:hidden;padding:0;break-after:page}
.cover.cover-g1:before{content:"";position:absolute;top:0;left:0;right:0;height:6mm;background:#f0cb61;z-index:3}
.cover.cover-g1:after{content:"";position:absolute;top:17mm;right:-55mm;width:178mm;height:178mm;border:2.5mm solid rgba(227,191,88,.26);border-radius:50%;z-index:0}
.cover-g1 .cover-sport-band{position:absolute;left:-25mm;top:171mm;width:260mm;height:22mm;background:#18436c;transform:rotate(-12deg);z-index:0}
.cover-g1 .cover-sport-ring{position:absolute;left:-65mm;top:135mm;width:158mm;height:158mm;border:1.4mm solid rgba(233,199,107,.17);border-radius:50%;z-index:0}
.cover-g1 .cover-sport-slash{position:absolute;right:0;top:0;width:12mm;height:225mm;background:rgba(238,198,92,.11);transform:skewX(-17deg);z-index:0}
.cover-g1 .cover-main{position:absolute;left:18mm;right:15mm;top:35mm;z-index:2}
.cover-g1 .over{font:700 10pt/1.3 NotoThai,sans-serif;letter-spacing:.9pt;color:#efcc77;margin:0 0 14mm}
.cover-g1 .cover-title-frame{border-left:2.4mm solid #eec65b;padding:1mm 0 0 8mm}
.cover-g1 .cover-edition{margin:0 0 5mm;color:#e2c77c;font-size:9.5pt;font-weight:700;letter-spacing:.35pt}
.cover-g1 h1.cover-display-title{border:0;padding:0;margin:0;color:#fff;font:700 42pt/1.24 NotoThai,sans-serif;letter-spacing:-.65pt;text-shadow:1.5pt 2pt 0 #071c30}
.cover-g1 .cover-display-year{font:700 73pt/1.08 NotoThai,sans-serif;letter-spacing:-1.5pt;color:#f1ce67;margin:2mm 0 5mm;text-shadow:1.3pt 2pt 0 #071c30}
.cover-g1 .cover-title-rule{background:#eec65b;width:94mm;height:1.6mm;margin:0 0 8mm;transform:skewX(-19deg)}
.cover-g1 .cover-subtitle{font:700 12.8pt/1.5 NotoThai,sans-serif;margin:0 0 2mm;color:#f9fbfc}
.cover-g1 .cover-network{font-size:9.6pt;line-height:1.5;color:#e7edf5;margin:0;max-width:157mm}
.cover-g1 .cover-bottom{position:absolute;bottom:0;left:0;right:0;background:#f4f6f9;color:#183b5c;padding:11mm 18mm 12mm;z-index:4;border-top:2.5mm solid #eec65b}
.cover-g1 .cover-bottom .seal{display:inline-block;background:#ffe6a2;color:#72521d;padding:1mm 3mm;border-radius:4px;font-size:8pt;margin-bottom:4mm}
.cover-g1 .cover-bottom strong{font-size:12pt;display:block;line-height:1.4}
.cover-g1 .cover-bottom p{font-size:9pt;color:#526e86;margin:0 0 2mm}
.cover-g1 .cover-bottom .cover-review-warning{margin-top:7mm;font-size:8.1pt;color:#685632;line-height:1.5}
"""

def cover_g2_html(photo_uri: str) -> str:
    """Review-only full-photo V2 cover; Thai title remains searchable text."""
    from html import escape
    if not photo_uri.startswith("file:///"):
        raise ValueError("The selected cover image must be a local private photo")
    src = escape(photo_uri, quote=True)
    return f"""<section class="cover cover-g2" data-cover-revision="V42-G2-PRIVATE-PROOF">
      <img class="g2-hero-photo" src="{src}" alt="" aria-hidden="true">
      <div class="g2-vignette"></div>
      <div class="g2-head"><p class="g2-over">NONGKUM YOUTH SPORTS · FRIENDSHIP EDITION</p>
        <p>กีฬานักเรียนกลุ่มหนองกุ่ม</p>
        <h1 class="g2-title">มิตรภาพเกมส์</h1><div class="g2-year">2569</div>
        <div class="g2-rule" aria-hidden="true"></div></div>
      <div class="g2-foot"><strong>สูจิบัตรการแข่งขันกีฬานักเรียน</strong>
        <p>กลุ่มเครือข่ายพัฒนาคุณภาพการศึกษาหนองกุ่ม</p>
        <strong>สนามหลัก โรงเรียนบ้านหนองกระทุ่ม</strong>
        <p>อำเภอบ่อพลอย จังหวัดกาญจนบุรี</p>
        <strong>16–20 พฤศจิกายน 2569</strong>
        <p>เปตองนอกรอบ 12–13 พฤศจิกายน 2569</p>
        <small>ตัวอย่างตรวจแบบเท่านั้น · รอตรวจสิทธิ์ภาพและคุณภาพงานพิมพ์</small>
      </div></section>"""


def cover_g2_css() -> str:
    return """
.cover.cover-g2{position:relative;width:210mm;height:297mm;padding:0;
 overflow:hidden;background:#153451;color:white;break-after:page}
.cover-g2 .g2-hero-photo{position:absolute;top:0;left:0;width:100%;height:100%;
 object-fit:cover;object-position:center center}
.cover-g2 .g2-vignette{position:absolute;inset:0;background:linear-gradient(
 180deg,rgba(11,35,58,.93),rgba(11,35,58,.30) 43%,rgba(11,35,58,.10) 65%,
 rgba(11,35,58,.91) 100%)}
.cover-g2:before{content:"";position:absolute;z-index:3;top:0;left:0;
 width:100%;height:5mm;background:#e7c566}
.cover-g2 .g2-head{position:absolute;top:27mm;left:18mm;right:12mm;
 border-left:2.1mm solid #e7c566;padding-left:7mm;z-index:2}
.cover-g2 .g2-over{font-size:8pt;letter-spacing:.7pt;color:#f4d78a;
 margin:0 0 12mm}
.cover-g2 .g2-head>p:not(.g2-over){font-size:9pt;color:#ffedb4;margin:0 0 3mm}
.cover-g2 h1.g2-title{font:700 40pt/1.3 NotoThai,sans-serif;
 margin:0;padding:0;border:0;color:#fff;text-shadow:1.2pt 2pt #113351}
.cover-g2 .g2-year{font:700 65pt/1.12 NotoThai,sans-serif;
 color:#ffdc70;text-shadow:1.2pt 2pt #113351}
.cover-g2 .g2-rule{width:93mm;height:1.4mm;background:#edcc70;margin-top:7mm}
.cover-g2 .g2-foot{position:absolute;bottom:0;left:0;right:0;z-index:2;
 background:rgba(8,30,51,.91);border-top:1.4mm solid #e8c66f;
 padding:10mm 18mm 17mm}
.cover-g2 .g2-foot strong{display:block;font-size:11pt;line-height:1.5}
.cover-g2 .g2-foot p{font-size:8.8pt;line-height:1.5;margin:0 0 2mm}
.cover-g2 .g2-foot small{font-size:7pt;color:#ffdf8f;display:block;margin-top:5mm}
"""

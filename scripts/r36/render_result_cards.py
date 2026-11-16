#!/usr/bin/env python3
"""R36.1: approved-result LINE cards with complete Thai + Latin glyph coverage.

Noto Sans Thai deliberately contains *no ASCII digits or Latin letters*.
Draw full Thai runs with Noto Sans Thai and Latin/digit runs with Noto Sans,
sharing a baseline; fail before publishing if any requested glyph is missing.
Never insert scores, winners or team information not in approved share jobs.
"""
import json
import re
import subprocess
from pathlib import Path
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont, features

ROOT = Path(__file__).resolve().parents[2]
JOBS = json.loads((ROOT / "data/r36-card-jobs.json").read_text(encoding="utf8"))
assert JOBS["schema_version"] == 1 and JOBS["approved_only"] is True
assert isinstance(JOBS["jobs"], list) and len(JOBS["jobs"]) <= 500
if not features.check_feature("raqm"):
    raise RuntimeError("Pillow requires Raqm text shaping for Thai marks")

def font_path(family, style):
    path = subprocess.check_output(
        ["fc-match", "-f", "%{file}", f"{family}:style={style}"],
        text=True, timeout=5,
    ).strip()
    if not path or not Path(path).is_file():
        raise RuntimeError(f"Missing font {family} {style}")
    return path

THAI = {style: font_path("Noto Sans Thai", style) for style in ("Regular", "Bold")}
LATIN = {style: font_path("Noto Sans", style) for style in ("Regular", "Bold")}
GLYPHS = {
    path: set(TTFont(path).getBestCmap()) for path in set(THAI.values()) | set(LATIN.values())
}
FONTS = {}
RUNS = re.compile(r"[\u0e00-\u0e7f]+|[^\u0e00-\u0e7f]+")

def spans(text):
    """Keep combining Thai marks in the same shaped run as Thai base letters."""
    for match in RUNS.finditer(str(text)):
        part = match.group()
        is_thai = "\u0e00" <= part[0] <= "\u0e7f"
        yield part, is_thai

def getfont(style, size, is_thai):
    family = THAI if is_thai else LATIN
    path = family[style]
    key = (path, size)
    if key not in FONTS:
        FONTS[key] = ImageFont.truetype(path, size, layout_engine=ImageFont.Layout.RAQM)
    return FONTS[key]

def measure(draw, text, style, size):
    return sum(draw.textlength(part, font=getfont(style, size, thai), direction="ltr")
               for part, thai in spans(text))

def check_chars(text, style):
    for part, thai in spans(text):
        available = GLYPHS[(THAI if thai else LATIN)[style]]
        missing = sorted(set(map(ord, part)) - available)
        if missing:
            raise ValueError("Unsupported glyphs in preview: " +
                             ", ".join(f"U+{code:04X}" for code in missing))

def centre(draw, x, y, text, size, color, style="Bold"):
    """y represents approximate text top; all runs share a common baseline."""
    check_chars(text, style)
    pen = float(x) - measure(draw, text, style, size) / 2
    baseline = int(y + size)
    for part, thai in spans(text):
        font = getfont(style, size, thai)
        draw.text((int(round(pen)), baseline), part, font=font, fill=color,
                  anchor="ls", direction="ltr")
        pen += draw.textlength(part, font=font, direction="ltr")

def cropped(draw, text, max_width, size, style="Bold"):
    text = str(text)
    if measure(draw, text, style, size) <= max_width:
        return text
    while text and measure(draw, text + "…", style, size) > max_width:
        text = text[:-1]
    return text.rstrip() + "…"

navy = (20, 50, 88)
navy_dark = (13, 34, 63)
gold = (248, 206, 112)
white = (255, 255, 255)
light = (225, 236, 252)

for job in JOBS["jobs"]:
    slug = job["slug"]
    assert re.fullmatch(r"r[0-9a-f]{8}-v[1-9][0-9]*-p2", slug), "Expected new design-specific URL"
    assert int(job["revision"]) >= 1
    image = Image.new("RGB", (1200, 630), navy_dark)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((30, 25, 1170, 605), radius=34, fill=navy, outline=gold, width=4)
    draw.rectangle((78, 120, 1122, 124), fill=gold)
    centre(draw, 600, 46, "มิตรภาพเกมส์ 2569", 50, gold)
    centre(draw, 600, 141, "ผลการแข่งขัน", 40, light)
    sport_div = " · ".join(x for x in [job.get("sport", ""), job.get("division", "")] if x)
    centre(draw, 600, 212, cropped(draw, sport_div, 990, 44), 44, light)

    if job.get("a") and job.get("b"):
        draw.rounded_rectangle((78, 300, 541, 458), radius=22, fill=(27, 66, 110))
        draw.rounded_rectangle((659, 300, 1122, 458), radius=22, fill=(27, 66, 110))
        a = cropped(draw, job["a"], 398, 57)
        b = cropped(draw, job["b"], 398, 57)
        centre(draw, 309, 341, a, 57, gold if job.get("winner") == job["a"] else white)
        centre(draw, 891, 341, b, 57, gold if job.get("winner") == job["b"] else white)
        centre(draw, 600, 347, "VS", 39, gold)
    else:
        event = job.get("line") or "รายการกรีฑา"
        centre(draw, 600, 336, cropped(draw, event, 980, 52), 52, white)

    winner = job.get("winner", "")
    if winner:
        detail = winner + " ชนะ"
    elif job.get("summary"):
        detail = job["summary"]
    else:
        detail = "ผลการแข่งขัน"
    centre(draw, 600, 487, cropped(draw, detail, 950, 43), 43, gold)
    centre(draw, 600, 553, "มิตรภาพเกมส์ 2569 · ผลการแข่งขัน", 25, light, "Regular")

    dest = ROOT / "r" / slug / "card.png"
    dest.parent.mkdir(parents=True, exist_ok=True)
    image.save(dest, format="PNG", optimize=True)
    with Image.open(dest) as verified:
        assert verified.format == "PNG" and verified.size == (1200, 630)
    print("R36.1 PNG:", dest.relative_to(ROOT), dest.stat().st_size, "bytes")

#!/usr/bin/env python3
"""R36: create 1200x630 PNG previews from already-approved, validated share jobs.
Uses installed Thai fonts; never writes scores, results or unapproved data.
"""
import json
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
JOBS = json.loads((ROOT / "data/r36-card-jobs.json").read_text(encoding="utf8"))
assert JOBS["schema_version"] == 1 and JOBS["approved_only"] is True
assert isinstance(JOBS["jobs"], list) and len(JOBS["jobs"]) <= 500

def font_path(style="Regular"):
    try:
        path = subprocess.check_output(
            ["fc-match", "-f", "%{file}", "Noto Sans Thai:style=" + style],
            text=True, timeout=5
        ).strip()
        if path and Path(path).exists():
            return path
    except Exception:
        pass
    raise RuntimeError("Thai font unavailable: install fonts-noto-core / fonts-thai-tlwg")

REGULAR = font_path("Regular")
BOLD = font_path("Bold")

def text_width(draw, text, font):
    return draw.textlength(str(text), font=font, direction="ltr")

def centre(draw, x, y, text, font, color):
    s = str(text)
    draw.text((int(x - text_width(draw, s, font) / 2), int(y)),
              s, font=font, fill=color, stroke_width=0, direction="ltr")

def cropped(draw, text, max_width, font):
    text = str(text)
    if text_width(draw, text, font) <= max_width:
        return text
    while text and text_width(draw, text + "…", font) > max_width:
        text = text[:-1]
    return text.rstrip() + "…"

navy = (20, 50, 88)
navy_dark = (13, 34, 63)
gold = (248, 206, 112)
white = (255, 255, 255)
light = (225, 236, 252)
mint = (207, 245, 224)

for job in JOBS["jobs"]:
    slug = job["slug"]
    assert slug.startswith("r") and "-v" in slug and slug.replace("-", "").replace("v", "").isalnum()
    assert int(job["revision"]) >= 1
    image = Image.new("RGB", (1200, 630), navy_dark)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((30, 25, 1170, 605), radius=34, fill=navy, outline=gold, width=4)
    draw.rectangle((78, 115, 1122, 119), fill=gold)
    centre(draw, 600, 48, "มิตรภาพเกมส์ 2569", ImageFont.truetype(BOLD, 48), gold)
    centre(draw, 600, 143, "ผลการแข่งขันที่ผ่านการรับรอง", ImageFont.truetype(BOLD, 33), mint)
    sport_div = " · ".join(x for x in [job.get("sport", ""), job.get("division", "")] if x)
    centre(draw, 600, 202, cropped(draw, sport_div, 990, ImageFont.truetype(BOLD, 37)),
           ImageFont.truetype(BOLD, 37), light)

    if job.get("a") and job.get("b"):
        draw.rounded_rectangle((78, 294, 541, 458), radius=22, fill=(27, 66, 110))
        draw.rounded_rectangle((659, 294, 1122, 458), radius=22, fill=(27, 66, 110))
        name_font = ImageFont.truetype(BOLD, 52)
        a = cropped(draw, job["a"], 390, name_font)
        b = cropped(draw, job["b"], 390, name_font)
        centre(draw, 309, 333, a, name_font, gold if job.get("winner") == job["a"] else white)
        centre(draw, 891, 333, b, name_font, gold if job.get("winner") == job["b"] else white)
        centre(draw, 600, 341, "VS", ImageFont.truetype(BOLD, 39), gold)
    else:
        event = job.get("line") or "รายการกรีฑา"
        f = ImageFont.truetype(BOLD, 50)
        centre(draw, 600, 330, cropped(draw, event, 970, f), f, white)

    winner = job.get("winner", "")
    if winner:
        detail = "ผู้ชนะ: " + winner
    elif job.get("summary"):
        detail = job["summary"]
    else:
        detail = "ผลรับรองแล้ว"
    winner_font = ImageFont.truetype(BOLD, 39)
    centre(draw, 600, 487, cropped(draw, detail, 950, winner_font), winner_font, gold)

    footer = "มิตรภาพเกมส์ 2569   ·   ผลรับรองรุ่นที่ " + str(job["revision"])
    centre(draw, 600, 552, footer, ImageFont.truetype(REGULAR, 23), light)
    dest = ROOT / "r" / slug / "card.png"
    dest.parent.mkdir(parents=True, exist_ok=True)
    image.save(dest, format="PNG", optimize=True)
    with Image.open(dest) as verified:
        assert verified.format == "PNG" and verified.size == (1200, 630)
    print("R36 PNG:", dest.relative_to(ROOT), dest.stat().st_size, "bytes")

#!/usr/bin/env python3
"""Reject PDF typography drift in patches; never auto-approve from page counts alone.

Usage:
 python scripts/r27/verify_pdf_font_parity.py --before R27B.pdf --after R27C.pdf --manifest manifest.json

Requires: pymupdf, fonttools, pillow
Manifest: {"document_pages": 41, "patches": [{"page":17,"text":"...",
 "expected_font_family":"bold","font_size":7.4,"expected_color":"163653",
 "original_bbox":[220,194,308,207]}]}
"""
import argparse
import io
import json
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

import fitz
from fontTools.ttLib import TTFont
from PIL import Image, ImageChops, ImageDraw

FAMILIES = {
    "regular": "NotoSansThai-Regular",
    "bold": "NotoSansThai-Bold",
    "latin": "NotoSans-Regular",
    "sarabun": "Sarabun-Regular",
}

def normalized(value):
    # Thai U+0E33 is glyph-shaped as U+0E4D + U+0E32 by some PDF engines.
    return unicodedata.normalize("NFKC", value)

def spans(page):
    return [s for b in page.get_text("dict")["blocks"]
            for line in b.get("lines", []) for s in line["spans"]]

def postscript_names(doc, page):
    result = {}
    for font in page.get_fonts(full=True):
        try:
            data = doc.extract_font(font[0])[3]
            ttf = TTFont(io.BytesIO(data))
            ps = [name.toUnicode() for name in ttf["name"].names if name.nameID == 6]
            if ps:
                result[font[3].split("+")[-1]] = ps[0]
        except Exception:
            continue
    return result

def check(before_path, after_path, manifest_path):
    before, after = fitz.open(before_path), fitz.open(after_path)
    manifest = json.loads(Path(manifest_path).read_text(encoding="utf-8"))
    errors = []
    expected_pages = int(manifest["document_pages"])
    by_page = defaultdict(list)
    for entry in manifest["patches"]:
        by_page[int(entry["page"])].append(entry)
    if len(before) != expected_pages or len(after) != expected_pages:
        return ["PAGE COUNT changed or did not match manifest"]
    for pnum, (old, new) in enumerate(zip(before, after), 1):
        if abs(old.rect.width - new.rect.width) > .01 or abs(old.rect.height - new.rect.height) > .01:
            errors.append(f"{pnum}: page dimensions changed")
        if pnum not in by_page:
            if old.get_text() != new.get_text():
                errors.append(f"{pnum}: text changed outside allowed pages")
            continue
        src, dst = spans(old), spans(new)
        font_names = postscript_names(after, new)
        visual_allowed = []
        for item in by_page[pnum]:
            text = item["text"]
            source = [s for s in src
                      if s["text"] == text and s["font"].startswith("Waree")
                      and abs(s["bbox"][0] - item["original_bbox"][0]) < 1.3]
            if len(source) != 1:
                errors.append(f"{pnum}: original patch ambiguous: {text[:30]}")
                continue
            region = fitz.Rect(source[0]["bbox"])
            family = item["expected_font_family"]
            new_line = [s for s in dst
                        if abs(s["bbox"][1] - region.y0) < 6
                        and region.x0 - 2 <= s["bbox"][0] < max(region.x1+75, region.x0+40)]
            if normalized(text) not in normalized(new.get_text()):
                errors.append(f"{pnum}: copied text differs: {text[:30]}")
            selected = []
            for s in new_line:
                if s["font"].startswith("Waree") and fitz.Rect(s["bbox"]).intersects(region):
                    errors.append(f"{pnum}: original Waree text remains")
                if family in ("regular", "bold") and s["font"].startswith("ThaiFix") and re.search("[ก-๙]", s["text"]):
                    selected.append(s)
                elif family == "sarabun" and s["font"].startswith("SarabunFix") and s["text"] == text:
                    selected.append(s)
                elif family == "latin" and s["text"] == text:
                    selected.append(s)
            if not selected:
                errors.append(f"{pnum}: expected replacement font not found: {text[:30]}")
                continue
            for s in selected:
                actual_face = font_names.get(s["font"].split("+")[-1], s["font"])
                if actual_face != FAMILIES[family]:
                    errors.append(f"{pnum}: FONT FAMILY {actual_face} != {FAMILIES[family]}")
                if abs(s["size"] - item["font_size"]) > .45:
                    errors.append(f"{pnum}: FONT SIZE mismatch")
                if s["color"] != int(item["expected_color"], 16):
                    errors.append(f"{pnum}: FONT COLOR mismatch")
            right = max([region.x1] + [s["bbox"][2] for s in selected])
            visual_allowed.append(fitz.Rect(region.x0-6, region.y0-7, min(old.rect.width,right+8), region.y1+7))
        for s in dst:
            if s["font"].startswith("Waree") and re.search("[ก-๙]", s["text"]):
                errors.append(f"{pnum}: Thai Waree fragment remains")
        # Pixel diff must be confined to declared replacement glyphs.
        zoom = fitz.Matrix(1.5, 1.5)
        pix_before = old.get_pixmap(matrix=zoom, alpha=False)
        pix_after = new.get_pixmap(matrix=zoom, alpha=False)
        if (pix_before.width,pix_before.height) != (pix_after.width,pix_after.height):
            errors.append(f"{pnum}: render geometry changed")
            continue
        original_image = Image.frombytes("RGB", (pix_before.width,pix_before.height),pix_before.samples)
        new_image = Image.frombytes("RGB", (pix_after.width,pix_after.height),pix_after.samples)
        changed = ImageChops.difference(original_image,new_image).convert("L").point(lambda x:255 if x>12 else 0)
        allowed = Image.new("L", original_image.size, 0)
        draw = ImageDraw.Draw(allowed)
        for r in visual_allowed:
            draw.rectangle((int(r.x0*1.5),int(r.y0*1.5),int(r.x1*1.5),int(r.y1*1.5)),fill=255)
        if ImageChops.subtract(changed,allowed).getbbox():
            errors.append(f"{pnum}: unexpected rendered pixels outside declared edits")
    return errors

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--before",required=True)
    parser.add_argument("--after",required=True)
    parser.add_argument("--manifest",required=True)
    args=parser.parse_args()
    errors=check(args.before,args.after,args.manifest)
    for issue in errors:
        print("FAIL:",issue)
    if errors:
        print("FAILED",len(errors),"checks")
        sys.exit(1)
    print("PASS: fonts, sizes, colors, Thai text extraction, page dimensions, render regions")

if __name__=="__main__":
    main()

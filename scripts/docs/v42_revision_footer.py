"""R11C V4.2: truthful book revision footer in Asia/Bangkok.

The timestamp is the repository commit timestamp, not the time a PDF was
re-generated. A single vector overlay is appended to *every* physical PDF
page, including the PR82 announcement, V3 appendix and cover.
"""
from __future__ import annotations

import datetime
import json
import subprocess
from pathlib import Path
from zoneinfo import ZoneInfo

import fitz
from weasyprint import HTML

MONTHS_TH = ("", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
             "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.")


def revision_stamp(root: Path, last_updated_iso: str | None = None) -> dict:
    root = Path(root).resolve()
    try:
        revision = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=root, text=True, stderr=subprocess.DEVNULL
        ).strip()
    except (subprocess.CalledProcessError, FileNotFoundError) as error:
        if last_updated_iso is None:
            raise RuntimeError("A real Git revision is required for footer timestamp") from error
        revision = "local-explicit-preview"
    if last_updated_iso is None:
        last_updated_iso = subprocess.check_output(
            ["git", "show", "-s", "--format=%cI", "HEAD"], cwd=root, text=True
        ).strip()
    parsed = datetime.datetime.fromisoformat(last_updated_iso.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Revision timestamp must have a timezone offset")
    thai = parsed.astimezone(ZoneInfo("Asia/Bangkok"))
    human = (f"{thai.day} {MONTHS_TH[thai.month]} "
             f"{thai.year + 543} เวลา {thai.hour:02}:{thai.minute:02} น.")
    return {
        "source_revision_sha": revision,
        "source_last_modified_iso": parsed.isoformat(),
        "source_last_modified_bangkok": thai.isoformat(),
        "footer_text": "ปรับปรุงล่าสุด " + human,
        "timezone": "Asia/Bangkok",
        "timestamp_origin": "git_commit" if last_updated_iso is not None and revision != "local-explicit-preview" else "explicit_preview",
    }


def apply_revision_footer(doc: fitz.Document, font: Path, out: Path, stamp: dict) -> int:
    """Add an extra bottom line below existing native footers, no text rewrites."""
    label = stamp["footer_text"]
    from html import escape
    # Absolute positioning in the lowest 14pt outside the native footers;
    # the PR82 original footer text ends around 822pt on A4 (842pt).
    uri = Path(font).resolve().as_uri()
    html_doc = f"""<!doctype html><html lang="th"><head><meta charset="utf-8">
    <style>
      @font-face{{font-family:RevisionThai;src:url('{uri}');font-weight:400}}
      @page{{size:A4;margin:0}}
      html,body{{margin:0;padding:0;background:transparent}}
      .last-revision{{position:absolute;top:291.55mm;left:82mm;width:117mm;
        font:6.2pt/1.3 RevisionThai,sans-serif;text-align:right;letter-spacing:0;
        color:#57677a}}
    </style></head>
    <body><div class="last-revision">{escape(label)}</div></body></html>"""
    overlay_path = Path(out) / "v42-revision-footer-overlay.pdf"
    HTML(string=html_doc, base_url=str(out)).write_pdf(overlay_path)
    overlay = fitz.open(overlay_path)
    try:
        if len(overlay) != 1:
            raise ValueError("Revision footer must occupy exactly one A4 overlay page")
        for page in doc:
            if not (abs(page.rect.width - overlay[0].rect.width) < 1.5
                    and abs(page.rect.height - overlay[0].rect.height) < 1.5):
                raise ValueError("Footer refuses non-A4 booklet page")
            page.show_pdf_page(page.rect, overlay, 0, overlay=True)
        return len(doc)
    finally:
        overlay.close()

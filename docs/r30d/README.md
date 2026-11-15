# R30-D PDF row typography repair (DRAFT)

Reproducible PDF patch and regression check; leaves all source PDFs unmodified.

```bash
python scripts/r30d/repair_row.py --before /path/R30B.pdf --current /path/R30C.pdf --output /path/R30D.pdf
python scripts/r30d/verify_row.py --before /path/R30B.pdf --current /path/R30C.pdf --after /path/R30D.pdf --report /path/QA_REPORT.json
```

Dependencies: PyMuPDF, WeasyPrint 68, Pillow, and Thai fonts installed via system packages. Do not upload or redistribute font binary files.

See `docs/r30d/PLAN_ROW_STYLE_FIELD_PRESERVATION_20261115.md` and `docs/r30d/QA_REPORT.md`. All outputs are draft-only and must be organizer-accepted before release.

# R11C-V4 — Full draft builder (Phase 3 candidate, not publication)

6 November 2026 — This branch creates the **entire V4 draft** directly from the current approved-vs-draft data separation. Do not treat it as an official signed committee order or confirmed competition schedule.

Inputs: `data/program-from-pdf-2569-20261104-draft.json`, `data/committee-2569-draft-public-review.json`, `assets/souvenir-committee-2569-v3.pdf`. The original program source (237 records) is immutable, and the women's football duplicate is excluded for the print projection (236 total).

Build command: `python scripts/docs/build-v4-full.py --root . --out build/v4-review`. Requires Python 3.11+, WeasyPrint, PyMuPDF and Noto Sans Thai.

Outputs: searchable A4 PDF, HTML draft, SHA/count QA, and a source-ID to real-PDF-page map covering **236 program entries + 250 committee entries = 486 anchors**. The generated file includes a 17-page annex of original V3 bracket/rule pages for reference only. This appendix is explicitly labelled as DRAFT and may retain obsolete printed schedules; the main V4 tables contain the accepted women's football date correction.

Current hard gates: 64-page source revision hash, 237 source / 236 print events, 186 matches, 50 athletics events / 289 lanes, 45 fixtures with both date and time confirmed, and 250 public draft committee rows. The content may remain draft even when these structural gates pass.

The workflow uploads an artifact for human review **without changing the live GitHub Pages viewer or replacing either V2/V3 PDF**. Review is a release gate only; formatting approval has been waived by the organizer for proceeding with this full draft. Later R11E publication requires factual approval and real device/print checks.

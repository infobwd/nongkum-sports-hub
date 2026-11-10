# R26 PDF bracket pilot — source-referenced generation scripts (review only)

The scripts here archive the *exact Python layout logic* used for the design pilots attached to PR #134. They are **reference source snapshots**, not a production build job or CI test.

- `build_r26c.py`: redesigned page 10 volleyball and page 15 petanque.
- `build_r26d.py`: continued from R26-C by redesigning page 16 petanque, page 19 table tennis and page 21 tug-of-war.

## Requirements and source provenance
Run with Python 3, PyMuPDF (`fitz`), WeasyPrint and Pillow, plus **Noto Sans Thai** system fonts. The snapshots use the working-area path `/mnt/data` and must be adapted to a local working directory before running elsewhere; **do not assume they're portable**.

Inputs required:
- `/mnt/data/ร่าง - สูจิบัตรกีฬากลุ่ม ปี 2569_V2.pdf`, 41 pages, sha256 `1cd0d0166fe202b2b69e18f5ec2e1c2d80439386767a1826bf21d7d5da9e0bbf`. The audited unmodified source is also archived in `assets/souvenir-2569-v2.pdf`.
- `/mnt/data/MittraphapGames_2569_V2_41pages_R26_DesignV2_REVIEW_ONLY_20261110.pdf`, the R26 base prepared in the conversation and [kept on Drive](https://drive.google.com/file/d/1Nnplm-fB2FXDjvzGJ6rsoyyWQ1ZpFshp/view).
- `/mnt/data/MittraphapGames_2569_R26C_V2_41pages_NewBracketPilot_10_15_REVIEW_ONLY.pdf` for R26D, SHA `20adcb54a2f6d41ead0e951d80bf74a99a029f265ed05bd780c6b8944a669e95`, [on Drive](https://drive.google.com/file/d/1z0ZG9Aah0_cNiZcQl56iDCqE9LdyvQQI/view).
- R26D reads `build_r26c.py` from the same work directory for common visual CSS. Save both scripts together as in the original execution, and set the desired working paths.

The published PDFs on Drive are the **review artifacts**; GitHub source is the reference plan/QA. These scripts do **not** overwrite public V2 or regenerate approved official schedules.

## Critical source discrepancy
V2 page 21, tug-of-war 12-year-old girls has **seven named slots**, not eight (L1–L4, R5–R7). The R26D output displays R8 as **“ไม่ปรากฏทีมในต้นฉบับ”**; do not infer a bye or supply an additional team without organizer confirmation.

## QA / next work
See `docs/R26D_BRACKET_REDESIGN_FIXED41_P16_P19_P21_QA_20261110.md`. To continue on pages 8/9/12/14 and 1–6, use source-backed extraction and page replacement without changing the 41-page count. A revised PDF requires a new SHA, audit trail and coordinate map before becoming the website's canonical V2 reader.

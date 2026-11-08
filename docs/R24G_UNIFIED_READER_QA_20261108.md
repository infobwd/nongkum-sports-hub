# R24-G — ผลตรวจโค้ดและ QA ตัวอ่าน 155 หน้าแบบ V2/V3

วันที่ 8 พฤศจิกายน 2569

## หลักฐานการทำงานจริง
- ฐาน main ก่อนเริ่ม: `608af45f5f4ef330bb985b144188253b1c43a427` (R24-F Merge แล้ว)
- แผนบันทึกก่อนลงโค้ด: `docs/R24G_UNIFIED_PERMISSIONED_PDF_READER_PLAN_20261108.md`, commit `1b254d93902df02986d7df61a0f2213fc383a662`
- PR พัฒนา: https://github.com/infobwd/nongkum-sports-hub/pull/126 (Draft; ยังไม่ Merge)
- head ที่ CI ผ่านก่อนเอกสาร QA นี้: `2e83d30893a2d62bef177e29b56a8b71f142face`

## Automated QA — 7/7 PASS
| ชุด | ผล | หลักฐาน |
|---|---|---|
| R24-G Unified Reader | PASS | https://github.com/infobwd/nongkum-sports-hub/actions/runs/42436386835 |
| R24-F Direct Drive Preview | PASS | https://github.com/infobwd/nongkum-sports-hub/actions/runs/42436386823 |
| R24-C Private Deep Links | PASS | https://github.com/infobwd/nongkum-sports-hub/actions/runs/42436386776 |
| R24-D Read-only Comparison | PASS | https://github.com/infobwd/nongkum-sports-hub/actions/runs/42436386609 |
| R24-A/B 3-edition Catalog | PASS | https://github.com/infobwd/nongkum-sports-hub/actions/runs/42436386608 |
| Validate Draft Data | PASS | https://github.com/infobwd/nongkum-sports-hub/actions/runs/42436386626 |
| R14 Field Ready | PASS | https://github.com/infobwd/nongkum-sports-hub/actions/runs/42436386580 |

## Scope tested
- PDF 155 หน้า, หน้า 1/99/100/155, reject out-of-range/invalid
- Source PDF `a2a9f47f8bf871403c3995e6b4ebd102802e600fc20c16198eb12ab73b12e89d`; wrong SHA fails closed, no public PDF bytes published
- Private map structurally 486 records, reject synthetic wrong digest; protected query fixture/entry
- Source V2 41 / V3 64 / 236 fixtures / 250 committee / 486 anchors unchanged; no results/standings changes
- Browser rendering implementation retains Drive preview fallback and local PDF reading path; no need to expose the Drive PDF publicly

## Pending — not accepted yet
1. **AUTH CONFIGURATION:** `data/booklet-oauth-config.json` still `enabled:false`, `client_id:null`. Real Google OAuth Web Client ID, consent screen verification, authorized origin and read/download permission required. Without this, Google Drive iframe fallback still works, and custom UI works with local PDF only.
2. **REAL PDF / BROWSER:** No evidence of loading real 155-page PDF in custom PDF.js on physical Safari/LINE/Android and checking actual rendering/page/zoom with real accounts. Automated structural and unit CI is not a substitute.
3. **PUBLICATION:** 155 page PDF remains `draft_review_not_approved`; R11E official release and image/child rights not approved. Do not change Google Drive sharing to anyone.
4. **PARALLEL PR:** #124 R24-E1 remains Draft. It modifies separate `js/pdf-viewer.js` and `js/booklet-private-viewer.js`. Before merge, reconcile its browser assertions with catalog changed by R24-F (notably first link of 155-page card).
5. **MERGE:** PR #126 is Draft; do not merge until organizer explicitly authorizes. No GitHub Pages deployment or device acceptance evidenced for R24-G.

## Status
PLAN RECORDED → DEVELOPED → AUTOMATED CI PASS; pending MERGED, DEPLOYED, AUTH CONFIGURED, DEVICE ACCEPTED, OFFICIAL RELEASE APPROVED.

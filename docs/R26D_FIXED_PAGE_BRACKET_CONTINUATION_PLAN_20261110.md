# R26-D — ผังสายหน้า 16 / 19 / 21 และสำรวจหน้าผังส่วนอื่น โดยคง 41 หน้า

วันที่ 10 พฤศจิกายน 2569 • สถานะเริ่ม **PLAN LOCK / IMPLEMENTATION PENDING**

## ต้นทางและเงื่อนไขเดิม
- V2 ต้นฉบับ 41 หน้า [Drive](https://drive.google.com/file/d/1zMxnF99lJHTQ8zgCH1QUs5rB9Uf8O4IO/view), SHA-256 `1cd0d0166fe202b2b69e18f5ec2e1c2d80439386767a1826bf21d7d5da9e0bbf`.
- R26-C ฉบับตรวจร่าง 41 หน้า ผังหน้า **10 วอลเลย์บอล** และ **15 เปตอง** ทำต้นแบบแล้ว: [Drive R26-C](https://drive.google.com/file/d/1z0ZG9Aah0_cNiZcQl56iDCqE9LdyvQQI/view); PR #134 ยังคงเป็นร่าง.
- R26C code/local original and base PDF must be retained; change only pages **16, 19, 21** in phase R26-D. Do not change web, `assets/souvenir-2569-v2.pdf`, V2 map 236, official scores, or Google Sheets.
- One page-in → one page-out; PDF 41 หน้า A4, bookmark count and embedded source PDF preserved, 38 pages others remain text-identical to R26-C.

## Crosswalk from the actual original PDF

| Page | Sport | Bracket type | Original slot counts |
|---|---|---|---|
| 16 | เปตอง 12 ปีชาย/หญิง | Knockout 8 per category | 8 + 8 |
| 16 | เปตองมัธยมชาย/หญิง | One direct pairing each | 2 + 2 |
| 19 | เทเบิลเทนนิสประถมชาย/หญิง | Knockout 8 per category | 8 + 8 |
| 19 | เทเบิลเทนนิสมัธยมชาย/หญิง | One direct pairing each | 2 + 2 |
| 21 | ชักเย่อปฐมวัย | Knockout 8 | 8 |
| 21 | ชักเย่อ 12 ปีชาย | Knockout 8 | 8 |
| 21 | ชักเย่อ 12 ปีหญิง | **7 source slots**, not 8 | **7**; source right slot number 8 is absent — do not add a school or invent a bye outcome |
| 21 | ชักเย่อมัธยมชาย/หญิง | One direct pairing each | 2 + 2 |

The original source PDF is authoritative for school labels/order, with source coordinates and text used as evidence. A source missing slot is displayed as **“— รอตรวจต้นฉบับ”** or empty (not a fabricated school, fixture, or winner).

## Implementation and QA
1. Extract `([1-8]).<school>` tokens from original text blocks using page-specific y-bands and left/right x split. Assert exact per-page slot keys and counts.
2. Reuse R26-C navy/gold/ivory styled HTML/CSS for symmetric 8-team tournament cards and direct-match cards. Distinguish group/no-bye/missing position; never populate results.
3. Page 21 dense with 3 knockout + 2 direct: use compact card heights tuned for A4 legibility without clipping/overflow or page break. Show note about source slot count.
4. Compose into R26C PDF 41 pages, replacing only pages 16,19,21; preserve 13 bookmarks and original V2 embedded evidence bytes.
5. Verify 38 unchanged pages, name and slot parity, 41 A4 pages, text bounds; visually inspect page images and preview. Document any limitations.
6. Save standalone 3-page pilot and full 41-page review PDF with versioned names; upload new files to Drive (do not overwrite originals); update PR #134 QA doc.
7. Inventory other bracket/source pages 1–6,7–9,12,14: classify group/pair vs knockout, fit within same page or schedule follow-up. Do not infer fully implemented if not.
8. No merge/website replacement until explicit organizer authorization and 236 source-highlights remapped if switching canonical viewer.

# R15-B/C — หลักฐานกติกา, Pure Standings Engine, JSON Release Gate และตรวจรับ

**5 พฤศจิกายน 2569 · โครงการมิตรภาพเกม 2569 · สถานะ: โค้ดพร้อมทดสอบ / กติกาสำหรับเผยแพร่อันดับยังรอกรรมการอนุมัติ**

## ขอบเขตและหลักฐานที่อ่าน

1. [แผน R15](R15_RESULTS_STANDINGS_PHOTO_JSON_PLAN.md), [R15-A](R15A_STANDINGS_UI_QA.md), [R1–R3](RESULTS_IMPLEMENTATION_R1_R3.md), [SOURCE QA](SOURCE_QA_2569.md)
2. \`data/program-from-pdf-2569-20261104-draft.json\` 237 รายการ (ฟุตบอล 21, ยิงจุดโทษ 7, ฟุตซอล 14, วอลเลย์บอล 20, ตะกร้อ 29, เปตอง 58, เทเบิลเทนนิส 16, ชักเย่อ 22, กรีฑา 50)
3. Google Drive: **ร่าง - สูจิบัตรกีฬากลุ่ม ปี 2569_V2.pdf** และ Google Docs ฉบับทำงาน R11C (ทั้งคู่ยังไม่ใช่หลักฐานมติอนุมัติกติกาอย่างเป็นทางการ)
4. รหัสอ้างอิงไฟล์ PDF เดิมใน candidate JSON: \`metadata.source_sha256\` — ตรวจตรงกับ \`data/standings-rules.json.source.candidate_source_sha256\`. ห้ามแก้ PDF ต้นฉบับหรือ candidate เพียงเพื่อให้ผ่าน engine

> **ข้อขัดกัน:** V2 ระบุฟุตบอล 12 ปีชายอันดับ 1–4 เข้ารอบรอง แต่ Google Docs ฉบับทำงานอีกชุดยังมีข้อความอันดับ 1–2 เข้าชิงโดยตรง; และมีคู่ชิงฟุตบอลหญิงซ้ำในข้อมูลเดิม. ต้องให้ผู้จัดรับรองต้นฉบับก่อนใช้ qualification/final placements.

## เกณฑ์สองประเภทที่ต้องแยก

**(ก) กติกาประเภทกีฬา / อันดับภายในรายการ:** ผลชนะ เสมอ แพ้ ลูกได้–เสีย คะแนนฟุตบอลต่อคู่, คะแนนรายเซ็ต, สายการแข่งขัน, ผลรอบรอง/รอบชิง, กติกาตัดสินกรณีแต้มเท่ากัน — ขึ้นกับประเภท/รุ่น/phase

**(ข) คะแนนรวมชิงถ้วยรางวัล:** หน้าแรกของ PDF V2 เขียนลำดับ 1 = 5, 2 = 3, 3 = 2 สำหรับประเภททีมและบุคคล เป็น **เกณฑ์ที่พบในร่าง** ไม่ใช่การให้ 5/3/2 ต่อผลฟุตบอลแต่ละนัด และยังไม่มีคำตอบครบเรื่องเสมอ, อันดับ 3 ไม่ได้ชิง, รายการไม่ครบทีม, ยกเลิก, หลายทีมโรงเรียนเดียวกัน จึงเก็บไว้ \`overall_award.status=pending_rule_approval\` **ไม่คิดคะแนนรวม**.

## ฟุตบอล 12 ปีชาย — explicit phase map

- PDF หน้า 7: 6 ทีม = 15 คู่พบกันหมด (source match no. 1–6 และ 8–16); 15 คู่ไม่ซ้ำกันตามคู่โรงเรียน ครบทุกคู่ของ 6 ทีม
- คู่ **17–18**: ทีมคะแนนอันดับ 1 พบ 4 และอันดับ 2 พบ 3 เป็น **playoff/semifinal** แม้ \`round\` ใน JSON ยังระบุ “พบกันหมด”
- คู่ **19**: ผู้ชนะคู่ 17 พบผู้ชนะคู่ 18 รอบชิง
- เป็นแผน mapping ชั้นกฎ **ไม่แก้ source PDF หรือ candidate fixture**
- ค่าที่เตรียมไว้ตามโจทย์ R15-B: **ชนะ 3, เสมอ 1, แพ้ 0**; goals for / against / goal_difference = ได้ − เสีย; **ยังไม่มีหลักฐานที่อนุมัติชัดว่าเมื่อคะแนนเท่ากันเรียงด้วยผลต่าง, ประตูได้, เฮดทูเฮด หรือจับสลากอย่างไร** จึง \`tie_break_status=pending_rule_approval\`, ไม่มีอันดับตัดสินจากกรณีนี้
- ทีมยังไม่แข่ง: แสดงรายชื่อ 6 ทีมและสถิติศูนย์ใน UI โดยใส่ \`—\` ในช่องอันดับ พร้อมแสดงว่า “ยังไม่จัดอันดับ”. **ไม่ถือว่าอันดับ 1–6**

## สถานะรายชนิดกีฬา

| กีฬา | สถานะกฎ | ตรวจพบในหลักฐาน / งานค้าง |
|---|---|---|
| ฟุตบอล | \`pending_rule_approval\` (engine arithmetic implemented) | ลีก 15 คู่ตรวจ mapping แล้ว; playoff 2 + final 1 แยกชัด; ขาด tie-break / กติกาได้อันดับ / ฟุตบอลมัธยมมีรอบชิงหญิงซ้ำ |
| ยิงจุดโทษ | \`needs_source_mapping\` | ไม่พบกติกาชี้ขาดเมื่อผลเสมอหลังจำนวนครั้งยิง, การเรียงรอบและ winner-by-attempt |
| ฟุตซอล | \`pending_rule_approval\` | ใน V2 ระบุแบ่งสาย/อันดับ 1–2 เข้ารอบรอง; ขาดแต้มแบ่งสาย, tie-break, mapping การไขว้และกติกาตัดสินรอบแพ้คัดออก |
| วอลเลย์บอล | \`needs_source_mapping\` | V2 ระบุแบ่งสาย แต่ source QA มีคู่ชิงโยงผู้ชนะผิดเพศ; ต้องตรวจ sets, รอบ และ tie-break |
| เซปักตะกร้อ | \`needs_source_mapping\` | source QA พบคู่ 24 เพศไม่ตรงบริบท; ยังไม่อนุมัติ sets และกติกาแบ่งสาย |
| เปตอง | \`pending_rule_approval\` | **พบกติกาแล้ว:** อนุบาลคัดเลือก/รอง/ชิง 1 เซ็ต 11 แต้ม; ประถมคัดเลือก/รอง 1 เซ็ต 11 แต้ม, ชิงชนะเลิศ 2 ใน 3 เซ็ต เซ็ตละ 11; มัธยมชิง 2 ใน 3 เซ็ต. ข้อมูลยังเป็นร่าง รวมทั้งมีคู่ 10 ปีชายต้องตรวจผังและวันเวลา |
| เทเบิลเทนนิส | \`pending_rule_approval\` | ยังขาดจำนวนเซ็ต / คะแนนต่อเซ็ต / วิธีตัดสินรอบปลายทาง |
| ชักเย่อ | \`pending_rule_approval\` | ใช้ผลชนะ–แพ้ แต่ยังขาดเงื่อนไขชิงที่ 3, รอบ/สาย และการชี้ขาด |
| กรีฑา | \`needs_source_mapping\` | 50 event records; เลขหัวข้อ 35 และ 48 ซ้ำข้ามเพศ; ต้องรับรอง event_id, การยกเลิก, จำนวนผู้เข้าและการจัดอันดับเสมอ |

**หมายเหตุ:** \`implemented\` หมายถึงโค้ดสูตรคำนวณใช้ได้ใน synthetic tests; ไม่ใช่การอนุมัติกติกาเป็นทางการ. \`data/standings-rules.json\` คง publication gate ทุกประเภทเป็น pending หรือ needs mapping.

## สัญญาผลที่เผยแพร่ได้

ใช้ \`data/public-results.json\` schema_version 1, \`metadata.approved_only=true\`, \`publication_status=empty/published\`, \`approved_results_count\` ตรงจำนวนรายการ และ **ทุกผล status=approved**. ประเภทผลถูกบังคับตามชนิดกีฬา:

- \`score\`: ฟุตบอล/ฟุตซอล/ยิงจุดโทษ — score_a/b จำนวนเต็มไม่ลบ, ผู้ชนะตรงคะแนน, ผลเสมอไม่ใส่ผู้ชนะ
- \`sets\`: เปตอง/วอลเลย์บอล/ตะกร้อ/เทเบิลเทนนิส — แต้มเซ็ตจำนวนเต็มไม่ลบ, เซ็ตไม่เสมอ, จำนวนเซ็ตที่ชนะต้องสอดคล้อง winner
- \`win_loss\`: ชักเย่อ — winner ต้องอยู่ในสองทีม
- \`ranking\`: กรีฑา — รหัส event ตรงต้นฉบับ, \`event_complete=true\`, rank/โรงเรียนไม่ซ้ำ, ไม่มีข้อมูลนักกีฬาส่วนบุคคล

ผลรายคู่ต้องมี \`fixture_id\` ตรงกับ candidate, \`sport_id\`/ \`division\` / \`team_a_id\` / \`team_b_id\` **ตรงกันและลำดับเดิม**; fixture แบบ placeholder (ผู้ชนะคู่..., ทีมอันดับ...) **ห้ามเผยแพร่** จนสร้าง mapping อ้างมติและทีมจริงที่ตรวจรับ. ผลแต่ละรายการมี \`id\` ไม่ซ้ำ และ \`revision\` จำนวนเต็ม ≥ 1. การแก้ผลที่เผยแพร่แล้วต้องเพิ่ม revision พร้อม \`metadata.corrections\` ระบุ \`result_id/from_revision/to_revision/reason\`; การถอนต้องมี \`metadata.withdrawals\`. ห้ามเผยแพร่ชื่อเด็ก, evidence link ส่วนตัว, รายละเอียดผู้อนุมัติหรืออีเมลใน JSON.

**ข้อส่งต่อ R15-D:** \`apps-script/Results.gs\` ในทางเลือก Sheet R3 เดิมยังต้องส่งออก \`revision\` และข้อมูล \`event_complete\` ให้ตรง validator; ให้ปรับตัวส่งออกในสาย intake โดยรักษาประวัติ/การรับรองไว้ใน Drive ส่วนตัว และใช้ validator ก่อน PR. **ไม่แก้ไฟล์ Apps Script ใน R15-B/C** เพื่อหลีกเลี่ยงชนงานขนาน.

## Engine / snapshot / CI

- \`js/standings-engine.js\` pure functions: \`assertFootballPhaseMapping\`, \`calculateLeague\`, \`calculateKnockout\`, \`calculateRankingEvent\`, \`canonical\`.
- \`scripts/results/standings-validation.mjs\`: \`validatePublication\`, \`buildSnapshot\`, \`validateSnapshot\`, \`digest\`.
- \`node scripts/results/validate-publication.mjs\` ตรวจผล, ID, schema, revision, sport, source SHA, mapping; CI แบบ pull_request ใช้ baseline \`origin/main\` สำหรับตรวจการแก้ผล/ถอนผลไม่ให้เงียบ
- \`node scripts/results/build-standings.mjs --check\`: ตรวจ public snapshot เทียบ canonical sha256 digest ของผลและกติกา + \`rules_version\`. **ถ้ากติกายังไม่มี approved ห้ามเขียน \`data/public-standings.json\`; ไม่มี snapshot ก็ผ่าน gate ได้แบบ fail-closed**
- \`node scripts/results/build-standings.mjs --write\`: เขียน derived-only snapshot ได้เฉพาะเมื่อมี rule รับรองครบ; ห้ามแก้ snapshot เอง
- \`standings.html\`: ก่อนแข่งดูรายชื่อทีมฟุตบอล 12 ปีชาย 6 ทีม สถิติศูนย์ แต่ไม่แสดงอันดับ. หลังมี approved standings จะแสดงจาก snapshot ที่ browser ตรวจ SHA-256 ของผลและ rules version/digest ไม่ตรงต้องซ่อน.
- \`.github/workflows/r15bc-standings.yml\`: ทดสอบ synthetic, validator, snapshot check, R15-A/results/mobile regression; \`validate.yml\` ของเดิมไม่ถูกลบ
- **ไม่มีการเพิ่มผลคะแนนจริง/ผลปลอมหรือ public standings snapshot ใน PR นี้**.

## Synthetic tests

\`node scripts/results/test-standings-r15bc.mjs\` ครอบคลุม:
- 6 ทีม/15 league/2 semifinal/1 final, ลีกไม่ซ้ำ และเจอ placeholder ในลีกต้อง fail
- zero-state ไม่มี rank; ชนะ 3 เสมอ 1 แพ้ 0; ลูกได้–เสีย/ผลต่าง; ผลไม่ครบยัง provisional/pending
- ไม่เอารอบแพ้คัดออกมาคิด league; knockout ไม่มีการสร้างอันดับ 1–3 เอง
- negative/noninteger score, winner ผิด, draw มี winner, ทีมผิด fixture, id ซ้ำ, revision ผิด, sport/type ผิด, status review, event ranking partial/duplicate
- correction/withdrawal audit และ snapshot stale/rules-version mismatch

## คำถามที่ต้องให้คณะกรรมการตอบก่อนเปิดอันดับทางการ

1. ฟุตบอล 12 ปีชาย: คะแนนลีก 3/1/0 และ tie-break เรียงลำดับอะไร? หากเสมอทุกเงื่อนไขทำอย่างไร? ขาด/ถอนตัวคิดอย่างไร?
2. ฟุตบอล V2 top 4 semifinal ถูกต้องใช่หรือไม่? ฟุตบอลหญิงที่มีคู่ชิงซ้ำและฟุตบอลมัธยมให้แก้ mapping อะไร?
3. ฟุตซอล/วอลเลย์บอล/ตะกร้อแบ่งสาย: กติกาคะแนนชนะ, จัดอันดับในสาย, ไขว้คู่, จำนวนเซ็ตและวิธีชี้ขาด?
4. เปตอง: ยืนยันรายละเอียดอนุบาล/ประถม/มัธยมจาก V2, เงื่อนไขจบเซ็ต และคู่ 10 ปีชายที่ซ้ำ?
5. เทเบิลเทนนิส/ยิงจุดโทษ/ชักเย่อ: จำนวนแต้ม/เซ็ต/ครั้งยิง/เกณฑ์ชี้ขาด, รอบชิงที่ 3?
6. กรีฑา: ยืนยัน event IDs ที่ซ้ำ, การจัดอันดับร่วมและการนับรายการที่ไม่มีผู้เข้า?
7. คะแนนรวม 5/3/2: ชิงอันดับ 3 หรือแบ่งอันดับ 3 ร่วม, โรงเรียนส่งหลายทีม, รายการยกเลิก/เหลือเพียง 2 ทีม, tie-break ถ้วยรวม?

หลังได้รับหลักฐานมติ อัปเดต \`rules_version\` + source decision reference + policy \`approval_status\`, เพิ่ม test ของกฎนั้น, สร้าง snapshot จาก approved results และผ่าน CI/PR ก่อนเผยแพร่. ห้ามยกระดับ status จากร่างเพียงเพราะฟังก์ชันทดสอบผ่าน.


## บันทึกเพิ่มเติม 6 พฤศจิกายน 2569 — ฟุตบอล tie-break Head-to-Head

กติกา **คะแนนเท่ากันใช้ผลต่างประตูได้–เสียจากการพบกันเอง** ได้รับข้อกำหนดจากผู้จัดแล้ว อ่านรายละเอียดที่ [R15BC_FOOTBALL_HEAD_TO_HEAD_GD_20261106.md](R15BC_FOOTBALL_HEAD_TO_HEAD_GD_20261106.md).

- ปรับ rulebook เป็น `r15-bc.2-h2h-gd`; `tie_break_status=approved` เฉพาะเกณฑ์ H2H GD นี้และระบุ `tie_break_source` ย้อนตรวจได้
- สองทีมแต้มเท่า: ผลต่างประตูจากนัดที่พบกัน; สามทีมขึ้นไปแต้มเท่า: mini-table เฉพาะการแข่งขันระหว่างทีมในกลุ่มนั้น
- ถ้าการพบกันในกลุ่มยังไม่ครบหรือ H2H GD เท่ากันอีก: **ไม่จัดอันดับตัดสิน** (`position=null`) และรอเกณฑ์ถัดไป; ไม่อนุมานผลจากประตูได้–เสียรวมทั้งหมด
- ยังคง `football_league.approval_status=pending_rule_approval` / `qualification_status=pending_rule_approval` / `sport_policies.football.status=pending_rule_approval` เพราะเงื่อนไขเข้ารอบและกรณีเสมอซ้ำยังไม่ผ่านรับรอง
- Synthetic tests ตรวจ 2 ทีม H2H สวนทาง GD รวม, 3 ทีม mini-table, H2H ยังไม่ครบ, H2H เสมอกัน, fail-closed invalid configuration และไม่มีผลจริง

> ข้อความเดิมในเอกสารนี้ที่ว่า tie-break ยังไม่ได้รับรอง เป็นสถานะ **ณ 5 พฤศจิกายน 2569**; ให้ถือบันทึก 6 พฤศจิกายนนี้เป็นสถานะล่าสุดสำหรับ **เฉพาะกติกา H2H GD** ไม่ใช่การอนุญาตให้เผยแพร่อันดับทุกกรณี.


## ข้อกำหนดเพิ่มเติม 6 พฤศจิกายน 2569 — ใบเหลือง/ใบแดง และเปตองแพ้คัดออก

ดูแผนก่อนลงโค้ดที่ [R15BC_CARDS_PETANQUE_KNOCKOUT_20261106.md](R15BC_CARDS_PETANQUE_KNOCKOUT_20261106.md).

- ฟุตบอล: ผู้จัดระบุ **นับใบเหลืองและใบแดงหลังเกณฑ์ H2H**; ระบบบังคับผลฟุตบอล approved ระบุยอดต่อทีมใน `disciplinary_cards.team_a/team_b.yellow/red` จำนวนเต็มไม่ลบ รวมเป็นยอด `yellow_cards`/`red_cards` เฉพาะลีก. ถ้าไม่กรอก **ไม่อนุมานเป็น 0**. ผู้จัดยังไม่ยืนยันวิธีเปรียบเทียบ/ให้น้ำหนัก/ขอบเขตการนับ จึงเก็บ `disciplinary_tie_break.ranking_method=pending_organizer_confirmation` และไม่ตัดสินกรณีที่ H2H GD ยังเสมอ
- เปตอง: ยืนยัน **single-elimination ทุก 58 คู่** (8 สายที่มี 4 รอบแรก+2 รอง+1 ชิง, 2 สายชิงโดยตรง); ผู้ชนะผ่าน ผู้แพ้ตกรอบ; ไม่มีตารางคะแนนพบกันหมด. Pure engine ตรวจผลเป็นเซ็ตและคืนทีมชนะ/แพ้โดยไม่อนุมานคู่ถัดไปหรืออันดับสามจาก placeholder. ยอดเซ็ตตาม PDF V2 ยังรอรับรองเป็นรายการย่อย
- Rule version เปลี่ยนเป็น `r15-bc.3-cards-petanque`, ไม่แก้ผลจริง, ไม่ปลด gate คำรับรองกติกาหรือ public snapshot โดยพลการ
- CI เพิ่มทดสอบบัตร missing/invalid/แก้หลังประกาศ, H2H tie ยัง unresolved, เปตองผลแพ้คัดออกและ fixture placeholder


## บันทึก 6 พ.ย. 2569 — รับรองฟุตบอลใบแดงน้อยกว่าก่อนใบเหลือง
อ้าง [R15BC_FOOTBALL_RED_THEN_YELLOW_20261106.md](R15BC_FOOTBALL_RED_THEN_YELLOW_20261106.md): ลำดับ tie-break ฉบับล่าสุด **H2H GD → ใบแดงน้อยกว่า → ใบเหลืองน้อยกว่า** โดยไม่มีสูตรคะแนนถ่วงน้ำหนัก. ใช้บัตรจากเกมลีกที่ approved ครบ 15 นัดเท่านั้นก่อนนำมาตัดอันดับ. หากบัตรยังเท่ากัน `position=null`; ข้อมูลไม่ครบไม่ถือว่าเป็น 0. กติกาเข้ารอบรอง/ชิงและ status ระดับกีฬายังคง pending ไม่ออกอันดับสาธารณะก่อนอนุมัติทั้งหมด. `rules_version=r15-bc.4-red-then-yellow`; CI เพิ่ม synthetic test ลีกครบ 15 นัด, red precedence, yellow secondary, incomplete, equal-card unresolved, validator rejection of wrong config.

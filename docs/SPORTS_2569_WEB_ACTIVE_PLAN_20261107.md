# มิตรภาพเกมส์ 2569 — แผนงานเว็บไซต์ที่ใช้งานอยู่ (7 พฤศจิกายน 2569)

> **CURRENT WEB PLAN — อ่านฉบับนี้ก่อนเอกสาร snapshot เก่า**  
> Repository: `infobwd/nongkum-sports-hub` · ฐานตรวจ: `main` วันที่ **7 พ.ย. 2569** และ PR ที่ Merge ถึงอย่างน้อย **#100** รวม R21 **#74** / R22 **#76**; ตรวจ PR/main อีกครั้งเมื่อจะลงมือ  
> ขอบเขต: เว็บไซต์ตารางแข่ง/ตรวจสูจิบัตร/กรรมการ/ผล/อันดับ และส่วนเชื่อมข้อมูลสำหรับวันแข่งขัน ไม่ใช่แผนจัดหน้าเล่มสูจิบัตร V4.2  
> **หลักการ:** MERGED ≠ DEPLOYED ≠ DEVICE ACCEPTED ≠ APPROVED. ถ้าไม่มีหลักฐานการตรวจรับ ให้ระบุว่า **ยังไม่ยืนยัน** ไม่ยกเป็น PASS

## 1. ข้อเท็จจริงบน main ที่ต้องรักษา

| หัวข้อ | สิ่งที่ตรวจจากไฟล์/PR | ข้อจำกัด |
|---|---|---|
| ขนาดชุดข้อมูล | `data/program-from-pdf-2569-20261104-draft.json` เก็บ **237** รายการเพื่อเป็นหลักฐานถอดสูจิบัตร; เว็บใช้ `js/program-corrections.js` ตัด **ฟุตบอลมัธยมหญิงรอบชิงที่ซ้ำในวันที่ 20 พ.ย.** จึงแสดง **236 รายการ** (วันชิงที่ยืนยันคือ **18 พ.ย. 2569**) | ห้ามลบหลักฐาน raw / นับ 237 ว่าเป็นจำนวนคู่ที่ใช้แข่ง / สลับไปใช้ raw ตรง ๆ; [R20-B QA](R20B_SHEETS_RESULT_ENTRY_FOOTBALL_FINAL_QA_20261106.md), [PR #59](https://github.com/infobwd/nongkum-sports-hub/pull/59) |
| ข้อมูลยืนยัน | ข้อมูลต้นทางมี **45** รายการที่ยืนยันวัน–เวลา–สถานที่ตามหลักฐาน: เปตอง 12–13 พ.ย. 24 รายการ + กลุ่มที่รับรอง 16 พ.ย. 21 รายการ; สถานที่หลักทุกกีฬา **โรงเรียนบ้านหนองกระทุ่ม** | หลังคัดคู่ซ้ำ เว็บใช้งาน 236 รายการ; **อีก 191 รายการไม่ควรเรียกว่าได้รับรองครบวัน–เวลา**. เวลา/คอร์ต/สนามย่อย/หน้าที่รายคนต้องตรวจแยก; ห้ามเติมเวลาที่ไม่ทราบ |
| ผลแข่งขันจริง | `data/public-results.json`: `approved_only=true`, `results=[]`, เผยแพร่ **0** ผล | หน้า `results.html` ว่างถูกต้องก่อนมีผลที่รับรอง; ห้ามใส่คะแนนสาธิตใน public |
| ตารางคะแนน | `standings.html`, `js/standings-engine.js`, `data/standings-rules.json` และเครื่องมือตรวจ/คำนวณอยู่แล้ว | กติกาบางส่วนยัง `pending_rule_approval`; **ไม่มี** `data/public-standings.json` ที่อนุมัติ จึงห้ามสร้างอันดับสมมติ |
| กรรมการ | หน้า `committee.html`, `committee-review.html` ค้นหาชื่อ/หน้าที่และเปิดเอกสารร่างได้; มีรหัส SMIS และการค้นหาหน้าที่ของฉัน | รายชื่อ/วันปฏิบัติหน้าที่ที่แสดงเพื่อ **ตรวจร่าง** ไม่ใช่การแต่งตั้งที่รับรอง; `assignments_2569` ในทะเบียนแม่แบบยังไม่ใช่คำสั่งจริง |
| ช่องทางบันทึกผล | `apps-script/ResultEntry.gs`, `Code.gs`, `Results.gs` และใบบันทึก A4 มีโค้ดแล้ว | **ยังไม่มีหลักฐานใน repo** ว่าติดตั้งสคริปต์เข้าชีตจริง ทดสอบสิทธิ์จริง หรือส่งผลขึ้น GitHub อัตโนมัติ; [R20](R20_MULTICHANNEL_RESULTS_SHEETS_GITHUB_PLAN.md) |
| การเผยแพร่ | GitHub Pages แสดง **snapshot ที่เผยแพร่แล้ว** ไม่ใช่ Google Sheets สด; LINE deep links ใช้ชุดรหัสเดิม | Merge โค้ดไม่เท่ากับผ่านการเปิดบน Safari/Android/LINE หรืออนุมัติโปรแกรมทั้งชุด |

## 2. โค้ดที่ Merge แล้ว — **ไม่ย้อนเปิดเป็นงานพัฒนาใหม่**

| สายงาน | สถานะจริง | หลักฐาน / สิ่งที่ยังต้องตรวจ |
|---|---|---|
| R13–R18, R18-B: ตารางแข่ง/ค้นหา/เรียงวัน/เลือกวันที่/กลับจากผล | **MERGED_CODE** | `index.html`, `js/program.js`, [R18-B](R18B_DATE_SELECTION_AND_ACTIVE_BACKLOG_PLAN.md); **device QA ยังรอ** |
| R21: ย้ายสองการ์ดไปเมนู «เพิ่มเติม» และลดศัพท์เทคนิคในหน้าตาราง | **MERGED_CODE** | [PR #74](https://github.com/infobwd/nongkum-sports-hub/pull/74), [แผน R21](R21_PROGRAM_MORE_MENU_PLAIN_LANGUAGE_PLAN_20261106.md); ไม่ต้องย้ายปุ่มซ้ำ |
| R22: ปุ่มขึ้นบนและดึงลงอัปเดตบน `review.html` | **MERGED_CODE / CI PASS** | [PR #76](https://github.com/infobwd/nongkum-sports-hub/pull/76), [แผน R22](R22_REVIEW_BACK_TO_TOP_PULL_REFRESH_PLAN_20261106.md); ตรวจ PDF split pane/มือถือจริง |
| R19-A ถึง R19-K, R19-F A/B: ค้นหากรรมการ/หน้าที่/ร่าง/ไฮไลท์ PDF/รหัส SMIS | **MERGED_CODE (เฉพาะระบบค้นหาและร่าง)** | [R19-F QA](R19F_MY_DUTY_PHASE_A_B_QA.md), [PR #55](https://github.com/infobwd/nongkum-sports-hub/pull/55), [PR #73](https://github.com/infobwd/nongkum-sports-hub/pull/73); **APPROVAL / duty_date ยังไม่ยืนยัน** |
| R15-A/B/C: หน้าอันดับ + engine, validator + football H2H/ใบแดงก่อนใบเหลือง/เปตองแพ้คัดออก | **MERGED_CODE / RULE GATE บางส่วนยัง BLOCKED** | [R15-BC QA](R15BC_RULES_ENGINE_JSON_VALIDATION_QA.md), [PR #52](https://github.com/infobwd/nongkum-sports-hub/pull/52); ไม่เปิด public standings จากกติกาบางส่วน |
| R15-D/E: คู่มือรับภาพ, synthetic test, mobile test matrix | **MERGED_CODE/DOCS; FIELD QA PENDING** | [SOP](R15D_PHOTO_RESULTS_INTAKE_SOP.md), [Mobile QA](R15E_MOBILE_ACCEPTANCE_QA.md); **ไม่ใช่ผ่านรับภาพจริง** |
| R20-A/B: ปรับ 45 รายการในชีต/ฟุตบอลหญิง 18 พ.ย.; เพิ่มเมนูกรอกและรับรองผลใน Apps Script | **MERGED_CODE; INSTALL/ACCOUNT QA PENDING** | [R20-B QA](R20B_SHEETS_RESULT_ENTRY_FOOTBALL_FINAL_QA_20261106.md), [PR #59](https://github.com/infobwd/nongkum-sports-hub/pull/59) |
| R12A/C: คัดความเสี่ยงนักกีฬาระดับโรงเรียน / engine ทดสอบข้อมูลสมมติ | **MERGED_CODE; REAL PRIVATE ROSTER PENDING** | [แผน R12](R12_ATHLETE_DOCUMENT_TO_JSON_SCHEDULE_CONFLICT_PLAN.md); ห้ามถือว่าได้ตรวจนักกีฬาจริงแล้ว |
| R10/R11/P2: โค้ดระบบคิวประกาศ/รับคำขอ/Sheets approval | **MERGED_CODE; DEPLOY/ROLE QA UNVERIFIED** | [R10 QA](R10_FIELD_OPERATIONS_DEPLOY_QA.md), [R11 QA](R11_PUBLIC_REQUEST_DEPLOY_AND_QA.md), [P2](P2_SHEETS_WORKFLOW.md) |

## 3. งานค้างที่ต้องทำจริง (เรียงตามวันและ dependency)

> **P0 = ต้องปิดก่อนเริ่มกีฬา 12–13 พ.ย. ถ้าเกี่ยวกับงานแข่งรอบนั้น** · **P1 = ต้องปิดก่อนใช้งานผล/การประกาศจริง** · **P2 = ปรับปรุง/ต่อยอดได้หลังเส้นทางหลักพร้อม**

| ID/ลำดับ | ระดับ | งานที่ยังค้าง | ผู้ให้หลักฐาน / งานถัดไป | เกณฑ์ปิดที่ตรวจสอบได้ |
|---|---|---|---|---|
| WEB-01 / DATA-R11E | **P0** | ตารางเปตอง 24 คู่และรายละเอียดสนามย่อยที่ยังไม่รับรอง; ปัญหา 3 แถวปี 2568 และจุดขัดแย้งอื่น | ผู้จัด/เจ้าของสนาม: ยืนยันคู่ คอร์ต เวลาเช็คอิน/ผู้รับผิดชอบจากเอกสารจริง; ตามด้วยรายการอื่นที่ยังไม่รับรองครบวัน–เวลา | มี approval/revision พร้อมแหล่งอ้างอิง, เว็บ/Sheets/ใบคะแนน/เอกสารตรงกัน; **อย่ากล่าวว่าทั้ง 236 รายการได้รับรองแล้ว** |
| WEB-02 / P2 + R20-B | **P0** | ติดตั้งการบันทึกผลใน Google Sheets และทดสอบสิทธิ์จริง | เจ้าของชีต: ติดตั้ง `Code.gs`, `Results.gs`, `ResultEntry.gs`; กำหนดบัญชีผู้บันทึก/ผู้รับรองและป้องกันคอลัมน์; ทดสอบผู้ไม่มีสิทธิ์ | เริ่มบันทึก → ส่งตรวจ → รับรองได้เฉพาะรายการต้นทาง approved → export **private**; ผู้ไม่มีสิทธิ์/ผลซ้ำ/ข้อมูลไม่ครบถูกปฏิเสธ; เก็บผล QA |
| WEB-03 / R15-D/E | **P0** | ซ้อมสนามรับภาพใบบันทึกผล และตรวจความเข้ากันกับระบบ | กรรมการสนาม + ผู้ตรวจ + ผู้รับรอง: ทดลองกีฬาเปตองและอย่างน้อยอีกหนึ่งรูปแบบ, ถ่ายภาพ A4 จริง, อ่าน 2 รอบ, ใช้ข้อมูลจำลองในพื้นที่ปิด | มีร่องรอยภาพ/แบบ/ผลตรวจ/ผู้รับรอง; ห้ามนำผลซ้อมไป `public-results.json`; ตรวจบน iPhone/Android/LINE ตาม [R15-E](R15E_MOBILE_ACCEPTANCE_QA.md) |
| WEB-04 / DEVICE-QA | **P0** | ตรวจเว็บจริงหลัง deploy ด้วยมือถือ | ผู้ตรวจสนาม: `index`, `review`, `committee`, `committee-review`, `results`, `standings`, PDF viewer, A4 score sheet | iPhone Safari + LINE WebView iOS/Android + Android Chrome: วันที่/ตัวกรอง/ลิงก์ LINE/ขึ้นบน/ดึงลง/เปิด-ปิด PDF/safe area/พิมพ์; มี device, version, screenshot, commit, critical defects=0 |
| WEB-05 / R19-APPROVAL | **P1** | ตรวจรายชื่อกรรมการร่างให้โรงเรียนยืนยัน และลงวัน/เวลาเวรจริง | โรงเรียน 8 แห่ง + ผู้จัด: ตรวจชื่อ/สะกด/โรงเรียน/หลายหน้าที่และอ้างอิงคำสั่งฉบับใหม่; แยก `duty_date` ออกจากวันกีฬา | มีหลักฐานตรวจรายโรงเรียนและคำสั่งอนุมัติ, private-to-public projection ตามสิทธิ์; ไม่เรียกชุดร่างว่า `committee_approved` |
| WEB-06 / R15-B/C | **P1** | กติกาอันดับยังไม่ครบทุกชนิดกีฬา/รอบและคะแนนรวมถ้วย | คณะกรรมการกติกา: ตรวจเงื่อนไขเข้ารอบ/ปรับแพ้/ผลเสมอที่ยัง unresolved, เซ็ต/รอบ/กรีฑา/คะแนนรวม; ยืนยัน rule version | validator และ synthetic QA ผ่านทุก phase ที่จะเผยแพร่; `public-standings.json` สร้างแบบ derived-only เมื่อมี approved results/rules ครบเท่านั้น |
| WEB-07 / R20-C | **P1** | ระบบส่งผลที่อนุมัติใน Sheets → GitHub ผ่าน PR ยังไม่เสร็จ | ผู้ดูแลระบบ: ออกแบบตัวส่งแยกสิทธิ์/secret, สร้าง JSON เฉพาะ approved → validator/CI → คนตรวจ → Merge; รองรับแก้ผลและไม่ส่งซ้ำ | ทดสอบ end-to-end ด้วย sandbox/private dry-run ก่อนใช้ approved ผลจริง; ห้ามใส่ token ในชีต/HTML ที่ผู้บันทึกแก้ได้; rollback/check digest |
| WEB-08 / R10/R11 | **P1** | เปิดใช้กองอำนวยการและคำขอสาธารณะ Apps Script ให้เสร็จ | เจ้าของบัญชี: Deploy Project A (public) / B (private) แยก; ทดสอบ allowlist, flag ปิดรับคำขอ, คิว `pending→ready→announced` และ URL จริง | มีหลักฐาน /exec และการปฏิเสธบัญชีไม่มีสิทธิ์; ไม่แชร์ลิงก์ private สู่สาธารณะ |
| WEB-09 / R12B/C | **P1** | ข้อมูลนักกีฬาจริง 8 โรงเรียนและตรวจชนเวลา | โรงเรียนส่งรายชื่อใน Drive **private owner-only**; ผู้ตรวจจับคู่รหัสกีฬา/รายการ/เวลาและจัดระดับ hard/near/potential/unknown | รายงานส่วนตัวพร้อม coverage/unknown; ไม่ commit PII ลง repo public; คณะกรรมการอนุมัติเปลี่ยนตารางแยกก่อนเผยแพร่ |
| WEB-10 / R11E | **P1** | Release โปรแกรมฉบับรับรองให้ตรงทุกช่องทาง | ผู้จัด + เว็บ + สายเล่ม R11C: เช็ค revision/ผลมติ/diff และผลกระทบ fixture, Sheets/Docs/PDF/หน้าเว็บ/LINE OG; fallback | release PR แยก, validator + link check ผ่าน, rollback, และตรวจหน้า host หลัง deploy; **เล่ม V4.2 เป็นสายงานแยก ไม่ใช่ merge เว็บอัตโนมัติ** |
| WEB-11 / R20-D/E/F | **P2 / หลัง WEB-02** | หน้าบันทึกคะแนนผ่านเว็บและรวมช่องทางภาพ/Sheets พร้อมซ้อมผู้ใช้จริง | พัฒนา API กลางที่ตรวจสิทธิ์ (ไม่ฝังคีย์ใน GitHub Pages) หลัง Sheets ใช้งานนิ่ง, รักษาช่องทางภาพ→ChatGPT→คนตรวจ | ผู้ใช้ไม่ต้องทราบศัพท์เทคนิค, บันทึกไม่สูญเมื่อเน็ตขาด, ไม่ซ้ำ/ไม่ทับผล approved; QA ผู้ใช้จริง |
| WEB-12 / UX-FOLLOWUP | **P2** | เก็บข้อบกพร่องจากการตรวจอุปกรณ์จริง + ปรับศัพท์เทคนิคที่ยังเหลือในหน้ารอง | ผู้ทดสอบส่งภาพ/ขั้นตอนทำซ้ำ; จำกัด PR เฉพาะ UI และตรวจ regressions | อุด critical defects ก่อนแข่ง; ข้อความ `ร่าง/รอรับรอง` ต้องคงเมื่อเป็นข้อเท็จจริง |

### หมายเหตุการจัดลำดับ
- หาก **WEB-02** ยังไม่เปิดใช้ได้ทัน 12 พ.ย. ให้ใช้ **WEB-03 เส้นทางภาพ→ตรวจรับ→ทำ JSON ผ่าน PR ด้วยคน** เป็น fallback; แต่ต้องมีผู้รับรองจริงและห้ามสร้างผลสาธิตเป็นผลจริง
- **WEB-07** และ **WEB-11** เป็นงานพัฒนาที่ยังไม่ปิด; งาน R20-B ที่ Merge แล้วเป็นเพียง **โค้ดพร้อมติดตั้ง/ทดลอง** ไม่ใช่ระบบรับผลบนเว็บที่เปิดใช้แล้ว
- R15-C validator และ R15-B pure engine ที่ Merge แล้ว **ไม่ต้องเขียนใหม่**; สิ่งที่ติดอยู่คือการอนุมัติ rules, ฝึกขั้นตอนผลจริง, และ publication
- กำหนดการรายคู่ของกรรมการไม่เท่ากับวันปฏิบัติหน้าที่รายครู; ต้องรับรองแยก
- สามารถทำสายเล่ม R11C/V4.2 ต่อใน PR อื่นได้โดยไม่เปลี่ยนโค้ดเว็บ; ก่อน release ต้องเทียบ revision ข้ามสาย

## 4. ลำดับดำเนินงานที่ไม่ชนไฟล์กัน

1. **ทันที / ก่อน 12 พ.ย.:** WEB-01 (ข้อมูลสนามย่อย) และ WEB-02 (ติดตั้ง Sheets) คู่กับ WEB-03 (ซ้อมผล) และ WEB-04 (ตรวจมือถือ) โดยไม่แก้ `js/program.js` ระหว่าง QA ถ้าไม่พบปัญหาร้ายแรง
2. **12–13 พ.ย.:** ใช้ workflow ที่ผ่านการซ้อมแล้ว, เก็บหลักฐานภายใน, ตรวจรายการเผยแพร่เฉพาะที่ approved; หากยังไม่มี approved ให้เว็บคงแสดงว่าไม่มีผล
3. **ก่อน 16–20 พ.ย.:** WEB-05/06/07/08/09 เป็นสายคู่ขนาน: กรรมการ/กติกา/ส่งผล GitHub/กองอำนวยการ/ชนเวลา; แต่ละสายทำ PR แยกและแจ้ง contract ที่ใช้ร่วมกัน
4. **หลังข้อมูลพร้อม:** WEB-10 release gate; WEB-11 หน้าบันทึกผลเว็บเป็นทางเลือกต่อยอด ไม่ใช่เงื่อนไขให้เว็บแสดงตารางที่มีอยู่ใช้งานได้
5. **เสมอ:** เว็บต้องอ่านเฉพาะ snapshot ที่อนุญาตเผยแพร่; ประวัติ Git/PR, JSON และ LINE ต้องไม่เปิดเผยข้อมูลนักเรียนหรือทะเบียนครูที่จำกัดสิทธิ์

## 5. เกณฑ์ตรวจรับและหลักฐานที่ต้องแนบก่อนเปลี่ยนสถานะ

- [ ] `main` และ PR ตรวจล่าสุด + ชื่อไฟล์/commit ที่เปลี่ยน; ถ้า Merge แล้วเปลี่ยนเป็น `MERGED_CODE` ไม่ใช่ `LIVE_PASS`
- [ ] โปรดแยก **code/CI**, **Apps Script deployment**, **อนุมัติข้อมูล/กติกา**, **device/field acceptance** เป็น 4 หลักฐานคนละชนิด
- [ ] ตารางกิจกรรมต้องคง `source_pdf` และรหัส fixture; raw 237 vs active 236 มีเหตุผล; ความเปลี่ยนแปลงใหม่ต้องผ่าน R11E
- [ ] ผลรับรอง `approved-only` + rule gating + digest ไม่เผยแพร่ผล/อันดับสมมติ
- [ ] Safari/LINE/Android บันทึกรุ่นอุปกรณ์ OS/เบราว์เซอร์ วันเวลา screenshot และปัญหาที่พบ; เปิดจริงหน้า review/PDF/committee/results/standings
- [ ] Google Sheets/Apps Script: บัญชีผู้ดูแลติดตั้ง/จำกัดสิทธิ์จริง/ซ้อมรับรอง และมีบันทึกว่า deploy แล้วหรือยัง
- [ ] ถ้ามีการถ่ายภาพ/ข้อมูลนักกีฬา เก็บใน private; ไม่เผยแพร่ชื่อ, บัญชี, ลายเซ็นหรือหลักฐานภาพไว้ใน GitHub สาธารณะ

## 6. กฎการดูแลแผนรายวัน

1. ใช้ไฟล์นี้เป็น **active web plan**, อ้างอิง `main` และ PR ล่าสุดทุกครั้ง; ไฟล์ [snapshot 6 พ.ย.](SPORTS_2569_ACTIVE_BACKLOG_20261106.md) และ [snapshot 4 พ.ย.](SPORTS_2569_ACTIVE_WORK_STATUS_20261104.md) เก็บเพื่อประวัติ ไม่ใช่แหล่งสถานะล่าสุด
2. แต่ละงานบอก **ID, ผู้รับผิดชอบบทบาท, สถานะ, evidence, blocker, next action, gate**; ไม่ปรับ `MERGED_CODE` เป็น `PENDING_CODE` จากการคัดลอกแผนเก่า
3. หากมีมติใหม่หรือ Merge ใหม่ ให้แก้เฉพาะแถวที่กระทบ พร้อมวันที่/หลักฐาน; ถ้าไม่มี evidence ให้เขียน `ยังไม่ยืนยัน`
4. อัปเดตแผนรายวันโดยไม่แก้ข้อมูลคะแนน, ผล, อันดับ หรือคำสั่งกรรมการโดยอัตโนมัติ

### ที่มาที่ควรอ่านคู่กัน
- [R20 multi-channel results](R20_MULTICHANNEL_RESULTS_SHEETS_GITHUB_PLAN.md) / [R20-B acceptance](R20B_SHEETS_RESULT_ENTRY_FOOTBALL_FINAL_QA_20261106.md)
- [R15-B/C engine & rules](R15BC_RULES_ENGINE_JSON_VALIDATION_QA.md), [R15-D SOP](R15D_PHOTO_RESULTS_INTAKE_SOP.md), [R15-E mobile QA](R15E_MOBILE_ACCEPTANCE_QA.md)
- [R19-F My Duty QA](R19F_MY_DUTY_PHASE_A_B_QA.md), [R12 conflict workflow](R12_ATHLETE_DOCUMENT_TO_JSON_SCHEDULE_CONFLICT_PLAN.md)
- [R10 deploy QA](R10_FIELD_OPERATIONS_DEPLOY_QA.md), [R11 deploy QA](R11_PUBLIC_REQUEST_DEPLOY_AND_QA.md), [P2 Sheets workflow](P2_SHEETS_WORKFLOW.md)


## R23 (7 พฤศจิกายน 2569) — ไฮไลท์รายการใน PDF ตารางแข่งขัน 41 หน้า

- **สถานะ: พัฒนาแล้ว / QA CI ผ่าน / PR #119 ยัง Draft / ยังไม่ได้ Merge หรือ Deploy** ([PR #119](https://github.com/infobwd/nongkum-sports-hub/pull/119)). งานนี้เพิ่มไฮไลท์รายการในตัวอ่าน PDF V2 ที่เว็บใช้ผ่าน `fixture=ID` โดยไม่แก้ข้อมูลรายการ, ผล, กรรมการ หรือเล่ม 155 หน้า.
- สร้างพิกัดจาก PDF SHA เดิม 41 หน้า **236 รายการครบ** (186 คู่ + 50 กรีฑา), แยกเลขคู่/รายการที่ซ้ำ, ตรวจ revision ก่อนแสดง. รายละเอียด: [แผน R23](R23_PROGRAM_PDF_FIXTURE_HIGHLIGHT_PHASE1_PLAN_20261107.md) และ [ผล QA](R23_PROGRAM_PDF_HIGHLIGHT_PHASE1_QA_20261107.md).
- ชุด CI [R23](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42379059887), [R11D](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42379059918), [R14](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42379059860), [R19 committee](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42379059857), [R19K](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42379059865), [Validate](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42379059849) **PASS** บน head `7c25fec7` ก่อนแก้ข้อความแผนนี้. ก่อน Merge ตรวจใหม่บน latest head.
- **ค้าง:** ผู้จัดอนุญาต Merge, ทดลอง iPhone Safari/LINE WebView/Android จริงหลัง staging/deploy, ตรวจกรณีซูม/ปัด/กลับการ์ดและหน้า PDF ร่าง; เฟส 2 เล่มใหม่ 155 หน้าแยกงานจาก PR #116/#118.

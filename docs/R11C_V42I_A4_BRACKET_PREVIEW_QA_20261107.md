# R11C V4.2-I — A4 symmetric bracket proof: implementation and organizer QA

วันที่: 7 พฤศจิกายน 2569  
สถานะ: **DEVELOPED ON ISOLATED BRANCH / REVIEW ONLY / NOT MERGED / NOT PUBLISHED**

## งานเดิมที่นำมาใช้ซ้ำ
- [V42-I plan in main](R11C_V42I_SYMMETRIC_BRACKET_VISUAL_REVIEW_PLAN_20261107.md) (PR #112 merged)
- [V42-E bracket source/edge audit](R11C_V42E_BRACKET_COVERAGE_QA_20261107.md)
- [V42-H six organizer review issues](R11C_V42H_ORGANIZER_BRACKET_REVIEW_PLAN_20261107.md)
- \`scripts/docs/v42_brackets.py\` โดยเรียก \`analyze()\` และใช้รายการ \`verified_links\` ที่ได้จากเอกสารต้นทาง
- Source \`data/program-from-pdf-2569-20261104-draft.json\`, SHA ณ เริ่มงาน \`7ba60be1b36a2591768fc0350476edc8ff2c3ac1\`
- main ก่อน branch: \`6008163fe25d8dcd904f1c50c9735c6c86ab2c33\`; PR #111 งานปกและ PR #112 แผนผัง Merge แล้ว; ไม่มี PR เปิด ณ เวลาเริ่ม

## สิ่งที่พัฒนารอบนี้
1. \`scripts/docs/v42i_bracket_preview.py\`: ตัวสร้าง HTML ผังสมมาตรสำหรับพิมพ์ A4 *ไม่เปลี่ยนตัวสร้าง PDF หลัก* และไม่แตะ source JSON:
   - เปตองหญิง 10 ปี: รอบแรกคู่ 5–8, รองคู่ 11–12, ชิงคู่ 42; วาดเส้นเฉพาะคู่ที่เลขอ้างถูกต้อง
   - เปตองชาย 10 ปี: คู่ 9 ใช้ผู้ชนะคู่ 1+2 แต่คู่ 10 ใช้ 2+4 และพบชื่อหนองกระทุ่มซ้ำ; แสดงกล่อง + สัญลักษณ์ \`!\` และไม่ต่อสายรอบแรกที่ความสัมพันธ์ยังไม่ยืนยัน; ไม่อ้างว่า 8 โรงเรียนไม่ซ้ำ
   - ชักเย่อหญิง 12 ปี: รอบแรกคู่ 9–11, รอง 16–17, ชิง 22; แสดงกล่อง \`ⓘ\` สำหรับทีมผ่านรอบตามข้อความต้นฉบับ โดยไม่สร้างคู่ที่สี่และไม่แต่งชื่อทีม
2. \`scripts/docs/test-v42i-bracket-preview.py\`: ตรวจแหล่ง 237 raw / 186 matches, 3 หน้า HTML A4, expected verified edges/blocked edges/bye และ reject ชื่อทีมผ่านรอบที่ถูกสร้างด้วยเลขคู่นอกต้นฉบับ
3. \`.github/workflows/r11c-v42i-bracket-preview.yml\`: ทำ Source QA และ HTML artifact ใน PR; ไม่เผยแพร่ PDF อัตโนมัติ
4. ตัวอย่าง PDF A4 **3 หน้า** สร้างและตรวจภาพเรนเดอร์ในพื้นที่ทำงานเพื่อให้ผู้จัดดูได้ในแชท (ไม่ได้ commit PDF หรือไฟล์ภาพ/ข้อมูลนักเรียนลง public repo)

## QA ที่ดำเนินการใน local preview
- เรนเดอร์ HTML ด้วย WeasyPrint เป็น PDF 3 หน้า ขนาด A4 595.28 × 841.89 pt
- เปิดภาพ PNG ทั้ง 3 หน้าแล้ว ตรวจตำแหน่งหัวข้อ ผังสองฝั่ง กล่องเลขคู่ ป้าย \`!\`/\`ⓘ\` และหน้าไม่ล้นกระดาษ
- พบในภาพรอบแรกว่าเส้น SVG บางส่วนกลายเป็นสามเหลี่ยมดำ; **แก้แล้ว** โดยกำหนด SVG \`fill="none"\` ชัดเจนและลดเส้นให้คม
- เพิ่มความกว้างกล่องรองฯ เป็น 14% ของผัง และย่อข้อความที่อ้างผู้ชนะอย่างมีหลักฐานเป็นบรรทัดคู่เลข เพื่ออ่านเมื่อพิมพ์
- ตรวจสถานะด้วยข้อมูล fixture ตัวอย่างที่คัดจาก JSON จริง: หญิง 10 ปี left/right/final = true; ชาย 10 ปี first->semi = false, semi->final = true; ชักเย่อหญิง 12 ปี bye = true (ข้อมูลจริงใน repoเป็นตัวทดสอบ regression ขั้นสุดท้าย)
- **GitHub Actions PASS แล้ว**: [V42-I Bracket A4 Preview QA run #42361100804](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42361100804) ผ่านทั้ง source/regression, สร้าง HTML review และอัปโหลด QA artifact; ยังไม่ถือว่าพิมพ์จริง/โทรศัพท์/iOS/LINE ผ่านจนกว่าจะตรวจบนอุปกรณ์

## การสร้าง HTML อ้างอิงข้อมูล Repo
\`\`\`bash
python scripts/docs/test-v42i-bracket-preview.py
python scripts/docs/v42i_bracket_preview.py \
  --source data/program-from-pdf-2569-20261104-draft.json \
  --output out/bracket-review.html \
  --qa-output out/bracket-review-qa.json
\`\`\`

สร้าง PDF *ฉบับตรวจร่าง* ด้วย WeasyPrint หรือเบราว์เซอร์ที่รองรับ print CSS A4 โดยแยกจาก official full booklet builder; ไม่ต้องเข้าถึงภาพปกส่วนตัว.

## ยังต้องให้ผู้จัดตรวจ
- [x] **ผู้จัดเห็นชอบแนวรูปแบบผัง** จาก PDF A4 ทั้ง 3 หน้าในแชท วันที่ 7 พ.ย. 2569 (“ผมพอใจผัง”) = `VISUAL DESIGN ACCEPTED` สำหรับแม่แบบ ไม่ใช่รับรองข้อมูลสนามหรือผ่าน print/device QA
- [ ] ตรวจสะกดชื่อทีม \"ทุง่ มะสังฯ\" ในข้อความต้นทางชักเย่อหญิงให้ตรงฉบับรับรอง (ตัวอย่างยังคงรูปแบบตาม source; ห้ามแก้แบบไม่มีมติ)
- [ ] มติผังเปตองชาย 10 ปี คู่ 9–10 และรายชื่อทีมรอบแรก
- [ ] ทดสอบพิมพ์ขาวดำและเปิดบน iPhone/Safari/LINE
- [ ] หลังผู้จัดเห็นชอบ จึงแยกงานบูรณาการใน \`build-v4-full.py\` โดยตรวจชนกับสายงานปก G2 อีกครั้ง

## Non-goals / protection
- ไม่แก้ \`v42_cover.py\` งานปก G2, \`build-v4-full.py\`, \`v42_brackets.py\` ตัวหลักในรอบนี้
- ไม่แก้ PDF V2/V3, PDF review 125 หน้าเดิม, Google Docs/Drive/Sheets, เว็บ, JSON หรือผลแข่งขัน
- ไม่ลบภาคผนวก V3 จำนวน 17 หน้า หรือเปลี่ยน 236 effective fixtures, 250 committee entries, 486 anchors
- REVIEW/QA ไม่เท่ากับ MERGED / OFFICIALLY APPROVED / PUBLISHED / ACCEPTED

## อัปเดตมติหลังตรวจตัวอย่าง: ทำแม่แบบนี้ต่อให้ครบทุกผังที่เกี่ยวข้อง

- ผู้จัดเห็นชอบด้านรูปลักษณ์ต้นแบบ V42-I แล้ว และให้บันทึกเพื่อขยายใช้งานกับ **ทุกกีฬา/รุ่นที่ต้องใช้ผังจริง**; ไม่บังคับรายการลีก/พบกันหมดหรือกรีฑาให้กลายเป็นสายแพ้คัดออก
- ยังไม่อ้างว่ารายการทุกประเภทพัฒนาแล้ว: ตัวสร้างใน PR #113 ครอบคลุมตัวอย่างเฉพาะ 3 กลุ่ม; รุ่นอื่นต้องทำ generic layout และ inventory coverage ต่อ
- รายละเอียดขั้นตอน `V42-I6–I11` บันทึกเพิ่มใน [แผน V42-I หลัก](R11C_V42I_SYMMETRIC_BRACKET_VISUAL_REVIEW_PLAN_20261107.md#10-มตดานรปแบบจากผจด-และแผนขยายทกผง-7-พย-2569): จำแนกรูปแบบสาย -> ออกแบบตัวจัดวางทั่วไป -> ติดจุดรอตรวจ -> QA ครบ -> รวมเล่มตรวจร่าง -> gate รับรอง
- งาน R11C ปก G2 อยู่คนละสาย PR; ห้ามแทรกงานผังไปแก้ `v42_cover.py` หรือภาพปก. เมื่อรวม PDF ต้องตรวจ `main` ใหม่ก่อนและรักษาส่วนปก/ประกาศ/ทะเบียนเดิม
- **สถานะก่อน Merge:** `PILOT DEVELOPED + CI PASS + DESIGN ACCEPTED BY ORGANIZER` แต่ `PR #113 OPEN`, `FULL COVERAGE PENDING`, `PRINT/DEVICE QA PENDING`, `R11E RELEASE NOT APPROVED`.

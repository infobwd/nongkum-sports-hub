# R19-E — เผยแพร่รายชื่อกรรมการฉบับร่างบนหน้า committee.html สำหรับ 8 โรงเรียนตรวจง่าย

วันที่ 6 พฤศจิกายน 2569 — **PLAN FIRST**: ต้องบันทึก Commit แผนนี้เป็น Commit แรกก่อนแตะ code/data

## คำสั่งจากผู้จัด
ผู้จัดยืนยันให้ **แสดงรายชื่อจากร่างสูจิบัตรปี 2569 บนหน้า GitHub Pages สาธารณะได้** เพื่อให้ครูและโรงเรียนทุกแห่งค้นหา ตรวจความถูกต้องได้ง่าย ไม่ต้องใส่รหัสเพื่อดูชื่อ แต่ **คงหน้า `committee-review.html` เดิม** สำหรับแต่ละโรงเรียนตรวจรายการ/ส่งรายงานทาง LINE (รหัสยังใช้เปิดหน้าตรวจอย่างเป็นระบบ)

## แหล่งข้อมูลและ Data Contract
- Extract ตัวจริง: `committee_2569_draft_private_review.json` จากร่าง `ร่าง สูจิบัตร กีฬากลุ่ม 2569 .pdf` หน้า 6–16, 250 บรรทัดชื่อ/บทบาท, ชื่อข้อความแตกต่างเบื้องต้น 151; source SHA256 `cab4c65eb15d5480d63da00a81a2e662f8c7857e0ae39ea80475733f5bc795e0`.
- ทำ **public minimal projection** ใน `data/committee-2569-draft-public-review.json`: เฉพาะ stable entry ID, ชื่อที่พิมพ์, หน่วยงาน/สังกัดตามร่าง, หน้าที่, ฝ่าย, ชนิดกีฬา, หมวดรุ่น (ถ้ามี), เลข PDF page และ flags ความคลาดเคลื่อน; ไม่เผยแพร่ `raw_text`, เบอร์, อีเมล, identifiers ภายใน/ทะเบียน Sillapa, หรือ secret สำหรับหน้า R19-D
- สถานะของ public list = `draft_for_school_verification`, **ไม่ใช่** `committee_approved`; ค่า `assignments_2569:[]` และตัวเลขที่รับรอง 0 ใน planning JSON **ไม่เปลี่ยน**
- รักษาชื่อที่สะกดผิดหรือตำแหน่งคลาดเคลื่อนตามเอกสารร่าง พร้อมป้าย “ควรตรวจ” ไม่แก้อัตโนมัติ
- 41 บรรทัดส่วนกลาง/ภายนอก/ระบุโรงเรียนไม่ชัดยังค้นหาได้ในมุมมอง “ทุกหน่วยงาน/ฝ่าย” ไม่เติมสังกัดใน 8 โรงเรียนโดยเดา
- จัดกลุ่ม/กรองโรงเรียนจากสังกัดที่ **ปรากฏในต้นฉบับ**, ไม่ map ด้วยชื่อบุคคลจาก Sillapa

## UX ภายในหน้าเดิม
1. ปรับคำอธิบายเดิมที่อาจทำให้เข้าใจว่ารายชื่อยังไม่มี: “รายชื่อจากร่าง 2569 เผยแพร่เพื่อให้ตรวจ — ยังไม่ใช่คำสั่งแต่งตั้งที่ลงนาม”
2. เพิ่ม filter โรงเรียน 8 แห่ง, ค้นหาชื่อ/ฝ่าย/หน้าที่, คงตัวกรองกีฬา/รุ่น และ 4 มุมมองเดิม (กีฬา, ฝ่าย, โรงเรียน, ประเด็นตรวจ)
3. แสดงรายชื่อ/สังกัด/หน้าที่ **จริง** ใต้การ์ดกีฬา, ฝ่ายและโรงเรียน, โดยใช้ native `details` เมื่อรายการยาว; แตะเปิดได้บนมือถือโดยไม่กระทบ Safe Area
4. ลิงก์เด่น “ตรวจชื่อ/แจ้งแก้ไข/ส่งผลยืนยัน” ไป `committee-review.html` (เดิม) ยังคงอยู่ ใช้รหัสแต่ละโรงเรียนสำหรับขั้น feedback
5. ไม่มีปุ่ม “ยืนยันแล้ว” บนหน้า public; ทุกการส่ง LINE ต้องให้ผู้จัดตรวจข้อความและตอบรับ ไม่อ้างว่าบันทึกแล้ว
6. search/query user-facing ไม่เก็บข้อความชื่อครูใน query string, analytics หรือ storage; render ด้วย textContent ไม่ใช้ innerHTML

## Acceptance / Regression
- จำนวน rows ใน public projection 250, ID ไม่ซ้ำ, 20 sections, 8 schools and general/unknown correctly distinguished; source hash/revision match R19-D.
- ค้นหาคนได้, filter school/sport, และมุมมองกีฬา/ฝ่าย/โรงเรียนทั้งหมดเห็นชื่อ (ไม่ใช่เพียงตัวเลข 9, 20)
- คง module private R19-D, encrypted bundles/code ไม่เปลี่ยน; ไม่มี contact/teacher IDs/passwords leaked
- คง 237 fixtures, pages result/standings, R15 photo intake, R12 roster, 2 bottom tabs, PDF unchanged
- Automated Node regression tests + GitHub Actions PASS ก่อน Merge
- Mobile Safari/LINE จริงและ GitHub Pages live load/readability ต้องตรวจหลัง deploy; ไม่อ้างผล live หากยังไม่ตรวจ

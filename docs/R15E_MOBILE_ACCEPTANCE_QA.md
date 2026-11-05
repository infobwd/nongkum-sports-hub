# R15-E — Mobile Acceptance: results / standings / photo-to-results

วันที่ 5 พ.ย. 2569 · สถานะ: **code/static checks only, DEVICE QA PENDING** (ไม่อ้างว่าทดสอบ iPhone/Android/LINE จริง)

อ้างอิง R5, R14 \`R14_FIELD_READY_PROGRAM_PDF_LINE_QA.md\`, R15-A \`R15A_STANDINGS_UI_QA.md\`, R16 \`R16_CHRONOLOGICAL_PROGRAM_MOBILE_SAFE_AREA_QA.md\`, R17 \`R17_TAB_RETURN_CONFIRMED_PETANQUE_QA.md\` และ R18 \`R18_DATE_AWARE_PROGRAM_STATUS_UX_QA.md\`

## เกณฑ์ร่วม (ก่อนทำด้วยเครื่องจริง)

- หน้า \`results.html\` และ \`standings.html\` เปิดผ่าน HTTPS ของ deployment ที่ระบุ version/commit, ไม่มี score สมมติใน public JSON; ณ วันตรวจ \`approved_results_count=0\`.
- \`results.html\`: ผลรายคู่, deep link \`?result=\`, ตัวกรอง \`school/sport/level\`, ปุ่มแชร์เฉพาะ approved, Refresh (cache no-store), skeleton/empty/network error/retry, 5-min visible recheck; ถ้า refresh ล้มเหลวหลังโหลดสำเร็จต้องรักษาข้อมูลเดิม
- \`standings.html\`: แสดง **ยังไม่มีผล** เมื่อ approved=0, **รอรับรองกติกา** เมื่อมี approved แต่ engine ยังไม่พร้อม; ไม่มีตารางอันดับสมมติ, โหลด independently, รักษาตัวกรองเมื่อสลับแท็บย่อย
- สองแท็บหลักล่างเท่านั้น: ตารางแข่ง / ผลแข่งขัน. จากผลกลับตารางด้วย \`from=results#programListing\` รักษาตัวกรองและตำแหน่งโปรแกรมตาม R17/R18. แท็บย่อยผลรายคู่/ตารางอันดับมีพื้นที่กดขั้นต่ำ 44px
- Safe Area: พื้นที่หัวติดขอบ notched screen ไม่ทับสถานะเครื่อง; footer และปุ่มท้ายหน้าต้องเลื่อนพ้น fixed bottom nav; ไม่มีแถบเทาปิดข้อความ; ลองหมุนจอ/เพิ่มฟอนต์
- การแชร์ไป LINE ที่เปิด URL กลับมาต้องเปิด \`?result=<id>\` **เฉพาะ id ที่อนุมัติ** หรือแสดงข้อความไม่พบ; ไม่เด้งหน้าแรกผิด. มือถือแชร์ไม่รองรับให้แสดง fallback ที่ตรวจสอบได้
- **ห้ามใช้ผลจริงในการทดสอบอัตโนมัติ**; ทดสอบ approved payload สมมติเฉพาะใน local/CI harness ไม่ยิงขึ้น GitHub Pages. หากทดสอบ public URL ที่ยังไม่มีผล ให้เห็นสถานะว่างตรงจริงเท่านั้น

## Test matrix — คงหลักฐานแยกอุปกรณ์

กรอก: ผู้ทดสอบ / วันเวลาไทย / รุ่นอุปกรณ์ / OS / browser version / URL+commit / portrait-landscape / แหล่งเน็ต / ภาพหรือคลิปพร้อมเลข test / PASS-FAIL-BLOCKED และ issue link. ห้ามเก็บข้อมูลนักเรียนหรือลายเซ็นในภาพ QA สาธารณะ

| ID | ขั้นตอน | ผลที่ต้องเห็น |
|---|---|---|
| M01 | เปิด results บนเน็ตปกติ, approved=0 | skeleton หาย, แสดง "ยังไม่มีผลรับรอง" และ 0, ไม่แสดงผล/อันดับสมมติ |
| M02 | เปิด standings และกลับผลรายคู่ | ลิงก์ย่อยใช้แตะครั้งเดียว, filter \`school/sport/level\` อยู่ครบ, ไม่มีแท็บล่างที่ 3 |
| M03 | กรองโรงเรียน → กีฬา → ช่วงชั้น → refresh → สลับย่อย | รายการ/ตัวกรองตรง, URL filter ไม่สูญ, ไม่เกิดการเลื่อนหรือ sticky header บังปุ่ม |
| M04 | ปิดเน็ตก่อนโหลดใหม่ แล้วกด retry หลังกลับออนไลน์ | เห็น error+retry ไม่ปน empty; recovery สำเร็จ |
| M05 | โหลดสำเร็จ → ปิดเน็ต → Refresh | ข้อมูลเดิมคงอยู่และบอกว่า refresh ไม่สำเร็จ ไม่ล้างผลเดิม |
| M06 | เปิด \`results.html?result=TEST-NOT-PUBLISHED\` | ไม่พบผลรับรอง; ไม่แสดงผลทดสอบ, กดกลับผลทั้งหมดได้ |
| M07 | *เมื่อมีผลจริง approved* แชร์ผล → LINE → เปิด deep link | เปิดผล ID ที่แชร์, ไม่ตกหน้าแรก; ต้องเลื่อน/ขยายได้และกลับได้ |
| M08 | แตะผลแข่งขัน → ตารางแข่ง → ผลแข่งขัน | โปรแกรมตามวัน-เวลา R18, ตำแหน่ง R17, ตัวกรองคงเดิม |
| M09 | เลื่อนถึงท้ายผล/อันดับ, หมุนจอ, ขยายตัวอักษร | footer, filter, refresh, retry, safe top/bottom ไม่ถูกบัง; ปุ่มกดได้ |
| M10 | ลอง back/forward, เปิดลิงก์จาก LINE, กลับหลัง background | ไม่มีหน้าเปล่า, ไม่มี gesture หน่วง, ทดสอบ pageshow/bfcache |
| M11 | เปิดใบบันทึก A4 จากคู่จริง (ไม่ใส่คะแนน), พิมพ์ตัวอย่าง | fixture/sport/team ล็อก; แบบว่างไม่พิมพ์ ID เอง; A4 1 หน้า + ลงนามครบ |
| M12 | *หลัง R15-C* ใช้ผลอนุมัติจริง 1 คู่ | เปรียบเทียบ JSON, หน้ารายคู่, ตารางคะแนน snapshot/hash, cache/refresh end-to-end |

### Safari iPhone (ต้องใช้เครื่องจริง)

- [ ] M01–M06, M08–M11 โดย Safari ปกติและ standalone/PWA หากมี; แนบหลักฐาน screenshot ขณะ scroll สุดท้าย
- [ ] เครื่องมี Dynamic Island/notch: แถบบน sticky ไม่ทับ status-bar และข้อความไม่เลื่อนใต้ mask สีเทา
- [ ] สลับ portrait/landscape, Zoom และตัวอักษรใหญ่, bottom home indicator, ปุ่ม back ใน Safari
- [ ] พิมพ์/Save PDF ใบ A4 จาก \`?fixture=\` ทั้ง match และ track_event; ตรวจจำนวนหน้าใน preview

### Chrome Android (ต้องใช้เครื่องจริง)

- [ ] M01–M06, M08–M11; กดกลับเครื่อง (hardware/system back) และ browser back, ลอง reload
- [ ] แถบนำทาง gesture/3-button, address bar ยุบ-ขยาย: bottom nav/footer ไม่ถูกบัง
- [ ] Share sheet/Copy link fallback, เปิดลิงก์ deep link ที่ส่งผ่านแอป LINE บนเครื่อง
- [ ] พิมพ์ A4 ด้วย Chrome/Save as PDF; ฟอนต์และตารางคะแนนไม่หลุดขอบ

### LINE WebView iOS/Android (ต้องใช้เครื่องจริง)

- [ ] เปิดลิงก์จากแชท LINE (แชททดสอบส่วนตัว) → results/standings → กรอง/สลับย่อย/กลับ โปรแกรม
- [ ] ตรวจกรณี \`?result=\` ผลที่รับรองเท่านั้น; deep link ที่ไม่เผยแพร่ต้องขึ้นไม่พบแทนการแสดงผลหลอก
- [ ] แตะ refresh/retry, ปิดเน็ตและเปิดใหม่, กลับจาก background, เปิด externally in browser หากจำเป็น
- [ ] ตรวจ sticky top และ safe-area bottom โดยเลื่อนถึง footer, แชร์ซ้ำและ URL ที่ถูก copy
- [ ] บันทึก OS, LINE version, screenshots/clip; **อย่าอ้าง PASS จาก Safari เทียบเท่ากับ LINE**

## Gate/การบันทึกผล

- **Automated QA:** \`node scripts/results/test-photo-intake-r15d.mjs\` + \`node scripts/ux/test-results-mobile-r15e.mjs\` และ regression R5/R15-A/R6/R9/R16–R18. เป็น DOM/contract/static tests ไม่ใช่ภาพหน้าจอจากเครื่องจริง
- **Manual QA ค้าง:** M01–M11 บนสามกลุ่มข้างต้น, ภาพ A4 พิมพ์จริง และ M07/M12 หลังผลจริง/engine. Gate R15-E จะถือ **mobile accepted** ได้เมื่อมีหลักฐานผู้ทดสอบจริงและ critical defects เป็น 0 เท่านั้น
- จดความผิดพลาดเป็น \`R15E-<device>-Mxx\`, รายละเอียดวิธีทำซ้ำ, expected/actual, timestamp, screenshot ที่ไม่มี PII, commit SHA, ผู้ตรวจรับ
- หาก R15-C/engine ยังไม่พร้อมให้รายงาน \`BLOCKED BY R15-B/C\` แทน PASS สำหรับการเทียบอันดับกับผลจริง; ห้ามเปิดผลสมมติบน public URL

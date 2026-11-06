# Shared Pull-to-Refresh — Phase 1

วันที่ 6 พฤศจิกายน 2569

## ขอบเขต
หน้าตารางแข่งขัน index.html, ผล results.html, อันดับ standings.html และหน้ากรรมการ committee.html (ใช้ของเดิม ไม่ติดตั้งซ้ำ)

## วิธีทำ
ใช้ shared gesture module สำหรับสามหน้าแรก เรียกฟังก์ชันโหลด JSON เดิมโดยตรง ไม่ reload หน้า รักษาตัวกรองและ deep link; คืนผล success/failure จาก loader เพื่อแจ้ง Toast อย่างถูกต้อง; ดึงได้เฉพาะเมื่ออยู่บนสุด; แสดง hint ใต้ sticky header และ toast ต่ำเหนือ safe area; กัน gesture ที่เริ่มบนฟอร์ม/ปุ่ม/ลิงก์และแนวนอน

## ขอบเขตห้ามแก้
ข้อมูล JSON, กติกาคะแนน, ระบบรับรอง, Google Sheets, committee-review.html, forms/score-sheet.html (แบบฟอร์มเสี่ยงสูญข้อมูล), backend

## QA
CI ทุกชุด, ตรวจการค้น/ตัวกรองคงเดิม, มือถือ Safari/LINE จริงภายหลัง merge; ไม่กล่าวอ้างทดสอบสัมผัสจริงโดยอัตโนมัติ

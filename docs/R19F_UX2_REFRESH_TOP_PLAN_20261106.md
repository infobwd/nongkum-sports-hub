# R19-F/UX-2 — Pull-to-refresh และปุ่มขึ้นบน

6 พฤศจิกายน 2569 | ต้นแบบอ้างอิง infobwd/sillapa/pull-refresh.js

## ขอบเขต
- เฉพาะ committee.html, css/committee.css, js/committee.js และสคริปต์ UX แยกไฟล์
- ดึงลงที่ตำแหน่งบนสุดเพื่อโหลดข้อมูล JSON ใหม่ผ่านฟังก์ชัน load เดิม ไม่ reload หน้าและไม่เปลี่ยนฐานข้อมูล
- คงโรงเรียน คำค้น และชื่อครูที่เลือก หากข้อมูลใหม่ยังมีชื่อ; แสดงสถานะสำเร็จ/ผิดพลาดโดยไม่กล่าวอ้างว่าโหลดสำเร็จเมื่อผิดพลาด
- ปุ่มขึ้นบนแสดงเมื่อเลื่อนลงและเว้น safe area/แถบเครื่องมือมือถือ
- หลีกเลี่ยงการดึงเมื่อสัมผัส input, select, button, link, details; ไม่ดัก horizontal swipe; เคารพ reduced motion

## ไม่แตะ
ข้อมูลกรรมการ/กำหนดแข่ง, การรับรอง, Google Sheets, โปรแกรม, ผล, ตารางคะแนน และหน้าอื่น

## ตรวจรับ
- CI committee R19-A/C, My Duty R19-F, R14, validate ผ่าน
- มือถือ Safari และ LINE WebView ตรวจจริงหลัง Merge; browser-native pull gesture อาจต่างกัน
- ไม่มี PR อื่นแก้ไฟล์เดียวกันขณะเริ่มงาน

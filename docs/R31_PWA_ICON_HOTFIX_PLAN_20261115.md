# R31 hotfix — แก้ไอคอน PWA ที่เสียหาย (15 พ.ย. 2569)

สถานะ: PLAN BEFORE CHANGE; branch `fix/r31-pwa-icons-crc-20261115` แยกจาก main หลัง Merge PR #140

## ปัญหาที่ตรวจพบจริง
ตรวจ blob `main` `icons/pwa-180.png` และ `icons/pwa-512.png` ด้วยการอ่าน PNG chunk/CRC พบว่ามี IDAT ไม่สมบูรณ์และไม่พบ IEND ตามมาตรฐาน ทั้งที่ CI R31 เดิมตรวจเฉพาะ signature + dimensions ผ่าน ส่วน `icons/pwa-192.png` ผ่าน CRC และ IEND.

## วิธีแก้และผลกระทบ
1. เปลี่ยน 180 และ 512 เป็น PNG ที่ตรวจแล้วด้วย Pillow และ PNG CRC ก่อนอัปโหลด; **รักษาชื่อไฟล์เดิม** เพื่อไม่กระทบ manifest/HTML
2. เพิ่ม QA PNG CRC ทุก chunk, การมี IEND และไม่เหลือ trailing bytes พร้อมตรวจทุกขนาด 180/192/512
3. เพิ่ม version ของ Service Worker cache เป็น r31-v2 เพื่อไม่ใช้ไอคอนที่เคย cache ไม่สมบูรณ์บนเครื่องที่ติดตั้งไปแล้ว
4. แยก hotfix PR ไม่แก้ข้อมูลการแข่งขัน/ตาราง/ผล/อันดับ/กรรมการหรือแผนสูจิบัตร
5. ตรวจ CI และไฟล์ที่เผยแพร่จริงหลัง merge; ยังต้อง QA บนอุปกรณ์จริง จึงยังไม่ถือว่า DEVICE ACCEPTED

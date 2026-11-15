# R30-G — สูจิบัตรพิธีการ/กรรมการ 44 หน้า ฉบับตรวจร่าง

**สถานะ:** SOURCE CHECKED → PLAN RECORDED → BUILT → PROGRAMMATIC QA PASS → DRIVE UPLOADED (หลังอัปโหลดสำเร็จ) → PR #139 DRAFT. **NOT MERGED / NOT PUBLISHED / NOT APPROVED**.

## เปลี่ยนอะไรจาก R30-F

- แก้เลขหน้าซ้อน: ตัดเลขหน้าของ PDF เก่าออกจาก **38 หน้า** (หน้า 4–19 และ 22–43) ด้วยการลบข้อความจริง ไม่ใช่ซ่อนข้อความ. คงเลขหน้าปัจจุบัน `NN / 44` และปุ่ม **กลับสารบัญ**.
- บทสรุปผู้บริหารหน้า 2 แสดง **8 โรงเรียน, 20 คณะ/ฝ่าย, 250 รายการมอบหมาย, 236 รายการแข่งขัน**. `250` เป็น **จำนวนรายการมอบหมาย** ในบัญชีร่าง **ไม่ใช่ 250 คนไม่ซ้ำกัน** และไม่ใช่จำนวนที่รับรอง.
- แสดง 4 ฝ่ายที่มีรายการมอบหมายสูงสุด (48, 31, 21, 18 ตามลำดับ) และจุดต่างระหว่างประกาศ/บัญชีที่ต้องตรวจรับ.
- สารบัญ/เลขหน้าอื่น/รายชื่อ/ประกาศ/กติกา/QR/เว็บไซต์คงไว้. ไม่เพิ่มผัง/ตารางการแข่งขันกลับเข้ามา.

## เอกสารต้นทาง

- [R30-F PDF 44 หน้า (immutable)](https://drive.google.com/file/d/16TN0HogTdT-0PWqcRnB3hZPc1djVJKvw/view)
- [PR #139](https://github.com/infobwd/nongkum-sports-hub/pull/139)
- [แผน R30-G](PLAN_PAGE_NUMBER_EXECUTIVE_COMMITTEE_INFO_20261115.md)

## สร้างซ้ำ

ใช้ Python 3, PyMuPDF, WeasyPrint, qrcode, Pillow, numpy, OpenCV และฟอนต์ไทย Noto Sans Thai หรือ Waree ที่ติดตั้งในเครื่อง (ไม่แจกฟอนต์ใน ZIP):

```bash
python build_r30g.py --source R30F.pdf --out R30G.pdf --workdir work
python qa_r30g.py --before R30F.pdf --after R30G.pdf --workdir work
```

**ข้อจำกัด:** ต้องตรวจคำสั่งลงนาม รายชื่อ/สังกัด สิทธิ์เปิด Google Drive พิมพ์จริง และโทรศัพท์ Safari/Chrome/LINE ก่อนเผยแพร่. ไม่แก้ผลหรืออันดับหรือข้อมูลแข่งขันในระบบ.

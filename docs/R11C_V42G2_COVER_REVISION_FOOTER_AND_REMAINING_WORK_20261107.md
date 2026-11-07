# R11C V4.2-G2 — เตรียมปก Full Photo V2 + ท้ายหน้าระบุแก้ไขล่าสุด และแผนสูจิบัตรที่ค้าง

**วันที่:** 7 พฤศจิกายน 2569 (Asia/Bangkok)
**สถานะ:** IMPLEMENTATION PLAN / REVIEW ONLY / ไม่ใช่การอนุมัติใช้ภาพหรือเผยแพร่
**ฐานล่าสุด:** `main` ที่ `42a2af2f91cb9bb24f32dde5da3bc7a76d76f6e8` หลัง PR #104; N3-A/N3-B/PR #103 รวมเล่มประกาศ PR82 11 หน้าเสร็จและ Merge
**ขอบเขตเปลี่ยน:** `scripts/docs/v42_cover.py`, `scripts/docs/build-v4-full.py`, QA/CI และเอกสารแผน. ห้ามแก้ 236 fixture JSON/กติกา/ผล/รายชื่อกรรมการ/บรรทัดประกาศ PR82.

## 1. ตรวจต้นแบบจริงก่อนแก้

- `docs/R11C_V42_VIS_COVER_A4_LAYOUT_TRIAL_20261107.md` หมวด 8 ยืนยัน **Full Photo Cover V2** เป็นแบบที่ผู้จัดเลือก โดย *การอนุมัติด้านดีไซน์ไม่เท่ากับอนุญาตเผยแพร่ภาพบุคคล*. คงวันและสนาม ชื่อ `มิตรภาพเกมส์ 2569` และ typography ที่ผ่านตรวจแล้ว
- `docs/R11C_V42G_COVER_TYPOGRAPHY_INTEGRATION_PLAN_20261107.md` ระบุ G1 เป็น fallback สำหรับกรณี image gate ยังไม่ผ่าน. G2 ต้องใช้ภาพที่ผู้จัดเลือกจริง; ไม่สร้างหรือแทนภาพด้วยภาพคนอื่น
- ต้นแบบรูปภาพแนวตั้งที่เคยตรวจขนาดประมาณ **1055 × 1491 พิกเซล** ไม่ถึง 300dpi แบบเต็ม A4. ต้องตรวจ original resolution/license ก่อนถือเป็น print master; รูปมีบุคคล/เด็กต้องไม่ commit หรือ upload เป็น GitHub Actions artifact
- **ข้อจำกัดปัจจุบัน:** Google Drive plugin บัญชีนี้ตอบ `link_id must identify an eligible linked account` เมื่อค้นหาไฟล์ปก; จึงยัง fetch/verify ภาพ Full Photo V2 ตัวจริงไม่ได้. ไฟล์ภาพแนบในสภาพแวดล้อมปัจจุบันเป็น screenshot ปก G1 และ screenshot ประกาศ PR82 ไม่ใช่ photo master. ห้ามสรุปว่า G2 full photo ลง PDF แล้ว

## 2. กรอบการดำเนินงานรอบนี้

### G2 cover plumbing (ไม่แก้ภาพ/ไม่แสดงภาพอื่นแทน)
1. เพิ่ม `cover_html(photo_uri=None)` / `cover_css()` สำหรับหน้าปก A4 Photo V2 ที่คง **ข้อความไทยเป็น text layer**; กรอบภาพเต็มหน้า, อ่านชื่อบนภาพได้, พื้นเงา/gradient overlay, ส่วนวันสนามอยู่ตำแหน่งล่างตามสไตล์เดิม.
2. ใน `build-v4-full.py` รองรับ **`--cover-photo PATH` สำหรับ photo ที่ได้รับการระบุจากผู้จัด** และตรวจว่านามสกุล/ชนิดรูป JPEG/PNG จริง, portrait aspect, pixel dimensions, ไม่เปลี่ยนอัตราส่วนรูป; แจ้ง effective print DPI จากขนาดจริง
3. ยังไม่อนุญาตให้ GitHub Actions ดาวน์โหลดรูป Drive ส่วนตัวมาเอง, ไม่ commit ภาพบุคคล และไม่ฝังภาพที่ยังไม่ผ่านสิทธิ์ลง artifact สาธารณะ. การ build CI default ต้องคง G1 fallback และบอกว่า G2 full-photo **pending**
4. หากภาพจริงพร้อม ให้สร้าง local/private PDF review ก่อน, รับรองการ crop/หน้าตา/สิทธิ์และคุณภาพแยก แล้วค่อยออกรุ่นภาพปกฉบับเผยแพร่.

### ท้ายหน้าทุกหน้า — “ปรับปรุงล่าสุด” พร้อมเวลาไทย
1. ตีความ `แก้ไขล่าสุด` เป็นเวลา **commit revision ของเล่ม** (source revision) ไม่ใช่เวลาที่กด Generate/re-run CI แบบไม่มีการแก้ไขเนื้อหา; ใช้ `git show -s --format=%cI HEAD` และแปลงเป็น `Asia/Bangkok` (UTC+7) จริง. ห้ามเดาวันเวลา.
2. PDF สามส่วนต้องแสดงเวลาเดียวกัน: เนื้อหาใหม่, ประกาศ PR82 ที่ฝัง PDF 11 หน้า, และภาคผนวก V3 ที่คง 17 หน้า. รวมปกด้วยในฐานะ metadata ฉบับรวมเล่ม; ใช้ข้อความเล็กที่ขอบล่างโดยไม่ทับชื่อ/การลงนาม/เนื้อหา PDF เก่า
3. ไม่ทำลายภาพ PR82 ที่ผู้จัดรับแล้ว. หลังประทับ timestamp ทดสอบ **visual/text parity เฉพาะขอบเขตเนื้อหาเดิม** กับ baseline PR82 และตรวจส่วนท้ายที่เพิ่มแยกต่างหาก. หน้าประกาศแม่แบบ original ใน Google Drive ไม่ถูกเปลี่ยน
4. เก็บ `source_revision_sha`, `source_last_modified_iso`, `source_last_modified_bangkok`, `timestamp_footer_pages` ใน QA manifest; ตรวจ footer ครบทุกหน้า 125 หน้า (หรือจำนวนจริง), all A4 และไม่มีหน้าซ้ำ.
5. หากเครื่องมือไม่มี git metadata ให้ **fail closed** ใน CI; สำหรับ local preview อนุญาต explicit `--last-updated-iso` เท่านั้น. ไม่อ้างว่าเวลา build คือเวลาแก้ไขล่าสุด

## 3. QA & Release gates

- [ ] ฟังก์ชัน Photo V2 รับเฉพาะภาพผู้จัดที่มีหลักฐาน provenance; ไม่มีการใช้ภาพ screenshot/ภาพ AI แทน
- [ ] G1 fallback CI rebuild ผ่าน และระบุ `selected_cover_design=full_photo_v2` / `rendered_cover_design=g1_text_only_fallback` จนกว่า image จริงพร้อม
- [ ] วันที่/เวลาไทยแสดงครบทุกหน้า รวม PR82 11 หน้า / 17 หน้า appendix / หน้าแรก; มี SHA timestamp ที่ตรวจย้อนจาก git
- [ ] PR82 11 หน้า source content + typography คงเดิม, ข้อความต้นฉบับ 341/20; 236 fixtures/250 committee/486 anchors/17 appendix/6 organizer notes ครบ
- [ ] เปรียบเทียบ render ต้น/กลาง/ท้ายเล่ม ไม่มีข้อความเวลาไปทับ footers เดิม; ทดสอบ Safari/LINE/iPhone ก่อน public
- [ ] GitHub PR พร้อม CI PASS ก่อน Merge; PDF เป็น **REVIEW ONLY** ไม่เปลี่ยน live website PDF
- [ ] หลัง QA, upload Drive revision-only หากบัญชีเชื่อมต่อพร้อมจริง/connector ยอมรับ source file; readback metadata. ไม่อ้างว่า upload สำเร็จหากไม่มี Drive ID

## 4. แผนคงเหลือหลัง N3-B

| ลำดับ | งาน | สถานะ/เกณฑ์จบ |
|---|---|---|
| G2 full-photo | **รอภาพจริง/สิทธิ์/300dpi print quality**; pipeline จะพร้อม แต่ไม่ถือเป็น final cover หากไม่มี asset ที่ตรวจได้ |
| Footer revision timestamp | **ดำเนินใน PR นี้**: timestamp จริงของ revision + QA ทุกหน้า |
| R20 bracket 6 groups | **รอมติผู้จัด**: volleyball 12 ช/ญ อ้างเลขชิงสลับ, takraw 12 หญิงคู่ 24, petanque 10 ชายรายชื่อและคู่ซ้ำ, shootout text typo; tug-of-war 12 หญิง bye ตรวจแล้ว |
| 12–13 Nov petanque | **เร่งด่วน** ยืนยัน 24 คู่นอกรอบ/คอร์ต/สนามย่อย/เวลาและรายชื่อทีม |
| Committee/announcement | PR82 PDF layout ใช้แล้ว; **ชื่อ ตำแหน่ง ข้อความแต่งตั้ง/เลขที่/วันลงนามยังต้องตรวจรับ** ไม่ใช่ประกาศที่มีผลบังคับใช้ |
| Rules / scores | เกณฑ์ถ้วย 5/3/2 และฟุตบอล 3/1/0 อยู่ใน draft; กติกาย่อย/การจัดอันดับ/เหตุการณ์ใบเหลืองใบแดงต้องให้กรรมการยืนยัน |
| V3 appendix | 17 หน้ายังแนบไว้; ต้องทำ coverage crosswalk ทีละหน้า ก่อนตัดของเก่า |
| R12 athletes | รับรายชื่อจริง 8 โรงเรียนแบบ private แล้วประเมินนักกีฬาแข่งซ้ำ/เวลา/พัก |
| R11E release | ตรวจพิมพ์ A4, กระบวนการเซ็นรับรอง, PDF/Drive/Docs/web version sync, mobile QA, rollback และอนุญาตเผยแพร่ explicit |

**ห้ามลดสถานะงาน**: Merge, Build, Drive review upload ไม่เท่ากับ published หรือ organizer-accepted. สถานะรูปประกอบ/รายชื่อ/ผังสายต้องแยกตามหลักฐาน.

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

## 5. ผลดำเนินการจริงหลัง PR #105 — 7 พฤศจิกายน 2569

**MERGED / G2 PRIVATE COVER SLOT READY / FOOTER COMPLETED / PDF REVIEW QA PASS** — PR [#105](https://github.com/infobwd/nongkum-sports-hub/pull/105), merge SHA `d14f598bc7803e10eb64d6c40948eb1c35bf2216`.

- เพิ่ม `cover_g2_html()/cover_g2_css()` เตรียม A4 Full Photo V2 แบบ **image input จาก private path ที่ผู้จัดเลือกจริง**; รองรับ `--cover-photo` ใน builder และบันทึกภาพ portrait size/effective DPI; ข้อความไทยแยก text layer, ไม่ใช้ภาพตัวอย่างสร้างใหม่แทนภาพจริง
- เพิ่ม source/regression test `test-v42g2-footer.py`; สร้างไฟล์ทดสอบหน้าเดียวจาก **ภาพสังเคราะห์สีล้วนที่ไม่มีบุคคล** เพื่อทดสอบ CSS เท่านั้น ไม่ใช่ต้นแบบภาพปกที่ผ่านอนุมัติ
- Google Drive plugin ในรอบนี้ไม่สามารถ fetch รูปเดิมได้: `link_id must identify an eligible linked account`; **G2 real photo still BLOCKED**. CI PDF จึงคง **G1 fallback** (ไม่อ้างว่าปก Full Photo ลงแล้ว), ตัวเลือก G2 ต้องรอสิทธิ์ไฟล์และภาพต้นฉบับพร้อม รวมถึงสิทธิ์เผยแพร่/300dpi print gate แยก
- เพิ่ม footer **“ปรับปรุงล่าสุด … เวลา … น.”** ผ่าน `scripts/docs/v42_revision_footer.py`: stamp PDF **ครบทั้ง 125 หน้า A4** รวม cover, PR82 PDF 11 หน้า, 17 หน้า V3 appendix; ใช้เวลา commit มี timezone แล้วแปลง Asia/Bangkok และเก็บ SHA ใน QA manifest. **ไม่ใช้เวลาที่กดสร้างไฟล์ใหม่โดยไม่มีการแก้เนื้อหา**
- Artifact ล่าสุดจาก PR head: `ปรับปรุงล่าสุด 7 พ.ย. 2569 เวลา 14:53 น.`, revision SHA `9569970044f50b0ab1e71d2daccd35598dfa636a`; PDF **125 หน้า**, 236 รายการแข่งขัน, 250 กรรมการ, 486 anchor positions, 17 appendix pages, 6 bracket notes. ประกาศ PR82 **หน้า 8–18** มีข้อความ/ภาพ **11/11 หน้าเดิมครบ โดยไม่รวมแถบเวลาที่เพิ่ม**, ตารางกรรมการเริ่มหน้า 19
- GitHub Actions [42353115707](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42353115707) review PDF **SUCCESS**, Validate draft data **SUCCESS**, `souvenir-v42f-pdf-preflight.json` status `review_only_pass`
- ตรวจภาพที่เรนเดอร์หน้า 1/8/18/19/125 ว่า timestamp ไม่ทับเนื้อหาประกาศหรือผังสายท้ายเล่ม; โดยตั้งใจให้เป็นตัวอักษรเล็กที่ขอบล่างเพื่อไม่แย่งพื้นที่จากต้นฉบับ
- **ยังไม่เผยแพร่** PDF บน GitHub Pages, ไม่แตะข้อมูลผล/ตาราง/คำสั่ง, ไม่เขียนทับ PR82 golden file, ไม่ย้ายรูป Drive และ **ยังไม่มีการยืนยันว่าอัปโหลด PDF รุ่นนี้เข้า Drive สำเร็จ** จนกว่าจะมี Drive ID/readback ใหม่

### งานคงเหลือลำดับปฏิบัติ

1. **P0 เปตองนอกรอบ 12–13 พ.ย.** ตรวจสนามย่อย/คู่ 24 คู่/ทีม/เวลา และรับรองก่อนแจกกรรมการ
2. **P0 ผังสาย 6 กลุ่ม** รับรองการแก้จากผู้จัด โดยเฉพาะเปตอง 10 ปีชายชื่อทีมและอ้างเลขคู่ซ้ำ, วอลเลย์บอลคู่ชิงชาย/หญิง, ตะกร้อหญิงคู่ 24; ชักเย่อหญิงยืนยันระบบ bye แล้ว, ยิงจุดโทษ typo text-only
3. **P1 G2 ภาพต้นฉบับ** เปิดสิทธิ์ Drive/ให้ภาพที่เลือกอย่างถูกต้อง, ตรวจสิทธิ์การพิมพ์/เผยแพร่เด็กและ effective 300 dpi หรืออนุมัติใช้ G1 fallback แบบ explicit
4. **P1 กรรมการ/คำสั่ง** ตรวจรายชื่อ 250 แถว, ตำแหน่ง และต้นฉบับประกาศ PR82 341 บรรทัด, เลขที่/วันที่/ผู้ลงนามให้ตรงเอกสารที่ได้รับรอง; ห้ามเติมโดยเดา
5. **P1 กติกา** รอรับรองเกณฑ์ tie-break/discipline/เปตอง และรายการกรีฑา/วัน–เวลายืนยัน
6. **P2 17 หน้า V3 ภาคผนวก** ทำ coverage crosswalk ทีละหน้าแล้วพิจารณาตัดส่วนซ้ำ ไม่ลบต้นฉบับ
7. **P2 R12 นักกีฬา** รับบัญชีรายคนจาก 8 โรงเรียนใน private workspace และตรวจแข่งหลายชนิด/เวลาชนจริง
8. **R11E ก่อนเผยแพร่** รับรองข้อมูล/ภาพ/เอกสาร, A4 print proof, เวลาแก้ไขและฉบับ PDF ที่ใช้งาน, Safari/LINE/iPhone, sync Drive/Docs/web อย่างมี revision/rollback และผู้จัดเซ็นรับรอง explicit

**การตีความสถานะ:** ตัวสร้าง G2 พร้อมแล้ว ≠ มีภาพ G2 จริงใน PDF; PDF review QA PASS ≠ ผู้จัดตรวจรับหรือเผยแพร่ทางการ. สำคัญให้รักษาความแตกต่างนี้ทุกแชท.

## 6. Final source-commit timestamp correctness (PR #107) — ตรวจรับเชิงเทคนิคแล้ว

- **PR [#107](https://github.com/infobwd/nongkum-sports-hub/pull/107) MERGED**, merge SHA `040831990d5aa33a59ebcd16a9df3c61ecb49047`
- พบว่าการ build บน `pull_request` อาจ checkout SHA ชั่วคราว; PR #107 แก้ให้ `actions/checkout` ใช้ head ที่แท้จริงและ full history จากนั้นดึง `git log -1 -- scripts/docs data assets` เพื่อหาการเปลี่ยน *ไฟล์งานจริง* ไม่เปลี่ยนวัน–เวลาเพราะ workflow rerun หรือแก้ docs-only
- Final review artifact จาก PR #107 CI run [42353593511](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42353593511) **SUCCESS** และ Validate draft data ผ่าน; source-edit commit `8db2d05f04fd96ab3fa21bd2a44dfd79f71a8a6f`, แสดงท้ายหน้า **“ปรับปรุงล่าสุด 7 พ.ย. 2569 เวลา 15:00 น.”**
- ตรวจครบ **125/125 หน้า A4**, PDF 125 หน้า/236 fixtures/250 committee/486 anchors/17 V3 appendix, PR82 11/11 content parity above revision footer, 6 bracket notes, ชื่อหน้ากากไทยค้นหาได้และสระ–วรรณยุกต์ไม่มีอักขระแทรก
- รูปใน final PDF **ยังเป็น G1 fallback**; G2 private Full Photo slot ผ่าน unit render 1-page A4 ด้วยภาพสีทดสอบ *ไม่ใช่ภาพผู้จัด*. ยังไม่ได้รับภาพ Full Photo V2 จริงจาก Drive เนื่องจาก account-link plugin error; ไม่ถือว่าปก G2 ตรวจรับหรือเผยแพร่
- ยังคง **review-only ไม่อัปโหลด Google Drive ในรอบนี้** เพราะ Google Drive plugin ไม่พร้อม และไม่แก้ GitHub Pages. ไฟล์ PDF ของ PR #107 เป็นร่างสำหรับผู้จัดตรวจจนกว่า R11E ผ่าน gate.

**บทสรุปงานค้าง:** P0 เปตอง 12–13 พ.ย. และ 6 bracket group approvals; P1 ภาพ G2+rights/300dpi, คำสั่งกรรมการ/กติกา; P2 crosswalk 17 appendix pages/R12 roster privacy; R11E print/mobile/revision/organizer signoff/publishing. เอกสาร snapshot ก่อนหน้าเป็นประวัติ ไม่ใช่สถานะล่าสุด.

## 7. G2 real selected-photo private PDF proof — 7 พฤศจิกายน 2569

**สถานะ: PHOTO SELECTED / PRIVATE PDF REVIEW BUILT / DRIVE UPLOADED & VERIFIED / PRINT & RIGHTS GATES STILL OPEN**

ตามคำสั่งผู้จัดในแชท ให้ใช้ภาพ **`เยาวชนไทยรวมพลังบนสนามกีฬา.png`** ที่มีอยู่ใน Google Drive หมวด `01_ภาพปก` โดยไม่สร้างภาพทดแทนและไม่เปลี่ยนแนว Full Photo V2 / sport-display title ที่ผู้จัดเคยเห็นชอบตาม PR #85.

### สิ่งที่ดำเนินการแล้ว (private runtime, no public source asset)

- อ่าน image file ตัวจริงที่ผู้จัดระบุ: `PNG 1055×1491 px`, **2,391,826 bytes**, SHA-256 `c6ee9f11867eb5aab8d14993687f83d2e98ad568bca2eb4397e200a11bcbd0da`. ตรงชื่อ/ขนาดของ Google Drive file ที่ตรวจ metadata ได้. **ห้ามเผยแพร่ private Drive file ID / image bytes ใน public repo**
- ใช้ภาพนี้เป็นหน้า Full Photo V2 อัตราส่วนใกล้ A4 portrait, ไม่มี crop คน, วางหัวเรื่อง **“มิตรภาพเกมส์ 2569” แบบ sport display** สีขาว–ทองพร้อมเส้นเน้น/เงาบางและพื้นอ่านง่าย; อักษรไทยเป็น PDF text layer ไม่ใช่ตัวอักษรที่ AI วาดลงภาพ. อักขระสระอำแสดงรูปแบบ Unicode render-equivalent `U+0E4D + U+0E32` เพื่อคงสระ–วรรณยุกต์และค้นหาได้
- ทำ **review-only full booklet 125 A4 pages** โดยแทน **เฉพาะหน้า 1** ของไฟล์ review baseline PR #107 ที่ตรวจ QA ไว้แล้ว; ตรวจ rendered pixels + PDF text เทียบกันหลังดำเนินงาน **124/124 หน้าที่เหลือเท่าเดิม**, ไม่มีหน้าใหม่หรือเปลี่ยนเนื้อหาอื่น
- Source PDF baseline SHA-256 `d019c9921841083846acce48516e2eaa88feeeef90e49c54441dc342804c9464`; G2 private PDF preview SHA-256 `7090ec514046264208f4c056c4a8e7ab57c08bd00fc00297ee44af216c0f88dc`, ขนาด **2,995,602 bytes**. ข้อมูลต้นทางในเล่ม: PR82 ประกาศ 11 หน้า, การแข่งขัน 236 รายการ, กรรมการ 250 รายการ, ภาคผนวก V3 17 หน้า และรายการตรวจผังสาย 6 กลุ่ม **อาศัยฐาน QA เดิม; ไม่กล่าวว่า regenerate source audit ในรอบ private cover proof**
- ท้ายกระดาษคงข้อความ **“ปรับปรุงล่าสุด 7 พ.ย. 2569 เวลา 15:00 น.”** ของ *source-edit revision* ในฐานเดิม. ห้ามตีความว่าเป็นเวลาสร้าง PDF หน้า G2 หรือเวลารับรอง/เผยแพร่
- Upload PDF G2 review ใหม่เข้า **โฟลเดอร์สูจิบัตรใน Google Drive** ผ่าน authenticated file reference สำเร็จ; connector readback ตรวจพบชื่อ MIME `application/pdf`, ขนาด **2,995,602 bytes**, parent folder ตรงเป้าหมาย. **เก็บชื่อรุ่นและหลักฐานในแชท ไม่บันทึก Drive IDs/URLs ส่วนตัวใน public repo**. ไม่เขียนทับ PDF N3-B/PR82/V3 หรืออัปโหลดรูปบุคคลลง GitHub
- **ยังไม่เปลี่ยน builder ของ GitHub**, GitHub Pages PDF, official Google Docs, fixtures JSON, results, referee roster หรือคำสั่งลงนาม. ตัวสร้าง `build-v4-full.py --cover-photo` ที่ Merge จาก PR #105 ยังคงรองรับภาพส่วนตัวอยู่แล้ว; private review นี้ใช้วิธี **replace cover page of QA-passed PDF baseline** เพื่อตรวจเร็วและไม่แตะอีก 124 หน้า

### Gate ที่ยังเปิด

1. **Image/children usage rights:** ยังไม่พบหลักฐานสิทธิ์ผู้ถ่าย/ฐานเผยแพร่ภาพเด็กสำหรับการเผยแพร่เป็นทางการ. การเลือกภาพของผู้จัดใช้ได้เพื่อทำ **private PDF proof** แต่ไม่ใช่ release approval
2. **300dpi print master:** `effective_full_page_dpi≈127.5`, ไม่ผ่าน 300dpi; หากจะพิมพ์ A4 คุณภาพสูงต้องได้ภาพต้นฉบับที่ละเอียดขึ้น (ประมาณ 2480×3508 px สำหรับ A4 300dpi) หรือผู้จัดรับรองมาตรฐานพิมพ์ที่ต่ำกว่าอย่างชัดเจนตามการทดสอบพิมพ์จริง
3. **Final visual acceptance:** ให้ผู้จัดเปิด PDF G2 review บน iPhone/LINE และพิมพ์ A4 ทดลอง; ยืนยันว่า crop/คอนทราสต์/title/footer ลงตัว ก่อนอนุมัติเป็นปกใช้งานจริง
4. **Reproducible release build:** เมื่อต้องออกรุ่นทางการ ให้นำภาพที่ผ่าน rights/print gates มาสร้างผ่าน `--cover-photo` จากต้นฉบับที่ได้รับอนุญาต, รัน GitHub/source/page-anchor QA ครบและ R11E. ห้ามนำ private preview ไปแทน live PDF โดยลัดขั้นตอน

**สถานะสรุป:** G2 *ภาพที่ผู้จัดเลือกถูกนำลง PDF ตรวจร่างและเก็บ Drive แล้ว* ≠ `G2 print approved` ≠ `R11E publication approved`.

## 8. G2 title typography correction — selected photo kept, sport masthead needs real style (7 พ.ย. 2569)

**REQUEST / IMPLEMENTATION PLAN FIRST — review-only.** ผู้จัดตรวจ G2 PDF ที่อัปโหลด Drive แล้วและชี้ว่า **ภาพถูก แต่ชื่องานยังเป็นตัวหนาธรรมดา ไม่ตรง sport display ที่อนุมัติ**. ปัญหาเกิดจากการใช้ `NotoThai-Bold` ใน PDF private proof พร้อมเส้นใต้และ shadow ที่ไม่ให้ผลมิติชัดบนเครื่องอ่าน iPhone แม้ว่าฐาน `v42_cover.py` จะระบุ `sport display` ในแผน. **ข้อ 8 ของ `R11C_V42_VIS_COVER_A4_LAYOUT_TRIAL_20261107.md` ยังคงเป็นแม่แบบหลัก** ไม่ย้อนออกแบบปกภาพใหม่.

### ขอบเขตเปลี่ยนเพียง typography หัวเรื่อง
1. **ล็อกภาพเดิม:** `เยาวชนไทยรวมพลังบนสนามกีฬา.png` (PNG 1055×1491; SHA `c6ee9f11867eb5aab8d14993687f83d2e98ad568bca2eb4397e200a11bcbd0da`), crop, gradient, รายละเอียด/วันและสนามและ G2 photo rights gates เดิมไม่เปลี่ยน. ไม่มีภาพบุคคลหรือไฟล์ปกที่มีนักเรียนใน public repo
2. **ปรับ masthead ให้เห็นจากภาพจริง:** ให้ `มิตรภาพเกมส์` ใช้ฟอนต์ไทยน้ำหนัก Black/ExtraBold ที่รองรับสระวรรณยุกต์, ปรับเอียงทั้งคำอย่างนุ่มนวลแบบสปอร์ตโดยไม่แยกสระ; ตัวเลข `2569` เป็นจุดนำสายตา ใช้ shape มิติ/เส้นสปีดสั้น/เส้นขอบรอบ *กรอบชื่อ* เพิ่มชั้นกราฟิกกรมท่า–ทองเหนือพื้นภาพเดิม. **ห้าม rasterize คำไทยเป็นภาพ** หรือวาดตัวอักษรที่ไม่ค้นหาได้
3. **ทดสอบจริง:** เรนเดอร์ PDF A4 ปกเดี่ยวพร้อมภาพจริงใน local private runtime, เปิดดู PNG ขนาดมือถือและ A4, ตรวจ glyph/diacritics, Thai searchable text layer, title not overlapping photo faces or date/venue/status, compare against G2 older cover and approved Full Photo V2 plan
4. **รวมเล่ม review-only 125 A4 pages:** เปลี่ยนหน้า 1 เท่านั้นจาก QA-passed 125-page baseline; พิสูจน์ PDF หน้า 2–125 เป็นข้อความและ pixels ตรง 124/124 หน้า, ช่วงประกาศ PR82 หน้า 8–18, 17 หน้า V3 appendix, 236 fixtures, 250 committee entries, 486 anchor positions ยึดหลักฐาน baseline ไม่แตะ data/ผล/กรรมการ
5. **ป้องกันไม่ให้กลับไปใช้ Bold แบบเดิม:** ปรับ `v42_cover.py` G2 helper ให้ใช้คลาส/typography ใหม่ซ้ำได้ และมี source regression test สะกดข้อความเดิม, Black Thai font fallback, style sport skew/speed accents, native text. Private image+PDF review อาจเก็บ Drive ใหม่โดยไม่ทับ G2 รุ่นก่อน; **PDF official/published URL ไม่เปลี่ยน**
6. แยกสถานะ **`G2 sport-title proof built` ≠ `user visual accepted` ≠ `image rights/300dpi approved` ≠ `R11E official release`**. ไม่ลงวันที่/เวลารับรองเอง

**งานร่วมกัน:** branch นี้แตะเฉพาะ helper ปก/การตรวจ typography และแผน; ไม่แก้ `scripts/docs/build-v4-full.py` ซึ่งอาจมีงาน R11E/ผังสายอื่น, ไม่เปลี่ยนโปรแกรมแข่ง JSON หรือ PR82 notice.

### ผลลงมือแก้ Typography จริง — G2 Sport Masthead V2.1 (7 พ.ย. 2569)

**IMPLEMENTED IN REVIEW / PRIVATE PDF QA PASSED / GOOGLE DRIVE REVIEW UPLOADED / VISUAL USER ACCEPTANCE PENDING**

- ติดตั้ง G2 helper `cover_g2_html()/cover_g2_css()` ใน `scripts/docs/v42_cover.py`: อักษร **Noto Sans Thai Black** 43pt, skew ทั้งคำ -7°, navy tapered panel + gold highlight/speed stripes; ปี 2569 ตัวหนา 70pt + plate/slanted speed accents. ตัวสะกดจริงยังเป็น text layer ค้นหาได้; decoration ไม่แทรกในคำหรือสระ–วรรณยุกต์. ระยะเผื่อข้อความและแผงด้านล่างไม่เปลี่ยน
- เพิ่ม source & synthetic-image PDF layout regression ใน `scripts/docs/test-v42g2-footer.py`: ตรวจว่า title ไม่กลับไปเป็น Bold ทั่วไป, มี `data-title-revision`, ชื่อไทยไม่แยกบรรทัด, การค้นหาใน PDF ได้, A4 1 หน้า, ตัวเลขเป็น native text และ local-only image gate. **ไม่ได้ใช้ภาพเด็กใน CI**
- GitHub Actions source/regression และ full booklet fallback QA ของ [PR #111](https://github.com/infobwd/nongkum-sports-hub/pull/111) **PASS**: `Validate draft data` และ `R11C V42 organizer review PDF`, run `42358089660` SUCCESS. CI ไม่ได้ฝังภาพจริงเพราะเป็น private source; private preview ด้านล่างทำต่างหาก
- Private G2 PDF review V2.1 สร้างจากไฟล์ตรวจร่าง 125 หน้าเดิม โดยเปลี่ยนเฉพาะหน้า 1; **หน้า 2–125 text + rendered pixels 124/124 เหมือนเดิม**, A4 125 หน้า, รูปเดิม SHA `c6ee9f11867eb5aab8d14993687f83d2e98ad568bca2eb4397e200a11bcbd0da`; ฟอนต์หัวเรื่องค้นหา/คัดลอกได้. Output PDF SHA-256 `0621f618912cee5ab0b16d4da553ae49f6250836ce0e760a46a4d901dfbd9388` ขนาด **3,002,632 bytes**
- Upload private PDF review **รุ่นใหม่ชื่อ `MittraphapGames_2569_G2_SportMasthead_V21_125pages_REVIEW.pdf`** ไปโฟลเดอร์สูจิบัตร Drive สำเร็จ และตรวจ metadata readback: MIME `application/pdf`, parent ถูกต้อง, ขนาด 3,002,632 bytes; ไม่ทับ G2 V2, PR82 หรือ N3-B เดิม; ไม่ commit private image or Drive ID ลง GitHub
- **Print & release gates ยังไม่ผ่าน:** ภาพ 1055×1491 px (~127.5dpi A4), rights/children image use unverified, ยังไม่ผ่านผู้จัดดูหน้าปก V2.1 จาก PDF จริงบนมือถือ/กระดาษ; R11E ยังไม่อนุมัติ. อย่าสับสนการ Merge กับการตรวจรับรูปลักษณ์จริง.

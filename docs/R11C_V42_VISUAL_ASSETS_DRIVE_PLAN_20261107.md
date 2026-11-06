# R11C-V4.2-VIS — Sports Magazine Visual Assets & Google Drive Handoff

**วันที่:** 7 พฤศจิกายน 2569  
**สถานะ:** PLAN / HANDOFF ONLY — บันทึกแผนแยกเพื่อส่งต่องาน; **ยังไม่ดึงภาพเข้า builder, ไม่สร้างหรือเผยแพร่ PDF ใหม่**  
**Repository:** infobwd/nongkum-sports-hub  
**งานเดิมที่ต่อยอด:** [R11C V4.2 แผนหลัก](R11C_V42_EDITORIAL_RULES_BRACKETS_PLAN_20261107.md) • [V4.2-A QA](R11C_V42A_OFFICIAL_SOURCE_QA_20261107.md) • [V4.1 QA](R11C_V41_IMPLEMENTATION_QA_20261106.md)  
**คู่มือพรอมป์ต์:** [R11C V4.2 Visual Image Prompts](R11C_V42_VISUAL_IMAGE_PROMPTS_20261107.md)

## 1. เป้าหมายและขอบเขต

เพิ่มอัตลักษณ์ **นิตยสารกีฬาเยาวชน (Youth Sports Editorial)** ให้สูจิบัตร “มิตรภาพเกมส์ 2569” โดยใช้ **Google Drive เป็นคลังภาพต้นทาง** และใช้ภาพที่ผ่านการคัดเลือกเท่านั้นในตัวสร้างสูจิบัตรเดิม ยังคงข้อมูลและสิทธิ์ตามระบบเดิม ไม่ตั้งระบบจัดเก็บนักกีฬาหรือ PDF generator ใหม่

**หลักการ:** ภาพใหญ่เฉพาะหน้าปก/หน้าเปิดหมวด; หน้าตาราง/ราชการอ่านชัด ไม่ตกแต่งทับข้อความ; ใช้สีกรมท่า–ทองร่วมกันทั้งเล่ม และสีโรงเรียนตามข้อมูลที่ตรวจแล้ว ไม่เปลี่ยนข้อมูลการแข่งขันเพราะการออกแบบ

### สิ่งที่ได้จากแผนนี้
- taxonomy โฟลเดอร์รูปภาพใน Google Drive, ชนิดไฟล์, ข้อกำหนดภาพและขั้นคัดเลือก
- prompt library รายหมวด รวม 9 ชนิดกีฬา และการใช้บุคคล/สถานที่อ้างอิงอย่างปลอดภัย
- asset contract และแนวทาง handoff จาก Drive → local approved assets → PDF ที่ฝังภาพในเล่ม
- prototype หกหน้า + QA สำหรับ PDF A4/มือถือ/สีขาวดำ/ข้อความ/ความเป็นทางการ
- เส้นแบ่งหน้าที่กับ V4.2-A ถึง V4.2-F, R19K, R20 และ R11E

### สถานะ baseline (ตรวจ 7 พ.ย. 2569)
- V4.2-A เรื่องคำสั่ง/ประกาศ **merged PR #80**; มี structured text จาก V3 หน้า 6–16 จำนวน 11 หน้า / 20 หมวดตามเอกสาร QA
- V4.2-B–F เป็นงานจัดเนื้อหา/กติกา/สี/ผังสาย/QA ที่ระบุในแผนหลัก งานภาพต้องรอต่อเข้ากับ layout ที่ถูกต้อง ไม่ยึดหน้ากระดาษเป็นค่าคงที่
- ข้อมูล review baseline: 236 โปรแกรม (186 คู่ + กรีฑา 50), 250 กรรมการ, 486 page-map anchors; จำนวนอาจเปลี่ยนได้เฉพาะตาม revision ที่มีหลักฐาน
- คลังรูปภาพ Google Drive มีอยู่แล้ว แยกจากโฟลเดอร์ภาพถ่ายประจำสนาม และได้สร้างหมวดหลัก **7 โฟลเดอร์** พร้อมโฟลเดอร์กีฬา **9 ชนิด**; เริ่มจากคลังว่างในรอบตรวจแรก
- **สำคัญ:** Repository เป็น public; ไม่บันทึก Drive file IDs / ลิงก์ private / ภาพหน้าบุคคลที่ไม่ยินยอม / รายชื่อนักเรียน / token ลง repo

## 2. โครงสร้างคลังภาพบน Google Drive

ให้ค้นใน Shared Drive ของโครงการจากชื่อโฟลเดอร์ **“รูปภาพประกอบสูจิบัตร”** (อยู่ใต้โฟลเดอร์งานปี 2569) ด้วย Google Drive connector ที่ผู้ใช้อนุญาต; **อย่าใส่ Drive folder ID ของพื้นที่ภายในลง public repository**

หมวดที่สร้างไว้:
1. 01_ภาพปก
2. 02_สนามและบรรยากาศ
3. 03_ภาพกีฬา — 01_ฟุตบอล, 02_ยิงจุดโทษ, 03_ฟุตซอล, 04_วอลเลย์บอล, 05_เซปักตะกร้อ, 06_เปตอง, 07_เทเบิลเทนนิส, 08_ชักเย่อ, 09_กรีฑา
4. 04_โรงเรียนและตราสัญลักษณ์
5. 05_ถ้วยรางวัลและพิธีการ
6. 06_ลวดลายพื้นหลัง
7. 07_ภาพผ่านการคัดเลือก

**ภาพถ่ายประจำสนาม** (แยกตาม 12, 13, 16–20 พ.ย.) มีจุดประสงค์เป็นภาพเหตุการณ์จริงภาคสนาม; **ไม่ใช่โฟลเดอร์ภาพประกอบก่อนการแข่งขัน** และห้ามอ้างภาพ AI เป็นภาพการแข่งขันจริง

## 3. อัตลักษณ์การออกแบบ (Visual System)

| บทบาท | สีตัวอย่าง | หมายเหตุ |
|---|---|---|
| Primary navy | #153451 | พื้นปก/แถบหัวเรื่อง |
| Editorial gold | #E8BC52 | แถบเน้น/เส้นแบ่ง |
| Sport sky-blue | #62ACD8 | สื่อเคลื่อนไหวอย่างพอดี |
| Reading ground | #F5F7FA / white | พื้นตารางให้ตัดกับตัวอักษร |
| Action coral | #EC7952 | แต้มสีรองตามหมวด ไม่ใช้แทนสถานะข้อมูล |

- ภาพ photography ควรมีอารมณ์นักกีฬานักเรียนไทย สนามจริง/สมจริง ความเป็นมิตรและน้ำใจนักกีฬา ไม่ใช่การแข่งขันมืออาชีพหรือฉากเกินจริง
- A4 portrait เป็น default สำหรับ cover/section divider; landscape 16:9 เฉพาะ hero band/สถานที่ที่นำไป crop; artwork ปกเป้าหมาย 2480×3508 px ที่ 300 dpi เมื่อต้นทางรองรับ
- Negative space 25–35% ของบริเวณหัวเรื่อง; **ไม่ขอให้โมเดลภาพสร้างอักษรไทยจริง ตราทางการ สีเสื้อ/ตราโรงเรียนที่ไม่ได้ตรวจ ชื่อทีม วันเวลา หรือคะแนน** ให้วางตัวอักษรและโลโก้ที่ตรวจรับแยกเป็นชั้น layout
- หน้าราชการ/ประกาศใช้ Sarabun แบบมีหัวตาม V4.2-A และพื้นสว่าง; ห้ามสอดภาพ AI หลังตราครุฑ/ลายเซ็น/ข้อความสั่งการหรือทำให้ดูเหมือนลงนามแล้ว
- หน้าโปรแกรม/กติกา/ทะเบียนกรรมการต้องคง white/near-white reading panel; texture เบามากเฉพาะมุม/หัว ไม่ใช้ full-bleed หลังข้อมูล; PDF ขาวดำต้องอ่านได้
- 8 สีโรงเรียนต้องใช้การ map จากข้อมูลที่ตรวจแล้วตาม V42-D; hex ในชุด Visual System **ไม่ใช่สีประจำโรงเรียน**

## 4. Editorial placement map

| หน้า/เนื้อหา | ภาพที่ควรมี | ข้อจำกัด |
|---|---|---|
| ปก | คอลลาจ 4–5 ชนิดกีฬา + พื้นสนามเบลอ | full bleed ได้; เว้นพาดหัว; ป้ายสถานะ draft ต้องมองเห็น |
| พิธีเปิด/พิธีปิด | ภาพสนาม/ธง/ถ้วยใน hero band ไม่เกินราว 1/3 หน้า | เนื้อหา timeline ตาม source; ไม่สร้างเวลาเพิ่ม; ข้อความช่วง 08.45 ต้องครบ |
| สีประจำ 8 โรงเรียน | swatch และตราโรงเรียนต้นฉบับที่มีสิทธิ์ | ไม่สร้างตรา AI หรือแก้สีแบบคาดเดา |
| คำปฏิญาณ/น้ำใจนักกีฬา | ภาพจับมือ/ร่วมกัน กีฬาเยาวชน | ข้อความต้นฉบับทุกคำอยู่ใน text layer |
| หน้าเปิดกีฬา 9 ชนิด | 1 hero ต่อกีฬา, editorial crop | กลุ่มกีฬาไม่ใช่ตัวกำหนด fixture; ไม่แทนตารางเดิม |
| คู่แข่งขัน/Match Day | ภาพขนาดเล็กในหัวหมวดหรือการ์ดคู่เด่นเท่านั้น | คง fixture.id, วัน, เวลา, สถานะร่าง/ยืนยัน, วงเล็บ/รอบตาม source |
| รายชื่อคณะกรรมการ/ประกาศ | พื้นขาว + เส้นสี/texture อ่อนมาก | ห้ามปิดทับชื่อ หน้าที่ หมายเลข หรือตราทางการ |
| กติกา/ผังสาย | ไอคอนเล็กหรือ vector ที่ไม่มีผลต่อความหมาย | ไม่สร้างกติกาหรือ bracket ด้วย AI; ใช้ data-driven SVG |
| ภาคผนวก V3 | คง source ภาคผนวกตาม coverage gate V42-E | ห้ามตกแต่งจนตรวจเทียบต้นฉบับไม่ได้ |

**ข้อเสนอเริ่มต้น:** ภาพหลัก 12–16 ภาพ (ปก 1–2, สถานที่ 1–2, กีฬา 9, พิธี/คำปฏิญาณ 2–3, texture 1–2) แล้วเลือกภาพที่ใช้จริงก่อนสร้างหลายเวอร์ชัน

## 5. Identity, rights, and truthful imagery

- ถ้าแนบภาพนายแบบ/นางแบบต้นฉบับ: ใช้ภาพจากบุคคลที่ได้รับอนุญาต รวมถึงสิทธิ์ใช้ภาพสำหรับการสร้าง/ดัดแปลงและเผยแพร่ ไม่ทำให้เด็กดูเป็นผู้ชนะหรือเข้าร่วมรายการที่ไม่มีหลักฐาน
- ห้ามอัปโหลด **ภาพอ้างอิงที่ระบุตัวเด็กได้** ลง repo public หรือโฟลเดอร์ที่เปิด public link; ควรเก็บในพื้นที่จำกัดสิทธิ์แยกต่างหาก ส่งเฉพาะภาพ artwork ที่ตรวจสิทธิ์แล้ว
- ระบุ provenance ในทะเบียนภายใน: ORIGINAL_PHOTO / AI_GENERATED / AI_EDITED / GRAPHIC_ASSET, ผู้ให้สิทธิ์ (ภายใน), สถานะการตรวจ, คนรับรอง, intended_page และ version
- หากเป็นภาพสถานที่จริง: แนบภาพสนามโรงเรียนบ้านหนองกระทุ่มจริงเพื่อรักษาสัดส่วนและตำแหน่งอาคาร; **ถ้าไม่มีภาพต้นฉบับ ให้สร้างภาพสนามทั่วไปโดยไม่กล่าวว่าเป็นสนามจริง**
- ใช้ถ้อยคำ “ภาพประกอบ” เมื่อเป็นฉากจำลอง/ภาพ AI; ภาพกีฬาต้องมีอุปกรณ์และท่าทางถูกต้อง ไม่สร้างโลโก้/สปอนเซอร์/ใบหน้าซ้ำผิดธรรมชาติ
- ภาพผู้อำนวยการ/กรรมการ/เด็กจริงที่เกี่ยวกับเอกสารทางการ ให้ใช้ภาพจริงที่ได้รับสิทธิ์ ไม่เอา AI สร้างภาพการรับรองหรือพิธีลงนาม

## 6. Drive → PDF Integration Plan (NOT IMPLEMENTED)

**ระยะ 1: Capture / Curation (Drive)**
1. ค้นโฟลเดอร์แยกประเภทด้วย connector ที่มีสิทธิ์; ตรวจไฟล์และการแชร์ก่อนนำไปใช้
2. สร้าง/แก้ภาพจาก [prompt library](R11C_V42_VISUAL_IMAGE_PROMPTS_20261107.md) โดยเก็บรุ่นงานในหมวดนั้น และตรวจใบหน้าหากมีภาพอ้างอิง
3. เลือก artwork ที่ผ่านสิทธิ์/เนื้อหา/กายวิภาค/ประเภทกีฬา/การพิมพ์ แล้วเก็บใน **07_ภาพผ่านการคัดเลือก**; โฟลเดอร์นี้ **ไม่ได้หมายความว่าโปรแกรมแข่งขัน approved**

**ระยะ 2: Asset handoff (local / private mapping)**
4. ผู้ดูแล export เฉพาะไฟล์ผ่านคัดเลือกจาก Drive เป็นไฟล์ภาพที่ใช้ทำเล่มจริงผ่านช่องทางที่ได้รับอนุญาต
5. ให้ builder รับเฉพาะไฟล์ที่มีอยู่ใน local approved export พร้อม **manifest ที่เป็น public-safe** เช่น asset_key, category, intended_slot, filename, sha256, attribution_display, rights_ok, review_status, image_kind; ไม่เก็บ private Drive ID / token / ชื่อนักเรียน
6. หากไม่มีไฟล์/rights ยังไม่ผ่าน ให้ fallback เป็นพื้นสี/กราฟิกเดิม **ไม่ให้ build fail เพราะภาพตกแต่ง**; แต่ให้ QA แจ้ง artwork missing ชัด
7. ใน PDF ต้อง **embed** ภาพเป็น binary assets ไม่อาศัย live Google Drive URL ระหว่างเปิดหน้า; จำกัดขนาดรูป/บีบอัดภาพโดยไม่เสียความคมของหน้า A4
8. GitHub Actions ไม่สามารถอ่าน Drive ส่วนตัวได้ด้วยตัวเองโดยไม่มี credential ที่ได้รับอนุมัติ: **ห้ามเพิ่ม token หรือ service-account key ใน repo / PR / manifest**; ห้ามทำ sync อัตโนมัติในเฟสแผนนี้

**ระยะ 3: Renderer handoff (future independent PR)**
9. ใช้ตัวสร้างเดิม **scripts/docs/build-v4-full.py** และโมดูลที่เกี่ยวข้องเท่านั้น; สร้าง renderer helper เป็นไฟล์ใหม่ได้เมื่อจำเป็น ไม่สร้าง PDF generator ชุดที่สอง
10. ใส่ภาพใน section slots หลังงาน V42-B/C/D/E ตามลำดับที่พร้อม ไม่แก้ content-source model, bracket logic, committee text หรือ school palette โดยงานภาพ
11. สร้าง HTML/PDF review artifact และ source-to-real-page map ใหม่; number of pages can change, **stable anchors ห้ามหาย**
12. ไม่มีการอัปโหลดทับ PDF V2/V3, หน้าเว็บหรือ Docs อัตโนมัติ; ต้องผ่าน R11E content/publication gate แยก

**ตัวอย่าง public-safe manifest (แนวคิด ไม่ใช่ไฟล์ที่สร้างแล้ว):**

~~~json
{
  "asset_key": "sport-football-hero-v01",
  "category": "sport",
  "sport_id": "football",
  "filename": "FOOTBALL_v01_APPROVED.webp",
  "intended_slot": "sport_divider",
  "image_kind": "AI_GENERATED",
  "review_status": "selected_for_design",
  "rights_ok": true,
  "sha256": "computed-at-export"
}
~~~

*หมายเหตุ:* การคัดเลือก “approved artwork” เป็นคนละเรื่องกับการรับรองคู่แข่งขัน/คำสั่ง; ต้องใช้สถานะแยกกันเสมอ

## 7. Six-page prototype & Acceptance Gate

สร้าง PDF preview ตัวอย่าง **6 รูปแบบหน้า** ก่อน rollout:
1. ปก (hero cover + ชื่อเรื่องจริง + ป้ายร่าง)
2. พิธีเปิด (hero band + เวลา/ข้อความ 08.45 ครบ)
3. สีโรงเรียนและคำปฏิญาณ (swatch ที่ตรวจ + editorial quote)
4. หน้าเปิดกีฬา (อย่างน้อยฟุตบอลและเปตอง crop ต่างกัน)
5. Match Day (การ์ดคู่และตารางกีฬา พร้อม fixture ID/status)
6. ทะเบียนกรรมการหรือประกาศราชการ (พื้นที่ขาว + Sarabun มีหัว; **ไม่มีภาพทับข้อความ**)

**QA ต้องผ่าน:**
- A4 พิมพ์ 100% ไม่มีภาพบิด/แตก/หลุดขอบ อักษรไม่ตัดกระดาษและไม่ทับภาพ
- ทุกหน้ามี contrast เพียงพอทั้งสีและขาวดำ; ภาพสำคัญมี cropping ที่ไม่ตัดใบหน้าหรืออุปกรณ์กีฬา
- ไม่มีข้อความสำคัญหล่น: V42-A source 11 หน้า/20 หมวด, กติกา, เวลา, คู่, รายชื่อ และหน้าที่กรรมการยังครบเมื่อทำเล่มจริง
- source-based anchor mapping **486 IDs สำหรับ baseline ปัจจุบัน** (236 fixture + 250 committee); ถ้า revision เปลี่ยนต้องมีหลักฐาน diff ใหม่
- no invented team/time/venue/results; status draft/รอตรวจยังชัด และ no signature/ครุฑ generated
- ตรวจบนหน้าจอมือถือผ่าน PDF viewer จริง + ตรวจพิมพ์ A4 + ลิงก์ page map/deep links ใหม่; ตรวจ PDF binary ว่าไม่ดึง Drive URLs เวลาเปิด
- รูปภาพทุกภาพผ่าน provenance/rights/consent review; image-only PDF ไม่แทน text layer

## 8. Workstream boundaries / ไม่ชนกับอีกแชท

| งาน | เจ้าของ / ไฟล์ | งานภาพทำได้ | ห้ามแก้ใน Visual plan |
|---|---|---|---|
| V42-A | official content / v42_official.py | ยึดความครบ + ที่ว่างด้านบนเท่านั้น | คำสั่ง/ประกาศ / ลายเซ็น / ตราราชการ |
| V42-B | พิธีการ | เสนอ hero band ใน mockup | เวลาพิธี/ลำดับ |
| V42-C | กติกา | icon/texture ที่ไม่แตะเนื้อหา | ข้อบังคับ / เกณฑ์ชี้ขาด |
| V42-D | school palette & match cards | เลย์เอาต์โทนกลางและ sport dividers | สีกลุ่มโรงเรียนที่รอรับรอง |
| V42-E | bracket & source coverage | เส้นกราฟิกตกแต่งบริเวณหัว | bracket model / คัดภาคผนวก |
| V42-F | PDF review/QA | เสริม visual assertions หลัง layout พร้อม | QA content source / source IDs |
| R19K/R20/R12 | ชื่อกรรมการ/ตาราง/นักกีฬา private | ไม่เกี่ยวข้อง | ข้อมูลแข่ง/ผล/บุคคล |
| R11E | release gate | ส่ง review artifact เท่านั้น | live PDF / published data |

**รอบนี้แตะเพียงเอกสารแผนและพรอมป์ต์ใน docs/**; ไม่แก้ build script, source JSON, PDF, website, Docs, Sheets หรือ workflow

## 9. Sequence for the next chat

1. เปิด **แผน V4.2 หลัก** และ V42-A QA แล้วเปิด **ไฟล์นี้** กับคู่มือพรอมป์ต์
2. ตรวจ main / PR ที่เปิดอยู่ก่อนทำ code; V42-A มีแล้ว ส่วน V42-B–F อาจเปลี่ยนระหว่างแชท
3. ตรวจ Drive folder “รูปภาพประกอบสูจิบัตร” และโฟลเดอร์ย่อย 7+9; ภาพที่ยังไม่มีให้เสนอรายการภาพขั้นต่ำ ไม่คาดเดาว่าได้รับ upload แล้ว
4. ทำ **mockup หกหน้า** โดยใช้ภาพที่ผ่านคัดเลือกหรือ placeholders ปลอดสิทธิ์ ไม่โหลดภาพ Drive โดยตรงจาก public repo
5. ยืนยันผู้ดูแลว่าภาพบุคคล/สนาม/ตราโรงเรียนมีสิทธิ์ ก่อนนำเข้า builder; จัด artwork manifest ที่ไม่เปิดเผย private IDs
6. พัฒนาโค้ดเฉพาะ visual slots ใน PR ใหม่หลังประสาน V42-B–F; สร้าง review PDF และบันทึก visual QA; R11E ควบคุมการเผยแพร่

## 10. Definition of done ของงาน Visual (ไม่ใช่ทั้ง V4.2)

- โฟลเดอร์และ prompt library พร้อมใช้; artifact ที่ผ่านการคัดเลือกมี provenance และสิทธิ์
- ต้นแบบ 6 หน้าอ่านดีเหมือนนิตยสารกีฬา แต่หน้าทางการและตารางยังครบ
- เครื่องมือสร้าง PDF V4.2 เดิมรับ selected artwork แบบฝังไฟล์, fallback ได้เมื่อไม่มีภาพ
- ทดสอบ A4 มือถือ ขาวดำ, ภาพ/ตัวอักษร, source anchor และสถานะร่างผ่าน
- **ไม่มีการตีความว่า visual approval เท่ากับ document/content approval**

## 8. บันทึกผลตรวจรับภาพปกทดลอง (7 พฤศจิกายน 2569)

**VIS-COVER: ผู้จัดเห็นชอบตัวอย่างปก A4 ที่ใช้ภาพจริงจาก Google Drive ในด้านองค์ประกอบและเลย์เอาต์แล้ว** ให้ใช้ต้นแบบนี้ต่อยอด ไม่ต้องทำภาพปกใหม่ซ้ำโดยไม่มีเหตุผล บันทึกรายละเอียดใน [แผนทดลองปกและผลตรวจรับ](R11C_V42_VIS_COVER_A4_LAYOUT_TRIAL_20261107.md#7-ผลตรวจรับหน้าปกจากผู้จัด-7-พฤศจิกายน-2569)

- Approved scope: visual composition / navy–gold masthead / horizontal hero photo / readable footer
- Pending gate: image source, photographer rights, permissions to publish identifiable students, public-sharing suitability
- Do not commit the original Drive photo, children's identities, private Drive IDs or cover PDF with recognizable children to public repo
- Do not modify V42-B–F source content or official live PDF; integrating image slots waits for a separate renderer PR and rights confirmation
- Recommended immediate content work: **V42-B พิธีเปิด–ปิด** (especially 08.45 subevents), followed by V42-C → D → E → F

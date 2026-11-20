# R30-L / มิตรภาพเกมส์ 2569

สูจิบัตรฉบับรวม 138 หน้า พร้อมสารบัญกีฬาและผลรับรองอยู่หน้า 3–4 และผลที่ผ่านการรับรองจาก Supabase R32 รวม 100 รายการ

การสร้างซ้ำต้องใช้ PDF R30-K เดิมที่ `/mnt/data/R30K_MittraphapGames_2569_R30K_Results_TOC_DRAFT.pdf` SHA256 `db3feb4a4220c7a6c4b57e0f15cd1c743b4358853f782bb07811029050ef1411` ซึ่งเก็บที่ https://drive.google.com/file/d/1nhr4IOVG0UYxCAQ7ZvEoWpV2v4_B51fQ/view

ใช้ Python 3, PyMuPDF, WeasyPrint และฟอนต์ Noto Sans Thai ที่ได้รับอนุญาตใช้งานตามระบบ โค้ดหลักอยู่ใน `build_r30l.py` ตามด้วย `clarify_result_status.py`, `restore_links.py`, `verify_r30l.py`; รายงานการตรวจใน `QA_REPORT.md` และ `QA_REPORT.json` ข้อมูลตรวจย้อนกลับใหม่ 17 คู่ใน `new_results_audit.json` และ `data/r30l/new_published_results_20261118.json` (GitHub)

งานนี้ไม่แก้ฐานข้อมูล/ไฟล์ตารางใน main/เว็บไซต์, ไม่แทนไฟล์ R30-K และยัง DRAFT จนผู้จัดตรวจรับ

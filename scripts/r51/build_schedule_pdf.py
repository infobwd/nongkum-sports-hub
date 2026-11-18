#!/usr/bin/env python3
"""R51: Standalone A4 schedule PDF. No scores/standings or write to source data.
Inputs are the same 236 corrected fixtures and R50 12-pair overlay as the public site.
"""
from __future__ import annotations

import html
import json
import os
import re
import subprocess
from collections import Counter
from datetime import datetime
from pathlib import Path
from weasyprint import HTML

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "exports" / "MittraphapGames_2569_R51_ScheduleOnly_R50_REVIEW.pdf"
HTML_OUT = ROOT / "docs" / "exports" / "MittraphapGames_2569_R51_ScheduleOnly_R50_REVIEW.html"
SOURCE_KEY = "r33-20261118-r50-12pairs-r32-100"
E = lambda s: html.escape(str(s if s is not None else ""), quote=True)

JS = r"""
const fs=require('node:fs');
const vm=require('node:vm');
const load=(p)=>vm.runInThisContext(fs.readFileSync(p,'utf8'),{filename:p});
load('js/program-corrections.js');
load('js/program-approved-pairs-r50.js');
const raw=JSON.parse(fs.readFileSync('data/program-from-pdf-2569-20261104-draft.json','utf8'));
const data=globalThis.NongkumApprovedPairsR50.apply(globalThis.NongkumProgramCorrections.apply(raw));
process.stdout.write(JSON.stringify(data));
"""
def source_data() -> dict:
    result = subprocess.run(["node", "-e", JS], cwd=ROOT, check=True, capture_output=True, text=True)
    data = json.loads(result.stdout)
    fixtures = data["fixtures"]
    assert len(fixtures) == 236, f"unexpected fixture count: {len(fixtures)}"
    counts = Counter(x["kind"] for x in fixtures)
    assert counts["match"] == 186 and counts["track_event"] == 50, counts
    assert len(data["sports"]) == 9
    certified = [x for x in fixtures if x.get("pair_confirmation") == "approved_results"]
    assert len(certified) == 12, f"R50 pair mismatch: {len(certified)}"
    assert all(x.get("pair_confirmation_source_key") == SOURCE_KEY for x in certified)
    assert data["metadata"]["all_data_approved"] is False
    return data

TH_MONTHS = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
             "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]

def date_text(f: dict) -> tuple[str, bool]:
    p = f.get("source_pdf") or {}
    raw = str(p.get("source_date_text") or "")
    confirmed = f.get("planning_date_confirmation") == "confirmed"
    iso = f.get("planning_date") if confirmed else (p.get("source_date_iso") or f.get("planning_date") or "")
    if ("2568" in raw or re.search(r"พ\.ย\.\s*68", raw)) and not confirmed:
        return "รอตรวจวัน", False
    m = re.fullmatch(r"(\d{4})-(\d\d)-(\d\d)", str(iso))
    if m:
        year, month, day = map(int, m.groups())
        try:
            datetime(year, month, day)
        except ValueError:
            return "รอตรวจวัน", False
        if year != 2026:
            return "รอตรวจวัน", False
        return f"{day} {TH_MONTHS[month]} {year + 543}", confirmed
    return "รอตรวจวัน", False

def time_text(f: dict) -> tuple[str, bool]:
    p = f.get("source_pdf") or {}
    confirmed = f.get("planning_time_confirmation") == "confirmed"
    value = f.get("planning_time") if confirmed else (p.get("source_time") or f.get("time") or "")
    if not value:
        return "ไม่ระบุเวลา", False
    s = str(value).strip()
    mm = re.search(r"(\d{1,2}):(\d\d)", s)
    if mm:
        return f"{int(mm.group(1)):02d}.{mm.group(2)} น.", confirmed
    return s, confirmed

def venue_text(f: dict) -> str:
    p = f.get("source_pdf") or {}
    sub = (p.get("source_field") or f.get("field") or "").strip()
    return sub or "สนามหลัก"

def participants(f: dict, names: dict) -> str:
    if f.get("kind") == "track_event":
        label = (f.get("name") or f.get("source_pair_text") or "รายการกรีฑา").strip()
        lanes = [x for x in (f.get("lanes") or []) if not x.get("vacant")]
        if lanes:
            return E(label) + "<div class='lanes'>มีลู่แข่งขัน " + str(len(lanes)) + " ลู่ (รายละเอียดลู่ตรวจจากสูจิบัตรต้นฉบับ)</div>"
        return E(label)
    a = names.get(f.get("team_a_id"), "")
    b = names.get(f.get("team_b_id"), "")
    if a and b:
        main = f"<strong>{E(a)}</strong><span class='versus'> พบ </span><strong>{E(b)}</strong>"
    else:
        pdf_a = f.get("source_team_a_label") or ""
        pdf_b = f.get("source_team_b_label") or ""
        if pdf_a and pdf_b:
            main = E(pdf_a) + "<span class='versus'> พบ </span>" + E(pdf_b)
        else:
            main = E(f.get("source_pair_text") or "รอข้อมูลคู่แข่งขัน")
    if f.get("pair_confirmation") == "approved_results":
        main += "<div class='pair-approved'>คู่แข่งขันยืนยันจากผลรับรองแล้ว</div>"
    return main

def sort_key(f: dict):
    day, _ = date_text(f)
    # Anomalous days go to the end, not silently converted to the current year.
    p = f.get("source_pdf") or {}
    iso = f.get("planning_date") if f.get("planning_date_confirmation") == "confirmed" else p.get("source_date_iso")
    real_date = str(iso) if day != "รอตรวจวัน" else "9999-12-31"
    tm, _ = time_text(f)
    minute = re.search(r"(\d\d)\.(\d\d)", tm)
    ti = int(minute.group(1))*60 + int(minute.group(2)) if minute else 9999
    num = re.search(r"\d+", str(f.get("source_match_no") or ""))
    return real_date, ti, int(num.group(0)) if num else 9999, str(f.get("id") or "")

def render():
    data=source_data()
    schools={s["id"]:s.get("short") or s["name"] for s in data["schools"]}
    sports=data["sports"]
    fixtures=data["fixtures"]
    by_sport={s["id"]:sorted((f for f in fixtures if f.get("sport_id")==s["id"]),key=sort_key) for s in sports}
    counts={sid:len(rows) for sid,rows in by_sport.items()}
    assert sum(counts.values()) == 236

    sections=[]
    toc=[]
    for index,s in enumerate(sports,1):
        sid=s["id"]
        sname=s["name"]
        sport_rows=by_sport[sid]
        if not sport_rows: continue
        anchor=f"sport-{index}"
        toc.append(f"<a class='toc-item' href='#{anchor}'><span class='toc-num'>{index:02d}</span>"
                   f"<span>{E(sname)}</span><span class='toc-quantity'>{len(sport_rows)} รายการ</span></a>")
        rendered=[]
        for n,f in enumerate(sport_rows,1):
            date,date_ok=date_text(f)
            time,time_ok=time_text(f)
            if date_ok and time_ok:
                status="<small class='verified'>ยืนยันวันและเวลาแล้ว</small>"
            elif date_ok:
                status="<small class='pending'>วันยืนยัน · เวลาตามตารางรอตรวจ</small>"
            else:
                status="<small class='pending'>วัน/เวลาตามสูจิบัตร · โปรดตรวจสอบ</small>"
            when=f"{E(date)}<br><b>{E(time)}</b><br>{status}"
            round_name=f.get("round") or "รายการแข่งขัน"
            details=E(f.get("division") or "")
            if round_name:
                details += "<br><small class='round'>"+E(round_name)+"</small>"
            page=f.get("source_pdf",{}).get("page") or f.get("source_page") or "–"
            label = "ลำดับ" if f.get("kind") == "track_event" else "คู่"
            no=E(f.get("source_match_no") or n)
            content=participants(f,schools)
            venue=E(venue_text(f))
            rendered.append(f"<tr><td class='no'><b>{no}</b><small>{label}</small></td>"
                            f"<td>{details}</td><td class='opponents'>{content}</td>"
                            f"<td class='when'>{when}</td>"
                            f"<td class='venue'>{venue}<br><small>ต้นฉบับ น.{E(page)}</small></td></tr>")
        rows="".join(rendered)
        sections.append(f"<section class='sport-section' id='{anchor}'>"
                        f"<div class='sport-kicker'>มิตรภาพเกมส์ 2569 · ตารางการแข่งขัน</div>"
                        f"<h2><span class='sport-number'>{index:02d}</span>{E(sname)}</h2>"
                        f"<p class='sport-desc'>รวม {len(sport_rows)} รายการ · สนามหลัก: โรงเรียนบ้านหนองกระทุ่ม"
                        " (สนามหลักยืนยันแล้ว; สนามย่อยยึดตามตาราง)</p>"
                        "<table class='schedule'><colgroup><col class='col-no'><col class='col-division'>"
                        "<col class='col-opponents'><col class='col-when'><col class='col-venue'></colgroup>"
                        "<thead><tr><th>คู่ที่ / รายการ</th><th>รุ่นและรอบ</th><th>คู่แข่งขัน / รายการกีฬา</th>"
                        "<th>วันและเวลา</th><th>สนามย่อย / อ้างอิง</th></tr></thead>"
                        f"<tbody>{rows}</tbody></table></section>")

    css = r"""
@page {size:A4 portrait; margin:16mm 14mm 17mm 14mm;
 @top-right {content:"มิตรภาพเกมส์ 2569 · ตารางการแข่งขัน";font-size:8pt;color:#63778f}
 @bottom-left {content:"ฉบับตรวจร่าง R51 · 18 พ.ย. 2569";font-size:8pt;color:#64748b}
 @bottom-right {content:"หน้า " counter(page) " / " counter(pages);font-size:8pt;color:#64748b}}
@page:first {@top-right {content:""} @bottom-left {content:""} @bottom-right {content:""}}
* {box-sizing:border-box}
body {font-family:"Noto Sans Thai","Noto Sans","Loma",sans-serif;color:#20334e;font-size:9.15pt;line-height:1.45}
.cover {page-break-after:always;min-height:245mm;padding:25mm 16mm 10mm;position:relative;
 background:linear-gradient(150deg,#102b4d 0%,#1b4477 64%,#102b4d 100%);color:white}
.cover:before {content:"";display:block;height:5mm;width:27mm;background:#e8ba64;margin-bottom:30mm}
.cover .pretitle {font-size:11pt;letter-spacing:.4px;color:#e7d4ad}
.cover h1 {font-size:29pt;line-height:1.25;margin:9mm 0 3mm;font-weight:800;color:white}
.cover .subtitle {font-size:18pt;color:#f4d799;font-weight:700}
.cover .rule {height:1px;background:#b9cbe0;margin:15mm 0 11mm;opacity:.45}
.cover .cover-info {font-size:11pt;line-height:1.8}
.cover .cover-note {margin-top:24mm;padding:6mm 7mm;border-left:2.4mm solid #e9ba62;
 background:rgba(255,255,255,.1);font-size:9.5pt}
.cover .footer {margin-top:22mm;color:#dce6f2;font-size:9pt}
.toc {page-break-after:always}
h2 {color:#12345d;font-size:18pt;margin:2mm 0 4mm;line-height:1.3}
.toc .eyebrow,.sport-kicker {font-size:9pt;font-weight:700;color:#ad8137;letter-spacing:.2px}
.toc-item {display:flex;align-items:center;gap:5mm;border-bottom:1px solid #d9e2ed;
 padding:3.3mm 1mm;text-decoration:none;color:#15365d;font-size:11pt}
.toc-num {width:12mm;font-weight:800;color:#a57a35}
.toc-quantity {margin-left:auto;font-size:9pt;color:#657892}
.toc .note {margin-top:12mm;padding:4mm 5mm;background:#f3f6fa;border:1px solid #e0e6ef;
 font-size:9pt;line-height:1.7}
.sport-section {page-break-before:always}
.sport-section h2 {border-bottom:2px solid #dca94e;padding:0 0 3.5mm;display:flex;gap:4mm;align-items:center}
.sport-number {color:#b7893e;font-size:14pt}
.sport-desc {color:#586e86;font-size:9pt;margin:0 0 5mm}
table.schedule {table-layout:fixed;border-collapse:collapse;width:100%;font-size:8.6pt}
.schedule thead {display:table-header-group}
.schedule th {background:#1a3c68;color:white;padding:2.6mm 1.7mm;font-size:8.2pt;text-align:left;line-height:1.2}
.schedule td {padding:2.5mm 1.5mm;border-bottom:1px solid #d9e0e9;vertical-align:top;overflow-wrap:anywhere}
.schedule tbody tr:nth-child(even) {background:#f5f8fc}
.schedule tr {break-inside:avoid;page-break-inside:avoid}
.col-no {width:9%}.col-division {width:19%}.col-opponents {width:37%}.col-when {width:21%}.col-venue {width:14%}
td.no {color:#244875;text-align:center;font-size:11pt}
td.no small {display:block;font-size:7pt;color:#8490a2}
td.opponents {font-weight:500}
td.opponents strong {font-weight:700;color:#12345a}
.versus {color:#8491a1}
td.venue {font-size:8pt}
td.venue small {font-size:7.5pt;color:#7a8798}
.round {color:#6e7f90}
.when {font-size:8pt;line-height:1.45}
.when b {font-size:9.4pt;color:#163967}
.verified {font-size:7.3pt;color:#087161;font-weight:650}
.pending {font-size:7.3pt;color:#9a651e}
.pair-approved {font-size:7.8pt;color:#087161;margin-top:1mm;font-weight:700}
.lanes {font-size:7pt;color:#65768c;font-weight:400}
"""
    cover=f"""<section class="cover">
 <div class="pretitle">กลุ่มโรงเรียนหนองกุ่ม · มิตรภาพเกมส์ 2569</div>
 <h1>ตาราง<br>การแข่งขัน</h1><div class="subtitle">มิตรภาพเกมส์ 2569</div>
 <div class="rule"></div>
 <div class="cover-info">รวม <b>236 รายการ</b> · 9 ชนิดกีฬา<br>
 186 คู่แข่งขัน และ 50 รายการกรีฑา<br>
 แสดงคู่รอบต่อไปที่ยืนยันจากผลรับรองแล้ว <b>12 คู่</b></div>
 <div class="cover-note"><b>ฉบับตรวจร่างเฉพาะตารางการแข่งขัน</b><br>
 วัน เวลา และสนามย่อยบางรายการยังต้องเทียบกับเอกสารประกาศล่าสุด<br>
 ยืนยันชื่อคู่แข่งขันจากผลรับรองไม่ใช่การยืนยันกำหนดแข่งขันทุกส่วน</div>
 <div class="footer">ข้อมูลตาราง R33: {E(SOURCE_KEY)}<br>จัดทำ 18 พฤศจิกายน 2569</div></section>"""
    toc_html=f"""<section class="toc"><div class="eyebrow">สารบัญ</div><h2>ตารางการแข่งขันแยกตามชนิดกีฬา</h2>
      {''.join(toc)}
      <div class="note"><b>คำอธิบายสถานะ</b><br>
      <span style="color:#087161">คู่แข่งขันยืนยันจากผลรับรองแล้ว</span> = ยืนยันเพียงตัวทีมผู้เข้ารอบ<br>
      <span style="color:#087161">ยืนยันวันและเวลาแล้ว</span> = มีหลักฐานรับรองกำหนดแข่งขันส่วนวันและเวลา<br>
      <span style="color:#9a651e">ตามสูจิบัตร · โปรดตรวจสอบ</span> = ยังต้องเทียบประกาศวันเวลาและสนามย่อยก่อนใช้งาน<br>
      <br>ตารางนี้ไม่ใช่รายงานผลการแข่งขัน และไม่เปลี่ยนข้อสังเกตในสูจิบัตรต้นฉบับ
      </div></section>"""
    document=f"""<!doctype html><html lang="th"><head><meta charset="utf-8">
     <title>มิตรภาพเกมส์ 2569 — ตารางการแข่งขัน (เฉพาะตาราง) R51</title>
     <style>{css}</style></head><body>{cover}{toc_html}{''.join(sections)}</body></html>"""
    OUT.parent.mkdir(parents=True,exist_ok=True)
    HTML_OUT.write_text(document,encoding="utf-8")
    HTML(string=document,base_url=str(ROOT)).write_pdf(str(OUT))
    print(f"R51 PDF: {OUT}, {OUT.stat().st_size} bytes, {len(fixtures)} fixtures, {len(sports)} sports, 12 R50 pairs")

if __name__ == "__main__":
    render()

#!/usr/bin/env python3
"""Generate coordinate-only highlights from SHA-pinned V3 and public committee roster."""
import json,hashlib,re,unicodedata,argparse
from pathlib import Path
import fitz

SHA="0f0083bc349b2b0176cbeaa66a09e88e883aeb1cd4078c954582782e5e2bc1ba"
PDF="assets/souvenir-committee-2569-v3.pdf"
ROSTER="data/committee-2569-draft-public-review.json"
OUT="data/committee-pdf-positions-v3.json"
REPORT="docs/R19K_COMMITTEE_PDF_COORDINATE_QA.md"
NUM=re.compile(r"^\s*(\d{1,2}(?:\.\d{1,2}){1,3})(?![\d.])\s+")
SINGLE=re.compile(r"^\s*(\d{1,2})\.\s+")
def compact(s):
    return re.sub(r"\s+","",re.sub(r"[\u200b-\u200f\ufeff]","",unicodedata.normalize("NFC",str(s or ""))))
def rows(page):
    groups=[]
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines",[]):
            s="".join(z.get("text","") for z in line["spans"]).strip()
            if not s:continue
            x0,y0,x1,y1=line["bbox"]; cy=(y0+y1)/2
            row=next((r for r in groups if abs(r["cy"]-cy)<=2.2),None)
            if row is None: row={"cy":cy,"parts":[]};groups.append(row)
            row["parts"].append((x0,y0,x1,y1,s))
    result=[]
    for g in groups:
        parts=sorted(g["parts"],key=lambda t:t[0])
        s=" ".join(p[4] for p in parts)
        match=NUM.match(s) or SINGLE.match(s)
        result.append({"number":match.group(1) if match else "","text":s,"parts":parts,"cy":g["cy"]})
    return sorted(result,key=lambda r:r["cy"])
def box(row,name,number):
    parts=[p for p in row["parts"] if compact(name) in compact(p[4]) or
           (number and compact(number) in compact(p[4]))]
    if parts: x0,y0,x1,y1=min(parts,key=lambda p:p[0])[:4]
    else:
        x0=min(p[0] for p in row["parts"]);y0=min(p[1] for p in row["parts"])
        x1=max(p[2] for p in row["parts"]);y1=max(p[3] for p in row["parts"])
    return x0,y0,min(x1,x0+max(130,min(270,24+7.8*len(name)))),y1
def build(root):
    pdf_data=(root/PDF).read_bytes()
    if hashlib.sha256(pdf_data).hexdigest()!=SHA:raise ValueError("Pinned PDF SHA changed")
    roster=json.loads((root/ROSTER).read_text("utf8"))
    if roster.get("editorial_correction",{}).get("corrected_pdf_sha256")!=SHA:raise ValueError("Roster corrected-PDF SHA changed")
    doc=fitz.open(root/PDF)
    if len(doc)!=64:raise ValueError("PDF no longer 64 pages")
    sources={p:rows(doc[p-1]) for p in range(6,17)}
    matches,unresolved={},[]
    for e in roster["entries"]:
        page=e.get("pdf_page");number=str(e.get("number") or "").strip()
        name=str(e.get("name") or "").strip();key=e.get("id")
        if not key or not isinstance(page,int) or not 6<=page<=16 or len(name)<4:
            unresolved.append({"id":key,"page":page,"number":number,"name":name,"reason":"invalid_reference"});continue
        candidates=[row for row in sources[page] if compact(name) in compact(row["text"])]
        candidates=[row for row in candidates if row["number"]==number]
        if len(candidates)!=1:
            unresolved.append({"id":key,"page":page,"number":number,"name":name,
                               "reason":"no_exact_match" if not candidates else "ambiguous_match"});continue
        x0,y0,x1,y1=box(candidates[0],name,number)
        w,h=doc[page-1].rect.width,doc[page-1].rect.height
        if not(0<=x0<x1<=w and 0<=y0<y1<=h):raise ValueError("Invalid bbox: "+key)
        matches[key]={"page":page,"number":number,"name":name,
                      "rect":[round(x0/w,6),round(y0/h,6),round(x1/w,6),round(y1/h,6)]}
    qa={"total":len(roster["entries"]),"matched":len(matches),"unresolved":len(unresolved),"unresolved_entries":unresolved}
    return {"schema_version":1,"source_sha256":SHA,"roster_revision":roster["revision"],
            "source_pdf_pages":64,"coordinate_space":"normalized_top_left_cropbox",
            "entries":matches,"qa":qa}
def main():
    ap=argparse.ArgumentParser();ap.add_argument("--root",type=Path,default=Path(__file__).resolve().parents[2])
    ap.add_argument("--print-json",action="store_true");args=ap.parse_args()
    data=build(args.root);(args.root/OUT).write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n","utf8")
    qa=data["qa"];q="R19-K PDF V3 coordinate verification: "+str(qa["matched"])+"/"+str(qa["total"])
    lines=["# "+q,"","Source SHA-256: "+SHA,"","## Still needing manual verification",""]
    for e in qa["unresolved_entries"]:
        lines.append("- "+str(e["id"])+" page "+str(e["page"])+" clause "+str(e["number"])+" "+e["name"]+" ["+e["reason"]+"]")
    if not qa["unresolved_entries"]:lines.append("- None")
    (args.root/REPORT).write_text("\n".join(lines)+"\n","utf8")
    print(q,"unresolved",qa["unresolved"])
    if args.print_json:
        print("R19K_JSON_BEGIN")
        print(json.dumps(data,ensure_ascii=False,separators=(",",":")))
        print("R19K_JSON_END")
        print("R19K_REPORT_BEGIN")
        print("\n".join(lines))
        print("R19K_REPORT_END")
if __name__=="__main__":main()
